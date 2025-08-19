import { ethers } from 'ethers';
import { 
  BotConfig, 
  ChainConfig, 
  SessionStatus,
  ProgressiveSession,
  PaymentResult,
  BotMetrics
} from './types';
import { DiscordNotifier, DiscordWebhookConfig } from './DiscordNotifier';

/**
 * RefundBot - Handles no-show refunds and trapped funds in ProgressiveEscrowV7
 * This bot specifically addresses the fund-trapping bug where sessions
 * get stuck in Created status after the timeout period
 */

const REFUND_ABI = [
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function checkAndExpireSession(bytes32 sessionId) external',
  'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
  'function owner() external view returns (address)',
  'function cancelSession(bytes32 sessionId) external'
];

export class RefundBot {
  private config: BotConfig;
  private chainConfigs: Map<number, ChainConfig>;
  private providers: Map<number, ethers.JsonRpcProvider>;
  private wallets: Map<number, ethers.Wallet>;
  private contracts: Map<number, ethers.Contract>;
  private metrics: BotMetrics;
  private discordNotifier: DiscordNotifier;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  constructor(config: BotConfig, chainConfigs: ChainConfig[]) {
    this.config = config;
    this.chainConfigs = new Map();
    this.providers = new Map();
    this.wallets = new Map();
    this.contracts = new Map();
    
    // Initialize Discord notifier
    const discordConfig: DiscordWebhookConfig = {
      webhookUrl: process.env.REFUND_DISCORD_WEBHOOK_URL || process.env.BOT_DISCORD_WEBHOOK_URL || '',
      username: 'Chain Academy Refund Bot',
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

    console.log(`[RefundBot] Initialized with ${chainConfigs.length} chains`);
  }

  private setupChain(chainConfig: ChainConfig): void {
    try {
      // Setup provider
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      this.providers.set(chainConfig.chainId, provider);

      // Setup wallet
      const privateKey = process.env.REFUND_BOT_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('REFUND_BOT_PRIVATE_KEY environment variable not set');
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      this.wallets.set(chainConfig.chainId, wallet);

      // Setup contract
      const contract = new ethers.Contract(
        chainConfig.contractAddress,
        REFUND_ABI,
        wallet
      );
      this.contracts.set(chainConfig.chainId, contract);

      // Initialize chain metrics
      this.metrics.chainMetrics[chainConfig.chainId] = {
        processed: 0,
        gasUsed: BigInt(0),
        averageGasPrice: BigInt(0)
      };

      console.log(`[RefundBot] Setup chain ${chainConfig.name} (${chainConfig.chainId})`);
    } catch (error) {
      console.error(`[RefundBot] Failed to setup chain ${chainConfig.chainId}:`, error);
      throw error;
    }
  }

  /**
   * Main execution function - processes refunds for no-show and trapped sessions
   */
  public async executeRefundCheck(): Promise<void> {
    if (this.isRunning) {
      console.log('[RefundBot] Already running, skipping execution');
      return;
    }

    if (this.isPaused) {
      console.log('[RefundBot] Bot is paused, skipping execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[RefundBot] Starting refund check execution...');
      
      // Process refunds across all chains
      const results: PaymentResult[] = [];
      
      for (const [chainId, contract] of this.contracts) {
        console.log(`[RefundBot] Processing refunds on chain ${chainId}`);
        const chainResults = await this.processChainRefunds(chainId, contract);
        results.push(...chainResults);
      }
      
      // Update metrics
      this.updateMetrics(results);
      
      // Send notifications
      if (results.length > 0 && this.discordNotifier.isEnabled()) {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        await this.discordNotifier.notifyExecutionSummary(
          results.length,
          successful,
          failed,
          results.reduce((sum, r) => sum + (r.gasUsed || BigInt(0)), BigInt(0)),
          Date.now() - startTime
        );
      }
      
      const executionTime = Date.now() - startTime;
      console.log(`[RefundBot] Refund check completed in ${executionTime}ms`);
      console.log(`[RefundBot] Results: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
      
    } catch (error) {
      console.error('[RefundBot] Refund check execution failed:', error);
      
      if (this.discordNotifier.isEnabled()) {
        await this.discordNotifier.notifyError(
          'Refund Bot Execution Failed',
          (error as Error).message,
          {
            'Execution Time': new Date().toISOString(),
            'Bot Version': this.config.version || '2.0.0'
          }
        );
      }
    } finally {
      this.isRunning = false;
      this.metrics.lastExecutionTime = Date.now();
    }
  }

  /**
   * Process refunds for a specific chain
   */
  private async processChainRefunds(chainId: number, contract: ethers.Contract): Promise<PaymentResult[]> {
    const results: PaymentResult[] = [];
    
    // Since V7 doesn't have getAllActiveSessions, we need to work with tracked sessions
    // For now, we'll focus on processing individual session IDs that are reported as trapped
    
    // TODO: Integrate with the main bot's session tracker
    // const trackedSessions = await this.getTrackedSessions(chainId);
    
    console.log(`[RefundBot] No session enumeration available for chain ${chainId} - waiting for manual session IDs`);
    
    return results;
  }

  /**
   * Process refund for a specific session ID
   */
  public async processSessionRefund(sessionId: string, chainId: number): Promise<PaymentResult> {
    console.log(`[RefundBot] Processing refund for session ${sessionId} on chain ${chainId}`);
    
    const contract = this.contracts.get(chainId);
    if (!contract) {
      throw new Error(`No contract found for chain ${chainId}`);
    }

    try {
      // Get session details
      const session: ProgressiveSession = await contract.getSession(sessionId);
      
      if (session.student === ethers.ZeroAddress) {
        throw new Error('Session not found');
      }

      console.log('Session details:', {
        student: session.student,
        status: session.status,
        createdAt: new Date(Number(session.createdAt) * 1000).toISOString(),
        totalAmount: ethers.formatEther(session.totalAmount),
        releasedAmount: ethers.formatEther(session.releasedAmount)
      });

      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      const refundAmount = session.totalAmount - session.releasedAmount;

      // Check if refund is needed
      if (refundAmount <= 0) {
        console.log('[RefundBot] No funds to refund');
        return {
          sessionId,
          success: true,
          timestamp: Date.now(),
          chainId,
          error: 'No refund needed - already processed'
        };
      }

      // Determine refund strategy based on session state
      return await this.executeRefundStrategy(sessionId, session, timeSinceCreated, refundAmount, contract, chainId);

    } catch (error) {
      console.error(`[RefundBot] Failed to process refund for session ${sessionId}:`, error);
      return {
        sessionId,
        success: false,
        error: (error as Error).message,
        timestamp: Date.now(),
        chainId
      };
    }
  }

  /**
   * Execute appropriate refund strategy based on session state
   */
  private async executeRefundStrategy(
    sessionId: string, 
    session: ProgressiveSession, 
    timeSinceCreated: number, 
    refundAmount: bigint,
    contract: ethers.Contract,
    chainId: number
  ): Promise<PaymentResult> {
    
    const SESSION_START_TIMEOUT = 15 * 60; // 15 minutes
    const EMERGENCY_THRESHOLD = 60 * 60; // 1 hour
    
    console.log(`[RefundBot] Session analysis: Status=${session.status}, TimeSinceCreated=${Math.floor(timeSinceCreated/60)}min`);

    // Strategy 1: Try normal expiry function for Created sessions
    if (session.status === SessionStatus.Created && timeSinceCreated > SESSION_START_TIMEOUT) {
      console.log('[RefundBot] Attempting normal session expiry...');
      try {
        const tx = await contract.checkAndExpireSession(sessionId, {
          gasLimit: 200000
        });
        
        console.log(`[RefundBot] Expiry transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log('[RefundBot] Normal expiry successful');
          
          if (this.discordNotifier.isEnabled()) {
            await this.discordNotifier.notifyRefundProcessed(
              sessionId,
              session.student,
              refundAmount,
              session.paymentToken === ethers.ZeroAddress ? 'ETH' : 'TOKEN',
              this.getChainName(chainId),
              tx.hash,
              'No-show session expired'
            );
          }
          
          return {
            sessionId,
            success: true,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed,
            timestamp: Date.now(),
            chainId
          };
        }
      } catch (expireError) {
        console.log(`[RefundBot] Normal expiry failed: ${(expireError as Error).message}`);
        console.log('[RefundBot] This indicates the fund-trapping bug - proceeding to emergency refund');
      }
    }

    // Strategy 2: Emergency release for trapped funds
    if (timeSinceCreated > EMERGENCY_THRESHOLD) {
      console.log('[RefundBot] Executing emergency refund for trapped funds...');
      
      try {
        // Check if we have owner permissions
        const owner = await contract.owner();
        const ourAddress = await contract.runner?.getAddress();
        
        if (!ourAddress || owner.toLowerCase() !== ourAddress.toLowerCase()) {
          throw new Error(`Not contract owner. Owner: ${owner}, Our address: ${ourAddress}`);
        }

        const tx = await contract.emergencyRelease(
          sessionId,
          session.student,
          refundAmount,
          `Emergency refund: No-show session trapped for ${Math.floor(timeSinceCreated/3600)} hours`,
          {
            gasLimit: 250000
          }
        );
        
        console.log(`[RefundBot] Emergency refund transaction: ${tx.hash}`);
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log('[RefundBot] Emergency refund successful');
          
          if (this.discordNotifier.isEnabled()) {
            await this.discordNotifier.notifyRefundProcessed(
              sessionId,
              session.student,
              refundAmount,
              session.paymentToken === ethers.ZeroAddress ? 'ETH' : 'TOKEN',
              this.getChainName(chainId),
              tx.hash,
              'Emergency refund for trapped funds'
            );
          }
          
          return {
            sessionId,
            success: true,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed,
            timestamp: Date.now(),
            chainId
          };
        }
      } catch (emergencyError) {
        console.error(`[RefundBot] Emergency refund failed: ${(emergencyError as Error).message}`);
      }
    }

    // Strategy 3: Cancel session if possible (Created status only)
    if (session.status === SessionStatus.Created) {
      console.log('[RefundBot] Attempting session cancellation...');
      try {
        // Note: cancelSession requires participant to call it
        // This won't work from bot unless bot is student/mentor
        // Leaving this for completeness but it likely won't work
        const tx = await contract.cancelSession(sessionId, {
          gasLimit: 200000
        });
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          console.log('[RefundBot] Session cancellation successful');
          return {
            sessionId,
            success: true,
            transactionHash: tx.hash,
            gasUsed: receipt.gasUsed,
            timestamp: Date.now(),
            chainId
          };
        }
      } catch (cancelError) {
        console.log(`[RefundBot] Session cancellation failed: ${(cancelError as Error).message}`);
      }
    }

    // If all strategies fail
    throw new Error(`All refund strategies failed for session ${sessionId}. Manual intervention required.`);
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

  private getChainName(chainId: number): string {
    const names: Record<number, string> = {
      8453: 'Base',
      10: 'Optimism',
      42161: 'Arbitrum',
      137: 'Polygon'
    };
    return names[chainId] || `Chain ${chainId}`;
  }

  // Public interface methods
  public pause(): void {
    this.isPaused = true;
    console.log('[RefundBot] Bot paused');
  }

  public resume(): void {
    this.isPaused = false;
    console.log('[RefundBot] Bot resumed');
  }

  public getMetrics(): BotMetrics {
    return { ...this.metrics };
  }

  public isHealthy(): boolean {
    const lastExecution = this.metrics.lastExecutionTime;
    const timeSinceLastExecution = Date.now() - lastExecution;
    const maxTimeBetweenExecutions = 25 * 60 * 60 * 1000; // 25 hours
    
    return timeSinceLastExecution < maxTimeBetweenExecutions && !this.isPaused;
  }

  /**
   * Manual trigger for specific session refund
   */
  public async triggerRefund(sessionId: string, chainId: number): Promise<PaymentResult> {
    console.log(`[RefundBot] Manual refund trigger for session ${sessionId} on chain ${chainId}`);
    return await this.processSessionRefund(sessionId, chainId);
  }
}