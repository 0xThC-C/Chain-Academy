#!/usr/bin/env ts-node

/**
 * Test V8 Discord Notifications
 * Sends a test notification to verify Discord integration
 */

import dotenv from 'dotenv';
import { DiscordNotifier } from './bots/DiscordNotifier';

// Load V8 environment
dotenv.config({ path: '.env.v8' });

async function testV8Discord() {
  console.log('🧪 Testing V8 Discord Integration...');
  
  const discord = new DiscordNotifier({
    webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    username: 'Chain Academy V8 Bot',
    retryAttempts: 3,
    retryDelay: 1000,
    enabled: true
  });

  try {
    // Test bot startup notification
    console.log('📢 Sending bot startup notification...');
    const startupResult = await discord.notifyBotStartup('8.0.0', 4);
    console.log(`✅ Startup notification: ${startupResult ? 'SUCCESS' : 'FAILED'}`);

    // Test payment notification
    console.log('📢 Sending test payment notification...');
    const paymentResult = await discord.notifyPaymentSuccess(
      '0x1234567890abcdef',
      '0x3397ec53a2749210618d797424036694f4bcc745',
      BigInt('1000000000000000000'), // 1 ETH
      'ETH',
      'Base',
      '0xtest123'
    );
    console.log(`✅ Payment notification: ${paymentResult ? 'SUCCESS' : 'FAILED'}`);

    // Test error notification
    console.log('📢 Sending test error notification...');
    const errorResult = await discord.notifyError(
      'V8 Discord Integration Test',
      'This is a test error notification to verify Discord webhook is working correctly'
    );
    console.log(`✅ Error notification: ${errorResult ? 'SUCCESS' : 'FAILED'}`);

    console.log('\n🎉 V8 Discord Integration Test Complete!');
    console.log('Check your Discord channel for notifications.');

  } catch (error) {
    console.error('❌ Discord test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testV8Discord();
}