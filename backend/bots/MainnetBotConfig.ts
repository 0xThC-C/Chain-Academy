// MainnetBotConfig.ts - Configuration for Chain Academy Payment Bot on Mainnet L2s

import { BotConfig, ChainConfig } from './types';

// Environment variable validation
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Mainnet L2 Chain Configurations
export const MAINNET_CHAIN_CONFIGS: ChainConfig[] = [
  {
    chainId: 8453, // Base
    name: 'Base',
    rpcUrl: process.env.BOT_BASE_RPC_URL || 'https://mainnet.base.org',
    contractAddress: requireEnv('BASE_PROGRESSIVE_ESCROW'),
    gasLimit: BigInt(300000),
    maxFeePerGas: BigInt(50000000000), // 50 gwei
    maxPriorityFeePerGas: BigInt(2000000000), // 2 gwei
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    chainId: 10, // Optimism
    name: 'Optimism',
    rpcUrl: process.env.BOT_OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    contractAddress: requireEnv('OPTIMISM_PROGRESSIVE_ESCROW'),
    gasLimit: BigInt(300000),
    maxFeePerGas: BigInt(30000000000), // 30 gwei
    maxPriorityFeePerGas: BigInt(1000000000), // 1 gwei
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    chainId: 42161, // Arbitrum
    name: 'Arbitrum',
    rpcUrl: process.env.BOT_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    contractAddress: requireEnv('ARBITRUM_PROGRESSIVE_ESCROW'),
    gasLimit: BigInt(300000),
    maxFeePerGas: BigInt(10000000000), // 10 gwei
    maxPriorityFeePerGas: BigInt(100000000), // 0.1 gwei
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    }
  },
  {
    chainId: 137, // Polygon
    name: 'Polygon',
    rpcUrl: process.env.BOT_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contractAddress: requireEnv('POLYGON_PROGRESSIVE_ESCROW'),
    gasLimit: BigInt(300000),
    maxFeePerGas: BigInt(30000000000), // 30 gwei
    maxPriorityFeePerGas: BigInt(2000000000), // 2 gwei
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18
    }
  }
];

// Main Bot Configuration
export const MAINNET_BOT_CONFIG: BotConfig = {
  // Bot Identity
  name: process.env.BOT_NAME || 'ChainAcademy-PaymentBot-Mainnet',
  version: process.env.BOT_VERSION || '1.0.0',
  environment: 'mainnet',

  // Execution Settings
  enabled: process.env.BOT_ENABLED === 'true',
  cronSchedule: process.env.BOT_CHECK_INTERVAL || '0 */6 * * *', // Every 6 hours
  dailyCronSchedule: process.env.BOT_DAILY_CHECK || '0 2 * * *', // Daily at 2 AM UTC

  // Payment Processing
  paymentDelayHours: parseInt(process.env.BOT_PAYMENT_DELAY_HOURS || '24'), // 24 hours
  maxPaymentsPerRun: parseInt(process.env.BOT_MAX_PAYMENTS_PER_RUN || '50'),
  minPaymentAmount: BigInt(process.env.BOT_MIN_PAYMENT_AMOUNT || '1000000'), // 0.001 ETH/USDC

  // Gas Configuration
  gasLimits: {
    8453: BigInt(300000),  // Base
    10: BigInt(300000),    // Optimism
    42161: BigInt(300000), // Arbitrum
    137: BigInt(300000)    // Polygon
  },
  
  maxGasPrice: BigInt(process.env.BOT_MAX_GAS_PRICE || '50000000000'), // 50 gwei
  priorityFee: BigInt(process.env.BOT_PRIORITY_FEE || '2000000000'), // 2 gwei

  // Retry Logic
  retryAttempts: parseInt(process.env.BOT_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.BOT_RETRY_DELAY || '30000'), // 30 seconds

  // Monitoring & Notifications
  notificationEnabled: process.env.BOT_ENABLE_NOTIFICATIONS === 'true',
  webhookUrl: process.env.BOT_WEBHOOK_URL,
  logLevel: (process.env.BOT_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',

  // Emergency Controls
  emergencyStop: process.env.BOT_EMERGENCY_STOP === 'true',
  maintenanceMode: process.env.BOT_MAINTENANCE_MODE === 'true',

  // Health Check
  healthCheckInterval: parseInt(process.env.BOT_HEALTH_CHECK_INTERVAL || '300000'), // 5 minutes
  maxExecutionTime: parseInt(process.env.BOT_MAX_EXECUTION_TIME || '1800000'), // 30 minutes

  // Security
  allowedOperators: process.env.BOT_ALLOWED_OPERATORS?.split(',') || [],
  requireOperatorSignature: process.env.BOT_REQUIRE_OPERATOR_SIGNATURE === 'true'
};

// Validation function
export function validateMainnetConfig(): void {
  console.log('🔍 Validating mainnet bot configuration...');

  // Check required environment variables
  const requiredVars = [
    'BOT_PRIVATE_KEY',
    'BASE_PROGRESSIVE_ESCROW',
    'OPTIMISM_PROGRESSIVE_ESCROW',
    'ARBITRUM_PROGRESSIVE_ESCROW',
    'POLYGON_PROGRESSIVE_ESCROW'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate contract addresses
  MAINNET_CHAIN_CONFIGS.forEach(config => {
    if (!config.contractAddress || config.contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Invalid contract address for ${config.name}: ${config.contractAddress}`);
    }
    
    if (!config.contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(`Invalid contract address format for ${config.name}: ${config.contractAddress}`);
    }
  });

  // Check bot wallet
  const botPrivateKey = process.env.BOT_PRIVATE_KEY;
  if (!botPrivateKey || botPrivateKey.length !== 64) {
    throw new Error('BOT_PRIVATE_KEY must be a valid 64-character private key without 0x prefix');
  }

  // Emergency controls check
  if (MAINNET_BOT_CONFIG.emergencyStop) {
    throw new Error('Bot is in emergency stop mode. Set BOT_EMERGENCY_STOP=false to continue.');
  }

  if (MAINNET_BOT_CONFIG.maintenanceMode) {
    console.warn('⚠️ Bot is in maintenance mode. Some features may be limited.');
  }

  console.log('✅ Mainnet bot configuration validation passed');
  console.log(`📊 Configured for ${MAINNET_CHAIN_CONFIGS.length} chains:`);
  MAINNET_CHAIN_CONFIGS.forEach(config => {
    console.log(`   - ${config.name} (${config.chainId}): ${config.contractAddress}`);
  });
}

// Export helper functions
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return MAINNET_CHAIN_CONFIGS.find(config => config.chainId === chainId);
}

export function getAllSupportedChainIds(): number[] {
  return MAINNET_CHAIN_CONFIGS.map(config => config.chainId);
}

export function isMainnetChainSupported(chainId: number): boolean {
  return MAINNET_CHAIN_CONFIGS.some(config => config.chainId === chainId);
}

// Configuration summary for logging
export function getConfigSummary(): any {
  return {
    botName: MAINNET_BOT_CONFIG.name,
    version: MAINNET_BOT_CONFIG.version,
    environment: MAINNET_BOT_CONFIG.environment,
    enabled: MAINNET_BOT_CONFIG.enabled,
    schedule: MAINNET_BOT_CONFIG.cronSchedule,
    supportedChains: MAINNET_CHAIN_CONFIGS.map(c => ({
      chainId: c.chainId,
      name: c.name,
      contract: c.contractAddress
    })),
    maxPaymentsPerRun: MAINNET_BOT_CONFIG.maxPaymentsPerRun,
    paymentDelayHours: MAINNET_BOT_CONFIG.paymentDelayHours,
    emergencyStop: MAINNET_BOT_CONFIG.emergencyStop,
    maintenanceMode: MAINNET_BOT_CONFIG.maintenanceMode
  };
}