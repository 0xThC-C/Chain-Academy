import { ethers } from 'ethers';
import { 
  PendingPayment, 
  PaymentResult, 
  BotConfig, 
  ChainConfig, 
  PaymentBatch,
  PaymentStatus,
  PaymentLog,
  BotMetrics
} from './types';
import { PaymentScheduler } from './PaymentScheduler';

// Progressive Escrow V4 ABI for autoCompleteSession
const ESCROW_ABI = [
  'function autoCompleteSession(uint256 sessionId) external',
  'function getSessionDetails(uint256 sessionId) external view returns (tuple(address mentor, address student, uint256 amount, address token, uint8 status, uint256 completedAt, bool manuallyConfirmed))',
  'function getAllActiveSessions() external view returns (uint256[])',
  'event SessionAutoCompleted(uint256 indexed sessionId, address indexed mentor, uint256 amount)'
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

  constructor(config: BotConfig, chainConfigs: ChainConfig[]) {
    this.config = config;
    this.chainConfigs = new Map();
    this.providers = new Map();
    this.wallets = new Map();
    this.contracts = new Map();
    this.paymentLogs = new Map();
    this.scheduler = new PaymentScheduler(this);
    
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

    console.log(`[DailyPaymentBot] Initialized with ${chainConfigs.length} chains`);
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
      
    } catch (error) {
      console.error('[DailyPaymentBot] Daily execution failed:', error);
      // Send alert to admin
      await this.sendAlert('Daily execution failed', error);
    } finally {
      this.isRunning = false;
      this.metrics.lastExecutionTime = Date.now();
    }
  }

  /**
   * Scan all chains for sessions that need automatic payment
   */
  public async scanPendingPayments(): Promise<PendingPayment[]> {
    const allPendingPayments: PendingPayment[] = [];
    const cutoffTime = Date.now() - (this.config.paymentDelayHours * 60 * 60 * 1000);

    for (const [chainId, contract] of this.contracts) {
      try {
        console.log(`[DailyPaymentBot] Scanning chain ${chainId}...`);
        
        // Get all active sessions from the contract
        const sessionIds = await contract.getAllActiveSessions();
        console.log(`[DailyPaymentBot] Found ${sessionIds.length} active sessions on chain ${chainId}`);

        for (const sessionId of sessionIds) {
          try {
            // Get session details
            const sessionDetails = await contract.getSessionDetails(sessionId);
            
            // Check if session is completed but not manually confirmed
            if (sessionDetails.status === 2 && // COMPLETED status
                !sessionDetails.manuallyConfirmed &&
                Number(sessionDetails.completedAt) * 1000 < cutoffTime) {
              
              // Calculate proportional payment based on actual session time
              const actualDuration = sessionDetails.actualDuration || 60; // Default 60 minutes
              const scheduledDuration = sessionDetails.scheduledDuration || 60;
              const percentageCompleted = Math.min(100, (actualDuration / scheduledDuration) * 100);
              const proportionalAmount = (sessionDetails.amount * BigInt(Math.round(percentageCompleted))) / BigInt(100);

              const pendingPayment: PendingPayment = {
                sessionId: sessionId.toString(),
                mentorAddress: sessionDetails.mentor,
                studentAddress: sessionDetails.student,
                amount: proportionalAmount, // Proportional to actual session time
                fullAmount: sessionDetails.amount, // Original full amount
                percentageCompleted: Math.round(percentageCompleted),
                tokenAddress: sessionDetails.token,
                chainId: chainId,
                completedAt: Number(sessionDetails.completedAt),
                actualDuration,
                scheduledDuration,
                manualConfirmationDeadline: Number(sessionDetails.completedAt) + (24 * 60 * 60) // 24h from completion
              };
              
              allPendingPayments.push(pendingPayment);
              console.log(`[DailyPaymentBot] Found pending payment: Session ${sessionId} on chain ${chainId}`);
            }
          } catch (error) {
            console.error(`[DailyPaymentBot] Error checking session ${sessionId} on chain ${chainId}:`, error);
          }
        }
      } catch (error) {
        console.error(`[DailyPaymentBot] Error scanning chain ${chainId}:`, error);
      }
    }

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
}