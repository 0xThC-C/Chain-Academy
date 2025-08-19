import { ethers } from 'ethers';
import { 
  PendingPayment, 
  PaymentResult, 
  BotConfig, 
  ChainConfig, 
  PaymentBatch,
  PaymentStatus,
  PaymentLog,
  BotMetrics,
  ProgressiveSession,
  SessionStatus,
  TrackedSession,
  SessionTracker
} from './types';
import { PaymentScheduler } from './PaymentScheduler';
import { DiscordNotifier, DiscordWebhookConfig, AlertType } from './DiscordNotifier';

// Progressive Escrow V7 ABI for payment automation
const ESCROW_ABI = [
  'function autoCompleteSession(bytes32 sessionId) external',
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function getAvailablePayment(bytes32 sessionId) external view returns (uint256)',
  'function needsHeartbeat(bytes32 sessionId) external view returns (bool)',
  'function shouldAutoPause(bytes32 sessionId) external view returns (bool)',
  'event SessionAutoCompleted(bytes32 indexed sessionId, address indexed mentor, uint256 amount)',
  'event SessionCompleted(bytes32 indexed sessionId, address indexed mentor, uint256 totalReleased)'
];

export class DailyPaymentBot {
  private config: BotConfig;
  private chainConfigs: Map<number, ChainConfig>;
  private providers: Map<number, ethers.JsonRpcProvider>;
  private wallets: Map<number, ethers.Wallet>;
  private contracts: Map<number, ethers.Contract>;
  private paymentLogs: Map<string, PaymentLog>;
  private metrics: BotMetrics;
  private scheduler: PaymentScheduler;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  
  // V7 specific additions
  private sessionTracker: SessionTracker;
  private readonly fs = require('fs').promises;
  private discordNotifier: DiscordNotifier;

  constructor(config: BotConfig, chainConfigs: ChainConfig[]) {
    this.config = config;
    this.chainConfigs = new Map();
    this.providers = new Map();
    this.wallets = new Map();
    this.contracts = new Map();
    this.paymentLogs = new Map();
    this.scheduler = new PaymentScheduler(this);
    
    // Initialize V7 session tracker
    this.sessionTracker = {
      sessions: new Map(),
      lastFullScan: 0,
      scanInterval: 6 * 60 * 60 * 1000 // 6 hours
    };

    // Initialize Discord notifier
    const discordConfig: DiscordWebhookConfig = {
      webhookUrl: process.env.BOT_DISCORD_WEBHOOK_URL || '',
      username: 'Chain Academy Bot',
      enabled: process.env.BOT_ENABLE_DISCORD_NOTIFICATIONS === 'true',
      retryAttempts: 3,
      retryDelay: 2000
    };
    this.discordNotifier = new DiscordNotifier(discordConfig);
    
    // Initialize metrics
    this.metrics = {
      totalProcessed: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalGasUsed: BigInt(0),
      lastExecutionTime: 0,
      chainMetrics: {}
    };

    // Setup chain configurations
    chainConfigs.forEach(chainConfig => {
      this.chainConfigs.set(chainConfig.chainId, chainConfig);
      this.setupChain(chainConfig);
    });

    // Load existing session tracking data
    this.loadSessionTracker().catch(error => {
      console.warn(`[DailyPaymentBot] Could not load session tracker data: ${error.message}`);
    });

    console.log(`[DailyPaymentBot] Initialized with ${chainConfigs.length} chains`);
    
    // Send startup notification
    if (this.discordNotifier.isEnabled()) {
      this.discordNotifier.notifyBotStartup(
        config.version || '2.0.0',
        chainConfigs.length
      ).catch(error => {
        console.error('[DailyPaymentBot] Failed to send startup notification:', error);
      });
    }
  }

  private setupChain(chainConfig: ChainConfig): void {
    try {
      // Setup provider
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      this.providers.set(chainConfig.chainId, provider);

      // Setup wallet (using environment variable for private key)
      const privateKey = process.env.BOT_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('BOT_PRIVATE_KEY environment variable not set');
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      this.wallets.set(chainConfig.chainId, wallet);

      // Setup contract
      const contract = new ethers.Contract(
        chainConfig.contractAddress,
        ESCROW_ABI,
        wallet
      );
      this.contracts.set(chainConfig.chainId, contract);

      // Initialize chain metrics
      this.metrics.chainMetrics[chainConfig.chainId] = {
        processed: 0,
        gasUsed: BigInt(0),
        averageGasPrice: BigInt(0)
      };

      console.log(`[DailyPaymentBot] Setup chain ${chainConfig.name} (${chainConfig.chainId})`);
    } catch (error) {
      console.error(`[DailyPaymentBot] Failed to setup chain ${chainConfig.chainId}:`, error);
      throw error;
    }
  }

  /**
   * Main execution function - scans and processes all pending payments
   */
  public async executeDaily(): Promise<void> {
    if (this.isRunning) {
      console.log('[DailyPaymentBot] Already running, skipping execution');
      return;
    }

    if (this.isPaused) {
      console.log('[DailyPaymentBot] Bot is paused, skipping execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[DailyPaymentBot] Starting daily execution...');
      
      // Step 1: Scan for pending payments across all chains
      const pendingPayments = await this.scanPendingPayments();
      console.log(`[DailyPaymentBot] Found ${pendingPayments.length} pending payments`);

      if (pendingPayments.length === 0) {
        console.log('[DailyPaymentBot] No pending payments to process');
        return;
      }

      // Step 2: Organize payments by chain for batch processing
      const paymentBatches = this.organizeBatches(pendingPayments);
      
      // Step 3: Process payments by chain
      const results = await this.processAutomaticPayments(paymentBatches);
      
      // Step 4: Update metrics
      this.updateMetrics(results);
      
      // Step 5: Send notifications
      if (this.config.notificationEnabled) {
        await this.notifyMentors(results.filter(r => r.success));
      }
      
      // Step 6: Log activity
      await this.logPaymentActivity(results);
      
      const executionTime = Date.now() - startTime;
      console.log(`[DailyPaymentBot] Daily execution completed in ${executionTime}ms`);
      console.log(`[DailyPaymentBot] Results: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
      
      // Send execution summary to Discord
      if (this.discordNotifier.isEnabled() && results.length > 0) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalGasUsed = results.reduce((sum, r) => sum + (r.gasUsed || BigInt(0)), BigInt(0));
        
        this.discordNotifier.notifyExecutionSummary(
          results.length,
          successful,
          failed,
          totalGasUsed,
          executionTime
        ).catch(error => {
          console.error('[DailyPaymentBot] Failed to send execution summary:', error);
        });
      }
      
    } catch (error) {
      console.error('[DailyPaymentBot] Daily execution failed:', error);
      
      // Send error notification to Discord
      if (this.discordNotifier.isEnabled()) {
        await this.discordNotifier.notifyError(
          'Daily Execution Failed',
          (error as Error).message,
          {
            'Execution Time': new Date().toISOString(),
            'Bot Version': this.config.version || '2.0.0'
          }
        );
      }
      
      // Send alert to admin
      await this.sendAlert('Daily execution failed', error);
    } finally {
      this.isRunning = false;
      this.metrics.lastExecutionTime = Date.now();
    }
  }

  /**
   * Scan all chains for sessions that need automatic payment (V7 Compatible)
   */
  public async scanPendingPayments(): Promise<PendingPayment[]> {
    const allPendingPayments: PendingPayment[] = [];
    const cutoffTime = Date.now() - (this.config.paymentDelayHours * 60 * 60 * 1000);

    console.log(`[DailyPaymentBot] Starting V7 session scan with cutoff time: ${new Date(cutoffTime).toISOString()}`);

    // Since V7 doesn't have getAllActiveSessions, we need to use our session tracker
    await this.updateSessionTracker();

    for (const [sessionId, trackedSession] of this.sessionTracker.sessions) {
      if (!trackedSession.isTracked) continue;

      try {
        const contract = this.contracts.get(trackedSession.chainId);
        if (!contract) {
          console.warn(`[DailyPaymentBot] No contract found for chain ${trackedSession.chainId}`);
          continue;
        }

        console.log(`[DailyPaymentBot] Checking session ${sessionId} on chain ${trackedSession.chainId}`);
        
        // Get current session details from contract
        const sessionDetails: ProgressiveSession = await contract.getSession(sessionId);
        
        // Check if session is completed and eligible for auto-release
        if (sessionDetails.status === SessionStatus.Completed && 
            sessionDetails.isActive && 
            !sessionDetails.surveyCompleted) {
          
          // Check if enough time has passed since completion (based on startTime + duration)
          const sessionEndTime = (Number(sessionDetails.startTime) + (sessionDetails.sessionDuration * 60)) * 1000;
          const timeElapsed = Date.now() - sessionEndTime;
          
          if (timeElapsed >= this.config.paymentDelayHours * 60 * 60 * 1000) {
            // Get available payment amount
            const availablePayment = await contract.getAvailablePayment(sessionId);
            
            if (availablePayment > 0) {
              const pendingPayment: PendingPayment = {
                sessionId: sessionDetails.sessionId,
                mentorAddress: sessionDetails.mentor,
                studentAddress: sessionDetails.student,
                amount: availablePayment,
                fullAmount: sessionDetails.totalAmount,
                percentageCompleted: this.calculateCompletionPercentage(sessionDetails),
                tokenAddress: sessionDetails.paymentToken,
                chainId: trackedSession.chainId,
                completedAt: Math.floor(sessionEndTime / 1000),
                actualDuration: sessionDetails.sessionDuration, // V7 tracks this automatically
                scheduledDuration: sessionDetails.sessionDuration,
                manualConfirmationDeadline: Math.floor(sessionEndTime / 1000) + (24 * 60 * 60)
              };
              
              allPendingPayments.push(pendingPayment);
              console.log(`[DailyPaymentBot] Found pending payment: Session ${sessionId} (${ethers.formatEther(availablePayment)} tokens)`);
              
              // Mark session as having pending payment
              trackedSession.completedButNotReleased = true;
            }
          } else {
            console.log(`[DailyPaymentBot] Session ${sessionId} completed but waiting for delay period (${Math.round(timeElapsed / 60000)} min elapsed)`);
          }
        } else {
          // Update tracked session status
          trackedSession.status = sessionDetails.status;
          trackedSession.lastChecked = Date.now();
          
          // If session is no longer active, stop tracking it
          if (!sessionDetails.isActive) {
            trackedSession.isTracked = false;
            console.log(`[DailyPaymentBot] Session ${sessionId} is no longer active, stopped tracking`);
          }
        }
        
      } catch (error) {
        console.error(`[DailyPaymentBot] Error checking session ${sessionId}:`, error);
        // Don't remove from tracking on temporary errors
      }
    }

    // Save updated session tracker
    await this.saveSessionTracker();

    console.log(`[DailyPaymentBot] V7 scan completed. Found ${allPendingPayments.length} pending payments`);
    return allPendingPayments;
  }

  /**
   * Organize payments into batches by chain for efficient processing
   */
  private organizeBatches(payments: PendingPayment[]): PaymentBatch[] {
    const batchMap = new Map<number, PendingPayment[]>();
    
    // Group by chain
    payments.forEach(payment => {
      if (!batchMap.has(payment.chainId)) {
        batchMap.set(payment.chainId, []);
      }
      batchMap.get(payment.chainId)!.push(payment);
    });

    // Create batches with priorities
    const batches: PaymentBatch[] = [];
    for (const [chainId, chainPayments] of batchMap) {
      const batch: PaymentBatch = {
        chainId,
        payments: chainPayments,
        estimatedGas: this.config.gasLimits[chainId] || BigInt(500000),
        priority: this.determinePriority(chainPayments)
      };
      batches.push(batch);
    }

    // Sort by priority (high first)
    return batches.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private determinePriority(payments: PendingPayment[]): 'high' | 'medium' | 'low' {
    const totalValue = payments.reduce((sum, p) => sum + p.amount, BigInt(0));
    const oldestPayment = Math.min(...payments.map(p => p.completedAt));
    const hoursSinceOldest = (Date.now() - oldestPayment * 1000) / (1000 * 60 * 60);

    if (hoursSinceOldest > 72 || totalValue > ethers.parseUnits('10000', 6)) {
      return 'high';
    } else if (hoursSinceOldest > 48 || totalValue > ethers.parseUnits('1000', 6)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Process automatic payments in batches
   */
  public async processAutomaticPayments(batches: PaymentBatch[]): Promise<PaymentResult[]> {
    const allResults: PaymentResult[] = [];

    for (const batch of batches) {
      console.log(`[DailyPaymentBot] Processing batch for chain ${batch.chainId} with ${batch.payments.length} payments`);
      
      const contract = this.contracts.get(batch.chainId);
      if (!contract) {
        console.error(`[DailyPaymentBot] No contract found for chain ${batch.chainId}`);
        continue;
      }

      for (const payment of batch.payments) {
        const result = await this.processPayment(contract, payment);
        allResults.push(result);
        
        // Add delay between transactions to avoid nonce issues
        await this.delay(2000);
      }
    }

    return allResults;
  }

  private async processPayment(contract: ethers.Contract, payment: PendingPayment): Promise<PaymentResult> {
    const logKey = `${payment.chainId}-${payment.sessionId}`;
    
    try {
      // Check if we've already processed this payment
      const existingLog = this.paymentLogs.get(logKey);
      if (existingLog && existingLog.status === PaymentStatus.COMPLETED) {
        console.log(`[DailyPaymentBot] Payment already processed: ${logKey}`);
        return {
          sessionId: payment.sessionId,
          success: true,
          transactionHash: existingLog.transactionHash,
          timestamp: Date.now(),
          chainId: payment.chainId
        };
      }

      // Update log to processing
      this.paymentLogs.set(logKey, {
        id: logKey,
        sessionId: payment.sessionId,
        status: PaymentStatus.PROCESSING,
        attempts: (existingLog?.attempts || 0) + 1,
        lastAttempt: Date.now(),
        chainId: payment.chainId
      });

      console.log(`[DailyPaymentBot] Processing payment for session ${payment.sessionId} on chain ${payment.chainId}`);
      
      // Estimate gas
      const gasEstimate = await contract.autoCompleteSession.estimateGas(payment.sessionId);
      const gasLimit = gasEstimate + (gasEstimate / BigInt(10)); // Add 10% buffer
      
      // Get current gas price
      const chainConfig = this.chainConfigs.get(payment.chainId);
      const provider = contract.runner?.provider;
      if (!provider) {
        throw new Error(`No provider available for chain ${payment.chainId}`);
      }
      const feeData = await provider.getFeeData();
      
      // Execute transaction
      const tx = await contract.autoCompleteSession(payment.sessionId, {
        gasLimit,
        maxFeePerGas: chainConfig?.maxFeePerGas || feeData.maxFeePerGas,
        maxPriorityFeePerGas: chainConfig?.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas
      });
      
      console.log(`[DailyPaymentBot] Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Update log to completed
        this.paymentLogs.set(logKey, {
          ...this.paymentLogs.get(logKey)!,
          status: PaymentStatus.COMPLETED,
          transactionHash: tx.hash
        });
        
        console.log(`[DailyPaymentBot] Payment successful: ${tx.hash}`);
        
        // Send Discord notification for successful payment
        if (this.discordNotifier.isEnabled()) {
          const chainConfig = this.chainConfigs.get(payment.chainId);
          this.discordNotifier.notifyPaymentSuccess(
            payment.sessionId,
            payment.mentorAddress,
            payment.amount,
            'USDC', // TODO: Get actual token symbol
            chainConfig?.name || `Chain ${payment.chainId}`,
            tx.hash
          ).catch(error => {
            console.error('[DailyPaymentBot] Failed to send payment notification:', error);
          });
        }
        
        return {
          sessionId: payment.sessionId,
          success: true,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed,
          timestamp: Date.now(),
          chainId: payment.chainId
        };
      } else {
        throw new Error('Transaction failed');
      }
      
    } catch (error) {
      console.error(`[DailyPaymentBot] Payment failed for session ${payment.sessionId}:`, error);
      
      // Update log to failed
      const existingLog = this.paymentLogs.get(logKey);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.paymentLogs.set(logKey, {
        ...existingLog!,
        status: PaymentStatus.FAILED,
        error: errorMessage
      });
      
      return {
        sessionId: payment.sessionId,
        success: false,
        error: errorMessage,
        timestamp: Date.now(),
        chainId: payment.chainId
      };
    }
  }

  private updateMetrics(results: PaymentResult[]): void {
    this.metrics.totalProcessed += results.length;
    this.metrics.successfulPayments += results.filter(r => r.success).length;
    this.metrics.failedPayments += results.filter(r => !r.success).length;
    
    results.forEach(result => {
      if (result.gasUsed) {
        this.metrics.totalGasUsed += result.gasUsed;
        
        if (!this.metrics.chainMetrics[result.chainId]) {
          this.metrics.chainMetrics[result.chainId] = {
            processed: 0,
            gasUsed: BigInt(0),
            averageGasPrice: BigInt(0)
          };
        }
        
        this.metrics.chainMetrics[result.chainId].processed++;
        this.metrics.chainMetrics[result.chainId].gasUsed += result.gasUsed;
      }
    });
  }

  public async notifyMentors(successfulPayments: PaymentResult[]): Promise<void> {
    // Implementation would depend on notification system
    // This is a placeholder for the notification logic
    console.log(`[DailyPaymentBot] Sending notifications for ${successfulPayments.length} successful payments`);
    
    for (const payment of successfulPayments) {
      try {
        // Here you would integrate with your notification service
        // Example: email, push notifications, Discord webhooks, etc.
        console.log(`[DailyPaymentBot] Notification sent for session ${payment.sessionId}`);
      } catch (error) {
        console.error(`[DailyPaymentBot] Failed to send notification for session ${payment.sessionId}:`, error);
      }
    }
  }

  public async logPaymentActivity(results: PaymentResult[]): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results.map(r => ({
        sessionId: r.sessionId,
        success: r.success,
        chainId: r.chainId,
        transactionHash: r.transactionHash,
        error: r.error
      }))
    };
    
    // Log to console and persistent storage
    console.log('[DailyPaymentBot] Payment Activity Log:', JSON.stringify(logEntry, null, 2));
    
    // Here you would save to your logging system
    // Example: database, file system, external logging service
  }

  private async sendAlert(subject: string, error: any): Promise<void> {
    console.error(`[DailyPaymentBot] ALERT - ${subject}:`, error);
    // Implementation would send alerts to administrators
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Admin controls
  public pause(): void {
    this.isPaused = true;
    console.log('[DailyPaymentBot] Bot paused');
  }

  public resume(): void {
    this.isPaused = false;
    console.log('[DailyPaymentBot] Bot resumed');
  }

  public getMetrics(): BotMetrics {
    return { ...this.metrics };
  }

  public getPaymentLogs(): Map<string, PaymentLog> {
    return new Map(this.paymentLogs);
  }

  public isHealthy(): boolean {
    const lastExecution = this.metrics.lastExecutionTime;
    const timeSinceLastExecution = Date.now() - lastExecution;
    const maxTimeBetweenExecutions = 25 * 60 * 60 * 1000; // 25 hours
    
    return timeSinceLastExecution < maxTimeBetweenExecutions && !this.isPaused;
  }

  public startScheduler(): void {
    this.scheduler.start();
  }

  public stopScheduler(): void {
    this.scheduler.stop();
  }

  // V7 Specific Helper Methods

  /**
   * Calculate completion percentage for a session
   */
  private calculateCompletionPercentage(session: ProgressiveSession): number {
    // V7 calculates this automatically based on elapsed time vs duration
    // If the session is completed, it's 100% by definition
    if (session.status === SessionStatus.Completed) {
      return 100;
    }
    
    const now = Date.now() / 1000;
    const elapsed = now - Number(session.startTime) - (session.pausedTime / 1000);
    const scheduledDuration = session.sessionDuration * 60; // Convert minutes to seconds
    
    return Math.min(100, Math.max(0, (elapsed / scheduledDuration) * 100));
  }

  /**
   * Update session tracker from contract events and saved data
   */
  private async updateSessionTracker(): Promise<void> {
    const now = Date.now();
    
    // If we haven't done a full scan recently, we might need to discover new sessions
    // For V7, we'll need to rely on event monitoring or external session tracking
    if (now - this.sessionTracker.lastFullScan > this.sessionTracker.scanInterval) {
      console.log('[DailyPaymentBot] Session tracker needs update - checking for new sessions');
      
      // In a full implementation, this would scan recent contract events
      // For now, we'll just mark that we've done a scan
      this.sessionTracker.lastFullScan = now;
      
      // TODO: Add event monitoring for SessionCreated events to discover new sessions
      // This could be done by scanning recent blocks for SessionCreated events
    }

    // Clean up old inactive sessions
    for (const [sessionId, session] of this.sessionTracker.sessions) {
      // Remove sessions that haven't been checked in 7 days and are not being tracked
      if (!session.isTracked && (now - session.lastChecked) > (7 * 24 * 60 * 60 * 1000)) {
        this.sessionTracker.sessions.delete(sessionId);
        console.log(`[DailyPaymentBot] Removed old session from tracker: ${sessionId}`);
      }
    }
  }

  /**
   * Add a session to the tracker (call this when sessions are created)
   */
  public addSessionToTracker(sessionId: string, chainId: number): void {
    const trackedSession: TrackedSession = {
      sessionId,
      chainId,
      createdAt: Date.now(),
      lastChecked: Date.now(),
      status: SessionStatus.Created,
      isTracked: true,
      completedButNotReleased: false
    };
    
    this.sessionTracker.sessions.set(sessionId, trackedSession);
    console.log(`[DailyPaymentBot] Added session ${sessionId} to tracker`);
    
    // Save immediately
    this.saveSessionTracker().catch(error => {
      console.error('[DailyPaymentBot] Failed to save session tracker:', error);
    });
  }

  /**
   * Load session tracker from file
   */
  private async loadSessionTracker(): Promise<void> {
    const filePath = this.getSessionTrackerPath();
    
    try {
      const data = await this.fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Reconstruct the Map from saved data
      this.sessionTracker = {
        sessions: new Map(parsed.sessions || []),
        lastFullScan: parsed.lastFullScan || 0,
        scanInterval: parsed.scanInterval || (6 * 60 * 60 * 1000)
      };
      
      console.log(`[DailyPaymentBot] Loaded ${this.sessionTracker.sessions.size} sessions from tracker`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error('[DailyPaymentBot] Error loading session tracker:', error);
      }
      // File doesn't exist or is corrupted, start fresh
    }
  }

  /**
   * Save session tracker to file
   */
  private async saveSessionTracker(): Promise<void> {
    const filePath = this.getSessionTrackerPath();
    
    try {
      const dataToSave = {
        sessions: Array.from(this.sessionTracker.sessions.entries()),
        lastFullScan: this.sessionTracker.lastFullScan,
        scanInterval: this.sessionTracker.scanInterval,
        savedAt: new Date().toISOString()
      };
      
      await this.fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      console.error('[DailyPaymentBot] Failed to save session tracker:', error);
    }
  }

  /**
   * Get the path for session tracker storage
   */
  private getSessionTrackerPath(): string {
    return this.config.sessionIdStorage || './data/session-tracker.json';
  }

  /**
   * Get session tracker status for monitoring
   */
  public getSessionTrackerStatus(): any {
    return {
      totalSessions: this.sessionTracker.sessions.size,
      activeSessions: Array.from(this.sessionTracker.sessions.values()).filter(s => s.isTracked).length,
      pendingSessions: Array.from(this.sessionTracker.sessions.values()).filter(s => s.completedButNotReleased).length,
      lastFullScan: new Date(this.sessionTracker.lastFullScan).toISOString(),
      nextFullScan: new Date(this.sessionTracker.lastFullScan + this.sessionTracker.scanInterval).toISOString()
    };
  }
}