/**
 * Real-time Wallet Balance Monitor
 * 
 * Monitora saldos da wallet em todas as redes e envia alertas via Discord
 * quando os saldos ficam abaixo dos limites configurados
 */

import { ethers } from 'ethers';
import { DiscordLogMonitor } from './DiscordLogMonitor';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeToken: string;
  alertThreshold: string; // em ETH/token nativo
  criticalThreshold: string; // limite crítico
}

export interface BalanceInfo {
  network: string;
  balance: string;
  balanceUSD?: number;
  threshold: string;
  critical: boolean;
  warning: boolean;
}

export class WalletBalanceMonitor {
  private walletAddress: string;
  private networks: NetworkConfig[];
  private logger: DiscordLogMonitor;
  private checkInterval: number; // em minutos
  private monitoringTimer?: NodeJS.Timeout;
  private lastBalances: { [network: string]: string } = {};

  constructor(
    walletAddress: string,
    networks: NetworkConfig[],
    logger: DiscordLogMonitor,
    checkInterval: number = 30
  ) {
    this.walletAddress = walletAddress;
    this.networks = networks;
    this.logger = logger;
    this.checkInterval = checkInterval;
  }

  /**
   * Iniciar monitoramento de saldos
   */
  start(): void {
    console.log(`💰 Starting wallet balance monitoring for ${this.walletAddress}`);
    console.log(`🔍 Checking every ${this.checkInterval} minutes on ${this.networks.length} networks`);

    // Verificação inicial
    this.checkAllBalances();

    // Configurar timer para verificações periódicas
    this.monitoringTimer = setInterval(() => {
      this.checkAllBalances();
    }, this.checkInterval * 60 * 1000);
  }

  /**
   * Parar monitoramento
   */
  stop(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
      console.log('💰 Wallet balance monitoring stopped');
    }
  }

  /**
   * Verificar saldos em todas as redes
   */
  private async checkAllBalances(): Promise<void> {
    console.log(`💰 Checking wallet balances: ${new Date().toLocaleTimeString()}`);

    const balanceResults: BalanceInfo[] = [];

    for (const network of this.networks) {
      try {
        const balance = await this.getNetworkBalance(network);
        balanceResults.push(balance);

        // Verificar se houve mudança significativa no saldo
        await this.checkBalanceChanges(network.name, balance.balance);

        // Verificar limites de alerta
        await this.checkBalanceAlerts(balance);

      } catch (error) {
        console.error(`❌ Failed to check balance for ${network.name}:`, error);
        
        await this.logger.logError(
          error as Error, 
          `Balance check failed for ${network.name}`
        );
      }
    }

    // Enviar relatório consolidado se solicitado
    if (process.env.ENABLE_BALANCE_REPORTS === 'true') {
      await this.sendBalanceReport(balanceResults);
    }
  }

  /**
   * Obter saldo de uma rede específica
   */
  private async getNetworkBalance(network: NetworkConfig): Promise<BalanceInfo> {
    const provider = new ethers.JsonRpcProvider(network.rpcUrl);
    
    try {
      const balanceWei = await provider.getBalance(this.walletAddress);
      const balance = ethers.formatEther(balanceWei);
      
      const alertThreshold = parseFloat(network.alertThreshold);
      const criticalThreshold = parseFloat(network.criticalThreshold);
      const currentBalance = parseFloat(balance);

      return {
        network: network.name,
        balance,
        threshold: network.alertThreshold,
        critical: currentBalance <= criticalThreshold,
        warning: currentBalance <= alertThreshold && currentBalance > criticalThreshold
      };

    } catch (error) {
      console.error(`Error getting balance for ${network.name}:`, error);
      throw error;
    }
  }

  /**
   * Verificar mudanças significativas no saldo
   */
  private async checkBalanceChanges(network: string, currentBalance: string): Promise<void> {
    const lastBalance = this.lastBalances[network];
    
    if (lastBalance && lastBalance !== currentBalance) {
      const change = parseFloat(currentBalance) - parseFloat(lastBalance);
      const changePercent = Math.abs(change / parseFloat(lastBalance)) * 100;

      // Log mudanças significativas (>10%)
      if (changePercent > 10) {
        const direction = change > 0 ? 'increased' : 'decreased';
        const emoji = change > 0 ? '📈' : '📉';
        
        await this.logger.logWallet(
          `${emoji} Wallet balance ${direction} significantly on ${network}`,
          {
            network,
            previousBalance: lastBalance,
            currentBalance,
            change: change.toFixed(6),
            changePercent: changePercent.toFixed(2)
          }
        );
      }
    }

    this.lastBalances[network] = currentBalance;
  }

  /**
   * Verificar alertas de saldo baixo
   */
  private async checkBalanceAlerts(balance: BalanceInfo): Promise<void> {
    if (balance.critical) {
      await this.logger.logSecurity('critical', 
        `CRITICAL: Wallet balance extremely low on ${balance.network}`,
        {
          network: balance.network,
          balance: balance.balance,
          threshold: balance.threshold,
          walletAddress: this.walletAddress,
          actionRequired: 'Immediate funding required'
        }
      );

      console.log(`🚨 CRITICAL: Low balance on ${balance.network}: ${balance.balance}`);

    } else if (balance.warning) {
      await this.logger.logSecurity('warning',
        `WARNING: Wallet balance low on ${balance.network}`,
        {
          network: balance.network,
          balance: balance.balance,
          threshold: balance.threshold,
          walletAddress: this.walletAddress,
          recommendation: 'Consider funding wallet soon'
        }
      );

      console.log(`⚠️ WARNING: Low balance on ${balance.network}: ${balance.balance}`);
    }
  }

  /**
   * Enviar relatório consolidado de saldos
   */
  private async sendBalanceReport(balances: BalanceInfo[]): Promise<void> {
    const totalNetworks = balances.length;
    const criticalCount = balances.filter(b => b.critical).length;
    const warningCount = balances.filter(b => b.warning).length;
    const healthyCount = totalNetworks - criticalCount - warningCount;

    const reportColor = criticalCount > 0 ? 0xff0000 : 
                       warningCount > 0 ? 0xffaa00 : 0x00ff00;

    const fields = balances.map(balance => ({
      name: `${balance.critical ? '🔴' : balance.warning ? '🟡' : '🟢'} ${balance.network}`,
      value: `${balance.balance} ${balance.network === 'Polygon' ? 'MATIC' : 'ETH'}`,
      inline: true
    }));

    // Adicionar resumo
    fields.unshift({
      name: '📊 Summary',
      value: `✅ Healthy: ${healthyCount}\n⚠️ Warning: ${warningCount}\n🚨 Critical: ${criticalCount}`,
      inline: false
    });

    await this.logger.discord.sendEmbed({
      title: '💰 Wallet Balance Report',
      description: `Balance check for wallet: \`${this.walletAddress.slice(0, 10)}...${this.walletAddress.slice(-8)}\``,
      color: reportColor,
      fields,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verificar saldo de uma rede específica manualmente
   */
  async checkSingleNetwork(networkName: string): Promise<BalanceInfo | null> {
    const network = this.networks.find(n => n.name.toLowerCase() === networkName.toLowerCase());
    
    if (!network) {
      console.error(`Network ${networkName} not found`);
      return null;
    }

    try {
      return await this.getNetworkBalance(network);
    } catch (error) {
      console.error(`Failed to check balance for ${networkName}:`, error);
      return null;
    }
  }

  /**
   * Obter todos os saldos atuais
   */
  async getCurrentBalances(): Promise<BalanceInfo[]> {
    const balances: BalanceInfo[] = [];

    for (const network of this.networks) {
      try {
        const balance = await this.getNetworkBalance(network);
        balances.push(balance);
      } catch (error) {
        console.error(`Failed to get balance for ${network.name}:`, error);
      }
    }

    return balances;
  }
}

export default WalletBalanceMonitor;