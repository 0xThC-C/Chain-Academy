// Testnet Configuration for Chain Academy V2
// This file contains testnet-specific constants and utilities

import { sepolia } from 'wagmi/chains';

// Testnet Chain Configuration
export const TESTNET_CHAIN = sepolia;

// Testnet Display Information
export const TESTNET_INFO = {
  name: 'Sepolia Testnet',
  shortName: 'Sepolia',
  chainId: 11155111,
  symbol: 'SepoliaETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://sepolia.infura.io/v3/', // Add your Infura API key
  faucetUrl: 'https://sepoliafaucet.com/',
  isTestnet: true
};

// Mock/Test Token Information for Sepolia
export const TESTNET_TOKENS = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum (Native)',
    address: '0x0000000000000000000000000000000000000000', // Native ETH uses address(0)
    decimals: 18,
    isTestToken: true,
    isNative: true
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Testnet)',
    address: '0x556C875376950B70E0b5A670c9f15885093002B9',
    decimals: 6,
    isTestToken: true
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD (Testnet)',
    address: '0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085', 
    decimals: 6,
    isTestToken: true
  }
} as const;

// Contract Addresses (updated with deployed Sepolia addresses)
export const TESTNET_CONTRACTS = {
  mentorship: '0x409C486D1A686e9499E9561bFf82781843598eDF', // Main Mentorship Contract
  progressiveEscrow: '0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f', // Progressive Escrow V4 with ETH support
};

// Testnet-specific utilities
export const getTestnetExplorerLink = (hash: string, type: 'tx' | 'address' = 'tx'): string => {
  const baseUrl = TESTNET_INFO.explorerUrl;
  return type === 'tx' ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
};

export const isValidTestnetAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address) && address !== '0x0000000000000000000000000000000000000000';
};

// Testnet warning messages
export const TESTNET_WARNINGS = {
  environment: '⚠️ You are using TESTNET environment. Do not use real funds!',
  tokens: '💡 Using testnet tokens. Get test tokens from faucets.',
  contracts: '🔧 Contract addresses will be updated after deployment by Agent 2.',
  wallet: '🦊 Make sure your wallet is connected to Sepolia Testnet.'
};

// Helper function to get token info by symbol
export const getTestnetTokenInfo = (symbol: keyof typeof TESTNET_TOKENS) => {
  return TESTNET_TOKENS[symbol];
};

// Helper function to check if token is native ETH
export const isNativeETH = (address: string): boolean => {
  return address === '0x0000000000000000000000000000000000000000';
};

// Log testnet configuration
console.log('🧪 TESTNET CONFIGURATION LOADED:');
console.log(`  Network: ${TESTNET_INFO.name}`);
console.log(`  Chain ID: ${TESTNET_INFO.chainId}`);
console.log(`  Explorer: ${TESTNET_INFO.explorerUrl}`);
console.log(`  ETH: ${TESTNET_TOKENS.ETH.address} (Native)`);
console.log(`  USDC: ${TESTNET_TOKENS.USDC.address}`);
console.log(`  USDT: ${TESTNET_TOKENS.USDT.address}`);
console.log(`  Mentorship Contract: ${TESTNET_CONTRACTS.mentorship}`);

// Warning for development team
console.warn(TESTNET_WARNINGS.environment);
if (TESTNET_CONTRACTS.mentorship === '0x0000000000000000000000000000000000000000') {
  console.warn(TESTNET_WARNINGS.contracts);
}

export default {
  TESTNET_CHAIN,
  TESTNET_INFO,
  TESTNET_TOKENS,
  TESTNET_CONTRACTS,
  TESTNET_WARNINGS
};