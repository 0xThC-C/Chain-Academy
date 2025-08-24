#!/usr/bin/env ts-node

/**
 * ProgressiveEscrowV8 Bot Launcher
 * Enhanced Chain Academy payment bot with comprehensive fixes
 */

import dotenv from 'dotenv';
import { DailyPaymentBotV8 } from './bots/DailyPaymentBotV8';
import { BotConfigV8, ChainConfigV8 } from './bots/V8Types';
import { DiscordLogMonitor } from './monitoring/DiscordLogMonitor';

// Load V8 environment configuration
dotenv.config({ path: '.env.v8' });

function validateEnvironment() {
  const required = [
    'BOT_NAME',
    'PRIVATE_KEY',
    'DISCORD_WEBHOOK_URL',
    'BASE_RPC_URL',
    'OPTIMISM_RPC_URL', 
    'ARBITRUM_RPC_URL',
    'POLYGON_RPC_URL'
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`❌ Missing required environment variable: ${key}`);
    }
  }
}

function createV8Config(): BotConfigV8 {
  return {
    name: process.env.BOT_NAME || 'ChainAcademy-PaymentBot-V8',
    version: process.env.BOT_VERSION || '8.0.0',
    environment: process.env.ENVIRONMENT || 'mainnet',
    enabled: process.env.BOT_ENABLED === 'true',
    privateKey: process.env.PRIVATE_KEY!,
    cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL!,
    enableDiscordNotifications: process.env.ENABLE_DISCORD_NOTIFICATIONS === 'true',
    
    // V8 Enhanced features
    v8Features: {
      enhancedMonitoring: process.env.V8_FEATURES_ENHANCED_MONITORING === 'true',
      autoRecovery: process.env.V8_FEATURES_AUTO_RECOVERY === 'true',
      disputeHandling: process.env.V8_FEATURES_DISPUTE_HANDLING === 'true',
      multiVersionSupport: process.env.V8_FEATURES_MULTI_VERSION_SUPPORT === 'true',
      precisionPayments: process.env.V8_FEATURES_PRECISION_PAYMENTS === 'true'
    },
    
    // V8 Processing settings
    v8Settings: {
      maxRecoveryAttempts: parseInt(process.env.V8_MAX_RECOVERY_ATTEMPTS || '3'),
      healthCheckInterval: parseInt(process.env.V8_HEALTH_CHECK_INTERVAL || '300000'),
      batchProcessingSize: parseInt(process.env.V8_BATCH_PROCESSING_SIZE || '10'),
      emergencyThresholds: {
        maxStateTransitions: parseInt(process.env.V8_MAX_STATE_TRANSITIONS || '20'),
        maxPauseTime: parseInt(process.env.V8_MAX_PAUSE_TIME || '86400'),
        maxDisputeTime: parseInt(process.env.V8_MAX_DISPUTE_TIME || '604800')
      }
    },
    
    // V8 Monitoring
    monitoring: {
      enableRealTimeAlerts: process.env.V8_ENABLE_REAL_TIME_ALERTS === 'true',
      enablePredictiveAlerts: process.env.V8_ENABLE_PREDICTIVE_ALERTS === 'true',
      enablePerformanceMetrics: process.env.V8_ENABLE_PERFORMANCE_METRICS === 'true',
      healthCheckEndpoints: (process.env.HEALTH_CHECK_ENDPOINTS || '').split(',').filter(url => url.trim())
    },
    
    // Session storage
    sessionStoragePath: process.env.SESSION_STORAGE_PATH || './data/session-tracker-v8.json'
  };
}

function createChainConfigs(): ChainConfigV8[] {
  const migrationMode = process.env.MIGRATION_MODE as 'v7-only' | 'dual-support' | 'v8-only' || 'dual-support';
  
  return [
    // Base
    {
      chainId: 8453,
      name: 'Base',
      rpcUrl: process.env.BASE_RPC_URL!,
      contractAddress: process.env.BASE_CONTRACT_V7!,
      contractAddressV8: process.env.BASE_CONTRACT_V8 || '',
      v8Enabled: !!process.env.BASE_CONTRACT_V8,
      migrationMode,
      rpcSettings: {
        timeout: parseInt(process.env.RPC_TIMEOUT || '30000'),
        retries: parseInt(process.env.RPC_RETRIES || '3'),
        fallbackRpcs: []
      }
    },
    
    // Optimism
    {
      chainId: 10,
      name: 'Optimism', 
      rpcUrl: process.env.OPTIMISM_RPC_URL!,
      contractAddress: process.env.OPTIMISM_CONTRACT_V7!,
      contractAddressV8: process.env.OPTIMISM_CONTRACT_V8 || '',
      v8Enabled: !!process.env.OPTIMISM_CONTRACT_V8,
      migrationMode,
      rpcSettings: {
        timeout: parseInt(process.env.RPC_TIMEOUT || '30000'),
        retries: parseInt(process.env.RPC_RETRIES || '3'),
        fallbackRpcs: []
      }
    },
    
    // Arbitrum
    {
      chainId: 42161,
      name: 'Arbitrum',
      rpcUrl: process.env.ARBITRUM_RPC_URL!,
      contractAddress: process.env.ARBITRUM_CONTRACT_V7!,
      contractAddressV8: process.env.ARBITRUM_CONTRACT_V8 || '',
      v8Enabled: !!process.env.ARBITRUM_CONTRACT_V8,
      migrationMode,
      rpcSettings: {
        timeout: parseInt(process.env.RPC_TIMEOUT || '30000'),
        retries: parseInt(process.env.RPC_RETRIES || '3'),
        fallbackRpcs: []
      }
    },
    
    // Polygon
    {
      chainId: 137,
      name: 'Polygon',
      rpcUrl: process.env.POLYGON_RPC_URL!,
      contractAddress: process.env.POLYGON_CONTRACT_V7!,
      contractAddressV8: process.env.POLYGON_CONTRACT_V8 || '',
      v8Enabled: !!process.env.POLYGON_CONTRACT_V8,
      migrationMode,
      rpcSettings: {
        timeout: parseInt(process.env.RPC_TIMEOUT || '30000'),
        retries: parseInt(process.env.RPC_RETRIES || '3'),
        fallbackRpcs: []
      }
    }
  ];
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║              🤖 Chain Academy V8                   ║
║           Enhanced Payment Bot Launch              ║
║                                                   ║
║  🆕 V8 Features: Bug fixes & Enhanced monitoring  ║
║  🔧 Auto-recovery & Dispute handling              ║
║  📊 Precision payments & Health diagnostics       ║
║  📢 Real-time Discord logging enabled             ║
╚═══════════════════════════════════════════════════╝
`);

  // Initialize Discord Log Monitor
  const logMonitor = new DiscordLogMonitor({
    discordWebhook: process.env.DISCORD_WEBHOOK_URL || '',
    logLevel: 'info',
    enableWalletMonitoring: true,
    enableTransactionLogs: true,
    enablePerformanceMetrics: true,
    walletBalanceThreshold: '0.005',
    reportInterval: 60
  });

  try {
    console.log('🔍 Step 1: Validating V8 configuration...');
    validateEnvironment();
    console.log('✅ V8 configuration validation passed');

    await logMonitor.logBotStatus('starting', 'V8 Bot validation completed successfully');

    console.log('\n🔧 Step 2: Creating V8 bot instance...');
    const config = createV8Config();
    const chainConfigs = createChainConfigs();

    console.log(`📊 Configured for ${chainConfigs.length} chains:`);
    const chainSummary = chainConfigs.map(chain => {
      const v8Status = chain.v8Enabled ? '✅ V8 Ready' : '⏳ V7 Only';
      console.log(`   - ${chain.name} (${chain.chainId}): ${v8Status}`);
      if (chain.v8Enabled) {
        console.log(`     V8: ${chain.contractAddressV8}`);
      }
      console.log(`     V7: ${chain.contractAddress}`);
      return {
        name: chain.name,
        chainId: chain.chainId,
        v8Enabled: chain.v8Enabled,
        v8Contract: chain.contractAddressV8,
        v7Contract: chain.contractAddress
      };
    });

    await logMonitor.logBotStatus('starting', `Bot configured for ${chainConfigs.length} chains`, {
      chains: chainSummary,
      walletAddress: config.walletAddress
    });

    const bot = new DailyPaymentBotV8(config, chainConfigs);

    console.log('\n💓 Step 3: Performing V8 health check...');
    const healthInfo = bot.getHealthInfo();
    console.log(`   Health Status: ${healthInfo.healthy ? '✅ Healthy' : '⚠️ Issues detected'}`);
    console.log(`   Details: ${healthInfo.details}`);
    
    if (healthInfo.issues.length > 0) {
      console.log('   Issues:');
      healthInfo.issues.forEach(issue => console.log(`     - ${issue}`));
      await logMonitor.logSecurity('warning', 'Health check found issues', {
        issues: healthInfo.issues,
        details: healthInfo.details
      });
    }

    await logMonitor.logBotStatus('running', 'V8 bot health check completed', {
      healthy: healthInfo.healthy,
      details: healthInfo.details,
      issues: healthInfo.issues
    });

    console.log('\n✅ V8 bot initialization completed successfully!');
    console.log('🔄 Starting V8 automated payment processing...');

    // Start the scheduler
    bot.startScheduler();

    console.log('\n📊 V8 Bot Status: RUNNING');
    console.log('💡 Use Ctrl+C to gracefully shutdown');

    await logMonitor.logBotStatus('running', 'V8 Bot is now fully operational', {
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      walletAddress: config.walletAddress,
      chainsEnabled: chainConfigs.filter(c => c.v8Enabled).length,
      totalChains: chainConfigs.length
    });

    // Graceful shutdown handler
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Initiating graceful V8 shutdown...');
      
      await logMonitor.logBotStatus('stopping', 'Bot shutdown initiated by user signal', {
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
      
      bot.stopScheduler();
      logMonitor.stop();
      
      setTimeout(async () => {
        console.log('✅ V8 bot stopped successfully');
        await logMonitor.logBotStatus('stopping', 'Bot shutdown completed successfully', {
          finalUptime: process.uptime()
        });
        process.exit(0);
      }, 2000);
    });

    // Keep the process running
    process.on('uncaughtException', async (error) => {
      console.error('💥 V8 Uncaught Exception:', error);
      
      await logMonitor.logError(error, 'Uncaught Exception - Bot will restart');
      await logMonitor.logSecurity('critical', 'Bot crashed due to uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 V8 Unhandled Rejection at:', promise, 'reason:', reason);
      
      await logMonitor.logError(new Error(String(reason)), 'Unhandled Promise Rejection');
      await logMonitor.logSecurity('error', 'Unhandled promise rejection detected', {
        reason: String(reason)
      });
    });


  } catch (error) {
    console.error('❌ V8 bot startup failed:', error);
    
    await logMonitor.logError(error as Error, 'Bot startup failure');
    await logMonitor.logSecurity('critical', 'Bot failed to start - manual intervention required', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    process.exit(1);
  }
}

// Execute main function
if (require.main === module) {
  main();
}

export { main };