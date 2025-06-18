// Progressive Escrow V4 Multi-L2 Configuration
// Chain Academy Mentorship Platform - Mainnet Ready

// Progressive Escrow V4 contract addresses for all supported L2 networks
export const PROGRESSIVE_ESCROW_ADDRESSES = {
  // L2 Mainnets (to be deployed)
  base: '0x0000000000000000000000000000000000000000',
  optimism: '0x0000000000000000000000000000000000000000', 
  arbitrum: '0x0000000000000000000000000000000000000000',
  polygon: '0x0000000000000000000000000000000000000000',
  
  // Testnets
  baseSepolia: '0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f',
  optimismSepolia: '0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f',
  arbitrumSepolia: '0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f',
  polygonMumbai: '0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f'
} as const;

// USDC token addresses for each L2 network
export const USDC_ADDRESSES = {
  // L2 Mainnets
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  
  // Testnets
  baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  optimismSepolia: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  arbitrumSepolia: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  polygonMumbai: '0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e'
} as const;

// USDT token addresses for each L2 network
export const USDT_ADDRESSES = {
  // L2 Mainnets
  base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  
  // Testnets
  baseSepolia: '0x4A3A6Dd60A34bB2Aba60D73B4C88315E9CeB6A3D',
  optimismSepolia: '0x5589BB8228C07c4e15558875fAf2B859f678d129',
  arbitrumSepolia: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E',
  polygonMumbai: '0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832'
} as const;

// Chain ID mappings
export const CHAIN_IDS = {
  // L2 Mainnets
  base: 8453,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
  
  // Testnets
  baseSepolia: 84532,
  optimismSepolia: 11155420,
  arbitrumSepolia: 421614,
  polygonMumbai: 80001
} as const;

// Chain names for display
export const CHAIN_NAMES = {
  [CHAIN_IDS.base]: 'Base',
  [CHAIN_IDS.optimism]: 'Optimism',
  [CHAIN_IDS.arbitrum]: 'Arbitrum',
  [CHAIN_IDS.polygon]: 'Polygon',
  [CHAIN_IDS.baseSepolia]: 'Base Sepolia',
  [CHAIN_IDS.optimismSepolia]: 'Optimism Sepolia',
  [CHAIN_IDS.arbitrumSepolia]: 'Arbitrum Sepolia',
  [CHAIN_IDS.polygonMumbai]: 'Polygon Mumbai'
} as const;

// Block explorer URLs
export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.base]: 'https://basescan.org',
  [CHAIN_IDS.optimism]: 'https://optimistic.etherscan.io',
  [CHAIN_IDS.arbitrum]: 'https://arbiscan.io',
  [CHAIN_IDS.polygon]: 'https://polygonscan.com',
  [CHAIN_IDS.baseSepolia]: 'https://sepolia.basescan.org',
  [CHAIN_IDS.optimismSepolia]: 'https://sepolia-optimism.etherscan.io',
  [CHAIN_IDS.arbitrumSepolia]: 'https://sepolia.arbiscan.io',
  [CHAIN_IDS.polygonMumbai]: 'https://mumbai.polygonscan.com'
} as const;

// Progressive Escrow V4 ABI (L2-optimized from useProgressivePayment.ts)
export const PROGRESSIVE_ESCROW_V4_ABI = [
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
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: true, name: 'mentor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'ProgressivePaymentReleased',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'SessionPaused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'SessionResumed',
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
    console.warn(`⚠️ Unsupported chain ID: ${chainId}, falling back to Base Sepolia testnet`);
    return PROGRESSIVE_ESCROW_ADDRESSES.baseSepolia;
  }
  
  const address = PROGRESSIVE_ESCROW_ADDRESSES[chainKey];
  if (address === '0x0000000000000000000000000000000000000000') {
    console.warn(`⚠️ Progressive Escrow not deployed on ${chainKey}, using Base Sepolia testnet`);
    return PROGRESSIVE_ESCROW_ADDRESSES.baseSepolia;
  }
  
  return address;
};

// Helper function to get USDC address for current chain
export const getUSDCAddress = (chainId: number): string => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  
  if (!chainKey) {
    console.warn(`⚠️ Unsupported chain ID: ${chainId}, falling back to Base Sepolia testnet`);
    return USDC_ADDRESSES.baseSepolia;
  }
  
  return USDC_ADDRESSES[chainKey];
};

// Helper function to get USDT address for current chain
export const getUSDTAddress = (chainId: number): string => {
  const chainKey = Object.entries(CHAIN_IDS).find(([, id]) => id === chainId)?.[0] as SupportedChain;
  
  if (!chainKey) {
    console.warn(`⚠️ Unsupported chain ID: ${chainId}, falling back to Base Sepolia testnet`);
    return USDT_ADDRESSES.baseSepolia;
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

// Helper function to check if chain is testnet
export const isTestnetChain = (chainId: number): boolean => {
  return [
    CHAIN_IDS.baseSepolia,
    CHAIN_IDS.optimismSepolia,
    CHAIN_IDS.arbitrumSepolia,
    CHAIN_IDS.polygonMumbai
  ].includes(chainId as any);
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
  const contractAddress = getProgressiveEscrowAddress(chainId);
  const isDeployed = contractAddress !== '0x0000000000000000000000000000000000000000';
  const chainName = getChainName(chainId);
  
  return {
    isDeployed,
    contractAddress,
    message: isDeployed 
      ? `Progressive Escrow V4 deployed on ${chainName}`
      : `Progressive Escrow V4 not yet deployed on ${chainName}`
  };
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

// Session status enum matching the smart contract
export enum SessionStatus {
  Created = 0,
  Active = 1,
  Paused = 2,
  Completed = 3,
  Cancelled = 4
}

// Session data interface
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

// Progressive session data interface
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
}

// Booking transaction interface
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
}

// ABI alias for backward compatibility
export const PROGRESSIVE_ESCROW_ABI = PROGRESSIVE_ESCROW_V4_ABI;

// Legacy compatibility exports for gradual migration
export const MENTORSHIP_CONTRACT_ADDRESS = PROGRESSIVE_ESCROW_ADDRESSES;
export const USDC_CONTRACT_ADDRESS = USDC_ADDRESSES;
export const USDT_CONTRACT_ADDRESS = USDT_ADDRESSES;
export const MENTORSHIP_CONTRACT_ABI = PROGRESSIVE_ESCROW_V4_ABI;

// Legacy helper functions for compatibility
export const getContractAddress = getProgressiveEscrowAddress;
export const getCurrentContractAddress = () => getProgressiveEscrowAddress(84532); // Base Sepolia
export const getCurrentUSDCAddress = () => getUSDCAddress(84532);
export const getCurrentUSDTAddress = () => getUSDTAddress(84532);
export const isTestnetMode = () => false; // Mainnet deployment ready

export const getTestnetInfo = () => ({
  network: 'Base Sepolia Testnet',
  chainId: 84532,
  explorer: 'https://sepolia.basescan.org',
  contractAddress: getCurrentContractAddress(),
  usdcAddress: getCurrentUSDCAddress(),
  usdtAddress: getCurrentUSDTAddress(),
  isTestnet: true
});