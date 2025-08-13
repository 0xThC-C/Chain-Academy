#!/usr/bin/env node

// Script to enable all supported tokens in the contract
console.log('🔧 Script to enable ALL supported tokens');
console.log('');
console.log('Contract Address: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Function: addSupportedToken(address token)');
console.log('Function Selector: 0xeb0835bf');
console.log('');
console.log('📋 REQUIRED TRANSACTIONS (call these in order):');
console.log('');

console.log('1️⃣ Enable ETH (address(0)):');
console.log('To: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');

console.log('2️⃣ Enable USDC on Arbitrum (0xaf88d065e77c8cC2239327C5EDb3A432268e5831):');
console.log('To: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Data: 0xeb0835bf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831');
console.log('');

console.log('3️⃣ Enable USDT on Arbitrum (0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9):');
console.log('To: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Data: 0xeb0835bf000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9');
console.log('');

console.log('⚠️  This must be called by the contract owner only!');
console.log('🔄 Repeat for all 4 L2 networks: Arbitrum, Base, Optimism, Polygon');
console.log('');