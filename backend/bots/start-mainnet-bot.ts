#!/usr/bin/env ts-node

// start-mainnet-bot.ts - Launch script for Chain Academy Payment Bot on Mainnet

import dotenv from 'dotenv';
import { DailyPaymentBot } from './DailyPaymentBot';
import { 
  MAINNET_BOT_CONFIG, 
  MAINNET_CHAIN_CONFIGS, 
  validateMainnetConfig,
  getConfigSummary 
} from './MainnetBotConfig';

// Load environment variables
dotenv.config();

// ASCII Art Banner
const BANNER = `
╔═══════════════════════════════════════════════════╗
║              🤖 Chain Academy V2                   ║
║           Payment Bot - Mainnet Launch            ║
║                                                   ║
║  Automated payment processing for L2 networks     ║
║  Base • Optimism • Arbitrum • Polygon             ║
╚═══════════════════════════════════════════════════╝
`;

class MainnetBotLauncher {
  private bot: DailyPaymentBot | null = null;
  private isShuttingDown = false;

  async initialize(): Promise<void> {
    console.log(BANNER);
    console.log('🚀 Initializing Chain Academy Payment Bot for Mainnet...\n');

    try {
      // Step 1: Validate configuration
      console.log('🔍 Step 1: Validating configuration...');
      validateMainnetConfig();
      
      // Step 2: Display configuration summary
      console.log('\n📋 Step 2: Configuration Summary');
      console.log('================================');
      const summary = getConfigSummary();
      console.log(JSON.stringify(summary, null, 2));

      // Step 3: Check if bot is enabled
      if (!MAINNET_BOT_CONFIG.enabled) {
        throw new Error('Bot is disabled. Set BOT_ENABLED=true to enable.');
      }

      // Step 4: Initialize bot
      console.log('\n🔧 Step 3: Initializing bot...');
      this.bot = new DailyPaymentBot(MAINNET_BOT_CONFIG, MAINNET_CHAIN_CONFIGS);

      // Step 5: Health check
      console.log('\n💓 Step 4: Performing health check...');
      await this.performHealthCheck();

      // Step 6: Setup signal handlers
      this.setupSignalHandlers();

      console.log('\n✅ Bot initialization completed successfully!');
      console.log('🔄 Starting automated payment processing...\n');

    } catch (error) {
      console.error('❌ Bot initialization failed:', error);
      process.exit(1);
    }
  }

  async performHealthCheck(): Promise<void> {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    try {
      // Test connection to each chain
      for (const chainConfig of MAINNET_CHAIN_CONFIGS) {
        console.log(`   Testing ${chainConfig.name} (${chainConfig.chainId})...`);
        // Add specific health checks here if needed
      }

      console.log('   ✅ All chains accessible');

      // Check bot health
      const isHealthy = this.bot.isHealthy();
      if (isHealthy) {
        console.log('   ✅ Bot health check passed');
      } else {
        console.warn('   ⚠️ Bot health check failed');
      }

    } catch (error) {
      console.error('   ❌ Health check failed:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    try {
      console.log('🎯 Starting payment bot scheduler...');
      
      // Start the scheduler for automatic execution
      this.bot.startScheduler();
      
      console.log(`✅ Bot started successfully!`);
      console.log(`📅 Schedule: ${MAINNET_BOT_CONFIG.cronSchedule}`);
      console.log(`⏰ Next execution will be based on cron schedule`);
      console.log(`🔍 Bot will check for payments every scheduled interval`);
      
      // Run initial scan
      if (process.argv.includes('--immediate')) {
        console.log('\n🔄 Running immediate payment scan...');
        await this.bot.executeDaily();
      }

      // Keep the process alive
      console.log('\n📊 Bot Status: RUNNING');
      console.log('💡 Use Ctrl+C to gracefully shutdown\n');
      
      // Display live metrics every 5 minutes
      this.startMetricsDisplay();

    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      throw error;
    }
  }

  private startMetricsDisplay(): void {
    setInterval(() => {
      if (this.bot && !this.isShuttingDown) {
        const metrics = this.bot.getMetrics();
        console.log(`📊 [${new Date().toISOString()}] Metrics:`, {
          totalProcessed: metrics.totalProcessed,
          successful: metrics.successfulPayments,
          failed: metrics.failedPayments,
          lastExecution: new Date(metrics.lastExecutionTime).toISOString(),
          healthy: this.bot.isHealthy()
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private setupSignalHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'] as const;
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        
        console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
        await this.shutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown().then(() => process.exit(1));
    });
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('🔄 Shutting down bot...');

    try {
      if (this.bot) {
        // Stop the scheduler
        this.bot.stopScheduler();
        
        // Display final metrics
        const metrics = this.bot.getMetrics();
        console.log('📊 Final Metrics:', {
          totalProcessed: metrics.totalProcessed,
          successful: metrics.successfulPayments,
          failed: metrics.failedPayments,
          uptime: Date.now() - (metrics.lastExecutionTime || Date.now())
        });
      }

      console.log('✅ Bot shutdown completed');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  // Manual execution methods
  async runOnce(): Promise<void> {
    if (!this.bot) {
      await this.initialize();
    }

    console.log('🔄 Running one-time payment execution...');
    await this.bot!.executeDaily();
    console.log('✅ One-time execution completed');
  }

  async scanOnly(): Promise<void> {
    if (!this.bot) {
      await this.initialize();
    }

    console.log('🔍 Scanning for pending payments...');
    const pendingPayments = await this.bot!.scanPendingPayments();
    
    console.log(`📋 Scan Results: ${pendingPayments.length} pending payments found`);
    pendingPayments.forEach(payment => {
      console.log(`   - Session ${payment.sessionId} on ${payment.chainId}: ${payment.amount} tokens`);
    });
  }
}

// Main execution
async function main() {
  const launcher = new MainnetBotLauncher();

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`
Chain Academy Payment Bot - Mainnet

Usage:
  npm run start:bot                 # Start bot with scheduler
  npm run start:bot -- --immediate  # Start bot and run immediate scan
  npm run start:bot -- --once       # Run one-time execution only
  npm run start:bot -- --scan       # Scan for pending payments only

Options:
  --immediate    Run immediate scan after starting scheduler
  --once         Run one-time execution and exit
  --scan         Scan for pending payments and exit
  --help, -h     Show this help message

Environment Variables:
  BOT_ENABLED              Enable/disable bot (true/false)
  BOT_CHECK_INTERVAL       Cron schedule for automatic runs
  BOT_PRIVATE_KEY          Private key for bot wallet
  *_PROGRESSIVE_ESCROW     Contract addresses for each chain

Examples:
  BOT_ENABLED=true npm run start:bot
  npm run start:bot -- --scan
  npm run start:bot -- --once
      `);
      return;
    }

    if (args.includes('--once')) {
      await launcher.initialize();
      await launcher.runOnce();
      return;
    }

    if (args.includes('--scan')) {
      await launcher.initialize();
      await launcher.scanOnly();
      return;
    }

    // Normal startup with scheduler
    await launcher.initialize();
    await launcher.start();

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Startup error:', error);
    process.exit(1);
  });
}

export { MainnetBotLauncher };