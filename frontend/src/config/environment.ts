// Environment Configuration for Chain Academy V2
// This file manages environment-specific settings for testnet/mainnet

export interface EnvironmentConfig {
  chainId: number;
  networkName: string;
  environment: 'testnet' | 'mainnet';
  rpcUrl?: string;
  explorerUrl: string;
  mentorshipContractAddress: string;
  usdcAddress: string;
  usdtAddress: string;
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string = ''): string => {
  return process.env[key] || fallback;
};

// Current environment configuration - SEPOLIA TESTNET
export const CURRENT_CONFIG: EnvironmentConfig = {
  chainId: parseInt(getEnvVar('REACT_APP_CHAIN_ID', '11155111')),
  networkName: getEnvVar('REACT_APP_NETWORK_NAME', 'sepolia'),
  environment: getEnvVar('REACT_APP_ENVIRONMENT', 'testnet') as 'testnet' | 'mainnet',
  rpcUrl: getEnvVar('REACT_APP_SEPOLIA_RPC_URL'),
  explorerUrl: getEnvVar('REACT_APP_SEPOLIA_EXPLORER_URL', 'https://sepolia.etherscan.io'),
  mentorshipContractAddress: getEnvVar('REACT_APP_MENTORSHIP_CONTRACT_SEPOLIA', '0x409C486D1A686e9499E9561bFf82781843598eDF'),
  usdcAddress: getEnvVar('REACT_APP_SEPOLIA_USDC_ADDRESS', '0x556C875376950B70E0b5A670c9f15885093002B9'),
  usdtAddress: getEnvVar('REACT_APP_SEPOLIA_USDT_ADDRESS', '0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085')
};

// Validation function to ensure environment is properly configured
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if we're in testnet mode
  if (CURRENT_CONFIG.environment !== 'testnet') {
    errors.push('Environment must be set to testnet for this deployment');
  }
  
  // Check if chain ID is Sepolia
  if (CURRENT_CONFIG.chainId !== 11155111) {
    errors.push('Chain ID must be 11155111 (Sepolia testnet)');
  }
  
  // Check if contract address is set (will be updated by Agent 2)
  if (CURRENT_CONFIG.mentorshipContractAddress === '0x0000000000000000000000000000000000000000') {
    console.warn('⚠️ Mentorship contract address not yet configured - waiting for Agent 2');
  }
  
  // Check if explorer URL is set
  if (!CURRENT_CONFIG.explorerUrl) {
    errors.push('Explorer URL is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper functions for blockchain interactions
export const getExplorerLink = (hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const baseUrl = CURRENT_CONFIG.explorerUrl;
  return type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
};

export const isTestnetEnvironment = (): boolean => {
  return CURRENT_CONFIG.environment === 'testnet';
};

export const getNetworkDisplayName = (): string => {
  return CURRENT_CONFIG.networkName.charAt(0).toUpperCase() + CURRENT_CONFIG.networkName.slice(1);
};

// Log environment configuration on load
console.log('🔧 Chain Academy Environment Configuration:');
console.log(`  Network: ${getNetworkDisplayName()} (${CURRENT_CONFIG.environment})`);
console.log(`  Chain ID: ${CURRENT_CONFIG.chainId}`);
console.log(`  Explorer: ${CURRENT_CONFIG.explorerUrl}`);
console.log(`  Contract Address: ${CURRENT_CONFIG.mentorshipContractAddress}`);

// Validate environment on load
const validation = validateEnvironment();
if (!validation.isValid) {
  console.error('❌ Environment validation failed:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
} else {
  console.log('✅ Environment validation passed');
}

export default CURRENT_CONFIG;