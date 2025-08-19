#!/usr/bin/env ts-node

/**
 * Test script for Discord notifications
 * Usage: ts-node test-discord-notifications.ts <webhook_url>
 */

import { DiscordNotifier, AlertType } from './DiscordNotifier';
import { ethers } from 'ethers';

async function testDiscordNotifications(webhookUrl: string) {
  console.log('🧪 Testing Discord Webhook Notifications');
  console.log('======================================\n');

  const notifier = new DiscordNotifier({
    webhookUrl,
    username: 'Chain Academy Bot [TEST]',
    enabled: true,
    retryAttempts: 3
  });

  try {
    // Test 1: Basic test notification
    console.log('1️⃣ Testing basic webhook...');
    const testResult = await notifier.sendTestNotification();
    if (testResult) {
      console.log('✅ Basic webhook test passed');
    } else {
      console.log('❌ Basic webhook test failed');
      return;
    }
    
    await sleep(2000);

    // Test 2: Bot startup notification
    console.log('2️⃣ Testing bot startup notification...');
    await notifier.notifyBotStartup('2.0.0-test', 4);
    console.log('✅ Startup notification sent');
    
    await sleep(2000);

    // Test 3: Payment success notification
    console.log('3️⃣ Testing payment success notification...');
    await notifier.notifyPaymentSuccess(
      '0x1234567890123456789012345678901234567890123456789012345678901234',
      '0xMentor123456789012345678901234567890123456',
      ethers.parseEther('50'), // 50 USDC
      'USDC',
      'Base',
      '0xabcdef123456789012345678901234567890123456789012345678901234567890'
    );
    console.log('✅ Payment success notification sent');
    
    await sleep(2000);

    // Test 4: Refund notification
    console.log('4️⃣ Testing refund notification...');
    await notifier.notifyRefundProcessed(
      '0x9876543210987654321098765432109876543210987654321098765432109876',
      '0xStudent123456789012345678901234567890123456',
      ethers.parseEther('25'), // 25 USDC
      'USDC',
      'Optimism',
      'Session expired - no-show'
    );
    console.log('✅ Refund notification sent');
    
    await sleep(2000);

    // Test 5: Execution summary
    console.log('5️⃣ Testing execution summary...');
    await notifier.notifyExecutionSummary(
      15,  // total processed
      12,  // successful
      3,   // failed
      ethers.parseEther('0.05'), // gas used
      45000 // execution time ms
    );
    console.log('✅ Execution summary sent');
    
    await sleep(2000);

    // Test 6: Error notification
    console.log('6️⃣ Testing error notification...');
    await notifier.notifyError(
      'Test Error Scenario',
      'This is a test error message to verify error notifications are working correctly',
      {
        'Chain ID': '8453',
        'Session ID': '0x1234...5678',
        'Error Code': 'TEST_ERROR_001'
      }
    );
    console.log('✅ Error notification sent');
    
    await sleep(2000);

    // Test 7: Critical alert
    console.log('7️⃣ Testing critical alert...');
    await notifier.notifyCritical(
      'Test Critical Alert',
      'This is a test critical alert to verify emergency notifications',
      'Check bot logs and restart if necessary'
    );
    console.log('✅ Critical alert sent');
    
    await sleep(2000);

    // Test 8: Daily report
    console.log('8️⃣ Testing daily report...');
    await notifier.notifyDailyReport(
      new Date().toLocaleDateString(),
      {
        totalSessions: 25,
        totalPayments: 20,
        totalRefunds: 5,
        totalVolume: ethers.parseEther('1250'),
        successRate: 95.5,
        gasSpent: ethers.parseEther('0.125')
      }
    );
    console.log('✅ Daily report sent');

    console.log('\n🎉 All Discord notification tests completed successfully!');
    console.log('\nCheck your Discord channel to verify all messages were received.');
    
  } catch (error) {
    console.error('❌ Discord notification test failed:', error);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Discord Webhook Test Script

Usage: ts-node test-discord-notifications.ts <webhook_url>

Example:
  ts-node test-discord-notifications.ts "https://discord.com/api/webhooks/123456789/abcdef..."

To get a Discord webhook URL:
1. Go to your Discord server
2. Right-click on the channel where you want notifications
3. Select "Edit Channel" → "Integrations" → "Webhooks"  
4. Click "New Webhook" or "Copy Webhook URL"
5. Use that URL with this script

Environment variable alternative:
  BOT_DISCORD_WEBHOOK_URL="https://discord.com/..." ts-node test-discord-notifications.ts
`);
    process.exit(1);
  }

  let webhookUrl = args[0];
  
  // Check if using environment variable
  if (!webhookUrl && process.env.BOT_DISCORD_WEBHOOK_URL) {
    webhookUrl = process.env.BOT_DISCORD_WEBHOOK_URL;
    console.log('Using webhook URL from BOT_DISCORD_WEBHOOK_URL environment variable');
  }

  if (!webhookUrl) {
    console.error('❌ No webhook URL provided');
    process.exit(1);
  }

  // Validate webhook URL format
  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    console.error('❌ Invalid Discord webhook URL format');
    console.error('Expected: https://discord.com/api/webhooks/...');
    process.exit(1);
  }

  await testDiscordNotifications(webhookUrl);
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