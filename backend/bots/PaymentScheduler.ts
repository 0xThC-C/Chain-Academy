import cron from 'node-cron';
import { DailyPaymentBot } from './DailyPaymentBot';
import { BotConfig } from './types';

export class PaymentScheduler {
  private bot: DailyPaymentBot;
  private task: cron.ScheduledTask | null = null;
  private config: BotConfig;
  private isRunning: boolean = false;
  private executionHistory: ExecutionRecord[] = [];
  private maxHistorySize: number = 100;

  constructor(bot: DailyPaymentBot, config?: BotConfig) {
    this.bot = bot;
    this.config = config || this.getDefaultConfig();
    
    console.log(`[PaymentScheduler] Initialized with execution time: ${this.config.executionTime}`);
  }

  private getDefaultConfig(): BotConfig {
    return {
      enabled: true,
      cronSchedule: '0 2 * * *', // 2 AM UTC daily
      executionTime: '02:00', // 2 AM UTC
      paymentDelayHours: 24,
      maxRetryAttempts: 3,
      supportedChains: [8453, 10, 42161, 137], // Base, Optimism, Arbitrum, Polygon
      notificationEnabled: true,
      emergencyPauseAddress: process.env.EMERGENCY_PAUSE_ADDRESS || '',
      gasLimits: {
        8453: BigInt(500000),  // Base
        10: BigInt(500000),    // Optimism
        42161: BigInt(800000), // Arbitrum
        137: BigInt(600000)    // Polygon
      }
    };
  }

  /**
   * Start the scheduled task
   */
  public start(): void {
    if (this.isRunning) {
      console.log('[PaymentScheduler] Scheduler already running');
      return;
    }

    try {
      // Parse execution time (format: "HH:MM")
      const [hour, minute] = this.config.executionTime.split(':').map(Number);
      
      if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid execution time format: ${this.config.executionTime}`);
      }

      // Create cron expression for daily execution at specified time
      const cronExpression = `${minute} ${hour} * * *`;
      
      console.log(`[PaymentScheduler] Creating cron job with expression: ${cronExpression}`);
      
      this.task = cron.schedule(cronExpression, async () => {
        await this.executeBot();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.task.start();
      this.isRunning = true;
      
      console.log(`[PaymentScheduler] Scheduler started successfully. Next execution: ${this.getNextExecutionTime()}`);
      
      // Also schedule a health check every hour
      this.scheduleHealthCheck();
      
    } catch (error) {
      console.error('[PaymentScheduler] Failed to start scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the scheduled task
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('[PaymentScheduler] Scheduler not running');
      return;
    }

    if (this.task) {
      this.task.stop();
      // Note: destroy() may not be available in all versions of node-cron
      if (typeof (this.task as any).destroy === 'function') {
        (this.task as any).destroy();
      }
      this.task = null;
    }

    this.isRunning = false;
    console.log('[PaymentScheduler] Scheduler stopped');
  }

  /**
   * Execute the bot manually (for testing or emergency runs)
   */
  public async executeManually(): Promise<void> {
    console.log('[PaymentScheduler] Manual execution triggered');
    await this.executeBot(true);
  }

  /**
   * Internal method to execute the bot with error handling and logging
   */
  private async executeBot(isManual: boolean = false): Promise<void> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`[PaymentScheduler] Starting bot execution ${executionId} (${isManual ? 'manual' : 'scheduled'})`);
    
    const record: ExecutionRecord = {
      id: executionId,
      startTime,
      endTime: 0,
      success: false,
      isManual,
      error: null,
      metrics: null
    };

    try {
      // Check if bot is healthy before execution
      if (!this.bot.isHealthy() && !isManual) {
        throw new Error('Bot health check failed');
      }

      // Execute the daily payment process
      await this.bot.executeDaily();
      
      // Mark as successful
      record.success = true;
      record.metrics = this.bot.getMetrics();
      
      const duration = Date.now() - startTime;
      console.log(`[PaymentScheduler] Bot execution ${executionId} completed successfully in ${duration}ms`);
      
    } catch (error) {
      record.error = (error as Error).message;
      console.error(`[PaymentScheduler] Bot execution ${executionId} failed:`, error);
      
      // Send alert for failed executions
      await this.sendExecutionAlert(executionId, error);
      
      // If this is a critical failure, consider pausing the scheduler
      if (this.isCriticalError(error)) {
        console.error('[PaymentScheduler] Critical error detected, pausing scheduler');
        this.bot.pause();
      }
    } finally {
      record.endTime = Date.now();
      this.addExecutionRecord(record);
    }
  }

  /**
   * Schedule periodic health checks
   */
  private scheduleHealthCheck(): void {
    // Run health check every hour
    cron.schedule('0 * * * *', async () => {
      await this.performHealthCheck();
    }, {
      timezone: 'UTC'
    });
    
    console.log('[PaymentScheduler] Health check scheduled (hourly)');
  }

  /**
   * Perform health check on the bot and scheduler
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = this.bot.isHealthy();
      const lastExecution = this.getLastExecution();
      
      if (!isHealthy) {
        console.warn('[PaymentScheduler] Health check failed - bot is not healthy');
        await this.sendHealthAlert('Bot health check failed');
      }
      
      // Check if last execution was too long ago
      if (lastExecution && lastExecution.startTime < Date.now() - (26 * 60 * 60 * 1000)) {
        console.warn('[PaymentScheduler] Health check failed - last execution too old');
        await this.sendHealthAlert('Last execution too long ago');
      }
      
      // Check for consecutive failures
      const recentFailures = this.getRecentFailures(5);
      if (recentFailures.length >= 3) {
        console.warn('[PaymentScheduler] Health check failed - multiple consecutive failures');
        await this.sendHealthAlert('Multiple consecutive execution failures');
      }
      
    } catch (error) {
      console.error('[PaymentScheduler] Health check error:', error);
    }
  }

  /**
   * Check if an error is critical enough to pause the scheduler
   */
  private isCriticalError(error: any): boolean {
    const criticalPatterns = [
      'insufficient funds',
      'private key',
      'contract not found',
      'network error',
      'rpc error'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return criticalPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Send execution failure alert
   */
  private async sendExecutionAlert(executionId: string, error: any): Promise<void> {
    const alertData = {
      type: 'EXECUTION_FAILED',
      executionId,
      timestamp: new Date().toISOString(),
      error: error.message,
      metrics: this.bot.getMetrics()
    };
    
    console.error('[PaymentScheduler] EXECUTION ALERT:', JSON.stringify(alertData, null, 2));
    
    // Here you would integrate with your alerting system
    // Examples: email, Slack, Discord, PagerDuty, etc.
  }

  /**
   * Send health check alert
   */
  private async sendHealthAlert(reason: string): Promise<void> {
    const alertData = {
      type: 'HEALTH_CHECK_FAILED',
      reason,
      timestamp: new Date().toISOString(),
      schedulerStatus: this.getStatus(),
      botMetrics: this.bot.getMetrics()
    };
    
    console.warn('[PaymentScheduler] HEALTH ALERT:', JSON.stringify(alertData, null, 2));
  }

  /**
   * Add execution record to history
   */
  private addExecutionRecord(record: ExecutionRecord): void {
    this.executionHistory.unshift(record);
    
    // Keep only the most recent records
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get next scheduled execution time
   */
  public getNextExecutionTime(): string {
    if (!this.task) {
      return 'Not scheduled';
    }
    
    // Calculate next execution time based on current time and cron schedule
    const now = new Date();
    const [hour, minute] = this.config.executionTime.split(':').map(Number);
    
    const nextExecution = new Date();
    nextExecution.setUTCHours(hour, minute, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextExecution <= now) {
      nextExecution.setUTCDate(nextExecution.getUTCDate() + 1);
    }
    
    return nextExecution.toISOString();
  }

  /**
   * Get scheduler status information
   */
  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      nextExecution: this.getNextExecutionTime(),
      lastExecution: this.getLastExecution(),
      totalExecutions: this.executionHistory.length,
      successfulExecutions: this.executionHistory.filter(r => r.success).length,
      failedExecutions: this.executionHistory.filter(r => !r.success).length,
      recentFailures: this.getRecentFailures(5).length,
      config: this.config
    };
  }

  /**
   * Get last execution record
   */
  public getLastExecution(): ExecutionRecord | null {
    return this.executionHistory.length > 0 ? this.executionHistory[0] : null;
  }

  /**
   * Get recent execution failures
   */
  public getRecentFailures(count: number): ExecutionRecord[] {
    return this.executionHistory
      .filter(record => !record.success)
      .slice(0, count);
  }

  /**
   * Get execution history
   */
  public getExecutionHistory(limit?: number): ExecutionRecord[] {
    return limit ? this.executionHistory.slice(0, limit) : [...this.executionHistory];
  }

  /**
   * Update scheduler configuration
   */
  public updateConfig(newConfig: Partial<BotConfig>): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }
    
    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning) {
      this.start();
    }
    
    console.log('[PaymentScheduler] Configuration updated');
  }
}

// Supporting interfaces
interface ExecutionRecord {
  id: string;
  startTime: number;
  endTime: number;
  success: boolean;
  isManual: boolean;
  error: string | null;
  metrics: any;
}

interface SchedulerStatus {
  isRunning: boolean;
  nextExecution: string;
  lastExecution: ExecutionRecord | null;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  recentFailures: number;
  config: BotConfig;
}