// Configuration for Chain Academy Daily Payment Bot

const BOT_CONFIG = {
  // Execution schedule (24-hour format UTC)
  EXECUTION_TIME: process.env.BOT_EXECUTION_TIME || '02:00',
  
  // Payment delay before auto-completion (hours)
  PAYMENT_DELAY_HOURS: parseInt(process.env.PAYMENT_DELAY_HOURS) || 24,
  
  // Maximum retry attempts for failed transactions
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3,
  
  // Supported blockchain networks
  SUPPORTED_CHAINS: [
    8453,  // Base
    10,    // Optimism
    42161, // Arbitrum
    137    // Polygon
  ],
  
  // Notification settings
  NOTIFICATION_ENABLED: process.env.NOTIFICATION_ENABLED !== 'false',
  
  // Emergency pause address (admin wallet)
  EMERGENCY_PAUSE_ADDRESS: process.env.EMERGENCY_PAUSE_ADDRESS || '',
  
  // Gas limits per chain (in wei)
  GAS_LIMITS: {
    8453: '500000',   // Base
    10: '500000',     // Optimism  
    42161: '800000',  // Arbitrum
    137: '600000'     // Polygon
  },
  
  // RPC endpoints
  RPC_URLS: {
    8453: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    10: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    42161: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com'
  },
  
  // Contract addresses per chain
  CONTRACT_ADDRESSES: {
    8453: process.env.BASE_CONTRACT_ADDRESS || '',
    10: process.env.OPTIMISM_CONTRACT_ADDRESS || '',
    42161: process.env.ARBITRUM_CONTRACT_ADDRESS || '',
    137: process.env.POLYGON_CONTRACT_ADDRESS || ''
  },
  
  // Bot wallet private key (should be set in environment)
  BOT_PRIVATE_KEY: process.env.BOT_PRIVATE_KEY || '',
  
  // Monitoring and alerting
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
    MAX_EXECUTION_TIME: 10 * 60 * 1000,    // 10 minutes in milliseconds
    ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  },
  
  // Database settings for logging
  DATABASE: {
    URL: process.env.DATABASE_URL || '',
    TABLE_PREFIX: 'bot_',
    CONNECTION_TIMEOUT: 30000
  },
  
  // Rate limiting
  RATE_LIMITS: {
    TRANSACTIONS_PER_MINUTE: 10,
    MAX_CONCURRENT_CHAINS: 2,
    DELAY_BETWEEN_TRANSACTIONS: 2000 // 2 seconds
  }
};

// Chain configurations
const CHAIN_CONFIGS = [
  {
    chainId: 8453,
    name: 'Base',
    rpcUrl: BOT_CONFIG.RPC_URLS[8453],
    contractAddress: BOT_CONFIG.CONTRACT_ADDRESSES[8453],
    maxFeePerGas: '20000000000', // 20 gwei
    maxPriorityFeePerGas: '1000000000' // 1 gwei
  },
  {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: BOT_CONFIG.RPC_URLS[10],
    contractAddress: BOT_CONFIG.CONTRACT_ADDRESSES[10],
    maxFeePerGas: '20000000000',
    maxPriorityFeePerGas: '1000000000'
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: BOT_CONFIG.RPC_URLS[42161],
    contractAddress: BOT_CONFIG.CONTRACT_ADDRESSES[42161],
    maxFeePerGas: '30000000000', // Higher for Arbitrum
    maxPriorityFeePerGas: '1000000000'
  },
  {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: BOT_CONFIG.RPC_URLS[137],
    contractAddress: BOT_CONFIG.CONTRACT_ADDRESSES[137],
    maxFeePerGas: '50000000000', // Higher for Polygon
    maxPriorityFeePerGas: '30000000000'
  }
];

// Validation function
function validateConfig() {
  const errors = [];
  
  // Check required environment variables
  if (!BOT_CONFIG.BOT_PRIVATE_KEY) {
    errors.push('BOT_PRIVATE_KEY environment variable is required');
  }
  
  // Check contract addresses
  BOT_CONFIG.SUPPORTED_CHAINS.forEach(chainId => {
    if (!BOT_CONFIG.CONTRACT_ADDRESSES[chainId]) {
      errors.push(`Contract address for chain ${chainId} is not configured`);
    }
    if (!BOT_CONFIG.RPC_URLS[chainId]) {
      errors.push(`RPC URL for chain ${chainId} is not configured`);
    }
  });
  
  // Check execution time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(BOT_CONFIG.EXECUTION_TIME)) {
    errors.push('EXECUTION_TIME must be in HH:MM format (24-hour)');
  }
  
  // Check numeric values
  if (BOT_CONFIG.PAYMENT_DELAY_HOURS < 1 || BOT_CONFIG.PAYMENT_DELAY_HOURS > 168) {
    errors.push('PAYMENT_DELAY_HOURS must be between 1 and 168 hours');
  }
  
  if (BOT_CONFIG.MAX_RETRY_ATTEMPTS < 1 || BOT_CONFIG.MAX_RETRY_ATTEMPTS > 10) {
    errors.push('MAX_RETRY_ATTEMPTS must be between 1 and 10');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(error => console.error(`- ${error}`));
    throw new Error('Invalid bot configuration');
  }
  
  console.log('Bot configuration validated successfully');
}

// Environment-specific overrides
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const envConfigs = {
    development: {
      EXECUTION_TIME: '*/5 * * * *', // Every 5 minutes for testing
      PAYMENT_DELAY_HOURS: 0.1, // 6 minutes for testing
      NOTIFICATION_ENABLED: false
    },
    staging: {
      EXECUTION_TIME: '*/30 * * * *', // Every 30 minutes
      PAYMENT_DELAY_HOURS: 1, // 1 hour for staging
      NOTIFICATION_ENABLED: true
    },
    production: {
      // Use default values
    }
  };
  
  return envConfigs[env] || {};
}

// Apply environment-specific config
const environmentConfig = getEnvironmentConfig();
Object.assign(BOT_CONFIG, environmentConfig);

// Export configurations
module.exports = {
  BOT_CONFIG,
  CHAIN_CONFIGS,
  validateConfig,
  
  // Helper functions
  getChainConfig: (chainId) => {
    return CHAIN_CONFIGS.find(config => config.chainId === chainId);
  },
  
  isChainSupported: (chainId) => {
    return BOT_CONFIG.SUPPORTED_CHAINS.includes(chainId);
  },
  
  getGasLimit: (chainId) => {
    return BOT_CONFIG.GAS_LIMITS[chainId] || '500000';
  },
  
  // Convert string gas values to BigInt
  getBigIntGasLimits: () => {
    const gasLimits = {};
    Object.entries(BOT_CONFIG.GAS_LIMITS).forEach(([chainId, limit]) => {
      gasLimits[chainId] = BigInt(limit);
    });
    return gasLimits;
  }
};