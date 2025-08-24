/**
 * Discord Log Monitor
 * 
 * Sistema de monitoramento em tempo real que envia logs importantes 
 * diretamente para o Discord, incluindo:
 * - Status do bot e wallet
 * - Transações processadas
 * - Erros e alertas
 * - Métricas de performance
 * - Rotação de chaves
 */

import { DiscordNotifier } from '../bots/DiscordNotifier';

export interface LogMonitorConfig {
  discordWebhook: string;
  logLevel: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  enableWalletMonitoring: boolean;
  enableTransactionLogs: boolean;
  enablePerformanceMetrics: boolean;
  walletBalanceThreshold: string; // ETH threshold for alerts
  reportInterval: number; // minutes
}

export interface LogEvent {
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data?: any;
  timestamp: number;
  category: 'wallet' | 'transaction' | 'bot' | 'system' | 'security';
}

export class DiscordLogMonitor {
  public discord: DiscordNotifier;
  private config: LogMonitorConfig;
  private logBuffer: LogEvent[] = [];
  private metricsInterval?: NodeJS.Timeout;
  private lastReportTime: number = 0;

  constructor(config: LogMonitorConfig) {
    this.config = config;
    this.discord = new DiscordNotifier({
      webhookUrl: config.discordWebhook,
      username: 'Chain Academy V8 Monitor',
      enabled: true
    });

    this.startPerformanceMonitoring();
  }

  /**
   * Log wallet activity
   */
  async logWallet(message: string, data?: any): Promise<void> {
    const event: LogEvent = {
      level: 'info',
      message,
      data,
      timestamp: Date.now(),
      category: 'wallet'
    };

    this.logBuffer.push(event);
    
    if (this.config.enableWalletMonitoring) {
      await this.sendWalletLog(event);
    }
  }

  /**
   * Log transaction processing
   */
  async logTransaction(
    sessionId: string,
    action: 'payment' | 'refund' | 'complete',
    amount: string,
    token: string,
    network: string,
    txHash?: string,
    success: boolean = true
  ): Promise<void> {
    const event: LogEvent = {
      level: success ? 'info' : 'error',
      message: `${action.toUpperCase()} ${success ? 'SUCCESS' : 'FAILED'}: ${amount} ${token} on ${network}`,
      data: { sessionId, action, amount, token, network, txHash, success },
      timestamp: Date.now(),
      category: 'transaction'
    };

    this.logBuffer.push(event);

    if (this.config.enableTransactionLogs) {
      await this.sendTransactionLog(event);
    }
  }

  /**
   * Log bot status updates
   */
  async logBotStatus(status: 'starting' | 'running' | 'stopping' | 'error', message: string, data?: any): Promise<void> {
    const event: LogEvent = {
      level: status === 'error' ? 'error' : 'info',
      message: `BOT ${status.toUpperCase()}: ${message}`,
      data,
      timestamp: Date.now(),
      category: 'bot'
    };

    this.logBuffer.push(event);
    await this.sendBotLog(event);
  }

  /**
   * Log security events
   */
  async logSecurity(level: 'warning' | 'error' | 'critical', message: string, data?: any): Promise<void> {
    const event: LogEvent = {
      level,
      message: `SECURITY ${level.toUpperCase()}: ${message}`,
      data,
      timestamp: Date.now(),
      category: 'security'
    };

    this.logBuffer.push(event);
    await this.sendSecurityLog(event);
  }

  /**
   * Log system errors
   */
  async logError(error: Error, context?: string): Promise<void> {
    const event: LogEvent = {
      level: 'error',
      message: `ERROR${context ? ` in ${context}` : ''}: ${error.message}`,
      data: { stack: error.stack, context },
      timestamp: Date.now(),
      category: 'system'
    };

    this.logBuffer.push(event);
    await this.sendErrorLog(event);
  }

  /**
   * Send wallet log to Discord
   */
  private async sendWalletLog(event: LogEvent): Promise<void> {
    const color = event.level === 'error' ? 0xff0000 : 0x00ff00;

    await this.discord.sendEmbed({
      title: '👛 Wallet Activity',
      description: event.message,
      color,
      fields: event.data ? [
        {
          name: '📊 Details',
          value: this.formatData(event.data),
          inline: false
        }
      ] : [],
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Send transaction log to Discord
   */
  private async sendTransactionLog(event: LogEvent): Promise<void> {
    const data = event.data;
    const color = data.success ? 0x00ff00 : 0xff0000;
    const emoji = data.success ? '✅' : '❌';

    const fields = [
      {
        name: '🆔 Session ID',
        value: `\`${data.sessionId.slice(0, 10)}...${data.sessionId.slice(-8)}\``,
        inline: false
      },
      {
        name: '💰 Amount',
        value: `${data.amount} ${data.token}`,
        inline: true
      },
      {
        name: '🌐 Network',
        value: data.network,
        inline: true
      },
      {
        name: '⚡ Action',
        value: data.action,
        inline: true
      }
    ];

    if (data.txHash) {
      fields.push({
        name: '🔗 Transaction',
        value: `\`${data.txHash.slice(0, 10)}...${data.txHash.slice(-8)}\``,
        inline: false
      });
    }

    await this.discord.sendEmbed({
      title: `${emoji} Transaction ${data.success ? 'Processed' : 'Failed'}`,
      description: event.message,
      color,
      fields,
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Send bot status log to Discord
   */
  private async sendBotLog(event: LogEvent): Promise<void> {
    const colors = {
      starting: 0xffaa00,
      running: 0x00ff00,
      stopping: 0xff9900,
      error: 0xff0000
    };

    const emojis = {
      starting: '🔄',
      running: '✅',
      stopping: '⏹️',
      error: '❌'
    };

    const status = event.message.includes('STARTING') ? 'starting' :
                   event.message.includes('RUNNING') ? 'running' :
                   event.message.includes('STOPPING') ? 'stopping' : 'error';

    await this.discord.sendEmbed({
      title: `${emojis[status]} Bot Status Update`,
      description: event.message,
      color: colors[status],
      fields: event.data ? [
        {
          name: '📋 Details',
          value: this.formatData(event.data),
          inline: false
        }
      ] : [],
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Send security log to Discord
   */
  private async sendSecurityLog(event: LogEvent): Promise<void> {
    const colors: { [key: string]: number } = {
      warning: 0xffaa00,
      error: 0xff0000,
      critical: 0x8b00ff
    };

    const emojis: { [key: string]: string } = {
      warning: '⚠️',
      error: '🚨',
      critical: '🔥'
    };

    await this.discord.sendEmbed({
      title: `${emojis[event.level]} Security Alert`,
      description: event.message,
      color: colors[event.level],
      fields: event.data ? [
        {
          name: '📋 Context',
          value: this.formatData(event.data),
          inline: false
        }
      ] : [],
      timestamp: new Date(event.timestamp).toISOString()
    });

    // Also send as plain message for critical alerts
    if (event.level === 'critical') {
      await this.discord.sendMessage(`🚨 **CRITICAL SECURITY ALERT** 🚨\n${event.message}`);
    }
  }

  /**
   * Send error log to Discord
   */
  private async sendErrorLog(event: LogEvent): Promise<void> {
    await this.discord.sendEmbed({
      title: '❌ System Error',
      description: event.message,
      color: 0xff0000,
      fields: [
        {
          name: '📋 Error Details',
          value: event.data?.context || 'No additional context',
          inline: false
        },
        {
          name: '🔍 Stack Trace',
          value: event.data?.stack ? `\`\`\`${event.data.stack.substring(0, 1000)}\`\`\`` : 'Not available',
          inline: false
        }
      ],
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  /**
   * Start performance monitoring and periodic reports
   */
  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMetrics) return;

    const intervalMs = this.config.reportInterval * 60 * 1000;
    
    this.metricsInterval = setInterval(async () => {
      await this.sendPerformanceReport();
    }, intervalMs);

    console.log(`📊 Performance monitoring started (every ${this.config.reportInterval} minutes)`);
  }

  /**
   * Send periodic performance report
   */
  private async sendPerformanceReport(): Promise<void> {
    const now = Date.now();
    const timeSinceLastReport = now - this.lastReportTime;
    const recentLogs = this.logBuffer.filter(log => 
      (now - log.timestamp) < timeSinceLastReport
    );

    const transactionLogs = recentLogs.filter(log => log.category === 'transaction');
    const errorLogs = recentLogs.filter(log => log.level === 'error');
    const successful = transactionLogs.filter(log => log.data?.success).length;
    const successRate = transactionLogs.length > 0 ? (successful / transactionLogs.length * 100).toFixed(1) : '0';

    await this.discord.sendEmbed({
      title: '📊 Performance Report',
      description: `Bot performance summary for the last ${this.config.reportInterval} minutes`,
      color: 0x0099ff,
      fields: [
        {
          name: '📈 Transactions',
          value: `${transactionLogs.length} total`,
          inline: true
        },
        {
          name: '✅ Success Rate',
          value: `${successRate}%`,
          inline: true
        },
        {
          name: '❌ Errors',
          value: `${errorLogs.length}`,
          inline: true
        },
        {
          name: '🕐 Report Period',
          value: `${this.config.reportInterval} minutes`,
          inline: true
        },
        {
          name: '⏰ Next Report',
          value: new Date(now + (this.config.reportInterval * 60 * 1000)).toLocaleTimeString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    });

    this.lastReportTime = now;
    
    // Clean old logs to prevent memory leaks
    this.cleanOldLogs();
  }

  /**
   * Monitor wallet balances
   */
  async checkWalletBalances(walletAddress: string, networks: string[]): Promise<void> {
    if (!this.config.enableWalletMonitoring) return;

    for (const network of networks) {
      try {
        // This would integrate with your network providers to check balances
        // For now, creating placeholder
        const balance = '0.0'; // TODO: Implement actual balance checking
        const threshold = parseFloat(this.config.walletBalanceThreshold);

        if (parseFloat(balance) < threshold) {
          await this.logSecurity('warning', 
            `Low wallet balance on ${network}: ${balance} ETH (threshold: ${threshold} ETH)`,
            { network, balance, threshold, walletAddress }
          );
        }
      } catch (error) {
        await this.logError(error as Error, `Wallet balance check for ${network}`);
      }
    }
  }

  /**
   * Format data for Discord display
   */
  private formatData(data: any): string {
    if (!data) return 'No data';
    
    try {
      return JSON.stringify(data, null, 2).substring(0, 1000);
    } catch (error) {
      return String(data).substring(0, 1000);
    }
  }

  /**
   * Clean old logs from buffer
   */
  private cleanOldLogs(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;
    this.logBuffer = this.logBuffer.filter(log => log.timestamp > cutoff);
  }

  /**
   * Get log statistics
   */
  public getLogStats(): { 
    totalLogs: number;
    errorCount: number;
    transactionCount: number;
    lastLogTime: number;
  } {
    return {
      totalLogs: this.logBuffer.length,
      errorCount: this.logBuffer.filter(log => log.level === 'error').length,
      transactionCount: this.logBuffer.filter(log => log.category === 'transaction').length,
      lastLogTime: this.logBuffer.length > 0 ? Math.max(...this.logBuffer.map(log => log.timestamp)) : 0
    };
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    console.log('📊 Discord log monitoring stopped');
  }
}

export default DiscordLogMonitor;