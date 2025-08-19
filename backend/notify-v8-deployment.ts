#!/usr/bin/env ts-node

/**
 * Send V8 Deployment Success Notification
 */

import dotenv from 'dotenv';
import { DiscordNotifier } from './bots/DiscordNotifier';

dotenv.config({ path: '.env.v8' });

async function notifyV8Deployment() {
  const discord = new DiscordNotifier({
    webhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    username: 'Chain Academy V8 Bot',
    retryAttempts: 3,
    retryDelay: 1000,
    enabled: true
  });

  // Send bot startup notification 
  const startupSuccess = await discord.notifyBotStartup('8.0.0', 4);
  
  // Send additional deployment details
  const deploymentSuccess = await discord.notifyError(
    '🚀 V8 Deployment Complete',
    `✅ ProgressiveEscrowV8 deployed successfully on all networks:\n\n` +
    `🔗 **Base**: 0x3397ec53a2749210618d797424036694f4bcc745\n` +
    `🔗 **Optimism**: 0x3397ec53a2749210618d797424036694f4bcc745\n` +
    `🔗 **Arbitrum**: 0x7c188086d6c335a6ebbe0acbc0ace458f668ce5f\n` +
    `🔗 **Polygon**: 0x3397ec53a2749210618d797424036694f4bcc745\n\n` +
    `🆕 **V8 Critical Fixes Applied**:\n` +
    `• Fixed autoCompleteSession for Created sessions\n` +
    `• Fixed BigInt serialization errors\n` +
    `• Enhanced 9-state machine with disputes\n` +
    `• Multiple refund pathways (no-show, partial, emergency)\n` +
    `• Auto-recovery system for stuck sessions\n` +
    `• Real-time health monitoring\n\n` +
    `🔄 **Migration Status**: V7 Bot STOPPED → V8 Bot RUNNING\n` +
    `⚙️ **Mode**: V8-only (all networks using V8 contracts)\n` +
    `📅 **Schedule**: Every 6 hours automatic processing`
  );
  
  const success = startupSuccess && deploymentSuccess;

  console.log(success ? '✅ V8 deployment notification sent!' : '❌ Failed to send notification');
}

notifyV8Deployment();