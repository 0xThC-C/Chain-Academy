#!/usr/bin/env node

// V8 Contract Update Notification Script

import { DiscordNotifier } from './bots/DiscordNotifier';

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1406986268591525938/fPt_n2ITnBv8LDb7yT3ud0BS8t8CnHc8j8Ww6rM_PvnOlWsv9LsLY36d3bXRXD_WSVz7';

async function notifyV8Update() {
    const discord = new DiscordNotifier({
        webhookUrl: DISCORD_WEBHOOK_URL,
        username: 'Chain Academy V8 Update',
        retryAttempts: 3,
        retryDelay: 1000,
        enabled: true
    });

    const message = {
        embeds: [{
            title: '🔄 V8 Contract Update Complete',
            description: 'Chain Academy V8 contracts have been updated with V7 compatibility fixes',
            color: 0x00FF00,
            fields: [
                {
                    name: '🌐 Arbitrum',
                    value: '`0x74d6ae04f62fdd2d4942babad924ad6fc693329f`',
                    inline: true
                },
                {
                    name: '🔷 Base',
                    value: '`0x2a9d167e30195ba5fd29cfc09622be0d02da91be`',
                    inline: true
                },
                {
                    name: '🔴 Optimism', 
                    value: '`0xd5bbf7f5449b805cb5479e6aa04e722c28aa9ba1`',
                    inline: true
                },
                {
                    name: '🟣 Polygon',
                    value: '`0x2a9d167e30195ba5fd29cfc09622be0d02da91be`',
                    inline: true
                },
                {
                    name: '✨ V8.0.1 Features',
                    value: '• V7 Frontend Compatibility ✅\n• Enhanced State Machine ✅\n• Auto-Recovery System ✅\n• Dispute Resolution ✅\n• Progressive Payments ✅',
                    inline: false
                },
                {
                    name: '🚀 Status',
                    value: 'Bot updated and running with new contract addresses',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Chain Academy V8 - Production Ready'
            }
        }]
    };

    try {
        await discord.sendEmbed(message.embeds[0]);
        console.log('✅ V8 update notification sent successfully!');
    } catch (error) {
        console.error('❌ Failed to send V8 update notification:', error);
    }
}

notifyV8Update().catch(console.error);