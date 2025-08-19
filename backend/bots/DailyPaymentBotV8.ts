/**
 * DailyPaymentBotV8 - Enhanced Chain Academy Payment Bot for V8 Contracts
 * 
 * FEATURES:
 * - ✅ Fixed V7 bugs (enum mismatch, BigInt serialization)
 * - 🆕 V8 contract support with multiple refund pathways
 * - 🆕 Enhanced dispute handling and auto-recovery
 * - 🆕 Comprehensive session health monitoring
 * - 🆕 Multi-strategy processing with fallbacks
 * - 🆕 Real-time Discord notifications with analytics
 * - 🆕 Dual V7/V8 support during migration
 */

import { ethers } from 'ethers';
import cron from 'node-cron';
import { 
  BotConfigV8, 
  ChainConfigV8, 
  PendingPaymentV8, 
  SessionStatus, 
  RefundType,
  ProgressiveSessionV8,
  SessionHealthInfo,
  ProcessingStrategy,
  ProcessingMethod,
  BotMetricsV8,
  SessionEventV8,
  SessionEventType
} from './V8Types';
import { DiscordNotifier } from './DiscordNotifier';
import { SessionTracker } from './SessionTracker';

export class DailyPaymentBotV8 {
  private config: BotConfigV8;
  private chainConfigs: ChainConfigV8[];
  private discord: DiscordNotifier;
  private sessionTracker: SessionTracker;
  private isRunning: boolean = false;
  private metrics: BotMetricsV8;
  private cronJob?: cron.ScheduledTask;

  // V8: Enhanced ABI with all new functions
  private readonly V8_ABI = [
    // Core V8 functions
    'function getSessionV8(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 createdAt, uint256 startTime, uint256 lastHeartbeat, uint256 effectivePausedTime, uint256 lastActivityTime, uint8 status, bool isActive, bool isPaused, bool surveyCompleted, uint256 stateTransitionCount, uint256 lastStateChange, bool emergencyLocked, uint8 disputeReason, uint256 disputeCreatedAt, address disputeInitiator, bool arbitrationRequired, uint256 recoveryAttempts, uint256 lastRecoveryAttempt, bool autoRecoveryEnabled))',
    'function getAvailablePayment(bytes32 sessionId) external view returns (uint256)',
    'function checkSessionHealth(bytes32 sessionId) external view returns (bool healthy, string memory details)',
    
    // V8: Multiple processing methods
    'function autoCompleteSession(bytes32 sessionId) external',
    'function processNoShowRefund(bytes32 sessionId) external',
    'function processPartialRefund(bytes32 sessionId, uint256 completionPercentage) external',
    'function processEmergencyRefund(bytes32 sessionId, string calldata reason) external',
    'function executeAutoRecovery(bytes32 sessionId) external',
    
    // V8: Enhanced monitoring
    'function version() external pure returns (string memory)',
    'function getContractFeatures() external pure returns (string[] memory)',
    
    // V8: Events for monitoring
    'event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 totalAmount, address paymentToken, uint256 sessionDuration, uint256 scheduledTime)',
    'event SessionStateChanged(bytes32 indexed sessionId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)',
    'event DisputeRaised(bytes32 indexed sessionId, address indexed initiator, uint8 reason, uint256 timestamp)',
    'event AutoRecoveryExecuted(bytes32 indexed sessionId, string recoveryAction, uint256 timestamp)',
    'event RefundProcessed(bytes32 indexed sessionId, address recipient, uint256 amount, uint8 refundType)',
    'event SessionHealthCheck(bytes32 indexed sessionId, bool healthy, string details)'
  ];

  // V7 Compatibility ABI (for dual support)
  private readonly V7_ABI = [
    'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint8 status, bool isActive, bool surveyCompleted))',
    'function getAvailablePayment(bytes32 sessionId) external view returns (uint256)',
    'function autoCompleteSession(bytes32 sessionId) external'
  ];

  constructor(config: BotConfigV8, chainConfigs: ChainConfigV8[]) {
    this.config = config;
    this.chainConfigs = chainConfigs;
    this.discord = new DiscordNotifier({
      webhookUrl: config.discordWebhookUrl,
      username: 'Chain Academy V8 Bot',
      retryAttempts: 3,
      retryDelay: 1000,
      enabled: config.enableDiscordNotifications
    });
    this.sessionTracker = new SessionTracker(config.sessionStoragePath || './data/session-tracker-v8.json');
    
    this.initializeMetrics();
    this.logBotInitialization();
  }

  // ============ INITIALIZATION ============

  private initializeMetrics(): void {
    this.metrics = {
      // Base metrics
      totalProcessed: 0,
      successfulPayments: 0,
      failedPayments: 0,
      totalAmountProcessed: BigInt(0),
      lastExecutionTime: 0,
      errors: [],
      
      // V8 specific metrics
      v8Metrics: {
        sessionsProcessedV8: 0,
        disputesHandled: 0,
        autoRecoveriesExecuted: 0,
        emergencyActionsTriggered: 0,
        healthChecksPerformed: 0,
        averageProcessingTime: 0,
        successRateByMethod: {}
      },
      
      // Enhanced error tracking
      errorMetrics: {
        bigIntSerializationErrors: 0,
        rpcTimeouts: 0,
        gasEstimationFailures: 0,
        contractReverts: 0,
        networkErrors: 0
      },
      
      // Performance metrics
      performance: {
        averageBlockTime: 0,
        transactionThroughput: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
  }

  private logBotInitialization(): void {
    console.log(`[DailyPaymentBotV8] Initialized with ${this.chainConfigs.length} chains`);
    console.log(`[DailyPaymentBotV8] V8 Features Enabled:`, this.config.v8Features);
    console.log(`[DailyPaymentBotV8] Migration Mode: ${this.chainConfigs[0]?.migrationMode || 'v8-only'}`);
  }

  // ============ V8 ENHANCED SESSION SCANNING ============

  public async scanPendingPayments(): Promise<PendingPaymentV8[]> {
    const allPendingPayments: PendingPaymentV8[] = [];
    
    console.log('[DailyPaymentBotV8] Starting enhanced V8 session scan...');
    
    for (const chainConfig of this.chainConfigs) {
      try {
        const chainPayments = await this.scanChainV8(chainConfig);
        allPendingPayments.push(...chainPayments);
      } catch (error) {
        console.error(`[DailyPaymentBotV8] Error scanning chain ${chainConfig.name}:`, error);
        this.metrics.errorMetrics.networkErrors++;
        await this.discord.notifyError(
          `Chain scanning error on ${chainConfig.name}`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    console.log(`[DailyPaymentBotV8] Found ${allPendingPayments.length} pending payments across all chains`);
    return allPendingPayments;
  }

  private async scanChainV8(chainConfig: ChainConfigV8): Promise<PendingPaymentV8[]> {
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const pendingPayments: PendingPaymentV8[] = [];

    // V8: Support dual mode during migration
    if (chainConfig.migrationMode === 'dual-support') {
      const v7Payments = await this.scanV7Sessions(chainConfig, provider);
      const v8Payments = await this.scanV8Sessions(chainConfig, provider);
      pendingPayments.push(...v7Payments, ...v8Payments);
    } else if (chainConfig.migrationMode === 'v8-only' && chainConfig.v8Enabled) {
      const v8Payments = await this.scanV8Sessions(chainConfig, provider);
      pendingPayments.push(...v8Payments);
    } else {
      const v7Payments = await this.scanV7Sessions(chainConfig, provider);
      pendingPayments.push(...v7Payments);
    }

    return pendingPayments;
  }

  private async scanV8Sessions(chainConfig: ChainConfigV8, provider: ethers.Provider): Promise<PendingPaymentV8[]> {
    const contract = new ethers.Contract(chainConfig.contractAddressV8, this.V8_ABI, provider);
    const pendingPayments: PendingPaymentV8[] = [];

    console.log(`[DailyPaymentBotV8] Scanning V8 sessions on ${chainConfig.name}`);

    // V8: Enhanced session discovery
    await this.updateSessionTrackerV8(chainConfig, contract);

    for (const [sessionId, trackedSession] of this.sessionTracker.sessions) {
      if (trackedSession.chainId !== chainConfig.chainId) continue;

      try {
        const sessionData = await this.getSessionDataV8(contract, sessionId);
        if (!sessionData) continue;

        const healthInfo = await this.checkSessionHealthV8(contract, sessionId);
        const processingStrategy = this.determineProcessingStrategyV8(sessionData, healthInfo);

        if (processingStrategy.primary.method !== 'none') {
          const pendingPayment: PendingPaymentV8 = {
            sessionId,
            chainId: chainConfig.chainId,
            chainName: chainConfig.name,
            amount: sessionData.totalAmount - sessionData.releasedAmount,
            sessionType: 'v8',
            healthStatus: healthInfo,
            processingStrategy,
            refundType: this.determineRefundType(sessionData, healthInfo)
          };

          pendingPayments.push(pendingPayment);
        }

      } catch (error) {
        console.error(`[DailyPaymentBotV8] Error processing session ${sessionId}:`, error);
        this.metrics.errorMetrics.contractReverts++;
      }
    }

    return pendingPayments;
  }

  private async scanV7Sessions(chainConfig: ChainConfigV8, provider: ethers.Provider): Promise<PendingPaymentV8[]> {
    // V7 compatibility scanning (simplified for migration support)
    const contract = new ethers.Contract(chainConfig.contractAddress, this.V7_ABI, provider);
    const pendingPayments: PendingPaymentV8[] = [];

    console.log(`[DailyPaymentBotV8] Scanning V7 sessions on ${chainConfig.name} (compatibility mode)`);

    for (const [sessionId, trackedSession] of this.sessionTracker.sessions) {
      if (trackedSession.chainId !== chainConfig.chainId) continue;

      try {
        const sessionData = await contract.getSession(sessionId);
        const availablePayment = await contract.getAvailablePayment(sessionId);

        if (Number(availablePayment) > 0) {
          const pendingPayment: PendingPaymentV8 = {
            sessionId,
            chainId: chainConfig.chainId,
            chainName: chainConfig.name,
            amount: availablePayment,
            sessionType: 'v7',
            healthStatus: {
              healthy: true,
              details: 'V7 session',
              sessionId,
              lastChecked: Date.now(),
              issues: [],
              recoveryRecommended: false
            },
            processingStrategy: {
              primary: {
                method: 'autoComplete',
                functionName: 'autoCompleteSession',
                parameters: [sessionId],
                gasLimit: BigInt(200000),
                description: 'V7 auto-complete'
              },
              fallbacks: [],
              requiresAdmin: false,
              estimated: {
                successRate: 0.95,
                processingTime: 30000,
                gasEstimate: BigInt(150000)
              }
            }
          };

          pendingPayments.push(pendingPayment);
        }

      } catch (error) {
        console.error(`[DailyPaymentBotV8] Error processing V7 session ${sessionId}:`, error);
      }
    }

    return pendingPayments;
  }

  // ============ V8 SESSION DATA & HEALTH ============

  private async getSessionDataV8(contract: ethers.Contract, sessionId: string): Promise<ProgressiveSessionV8 | null> {
    try {
      const sessionData = await contract.getSessionV8(sessionId);
      
      // V8: Parse the enhanced session structure
      return {
        sessionId: sessionData.sessionId,
        student: sessionData.student,
        mentor: sessionData.mentor,
        paymentToken: sessionData.paymentToken,
        totalAmount: sessionData.totalAmount,
        releasedAmount: sessionData.releasedAmount,
        sessionDuration: Number(sessionData.sessionDuration),
        createdAt: Number(sessionData.createdAt),
        startTime: Number(sessionData.startTime),
        lastHeartbeat: Number(sessionData.lastHeartbeat),
        effectivePausedTime: Number(sessionData.effectivePausedTime),
        lastActivityTime: Number(sessionData.lastActivityTime),
        status: Number(sessionData.status) as SessionStatus,
        isActive: sessionData.isActive,
        isPaused: sessionData.isPaused,
        surveyCompleted: sessionData.surveyCompleted,
        stateTransitionCount: Number(sessionData.stateTransitionCount),
        lastStateChange: Number(sessionData.lastStateChange),
        emergencyLocked: sessionData.emergencyLocked,
        disputeReason: Number(sessionData.disputeReason),
        disputeCreatedAt: Number(sessionData.disputeCreatedAt),
        disputeInitiator: sessionData.disputeInitiator,
        arbitrationRequired: sessionData.arbitrationRequired,
        recoveryAttempts: Number(sessionData.recoveryAttempts),
        lastRecoveryAttempt: Number(sessionData.lastRecoveryAttempt),
        autoRecoveryEnabled: sessionData.autoRecoveryEnabled
      };

    } catch (error) {
      console.error(`[DailyPaymentBotV8] Error getting V8 session data:`, error);
      return null;
    }
  }

  private async checkSessionHealthV8(contract: ethers.Contract, sessionId: string): Promise<SessionHealthInfo> {
    try {
      const healthResult = await contract.checkSessionHealth(sessionId);
      this.metrics.v8Metrics.healthChecksPerformed++;
      
      return {
        healthy: healthResult.healthy,
        details: healthResult.details,
        sessionId,
        lastChecked: Date.now(),
        issues: healthResult.healthy ? [] : [healthResult.details],
        recoveryRecommended: !healthResult.healthy
      };

    } catch (error) {
      return {
        healthy: false,
        details: 'Health check failed',
        sessionId,
        lastChecked: Date.now(),
        issues: [`Health check error: ${error instanceof Error ? error.message : 'Unknown'}`],
        recoveryRecommended: true
      };
    }
  }

  // ============ V8 PROCESSING STRATEGY ============

  private determineProcessingStrategyV8(sessionData: ProgressiveSessionV8, healthInfo: SessionHealthInfo): ProcessingStrategy {
    const now = Math.floor(Date.now() / 1000);
    const cutoffTime = now - (24 * 60 * 60); // 24 hours ago

    // V8: Determine the best processing method based on session state
    if (sessionData.status === SessionStatus.Created && sessionData.createdAt < cutoffTime) {
      // No-show scenario
      return {
        primary: {
          method: 'processNoShow',
          functionName: 'processNoShowRefund',
          parameters: [sessionData.sessionId],
          gasLimit: BigInt(200000),
          description: 'Process no-show refund'
        },
        fallbacks: [
          {
            method: 'autoComplete',
            functionName: 'autoCompleteSession',
            parameters: [sessionData.sessionId],
            gasLimit: BigInt(200000),
            description: 'Fallback auto-complete'
          }
        ],
        requiresAdmin: false,
        estimated: {
          successRate: 0.98,
          processingTime: 25000,
          gasEstimate: BigInt(180000)
        }
      };
    }

    if (sessionData.status === SessionStatus.Disputed) {
      // Dispute resolution needed
      return {
        primary: {
          method: 'autoComplete',
          functionName: 'autoCompleteSession',
          parameters: [sessionData.sessionId],
          gasLimit: BigInt(250000),
          description: 'Auto-resolve expired dispute'
        },
        fallbacks: [],
        requiresAdmin: true,
        estimated: {
          successRate: 0.90,
          processingTime: 35000,
          gasEstimate: BigInt(220000)
        }
      };
    }

    if (!healthInfo.healthy && sessionData.autoRecoveryEnabled) {
      // Auto-recovery scenario
      return {
        primary: {
          method: 'autoComplete',
          functionName: 'executeAutoRecovery',
          parameters: [sessionData.sessionId],
          gasLimit: BigInt(300000),
          description: 'Execute auto-recovery'
        },
        fallbacks: [
          {
            method: 'processEmergency',
            functionName: 'processEmergencyRefund',
            parameters: [sessionData.sessionId, 'Auto-recovery triggered by bot'],
            gasLimit: BigInt(250000),
            description: 'Emergency refund as fallback'
          }
        ],
        requiresAdmin: false,
        estimated: {
          successRate: 0.85,
          processingTime: 40000,
          gasEstimate: BigInt(280000)
        }
      };
    }

    // Standard processing for completed/active sessions
    if (sessionData.status === SessionStatus.Active || sessionData.status === SessionStatus.Completed) {
      return {
        primary: {
          method: 'autoComplete',
          functionName: 'autoCompleteSession',
          parameters: [sessionData.sessionId],
          gasLimit: BigInt(200000),
          description: 'Standard session completion'
        },
        fallbacks: [],
        requiresAdmin: false,
        estimated: {
          successRate: 0.95,
          processingTime: 30000,
          gasEstimate: BigInt(150000)
        }
      };
    }

    // No processing needed
    return {
      primary: {
        method: 'none',
        functionName: 'none',
        parameters: [],
        gasLimit: BigInt(0),
        description: 'No processing required'
      },
      fallbacks: [],
      requiresAdmin: false,
      estimated: {
        successRate: 1.0,
        processingTime: 0,
        gasEstimate: BigInt(0)
      }
    };
  }

  private determineRefundType(sessionData: ProgressiveSessionV8, healthInfo: SessionHealthInfo): RefundType | undefined {
    if (sessionData.status === SessionStatus.Created && !healthInfo.healthy) {
      return RefundType.NoShow;
    }
    if (sessionData.status === SessionStatus.Disputed) {
      return RefundType.Dispute;
    }
    if (!healthInfo.healthy) {
      return RefundType.Technical;
    }
    return undefined;
  }

  // ============ V8 ENHANCED PROCESSING ============

  public async processPayments(pendingPayments: PendingPaymentV8[]): Promise<void> {
    console.log(`[DailyPaymentBotV8] Processing ${pendingPayments.length} payments with V8 engine`);

    for (const payment of pendingPayments) {
      const startTime = Date.now();
      
      try {
        const success = await this.processPaymentV8(payment);
        
        if (success) {
          this.metrics.successfulPayments++;
          this.metrics.v8Metrics.sessionsProcessedV8++;
          
          // V8: Record success metrics by method
          const method = payment.processingStrategy.primary.method;
          if (!this.metrics.v8Metrics.successRateByMethod[method]) {
            this.metrics.v8Metrics.successRateByMethod[method] = 0;
          }
          this.metrics.v8Metrics.successRateByMethod[method]++;

          // V8: Enhanced Discord notification
          await this.discord.notifyPaymentSuccess(
            payment.sessionId,
            'Processed', // We'll get mentor address from session data
            payment.amount,
            'Unknown', // We'll get token symbol from session data
            payment.chainName,
            'pending' // We'll get actual tx hash after processing
          );

        } else {
          this.metrics.failedPayments++;
          await this.discord.notifyError(
            `Payment processing failed for session ${payment.sessionId}`,
            `Failed to process ${payment.processingStrategy.primary.description}`
          );
        }

        // Update processing time metrics
        const processingTime = Date.now() - startTime;
        this.updateProcessingTimeMetrics(processingTime);

      } catch (error) {
        console.error(`[DailyPaymentBotV8] Error processing payment ${payment.sessionId}:`, error);
        this.metrics.failedPayments++;
        this.recordError(error, payment);
      }
    }

    this.metrics.lastExecutionTime = Date.now();
    await this.sendMetricsReport();
  }

  private async processPaymentV8(payment: PendingPaymentV8): Promise<boolean> {
    const chainConfig = this.chainConfigs.find(c => c.chainId === payment.chainId);
    if (!chainConfig) {
      console.error(`[DailyPaymentBotV8] Chain config not found for ${payment.chainId}`);
      return false;
    }

    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const wallet = new ethers.Wallet(this.config.privateKey, provider);

    // Use appropriate contract and ABI based on session type
    const contractAddress = payment.sessionType === 'v8' ? chainConfig.contractAddressV8 : chainConfig.contractAddress;
    const abi = payment.sessionType === 'v8' ? this.V8_ABI : this.V7_ABI;
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const strategy = payment.processingStrategy;

    // Try primary method first
    let success = await this.tryProcessingMethod(contract, strategy.primary, payment);
    
    // Try fallback methods if primary fails
    if (!success && strategy.fallbacks.length > 0) {
      for (const fallback of strategy.fallbacks) {
        console.log(`[DailyPaymentBotV8] Trying fallback method: ${fallback.description}`);
        success = await this.tryProcessingMethod(contract, fallback, payment);
        if (success) break;
      }
    }

    return success;
  }

  private async tryProcessingMethod(contract: ethers.Contract, method: ProcessingMethod, payment: PendingPaymentV8): Promise<boolean> {
    try {
      if (method.functionName === 'none') return true;

      console.log(`[DailyPaymentBotV8] Executing ${method.description} for session ${payment.sessionId}`);

      // V8: Enhanced transaction with proper gas estimation
      const gasEstimate = await contract[method.functionName].estimateGas(...method.parameters);
      const gasLimit = gasEstimate + BigInt(50000); // Add buffer

      const tx = await contract[method.functionName](...method.parameters, {
        gasLimit: gasLimit
      });

      console.log(`[DailyPaymentBotV8] Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`[DailyPaymentBotV8] Transaction confirmed in block ${receipt.blockNumber}`);
      return true;

    } catch (error: any) {
      console.error(`[DailyPaymentBotV8] Method ${method.functionName} failed:`, error.reason || error.message);
      
      // V8: Enhanced error classification
      if (error.reason) {
        if (error.reason.includes('Not eligible')) {
          this.metrics.errorMetrics.contractReverts++;
        } else if (error.reason.includes('gas')) {
          this.metrics.errorMetrics.gasEstimationFailures++;
        }
      } else if (error.message?.includes('timeout')) {
        this.metrics.errorMetrics.rpcTimeouts++;
      }

      return false;
    }
  }

  // ============ V8 SESSION TRACKER UPDATES ============

  private async updateSessionTrackerV8(chainConfig: ChainConfigV8, contract: ethers.Contract): Promise<void> {
    try {
      // V8: Enhanced session discovery using events
      const currentBlock = await contract.provider.getBlockNumber();
      const fromBlock = Math.max(currentBlock - 10000, 0);

      const sessionCreatedFilter = contract.filters.SessionCreated();
      const events = await contract.queryFilter(sessionCreatedFilter, fromBlock, currentBlock);

      for (const event of events) {
        if ('args' in event && event.args) {
          const sessionId = event.args[0];
          const trackedSession = {
            sessionId: sessionId,
            chainId: chainConfig.chainId,
            createdAt: Date.now(),
            lastChecked: Date.now(),
            status: SessionStatus.Created,
            isTracked: true,
            completedButNotReleased: false
          };

          this.sessionTracker.addSession(sessionId, trackedSession);
        }
      }

      await this.sessionTracker.save();

    } catch (error) {
      console.error(`[DailyPaymentBotV8] Error updating session tracker:`, error);
    }
  }

  // ============ V8 METRICS & REPORTING ============

  private updateProcessingTimeMetrics(processingTime: number): void {
    const currentAvg = this.metrics.v8Metrics.averageProcessingTime;
    const processed = this.metrics.v8Metrics.sessionsProcessedV8;
    
    this.metrics.v8Metrics.averageProcessingTime = 
      ((currentAvg * (processed - 1)) + processingTime) / processed;
  }

  private recordError(error: any, payment: PendingPaymentV8): void {
    // V8: Enhanced error recording with context
    const errorRecord = {
      timestamp: Date.now(),
      sessionId: payment.sessionId,
      chainId: payment.chainId,
      error: error.message || 'Unknown error',
      processingMethod: payment.processingStrategy.primary.method,
      sessionType: payment.sessionType
    };

    this.metrics.errors.push(errorRecord);

    // V8: Classify errors for better tracking
    if (error.message?.includes('BigInt')) {
      this.metrics.errorMetrics.bigIntSerializationErrors++;
    }
  }

  // ============ V8 ENHANCED DISCORD NOTIFICATIONS ============

  private async sendMetricsReport(): Promise<void> {
    if (!this.config.enableDiscordNotifications) return;

    const report = {
      botVersion: 'V8',
      timestamp: new Date().toISOString(),
      totalProcessed: this.metrics.totalProcessed,
      successfulPayments: this.metrics.successfulPayments,
      failedPayments: this.metrics.failedPayments,
      v8Metrics: this.metrics.v8Metrics,
      errorSummary: {
        bigIntErrors: this.metrics.errorMetrics.bigIntSerializationErrors,
        rpcTimeouts: this.metrics.errorMetrics.rpcTimeouts,
        contractReverts: this.metrics.errorMetrics.contractReverts
      },
      performance: this.metrics.performance
    };

    await this.discord.notifyExecutionSummary(
      this.metrics.successfulPayments,
      this.metrics.failedPayments,
      this.metrics.totalAmountProcessed,
      JSON.stringify(report, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2)
    );
  }

  // ============ V8 HEALTH & MONITORING ============

  public isHealthy(): boolean {
    const recentErrors = this.metrics.errors.filter(e => 
      Date.now() - e.timestamp < 60000 // Last minute
    ).length;

    const errorRate = recentErrors / Math.max(this.metrics.totalProcessed, 1);
    const hasRecentExecution = Date.now() - this.metrics.lastExecutionTime < 3600000; // 1 hour

    return errorRate < 0.1 && hasRecentExecution && !this.hasCriticalErrors();
  }

  private hasCriticalErrors(): boolean {
    return this.metrics.errorMetrics.bigIntSerializationErrors > 5 ||
           this.metrics.errorMetrics.rpcTimeouts > 10 ||
           this.metrics.errorMetrics.contractReverts > 20;
  }

  public getMetrics(): BotMetricsV8 {
    // V8: Return metrics with proper BigInt handling
    return {
      ...this.metrics,
      totalAmountProcessed: this.metrics.totalAmountProcessed
    };
  }

  public getHealthInfo(): { healthy: boolean; details: string; issues: string[] } {
    const issues: string[] = [];
    
    if (this.metrics.errorMetrics.bigIntSerializationErrors > 0) {
      issues.push(`${this.metrics.errorMetrics.bigIntSerializationErrors} BigInt serialization errors`);
    }
    
    if (this.metrics.errorMetrics.rpcTimeouts > 5) {
      issues.push(`${this.metrics.errorMetrics.rpcTimeouts} RPC timeouts`);
    }
    
    if (this.metrics.failedPayments > this.metrics.successfulPayments * 0.1) {
      issues.push(`High failure rate: ${this.metrics.failedPayments} failures`);
    }

    const healthy = issues.length === 0;
    
    return {
      healthy,
      details: healthy ? 'Bot V8 operating normally' : `Found ${issues.length} issues`,
      issues
    };
  }

  // ============ V8 EXECUTION CONTROL ============

  public async executeDaily(): Promise<void> {
    if (this.isRunning) {
      console.log('[DailyPaymentBotV8] Execution already in progress');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('[DailyPaymentBotV8] Starting daily execution with V8 engine...');
      
      if (this.config.enableDiscordNotifications) {
        await this.discord.notifyBotStartup('8.0.0', this.chainConfigs.length);
      }

      const pendingPayments = await this.scanPendingPayments();
      
      if (pendingPayments.length > 0) {
        await this.processPayments(pendingPayments);
      } else {
        console.log('[DailyPaymentBotV8] No pending payments found');
      }

      const executionTime = Date.now() - startTime;
      console.log(`[DailyPaymentBotV8] Daily execution completed in ${executionTime}ms`);

    } catch (error) {
      console.error('[DailyPaymentBotV8] Daily execution failed:', error);
      this.recordError(error, {
        sessionId: 'daily-execution',
        chainId: 0,
        chainName: 'all',
        amount: BigInt(0),
        sessionType: 'v8',
        healthStatus: { healthy: false, details: 'Execution error', sessionId: '', lastChecked: Date.now(), issues: [], recoveryRecommended: false },
        processingStrategy: { primary: { method: 'autoComplete', functionName: '', parameters: [], gasLimit: BigInt(0), description: '' }, fallbacks: [], requiresAdmin: false, estimated: { successRate: 0, processingTime: 0, gasEstimate: BigInt(0) } }
      } as PendingPaymentV8);
      
      if (this.config.enableDiscordNotifications) {
        await this.discord.notifyError(
          'Daily execution failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    } finally {
      this.isRunning = false;
    }
  }

  public startScheduler(): void {
    if (this.cronJob) {
      console.log('[DailyPaymentBotV8] Scheduler already running');
      return;
    }

    console.log(`[DailyPaymentBotV8] Starting scheduler with expression: ${this.config.cronSchedule}`);
    
    this.cronJob = cron.schedule(this.config.cronSchedule, async () => {
      await this.executeDaily();
    }, {
      timezone: 'UTC'
    });

    console.log('[DailyPaymentBotV8] Scheduler started successfully');
  }

  public stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = undefined;
      console.log('[DailyPaymentBotV8] Scheduler stopped');
    }
  }
}