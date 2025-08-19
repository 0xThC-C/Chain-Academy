#!/usr/bin/env ts-node

/**
 * Test script for V7 Bot Implementation
 * 
 * This script tests the updated DailyPaymentBot with V7 contract integration
 */

import { DailyPaymentBot } from './DailyPaymentBot';
import { MAINNET_CHAIN_CONFIGS, MAINNET_BOT_CONFIG, validateMainnetConfig } from './MainnetBotConfig';
import { ChainConfig } from './types';

// Test configuration for V7
const TEST_CHAIN_CONFIGS: ChainConfig[] = [
  {
    chainId: 8453, // Base
    name: 'Base Testnet',
    rpcUrl: process.env.BOT_BASE_RPC_URL || 'https://mainnet.base.org',
    contractAddress: process.env.BASE_PROGRESSIVE_ESCROW_V7 || '0x0000000000000000000000000000000000000000',
    gasLimit: BigInt(300000),
    maxFeePerGas: BigInt(50000000000),
    maxPriorityFeePerGas: BigInt(2000000000),
  }
];

async function testV7Bot() {
  console.log('🧪 Starting V7 Bot Test Suite');
  
  try {
    // Validate configuration
    console.log('\n1️⃣ Validating configuration...');
    validateMainnetConfig();
    console.log('✅ Configuration validation passed');
    
    // Initialize bot
    console.log('\n2️⃣ Initializing V7 Bot...');
    const bot = new DailyPaymentBot(MAINNET_BOT_CONFIG, TEST_CHAIN_CONFIGS);
    console.log('✅ Bot initialized successfully');
    
    // Test session tracker
    console.log('\n3️⃣ Testing Session Tracker...');
    const trackerStatus = bot.getSessionTrackerStatus();
    console.log('Session Tracker Status:', JSON.stringify(trackerStatus, null, 2));
    
    // Add a test session to tracker (simulate)
    console.log('\n4️⃣ Testing Session Addition...');
    const testSessionId = '0x1234567890123456789012345678901234567890123456789012345678901234';
    bot.addSessionToTracker(testSessionId, 8453);
    console.log(`✅ Added test session: ${testSessionId}`);
    
    // Check tracker status again
    const updatedStatus = bot.getSessionTrackerStatus();
    console.log('Updated Session Tracker Status:', JSON.stringify(updatedStatus, null, 2));
    
    // Test pending payment scan (this will be limited by actual contract data)
    console.log('\n5️⃣ Testing Pending Payment Scan...');
    try {
      const pendingPayments = await bot.scanPendingPayments();
      console.log(`✅ Scan completed. Found ${pendingPayments.length} pending payments`);
      
      if (pendingPayments.length > 0) {
        console.log('Sample pending payment:', JSON.stringify(pendingPayments[0], null, 2));
      }
    } catch (error) {
      console.warn('⚠️ Pending payment scan failed (expected if no contract is deployed):', (error as Error).message);
    }
    
    // Test bot health check
    console.log('\n6️⃣ Testing Bot Health...');
    const isHealthy = bot.isHealthy();
    console.log(`Bot Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    // Get metrics
    console.log('\n7️⃣ Bot Metrics...');
    const metrics = bot.getMetrics();
    console.log('Bot Metrics:', JSON.stringify(metrics, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2
    ));
    
    console.log('\n🎉 V7 Bot Test Suite Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Test configuration requirements
function checkTestRequirements() {
  console.log('🔍 Checking test requirements...');
  
  const requiredEnvVars = [
    'BOT_PRIVATE_KEY',
    'BASE_PROGRESSIVE_ESCROW_V7'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables for testing:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these environment variables before running the test.');
    process.exit(1);
  }
  
  console.log('✅ Test requirements satisfied');
}

// Main execution
async function main() {
  console.log('🚀 Chain Academy V7 Bot Test Suite');
  console.log('=====================================\n');
  
  // Check requirements first
  checkTestRequirements();
  
  // Run the test
  await testV7Bot();
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { testV7Bot, checkTestRequirements };