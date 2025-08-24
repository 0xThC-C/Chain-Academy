// Progressive Escrow V8 Multi-L2 Configuration
// Chain Academy Mentorship Platform - V8 Production Ready

// Progressive Escrow V8 contract addresses for all supported L2 networks
export const PROGRESSIVE_ESCROW_ADDRESSES = {
  // L2 Mainnets (V8 FIXED - V7 Compatible)
  base: '0x2a9d167e30195ba5fd29cfc09622be0d02da91be',
  optimism: '0xd5bbf7f5449b805cb5479e6aa04e722c28aa9ba1', 
  arbitrum: '0x74d6ae04f62fdd2d4942babad924ad6fc693329f',
  polygon: '0x2a9d167e30195ba5fd29cfc09622be0d02da91be'
} as const;

// USDC token addresses for each L2 network (auto-enabled in V8)
export const USDC_ADDRESSES = {
  // L2 Mainnets
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
} as const;

// USDT token addresses for each L2 network (auto-enabled in V8)
export const USDT_ADDRESSES = {
  // L2 Mainnets
  base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
} as const;

// Chain ID mappings
export const CHAIN_IDS = {
  // L2 Mainnets
  base: 8453,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137
} as const;

// Chain names for display
export const CHAIN_NAMES = {
  [CHAIN_IDS.base]: 'Base',
  [CHAIN_IDS.optimism]: 'Optimism',
  [CHAIN_IDS.arbitrum]: 'Arbitrum',
  [CHAIN_IDS.polygon]: 'Polygon'
} as const;

// Block explorer URLs
export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.base]: 'https://basescan.org',
  [CHAIN_IDS.optimism]: 'https://optimistic.etherscan.io',
  [CHAIN_IDS.arbitrum]: 'https://arbiscan.io',
  [CHAIN_IDS.polygon]: 'https://polygonscan.com'
} as const;

// Progressive Escrow V8 ABI (Enhanced with Bug Fixes)
export const PROGRESSIVE_ESCROW_V8_ABI = [
  // Read functions
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getSession',
    outputs: [{
      components: [
        { name: 'sessionId', type: 'bytes32' },
        { name: 'student', type: 'address' },
        { name: 'mentor', type: 'address' },
        { name: 'paymentToken', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'releasedAmount', type: 'uint256' },
        { name: 'sessionDuration', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'lastHeartbeat', type: 'uint256' },
        { name: 'pausedTime', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'isActive', type: 'bool' },
        { name: 'isPaused', type: 'bool' },
        { name: 'surveyCompleted', type: 'bool' }
      ],
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getAvailablePayment',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'needsHeartbeat',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'shouldAutoPause',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getEffectiveElapsedTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'isTokenSupported',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "mentor", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "durationMinutes", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ],
    name: "createProgressiveSession",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'startProgressiveSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'checkAndExpireSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'releaseProgressivePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'updateHeartbeat',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'pauseSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'resumeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'rating', type: 'uint256' },
      { name: 'feedback', type: 'string' }
    ],
    name: 'completeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'autoCompleteSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'cancelSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // V8 Enhanced functions
  {
    inputs: [
      { name: 'totalAmount', type: 'uint256' },
      { name: 'elapsedMinutes', type: 'uint256' },
      { name: 'durationMinutes', type: 'uint256' }
    ],
    name: 'calculateMaxRelease',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'emergencyRefund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'disputeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'resolveDispute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: true, name: 'student', type: 'address' },
      { indexed: true, name: 'mentor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'token', type: 'address' }
    ],
    name: 'SessionCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'startTime', type: 'uint256' }
    ],
    name: 'SessionStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalReleased', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'ProgressivePaymentReleased',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'pausedAt', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' }
    ],
    name: 'SessionPaused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'resumedAt', type: 'uint256' }
    ],
    name: 'SessionResumed',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'mentorAmount', type: 'uint256' },
      { indexed: false, name: 'platformFee', type: 'uint256' },
      { indexed: false, name: 'completedAt', type: 'uint256' }
    ],
    name: 'SessionCompleted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'refundAmount', type: 'uint256' },
      { indexed: false, name: 'cancelledAt', type: 'uint256' }
    ],
    name: 'SessionCancelled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'refundAmount', type: 'uint256' }
    ],
    name: 'SessionExpired',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'HeartbeatReceived',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: 'token', type: 'address' },
      { indexed: false, name: 'supported', type: 'bool' }
    ],
    name: 'TokenSupportUpdated',
    type: 'event'
  },
  // V8 Enhanced events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'refundAmount', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' }
    ],
    name: 'EmergencyRefundExecuted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: true, name: 'initiator', type: 'address' },
      { indexed: false, name: 'reason', type: 'string' }
    ],
    name: 'DisputeInitiated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'resolution', type: 'uint8' }
    ],
    name: 'DisputeResolved',
    type: 'event'
  }
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

// Supported payment tokens
export const SUPPORTED_TOKENS = {
  ETH: 'ETH',
  USDC: 'USDC',
  USDT: 'USDT',
} as const;

export type SupportedToken = keyof typeof SUPPORTED_TOKENS;
export type SupportedChain = keyof typeof PROGRESSIVE_ESCROW_ADDRESSES;

// Helper function to get Progressive Escrow address for current chain
export const getProgressiveEscrowAddress = (chainId: number): string => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  
  if (!chainKey) {
    throw new Error(`⚠️ Unsupported chain ID: ${chainId}. Please switch to Base, Optimism, Arbitrum, or Polygon.`);
  }
  
  const address = PROGRESSIVE_ESCROW_ADDRESSES[chainKey];
  if (!address) {
    throw new Error(`⚠️ Progressive Escrow V8 not deployed on ${chainKey}`);
  }
  
  return address;
};

// Helper function to get USDC address for current chain
export const getUSDCAddress = (chainId: number): string => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  
  if (!chainKey) {
    throw new Error(`⚠️ Unsupported chain ID: ${chainId}. Please switch to Base, Optimism, Arbitrum, or Polygon.`);
  }
  
  return USDC_ADDRESSES[chainKey];
};

// Helper function to get USDT address for current chain
export const getUSDTAddress = (chainId: number): string => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  
  if (!chainKey) {
    throw new Error(`⚠️ Unsupported chain ID: ${chainId}. Please switch to Base, Optimism, Arbitrum, or Polygon.`);
  }
  
  return USDT_ADDRESSES[chainKey];
};

// Helper function to get ETH address (always address(0) for native ETH)
export const getETHAddress = (): string => {
  return '0x0000000000000000000000000000000000000000';
};

// Helper function to get token address for any supported token
export const getTokenAddress = (token: SupportedToken, chainId: number): string => {
  switch (token) {
    case 'ETH':
      return getETHAddress();
    case 'USDC':
      return getUSDCAddress(chainId);
    case 'USDT':
      return getUSDTAddress(chainId);
    default:
      throw new Error(`Unsupported token: ${token}`);
  }
};

// Helper function to check if token is native ETH
export const isNativeToken = (token: SupportedToken): boolean => {
  return token === 'ETH';
};

// Helper function to get chain name
export const getChainName = (chainId: number): string => {
  return CHAIN_NAMES[chainId as keyof typeof CHAIN_NAMES] || `Chain ${chainId}`;
};

// Helper function to get block explorer URL
export const getBlockExplorerUrl = (chainId: number): string => {
  return BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS] || 'https://etherscan.io';
};

// Helper function to check if chain is supported
export const isSupportedChain = (chainId: number): boolean => {
  return Object.values(CHAIN_IDS).includes(chainId as any);
};

// Helper function to check if chain is testnet (always false for mainnet-only deployment)
export const isTestnetChain = (_chainId: number): boolean => {
  return false;
};

// Helper function to get all supported chains
export const getSupportedChains = (): Array<{ chainId: number; name: string; isTestnet: boolean }> => {
  return Object.entries(CHAIN_IDS).map(([_, chainId]) => ({
    chainId,
    name: CHAIN_NAMES[chainId],
    isTestnet: isTestnetChain(chainId)
  }));
};

// Helper function to validate deployment status
export const validateDeploymentStatus = (chainId: number): {
  isDeployed: boolean;
  contractAddress: string;
  message: string;
} => {
  try {
    const contractAddress = getProgressiveEscrowAddress(chainId);
    const chainName = getChainName(chainId);
    
    return {
      isDeployed: true,
      contractAddress,
      message: `Progressive Escrow V8 deployed on ${chainName}`
    };
  } catch (error) {
    return {
      isDeployed: false,
      contractAddress: '',
      message: (error as Error).message
    };
  }
};

// Network configuration for wallet switching
export const getNetworkConfig = (chainId: number) => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  if (!chainKey) return null;
  
  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: getChainName(chainId),
    blockExplorerUrls: [getBlockExplorerUrl(chainId)],
    progressiveEscrowAddress: getProgressiveEscrowAddress(chainId),
    usdcAddress: getUSDCAddress(chainId),
    usdtAddress: getUSDTAddress(chainId)
  };
};

// V8 Enhanced Session status enum
export enum SessionStatus {
  Created = 0,
  Active = 1,
  Paused = 2,
  Completed = 3,
  Cancelled = 4,
  Expired = 5,
  Disputed = 6,
  EmergencyRefunded = 7,
  NoShow = 8
}

// V8 Session data interface
export interface SessionData {
  mentorId: number;
  mentorName: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  skills: string[];
  mentorAddress?: string;
  prerequisites?: string;
}

// V8 Progressive session data interface (enhanced)
export interface ProgressiveSessionData {
  sessionId: string;
  student: string;
  mentor: string;
  paymentToken: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  sessionDuration: number;
  startTime: number;
  lastHeartbeat: number;
  pausedTime: number;
  createdAt: number;
  status: SessionStatus;
  isActive: boolean;
  isPaused: boolean;
  surveyCompleted: boolean;
  disputeReason?: string;
  refundAmount?: bigint;
}

// V8 Enhanced Booking transaction interface
export interface BookingTransaction {
  sessionId?: number;
  student: string;
  mentor: string;
  amount: bigint;
  token: SupportedToken;
  tokenAddress: string;
  scheduledTime: Date;
  sessionData: SessionData;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: Date;
  chainId: number;
  version: 'V8';
}

// Main exports for V8
export const PROGRESSIVE_ESCROW_ABI = PROGRESSIVE_ESCROW_V8_ABI;

// Legacy compatibility exports (pointing to V8)
export const MENTORSHIP_CONTRACT_ADDRESS = PROGRESSIVE_ESCROW_ADDRESSES;
export const USDC_CONTRACT_ADDRESS = USDC_ADDRESSES;
export const USDT_CONTRACT_ADDRESS = USDT_ADDRESSES;
export const MENTORSHIP_CONTRACT_ABI = PROGRESSIVE_ESCROW_V8_ABI;

// Legacy helper functions for compatibility
export const getContractAddress = getProgressiveEscrowAddress;
export const getCurrentContractAddress = () => getProgressiveEscrowAddress(8453); // Base Mainnet
export const getCurrentUSDCAddress = () => getUSDCAddress(8453);
export const getCurrentUSDTAddress = () => getUSDTAddress(8453);
export const isTestnetMode = () => false; // Mainnet only

export const getMainnetInfo = () => ({
  network: 'Base Mainnet',
  chainId: 8453,
  explorer: 'https://basescan.org',
  contractAddress: getCurrentContractAddress(),
  usdcAddress: getCurrentUSDCAddress(),
  usdtAddress: getCurrentUSDTAddress(),
  isTestnet: false
});

// V8 specific constants
export const CONTRACT_VERSION = 'V8';
export const PLATFORM_FEE_PERCENT = 10;
export const HEARTBEAT_INTERVAL = 30; // seconds
export const GRACE_PERIOD = 60; // seconds
export const SESSION_START_TIMEOUT = 15 * 60; // 15 minutes in seconds
export const AUTO_RELEASE_DELAY = 7 * 24 * 60 * 60; // 7 days in seconds
export const DISPUTE_TIMEOUT = 7 * 24 * 60 * 60; // 7 days for dispute resolution
export const EMERGENCY_REFUND_COOLDOWN = 24 * 60 * 60; // 24 hours cooldown

// V8 Enhanced Features
export const V8_FEATURES = {
  enhancedStateMachine: true,
  multipleRefundPathways: true,
  autoRecoverySystem: true,
  disputeResolution: true,
  healthMonitoring: true,
  progressivePayments: true,
  emergencyControls: true,
  gasOptimized: true,
  bigIntSupport: true,
  autoCompleteForCreated: true
} as const;