// Bot-specific types for Chain Academy Payment Automation

// Session status enum from ProgressiveEscrowV7 contract
export enum SessionStatus {
  Created = 0,
  Started = 1,
  Paused = 2,
  Completed = 3,
  Cancelled = 4,
  Expired = 5
}

// ProgressiveSession struct from V7 contract
export interface ProgressiveSession {
  sessionId: string; // bytes32 as string
  student: string;
  mentor: string;
  paymentToken: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  sessionDuration: number; // in minutes
  startTime: number; // timestamp
  lastHeartbeat: number; // timestamp
  pausedTime: number; // accumulated paused time in seconds
  createdAt: number; // timestamp
  status: SessionStatus;
  isActive: boolean;
  isPaused: boolean;
  surveyCompleted: boolean;
}

export interface PendingPayment {
  sessionId: string;
  mentorAddress: string;
  studentAddress: string;
  amount: bigint; // Proportional amount based on actual session time
  fullAmount: bigint; // Original full session amount
  percentageCompleted: number; // Percentage of session actually completed
  tokenAddress: string;
  chainId: number;
  completedAt: number;
  transactionHash?: string;
  sessionTitle?: string;
  actualDuration: number; // Actual minutes spent in session
  scheduledDuration: number; // Originally scheduled duration
  manualConfirmationDeadline: number; // 24h deadline for manual confirmation
}

export interface PaymentResult {
  sessionId: string;
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: bigint;
  timestamp: number;
  chainId: number;
}

export interface BotConfig {
  // Bot Identity
  name?: string;
  version?: string;
  environment?: string;
  
  // Core Settings
  enabled: boolean;
  cronSchedule: string;
  dailyCronSchedule?: string;
  executionTime: string;
  paymentDelayHours: number;
  maxRetryAttempts: number;
  supportedChains: number[];
  notificationEnabled: boolean;
  emergencyPauseAddress: string;
  gasLimits: {
    [chainId: number]: bigint;
  };
  
  // Payment Processing
  maxPaymentsPerRun?: number;
  minPaymentAmount?: bigint;
  maxGasPrice?: bigint;
  priorityFee?: bigint;
  retryAttempts?: number;
  retryDelay?: number;
  
  // Monitoring & Notifications
  webhookUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  healthCheckInterval?: number;
  maxExecutionTime?: number;
  
  // Discord Notifications
  discordWebhookUrl?: string;
  enableDiscordNotifications?: boolean;
  
  // Emergency Controls
  emergencyStop?: boolean;
  maintenanceMode?: boolean;
  
  // Security
  allowedOperators?: string[];
  requireOperatorSignature?: boolean;
  
  // V7 specific configurations
  sessionTrackingEnabled?: boolean; // Track session IDs externally
  heartbeatCheckEnabled?: boolean; // Monitor session heartbeats
  autoPauseCheckEnabled?: boolean; // Check for sessions that need auto-pause
  minAutoReleaseDelay?: number; // Minimum delay before auto-release (hours)
  sessionIdStorage?: string; // Path to store tracked session IDs
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  isTestnet?: boolean;
  explorerUrl?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface NotificationPayload {
  mentorAddress: string;
  amount: string;
  tokenSymbol: string;
  sessionId: string;
  transactionHash: string;
  chainName: string;
}

export interface BotMetrics {
  totalProcessed: number;
  successfulPayments: number;
  failedPayments: number;
  totalGasUsed: bigint;
  lastExecutionTime: number;
  chainMetrics: {
    [chainId: number]: {
      processed: number;
      gasUsed: bigint;
      averageGasPrice: bigint;
    };
  };
}

export interface PaymentBatch {
  chainId: number;
  payments: PendingPayment[];
  estimatedGas: bigint;
  priority: 'high' | 'medium' | 'low';
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRY = 'RETRY'
}

export interface PaymentLog {
  id: string;
  sessionId: string;
  status: PaymentStatus;
  attempts: number;
  lastAttempt: number;
  error?: string;
  transactionHash?: string;
  chainId: number;
}

// Session tracking for V7 (since getAllActiveSessions is not available)
export interface TrackedSession {
  sessionId: string;
  chainId: number;
  createdAt: number;
  lastChecked: number;
  status: SessionStatus;
  isTracked: boolean; // Whether we're actively tracking this session
  completedButNotReleased?: boolean; // Session completed but payment not yet released
}

export interface SessionTracker {
  sessions: Map<string, TrackedSession>; // sessionId -> TrackedSession
  lastFullScan: number; // Last time we did a comprehensive scan
  scanInterval: number; // How often to perform full scans (milliseconds)
}