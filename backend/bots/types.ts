// Bot-specific types for Chain Academy Payment Automation

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
  enabled: boolean;
  cronSchedule: string;
  executionTime: string;
  paymentDelayHours: number;
  maxRetryAttempts: number;
  supportedChains: number[];
  notificationEnabled: boolean;
  emergencyPauseAddress: string;
  gasLimits: {
    [chainId: number]: bigint;
  };
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
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