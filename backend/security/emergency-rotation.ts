#!/usr/bin/env node

/**
 * Emergency Key Rotation Script
 * 
 * Use this script in case of suspected wallet compromise
 * This will immediately generate a new wallet and prepare for migration
 */

import { SecureWalletGenerator } from './generate-secure-wallet';
import { DiscordNotifier } from '../bots/DiscordNotifier';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

async function emergencyRotation() {
    console.log('🚨 EMERGENCY KEY ROTATION INITIATED');
    console.log('⚠️  This should only be used in case of suspected compromise');
    console.log('');

    // Initialize Discord notifier
    const discord = new DiscordNotifier({
        webhookUrl: DISCORD_WEBHOOK_URL,
        username: 'Chain Academy Emergency System',
        enabled: true
    });

    try {
        // Notify emergency start
        await discord.sendEmbed({
            title: '🚨 EMERGENCY KEY ROTATION INITIATED',
            description: 'Emergency wallet rotation has been triggered due to suspected compromise',
            color: 0xff0000,
            fields: [
                {
                    name: '⚠️ Status',
                    value: 'Emergency rotation in progress',
                    inline: true
                },
                {
                    name: '🕐 Timestamp',
                    value: new Date().toISOString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        });

        // Generate new secure wallet
        console.log('🔐 Generating new secure wallet...');
        SecureWalletGenerator.generateWallets({
            count: 1,
            outputFormat: 'console'
        });

        console.log('');
        console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
        console.log('1. Copy the new private key (without 0x prefix)');
        console.log('2. Update production environment variable PRIVATE_KEY');
        console.log('3. Restart the bot: pm2 restart chain-academy-v8-bot');
        console.log('4. Monitor bot logs for successful startup');
        console.log('5. Fund new wallet with small amounts for testing');
        console.log('');
        
        // Notify emergency completion
        await discord.sendEmbed({
            title: '✅ Emergency Wallet Generated',
            description: 'New secure wallet has been generated. Manual intervention required to complete rotation.',
            color: 0xff9900,
            fields: [
                {
                    name: '📋 Next Steps',
                    value: '1. Update production environment\n2. Restart bot services\n3. Test new wallet functionality\n4. Fund new wallet for operations',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString()
        });

        console.log('✅ Emergency rotation preparation completed!');
        console.log('⚠️  Remember: Update production environment variables immediately');

    } catch (error) {
        console.error('❌ Emergency rotation failed:', error);
        
        await discord.sendEmbed({
            title: '❌ Emergency Rotation Failed',
            description: 'Emergency key rotation encountered an error',
            color: 0xff0000,
            fields: [
                {
                    name: '❌ Error',
                    value: error instanceof Error ? error.message : 'Unknown error',
                    inline: false
                },
                {
                    name: '🔧 Action Required',
                    value: 'Manual wallet generation and rotation needed immediately',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString()
        });
    }
}

// Execute emergency rotation
emergencyRotation().catch(console.error);