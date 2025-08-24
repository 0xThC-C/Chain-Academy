#!/usr/bin/env node

/**
 * Discord Log Monitor Starter
 * 
 * Inicia o sistema de monitoramento de logs em tempo real
 * Integra com o bot principal para capturar todos os eventos
 */

import { DiscordLogMonitor } from './DiscordLogMonitor';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.v8' });

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1406986268591525938/fPt_n2ITnBv8LDb7yT3ud0BS8t8CnHc8j8Ww6rM_PvnOlWsv9LsLY36d3bXRXD_WSVz7';
const BOT_WALLET = '0x4370772caa2B2FC8E372f242a6CAA0A8293Fb765';

class V8LogMonitorService {
  private logMonitor: DiscordLogMonitor;
  private networks = ['base', 'arbitrum', 'optimism', 'polygon'];

  constructor() {
    this.logMonitor = new DiscordLogMonitor({
      discordWebhook: DISCORD_WEBHOOK_URL,
      logLevel: 'info',
      enableWalletMonitoring: true,
      enableTransactionLogs: true,
      enablePerformanceMetrics: true,
      walletBalanceThreshold: '0.005', // Alert if balance < 0.005 ETH
      reportInterval: 60 // Report every hour
    });

    this.startMonitoring();
  }

  async startMonitoring(): Promise<void> {
    try {
      // Send startup notification
      await this.logMonitor.logBotStatus('starting', 'Discord log monitoring service starting', {
        wallet: BOT_WALLET,
        networks: this.networks,
        timestamp: new Date().toISOString()
      });

      // Start wallet balance monitoring
      setInterval(async () => {
        await this.logMonitor.checkWalletBalances(BOT_WALLET, this.networks);
      }, 30 * 60 * 1000); // Check every 30 minutes

      // Send running notification
      await this.logMonitor.logBotStatus('running', 'Discord log monitoring is now active', {
        monitoringInterval: '30 minutes',
        reportInterval: '60 minutes',
        wallet: BOT_WALLET
      });

      console.log('📊 Discord Log Monitor started successfully');
      console.log(`🔍 Monitoring wallet: ${BOT_WALLET}`);
      console.log(`🌐 Networks: ${this.networks.join(', ')}`);
      console.log('📢 Discord notifications enabled');

      // Keep the process alive
      process.on('SIGINT', async () => {
        await this.shutdown();
      });

      process.on('SIGTERM', async () => {
        await this.shutdown();
      });

    } catch (error) {
      console.error('❌ Failed to start log monitor:', error);
      await this.logMonitor.logError(error as Error, 'Log monitor startup');
      process.exit(1);
    }
  }

  /**
   * Simulate bot activity logging (for testing)
   */
  async simulateActivity(): Promise<void> {
    // Simulate wallet activity
    await this.logMonitor.logWallet('Wallet balance check completed', {
      wallet: BOT_WALLET,
      networks: this.networks
    });

    // Simulate transaction
    await this.logMonitor.logTransaction(
      '0x123456789abcdef',
      'payment',
      '50.0',
      'USDT',
      'base',
      '0xabcdef123456789',
      true
    );

    // Simulate security check
    await this.logMonitor.logSecurity('warning', 'Routine security check completed', {
      checks: ['wallet balance', 'transaction history', 'key rotation status']
    });
  }

  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down Discord Log Monitor...');
    
    await this.logMonitor.logBotStatus('stopping', 'Discord log monitoring service shutting down', {
      uptime: process.uptime(),
      stats: this.logMonitor.getLogStats()
    });

    this.logMonitor.stop();
    
    console.log('✅ Discord Log Monitor stopped gracefully');
    process.exit(0);
  }

  /**
   * Get monitor instance (for integration with other services)
   */
  getMonitor(): DiscordLogMonitor {
    return this.logMonitor;
  }
}

// Global monitor instance for external access
let globalMonitor: V8LogMonitorService | null = null;

/**
 * Get global monitor instance
 */
export function getGlobalMonitor(): DiscordLogMonitor | null {
  return globalMonitor?.getMonitor() || null;
}

// Start the service if run directly
if (require.main === module) {
  globalMonitor = new V8LogMonitorService();

  // Test mode - simulate some activity after startup
  setTimeout(async () => {
    if (globalMonitor && process.argv.includes('--test')) {
      console.log('🧪 Running in test mode - simulating activity');
      await globalMonitor.getMonitor().logWallet('Test wallet activity', { test: true });
      await globalMonitor.getMonitor().logBotStatus('running', 'Test bot activity', { test: true });
    }
  }, 5000);
}

export { V8LogMonitorService };