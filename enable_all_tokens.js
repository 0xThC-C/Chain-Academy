#!/usr/bin/env node

/**
 * COMPREHENSIVE TOKEN ENABLEMENT SCRIPT
 * 
 * This script provides the exact transaction data needed to enable
 * ETH, USDC, and USDT on all 4 deployed L2 networks.
 * 
 * Contract Address (same on all networks): 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48
 * Function: addSupportedToken(address token)
 * Function Selector: 0xeb0835bf
 * 
 * ⚠️  CRITICAL: These transactions must be sent by the contract owner!
 */

console.log('🔧 COMPLETE TOKEN ENABLEMENT FOR ALL L2 NETWORKS');
console.log('📋 Contract Address: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('🔐 Function: addSupportedToken(address token)');
console.log('🎯 Function Selector: 0xeb0835bf');
console.log('');

// Token addresses for each network
const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000', // Native ETH (address(0))
  ARBITRUM: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
  },
  BASE: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
  },
  OPTIMISM: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
  },
  POLYGON: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  }
};

const CONTRACT_ADDRESS = '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48';

console.log('🌐 ==================== ARBITRUM ONE (ChainID: 42161) ====================');
console.log('');
console.log('1️⃣ Enable ETH on Arbitrum:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');
console.log('2️⃣ Enable USDC on Arbitrum:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831');
console.log('');
console.log('3️⃣ Enable USDT on Arbitrum:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9');
console.log('');

console.log('🔵 ==================== BASE (ChainID: 8453) ====================');
console.log('');
console.log('1️⃣ Enable ETH on Base:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');
console.log('2️⃣ Enable USDC on Base:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913');
console.log('');
console.log('3️⃣ Enable USDT on Base:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf000000000000000000000000fde4c96c8593536e31f229ea8f37b2ada2699bb2');
console.log('');

console.log('🔴 ==================== OPTIMISM (ChainID: 10) ====================');
console.log('');
console.log('1️⃣ Enable ETH on Optimism:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');
console.log('2️⃣ Enable USDC on Optimism:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000000b2c639c533813f4aa9d7837caf62653d097ff85');
console.log('');
console.log('3️⃣ Enable USDT on Optimism:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf00000000000000000000000094b008aa00579c1307b0ef2c499ad98a8ce58e58');
console.log('');

console.log('🟣 ==================== POLYGON (ChainID: 137) ====================');
console.log('');
console.log('1️⃣ Enable ETH on Polygon:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');
console.log('2️⃣ Enable USDC on Polygon:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa84174');
console.log('');
console.log('3️⃣ Enable USDT on Polygon:');
console.log('To:', CONTRACT_ADDRESS);
console.log('Data: 0xeb0835bf000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f');
console.log('');

console.log('📊 ==================== SUMMARY ====================');
console.log('Total transactions needed: 12 (3 tokens × 4 networks)');
console.log('');
console.log('⚠️  IMPORTANT REMINDERS:');
console.log('• These transactions MUST be sent by the contract owner');
console.log('• Use the correct network for each set of transactions');
console.log('• Each transaction enables one token on one network');
console.log('• After enabling, users can pay with ETH, USDC, or USDT');
console.log('• Gas fees will be paid in each network\'s native token');
console.log('');
console.log('🔍 TO VERIFY ENABLEMENT:');
console.log('Run debug_contract.js on each network to confirm tokens are supported');
console.log('');
console.log('✅ Once complete, all payment failures should be resolved!');