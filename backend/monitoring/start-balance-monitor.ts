#!/usr/bin/env node

/**
 * Wallet Balance Monitor Starter
 * 
 * Sistema dedicado para monitoramento de saldos em tempo real
 * Integrado com Discord para alertas automáticos
 */

import { WalletBalanceMonitor, NetworkConfig } from './WalletBalanceMonitor';
import { DiscordLogMonitor } from './DiscordLogMonitor';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.v8' });

const WALLET_ADDRESS = '0x4370772caa2B2FC8E372f242a6CAA0A8293Fb765';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

class BalanceMonitorService {
  private balanceMonitor: WalletBalanceMonitor;
  private logger: DiscordLogMonitor;

  constructor() {
    // Configurar logger Discord
    this.logger = new DiscordLogMonitor({
      discordWebhook: DISCORD_WEBHOOK_URL,
      logLevel: 'info',
      enableWalletMonitoring: true,
      enableTransactionLogs: false,
      enablePerformanceMetrics: false,
      walletBalanceThreshold: '0.005',
      reportInterval: 120 // Report a cada 2 horas
    });

    // Configurar redes para monitoramento
    const networks: NetworkConfig[] = [
      {
        name: 'Base',
        chainId: 8453,
        rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
        nativeToken: 'ETH',
        alertThreshold: '0.01', // Alerta quando < 0.01 ETH
        criticalThreshold: '0.005' // Crítico quando < 0.005 ETH
      },
      {
        name: 'Arbitrum',
        chainId: 42161,
        rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        nativeToken: 'ETH',
        alertThreshold: '0.01',
        criticalThreshold: '0.005'
      },
      {
        name: 'Optimism',
        chainId: 10,
        rpcUrl: process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
        nativeToken: 'ETH',
        alertThreshold: '0.01',
        criticalThreshold: '0.005'
      },
      {
        name: 'Polygon',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
        nativeToken: 'MATIC',
        alertThreshold: '20.0', // Alerta quando < 20 MATIC
        criticalThreshold: '10.0' // Crítico quando < 10 MATIC
      }
    ];

    // Inicializar monitor de saldos
    this.balanceMonitor = new WalletBalanceMonitor(
      WALLET_ADDRESS,
      networks,
      this.logger,
      30 // Verificar a cada 30 minutos
    );

    this.startService();
  }

  async startService(): Promise<void> {
    try {
      console.log('💰 Starting Chain Academy V8 Balance Monitor...\n');
      console.log(`🔍 Monitoring wallet: ${WALLET_ADDRESS}`);
      console.log(`📊 Networks: Base, Arbitrum, Optimism, Polygon`);
      console.log(`⏰ Check interval: 30 minutes`);
      console.log(`📢 Discord alerts: Enabled\n`);

      // Notificar início do monitoramento
      await this.logger.logBotStatus('starting', 'Balance monitoring service starting', {
        walletAddress: WALLET_ADDRESS,
        networks: ['Base', 'Arbitrum', 'Optimism', 'Polygon'],
        checkInterval: '30 minutes'
      });

      // Realizar check inicial imediato
      console.log('🔍 Performing initial balance check...');
      const initialBalances = await this.balanceMonitor.getCurrentBalances();
      
      console.log('📊 Initial Balance Report:');
      initialBalances.forEach(balance => {
        const status = balance.critical ? '🔴 CRITICAL' : 
                      balance.warning ? '🟡 WARNING' : '🟢 HEALTHY';
        console.log(`   ${balance.network}: ${balance.balance} ${balance.network === 'Polygon' ? 'MATIC' : 'ETH'} ${status}`);
      });

      // Iniciar monitoramento contínuo
      this.balanceMonitor.start();

      // Notificar que o serviço está rodando
      await this.logger.logBotStatus('running', 'Balance monitoring service is now active', {
        initialBalances: initialBalances.map(b => ({
          network: b.network,
          balance: b.balance,
          status: b.critical ? 'CRITICAL' : b.warning ? 'WARNING' : 'HEALTHY'
        }))
      });

      console.log('\n✅ Balance monitoring service started successfully!');
      console.log('💡 Use Ctrl+C to stop monitoring');

      // Configurar handlers para shutdown graceful
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start balance monitoring service:', error);
      
      await this.logger.logError(error as Error, 'Balance monitor startup failure');
      await this.logger.logSecurity('critical', 'Balance monitoring service failed to start', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down Balance Monitor...');

    try {
      await this.logger.logBotStatus('stopping', 'Balance monitoring service shutting down', {
        uptime: process.uptime(),
        finalCheck: new Date().toISOString()
      });

      this.balanceMonitor.stop();
      this.logger.stop();

      console.log('✅ Balance Monitor stopped gracefully');
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }

    process.exit(0);
  }

  /**
   * Comando para verificar saldo de uma rede específica
   */
  async checkSingleNetwork(network: string): Promise<void> {
    console.log(`🔍 Checking balance for ${network}...`);
    
    const balance = await this.balanceMonitor.checkSingleNetwork(network);
    
    if (balance) {
      const status = balance.critical ? '🔴 CRITICAL' : 
                    balance.warning ? '🟡 WARNING' : '🟢 HEALTHY';
      
      console.log(`💰 ${balance.network}: ${balance.balance} ${balance.network === 'Polygon' ? 'MATIC' : 'ETH'} ${status}`);
      
      await this.logger.logWallet(`Manual balance check for ${balance.network}`, {
        network: balance.network,
        balance: balance.balance,
        status: status.split(' ')[1]
      });
    } else {
      console.log(`❌ Network ${network} not found or error occurred`);
    }
  }

  /**
   * Comando para gerar relatório completo
   */
  async generateReport(): Promise<void> {
    console.log('📊 Generating comprehensive balance report...');
    
    const balances = await this.balanceMonitor.getCurrentBalances();
    
    console.log('\n💰 Complete Balance Report:');
    console.log('================================');
    
    balances.forEach(balance => {
      const status = balance.critical ? '🔴 CRITICAL' : 
                    balance.warning ? '🟡 WARNING' : '🟢 HEALTHY';
      
      console.log(`${balance.network}:`);
      console.log(`  Balance: ${balance.balance} ${balance.network === 'Polygon' ? 'MATIC' : 'ETH'}`);
      console.log(`  Status: ${status}`);
      console.log(`  Threshold: ${balance.threshold} ${balance.network === 'Polygon' ? 'MATIC' : 'ETH'}`);
      console.log('');
    });

    console.log('================================');
    console.log(`Total Networks: ${balances.length}`);
    console.log(`Healthy: ${balances.filter(b => !b.warning && !b.critical).length}`);
    console.log(`Warning: ${balances.filter(b => b.warning).length}`);
    console.log(`Critical: ${balances.filter(b => b.critical).length}`);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const service = new BalanceMonitorService();

  switch (command) {
    case 'check':
      const network = args[1];
      if (network) {
        service.checkSingleNetwork(network).then(() => process.exit(0));
      } else {
        console.log('Usage: npm run balance:check <network>');
        console.log('Available networks: base, arbitrum, optimism, polygon');
      }
      break;

    case 'report':
      service.generateReport().then(() => process.exit(0));
      break;

    case 'monitor':
    default:
      // Start continuous monitoring (default)
      break;
  }
}

export { BalanceMonitorService };