/**
 * V8 Types - Enhanced types for ProgressiveEscrowV8
 * Fixes enum mismatches and adds new V8 features
 */

// ============ FIXED ENUMS ============

export enum SessionStatus {
  Created = 0,      // ✅ FIXED: Initial state after session creation
  Active = 1,       // ✅ FIXED: Was "Started" in V7, now "Active"
  Paused = 2,       // Temporarily paused but can resume
  Completed = 3,    // Successfully completed with survey
  Cancelled = 4,    // Cancelled before start (full refund)
  Expired = 5,      // Expired without starting (full refund)
  Disputed = 6,     // 🆕 V8: Under dispute resolution
  Abandoned = 7,    // 🆕 V8: Abandoned by participants
  Emergency = 8     // 🆕 V8: Emergency terminated by admin
}

export enum DisputeReason {
  PaymentAmount = 0,
  ServiceQuality = 1,
  TechnicalIssues = 2,
  TimeDiscrepancy = 3,
  Other = 4
}

export enum RefundType {
  NoShow = 0,       // Student/mentor didn't show up
  Partial = 1,      // Session partially completed
  Emergency = 2,    // Emergency refund by admin
  Dispute = 3,      // Dispute resolution refund
  Technical = 4     // Technical issues refund
}

// ============ V8 ENHANCED INTERFACES ============

export interface ProgressiveSessionV8 {
  // Core session data
  sessionId: string;
  student: string;
  mentor: string;
  paymentToken: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  sessionDuration: number;
  
  // Enhanced timing with precision
  createdAt: number;
  startTime: number;
  lastHeartbeat: number;
  effectivePausedTime: number;    // 🆕 V8: More precise pause tracking
  lastActivityTime: number;      // 🆕 V8: Last meaningful interaction
  
  // State management
  status: SessionStatus;
  isActive: boolean;
  isPaused: boolean;
  surveyCompleted: boolean;
  
  // 🆕 V8: Enhanced state tracking
  stateTransitionCount: number;   // Prevent excessive state changes
  lastStateChange: number;        // Track state change timing
  emergencyLocked: boolean;       // Emergency admin lock
  
  // 🆕 V8: Dispute handling
  disputeReason: DisputeReason;
  disputeCreatedAt: number;
  disputeInitiator: string;
  arbitrationRequired: boolean;
  
  // 🆕 V8: Recovery mechanisms
  recoveryAttempts: number;
  lastRecoveryAttempt: number;
  autoRecoveryEnabled: boolean;
}

export interface PaymentCalculationV8 {
  totalAmount: bigint;
  elapsedMinutes: number;
  sessionDuration: number;
  pausedTime: number;
  effectiveTime: number;
  progressiveRelease: bigint;
  platformFee: bigint;
  mentorAmount: bigint;
}

export interface SessionHealthInfo {
  healthy: boolean;
  details: string;
  sessionId: string;
  lastChecked: number;
  issues: string[];
  recoveryRecommended: boolean;
}

// ============ V8 BOT CONFIGURATION ============

// Base interfaces (extending from types.ts)
export interface BotConfig {
  name: string;
  version: string;
  environment: string;
  enabled: boolean;
  privateKey: string;
  cronSchedule: string;
  discordWebhookUrl: string;
  enableDiscordNotifications: boolean;
  sessionStoragePath?: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
}

export interface BotMetrics {
  totalProcessed: number;
  successfulPayments: number;
  failedPayments: number;
  totalAmountProcessed: bigint;
  lastExecutionTime: number;
  errors: any[];
}

export interface PendingPayment {
  sessionId: string;
  chainId: number;
  chainName: string;
  amount: bigint;
}

export interface DiscordNotification {
  // Base notification properties
}

export interface BotConfigV8 extends BotConfig {
  // V8 Contract addresses
  contractAddressV8?: string;
  
  // V8 Enhanced features
  v8Features: {
    enhancedMonitoring: boolean;
    autoRecovery: boolean;
    disputeHandling: boolean;
    multiVersionSupport: boolean;
    precisionPayments: boolean;
  };
  
  // V8 Processing settings
  v8Settings: {
    maxRecoveryAttempts: number;
    healthCheckInterval: number;
    batchProcessingSize: number;
    emergencyThresholds: {
      maxStateTransitions: number;
      maxPauseTime: number;
      maxDisputeTime: number;
    };
  };
  
  // V8 Monitoring
  monitoring: {
    enableRealTimeAlerts: boolean;
    enablePredictiveAlerts: boolean;
    enablePerformanceMetrics: boolean;
    healthCheckEndpoints: string[];
  };
}

export interface ChainConfigV8 extends ChainConfig {
  // V8 contract address
  contractAddressV8: string;
  
  // V8 specific settings
  v8Enabled: boolean;
  migrationMode: 'v7-only' | 'dual-support' | 'v8-only';
  
  // Enhanced RPC settings for V8
  rpcSettings: {
    timeout: number;
    retries: number;
    fallbackRpcs: string[];
  };
}

// ============ V8 PROCESSING INTERFACES ============

export interface PendingPaymentV8 extends PendingPayment {
  sessionType: 'v7' | 'v8';
  refundType?: RefundType;
  disputeInfo?: {
    reason: DisputeReason;
    initiator: string;
    createdAt: number;
  };
  healthStatus: SessionHealthInfo;
  processingStrategy: ProcessingStrategy;
}

export interface ProcessingStrategy {
  primary: ProcessingMethod;
  fallbacks: ProcessingMethod[];
  requiresAdmin: boolean;
  estimated: {
    successRate: number;
    processingTime: number;
    gasEstimate: bigint;
  };
}

export interface ProcessingMethod {
  method: 'autoComplete' | 'processNoShow' | 'processPartial' | 'processEmergency' | 'resolveDispute' | 'none';
  functionName: string;
  parameters: any[];
  gasLimit: bigint;
  description: string;
}

// ============ V8 EVENTS & MONITORING ============

export interface SessionEventV8 {
  sessionId: string;
  eventType: SessionEventType;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  data: any;
  chainId: number;
}

export enum SessionEventType {
  Created = 'SessionCreated',
  Started = 'SessionStarted', 
  Paused = 'SessionPaused',
  Resumed = 'SessionResumed',
  Completed = 'SessionCompleted',
  Cancelled = 'SessionCancelled',
  Expired = 'SessionExpired',
  StateChanged = 'SessionStateChanged',
  DisputeRaised = 'DisputeRaised',
  DisputeResolved = 'DisputeResolved',
  EmergencyAction = 'EmergencyAction',
  AutoRecoveryExecuted = 'AutoRecoveryExecuted',
  ProgressivePaymentReleased = 'ProgressivePaymentReleased',
  HeartbeatReceived = 'HeartbeatReceived',
  RefundProcessed = 'RefundProcessed',
  SessionHealthCheck = 'SessionHealthCheck',
  SystemMetrics = 'SystemMetrics'
}

// ============ V8 METRICS & REPORTING ============

export interface BotMetricsV8 extends BotMetrics {
  // V8 specific metrics
  v8Metrics: {
    sessionsProcessedV8: number;
    disputesHandled: number;
    autoRecoveriesExecuted: number;
    emergencyActionsTriggered: number;
    healthChecksPerformed: number;
    averageProcessingTime: number;
    successRateByMethod: Record<string, number>;
  };
  
  // Enhanced error tracking
  errorMetrics: {
    bigIntSerializationErrors: number;
    rpcTimeouts: number;
    gasEstimationFailures: number;
    contractReverts: number;
    networkErrors: number;
  };
  
  // Performance metrics
  performance: {
    averageBlockTime: number;
    transactionThroughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface SessionAnalytics {
  sessionId: string;
  creationTime: number;
  processingTime?: number;
  completionTime?: number;
  totalDuration: number;
  effectiveDuration: number;
  pausedDuration: number;
  paymentEvents: PaymentEvent[];
  stateTransitions: StateTransition[];
  healthChecks: HealthCheck[];
  finalOutcome: SessionOutcome;
}

export interface PaymentEvent {
  timestamp: number;
  amount: bigint;
  recipient: string;
  type: 'progressive' | 'final' | 'refund';
  transactionHash: string;
}

export interface StateTransition {
  timestamp: number;
  fromState: SessionStatus;
  toState: SessionStatus;
  trigger: string;
  transactionHash?: string;
}

export interface HealthCheck {
  timestamp: number;
  healthy: boolean;
  issues: string[];
  metrics: {
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
}

export interface SessionOutcome {
  status: SessionStatus;
  totalPaid: bigint;
  totalRefunded: bigint;
  platformFee: bigint;
  processingMethod: string;
  completionPercentage: number;
  userSatisfaction?: number;
}

// ============ V8 MIGRATION SUPPORT ============

export interface MigrationInfo {
  fromVersion: 'v7';
  toVersion: 'v8';
  sessionId: string;
  migrationStatus: MigrationStatus;
  migrationDate: number;
  dataIntegrity: {
    balancesMatch: boolean;
    stateConsistent: boolean;
    eventsComplete: boolean;
  };
}

export enum MigrationStatus {
  Pending = 'pending',
  InProgress = 'in-progress', 
  Completed = 'completed',
  Failed = 'failed',
  RollbackRequired = 'rollback-required'
}

// ============ V8 DISCORD NOTIFICATIONS ============

export interface DiscordNotificationV8 extends DiscordNotification {
  v8Features: {
    sessionHealth: boolean;
    disputeAlerts: boolean;
    recoveryNotifications: boolean;
    performanceMetrics: boolean;
    predictiveAlerts: boolean;
  };
  
  enhancedContent: {
    sessionAnalytics: boolean;
    errorDetails: boolean;
    recoveryRecommendations: boolean;
    trendAnalysis: boolean;
  };
}

// ============ EXPORTS ============

// Re-export base types (removed dependency)

// V8 specific exports
export {
  SessionStatus as SessionStatusV8,
  DisputeReason,
  RefundType,
  ProgressiveSessionV8,
  PaymentCalculationV8,
  SessionHealthInfo,
  BotConfigV8,
  ChainConfigV8,
  PendingPaymentV8,
  ProcessingStrategy,
  ProcessingMethod,
  SessionEventV8,
  SessionEventType,
  BotMetricsV8,
  SessionAnalytics,
  MigrationInfo,
  MigrationStatus,
  DiscordNotificationV8
};