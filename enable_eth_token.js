#!/usr/bin/env node

// Script to enable ETH as supported token in the contract
console.log('🔧 Script to enable ETH as supported token');
console.log('');
console.log('Contract Address: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Function to call: addSupportedToken(address(0))');
console.log('Function Selector: 0xeb0835bf');
console.log('');
console.log('📋 Transaction data needed:');
console.log('To: 0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48');
console.log('Data: 0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000');
console.log('');
console.log('⚠️  This must be called by the contract owner only!');
console.log('');