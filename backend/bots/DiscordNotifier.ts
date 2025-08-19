/**
 * Discord Webhook Notification System for Chain Academy Bot
 * 
 * Features:
 * - Rich embeds with colors
 * - Different alert types (success, warning, error)
 * - Bot metrics and status reports
 * - Session processing notifications
 * - Error handling and retry logic
 */

import { ethers } from 'ethers';
import axios from 'axios';

export interface DiscordWebhookConfig {
  webhookUrl: string;
  username?: string;
  avatar?: string;
  retryAttempts?: number;
  retryDelay?: number;
  enabled?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
  thumbnail?: {
    url: string;
  };
}

export enum AlertType {
  SUCCESS = 0x00ff00,   // Green
  WARNING = 0xffaa00,   // Orange  
  ERROR = 0xff0000,     // Red
  INFO = 0x0099ff,      // Blue
  CRITICAL = 0x8b00ff   // Purple
}

export class DiscordNotifier {
  private config: DiscordWebhookConfig;

  constructor(config: DiscordWebhookConfig) {
    this.config = {
      username: 'Chain Academy Bot',
      avatar: 'https://cdn.discordapp.com/attachments/placeholder/bot-avatar.png',
      retryAttempts: 3,
      retryDelay: 2000,
      enabled: true,
      ...config
    };
  }

  /**
   * Send a basic text message
   */
  async sendMessage(content: string): Promise<boolean> {
    if (!this.config.enabled || !this.config.webhookUrl) return false;

    const payload = {
      content,
      username: this.config.username,
      avatar_url: this.config.avatar
    };

    return await this.sendWebhook(payload);
  }

  /**
   * Send rich embed notification
   */
  async sendEmbed(embed: DiscordEmbed): Promise<boolean> {
    if (!this.config.enabled || !this.config.webhookUrl) return false;

    const payload = {
      username: this.config.username,
      avatar_url: this.config.avatar,
      embeds: [embed]
    };

    return await this.sendWebhook(payload);
  }

  /**
   * Bot startup notification
   */
  async notifyBotStartup(version: string, chainCount: number): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '🤖 Chain Academy Bot Started',
      description: `Payment bot V${version} is now online and monitoring ${chainCount} chains`,
      color: AlertType.SUCCESS,
      fields: [
        {
          name: '📊 Status',
          value: '✅ Online',
          inline: true
        },
        {
          name: '🔗 Chains',
          value: `${chainCount} networks`,
          inline: true
        },
        {
          name: '⏰ Next Execution',
          value: 'Every 6 hours',
          inline: true
        }
      ],
      footer: {
        text: 'Chain Academy V7 Bot',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Payment processing success notification
   */
  async notifyPaymentSuccess(
    sessionId: string, 
    mentorAddress: string, 
    amount: bigint, 
    tokenSymbol: string,
    chainName: string,
    txHash: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '💰 Payment Processed Successfully',
      description: `Automatic payment released to mentor`,
      color: AlertType.SUCCESS,
      fields: [
        {
          name: '🆔 Session ID',
          value: `\`${sessionId.slice(0, 10)}...${sessionId.slice(-8)}\``,
          inline: false
        },
        {
          name: '👨‍🏫 Mentor',
          value: `\`${mentorAddress.slice(0, 6)}...${mentorAddress.slice(-4)}\``,
          inline: true
        },
        {
          name: '💵 Amount',
          value: `${ethers.formatEther(amount)} ${tokenSymbol}`,
          inline: true
        },
        {
          name: '🌐 Network',
          value: chainName,
          inline: true
        },
        {
          name: '🔗 Transaction',
          value: `[View on Explorer](https://explorer.example.com/tx/${txHash})`,
          inline: false
        }
      ],
      footer: {
        text: 'Chain Academy Payment Bot',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Refund processing notification
   */
  async notifyRefundProcessed(
    sessionId: string,
    studentAddress: string,
    amount: bigint,
    tokenSymbol: string,
    chainName: string,
    reason: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '🔄 Refund Processed',
      description: `Automatic refund issued to student`,
      color: AlertType.WARNING,
      fields: [
        {
          name: '🆔 Session ID',
          value: `\`${sessionId.slice(0, 10)}...${sessionId.slice(-8)}\``,
          inline: false
        },
        {
          name: '👨‍🎓 Student',
          value: `\`${studentAddress.slice(0, 6)}...${studentAddress.slice(-4)}\``,
          inline: true
        },
        {
          name: '💵 Amount',
          value: `${ethers.formatEther(amount)} ${tokenSymbol}`,
          inline: true
        },
        {
          name: '🌐 Network',
          value: chainName,
          inline: true
        },
        {
          name: '📝 Reason',
          value: reason,
          inline: false
        }
      ],
      footer: {
        text: 'Chain Academy Payment Bot',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Execution summary notification
   */
  async notifyExecutionSummary(
    totalProcessed: number,
    successful: number,
    failed: number,
    totalGasUsed: bigint,
    executionTime: number
  ): Promise<boolean> {
    const successRate = totalProcessed > 0 ? (successful / totalProcessed * 100).toFixed(1) : '0';
    const color = failed > 0 ? AlertType.WARNING : AlertType.SUCCESS;

    const embed: DiscordEmbed = {
      title: '📊 Execution Summary',
      description: `Bot execution completed in ${executionTime}ms`,
      color: color,
      fields: [
        {
          name: '✅ Successful',
          value: successful.toString(),
          inline: true
        },
        {
          name: '❌ Failed', 
          value: failed.toString(),
          inline: true
        },
        {
          name: '📈 Success Rate',
          value: `${successRate}%`,
          inline: true
        },
        {
          name: '⛽ Gas Used',
          value: `${ethers.formatEther(totalGasUsed)} ETH`,
          inline: true
        },
        {
          name: '📦 Total Processed',
          value: totalProcessed.toString(),
          inline: true
        },
        {
          name: '⏱️ Duration',
          value: `${(executionTime / 1000).toFixed(1)}s`,
          inline: true
        }
      ],
      footer: {
        text: 'Chain Academy Payment Bot',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Error notification
   */
  async notifyError(
    title: string,
    error: string,
    context?: { [key: string]: string }
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: `❌ ${title}`,
      description: error.length > 2000 ? error.substring(0, 2000) + '...' : error,
      color: AlertType.ERROR,
      fields: [],
      footer: {
        text: 'Chain Academy Payment Bot - Error',
      },
      timestamp: new Date().toISOString()
    };

    // Add context fields
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        embed.fields!.push({
          name: key,
          value: value.length > 1000 ? value.substring(0, 1000) + '...' : value,
          inline: false
        });
      }
    }

    return await this.sendEmbed(embed);
  }

  /**
   * Critical alert (bot stopped, wallet drained, etc.)
   */
  async notifyCritical(
    title: string,
    message: string,
    actionRequired?: string
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: `🚨 CRITICAL: ${title}`,
      description: message,
      color: AlertType.CRITICAL,
      fields: [],
      footer: {
        text: 'Chain Academy Payment Bot - CRITICAL',
      },
      timestamp: new Date().toISOString()
    };

    if (actionRequired) {
      embed.fields!.push({
        name: '⚡ Action Required',
        value: actionRequired,
        inline: false
      });
    }

    // Also send as plain message for immediate attention
    await this.sendMessage(`🚨 **CRITICAL ALERT** 🚨\n${title}: ${message}`);

    return await this.sendEmbed(embed);
  }

  /**
   * Daily report notification
   */
  async notifyDailyReport(
    date: string,
    metrics: {
      totalSessions: number;
      totalPayments: number;
      totalRefunds: number;
      totalVolume: bigint;
      successRate: number;
      gasSpent: bigint;
    }
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: `📈 Daily Report - ${date}`,
      description: 'Chain Academy Bot daily activity summary',
      color: AlertType.INFO,
      fields: [
        {
          name: '🎯 Sessions Processed',
          value: metrics.totalSessions.toString(),
          inline: true
        },
        {
          name: '💰 Payments Released',
          value: metrics.totalPayments.toString(),
          inline: true
        },
        {
          name: '🔄 Refunds Issued',
          value: metrics.totalRefunds.toString(),
          inline: true
        },
        {
          name: '💵 Total Volume',
          value: `${ethers.formatEther(metrics.totalVolume)} tokens`,
          inline: true
        },
        {
          name: '📊 Success Rate',
          value: `${metrics.successRate.toFixed(1)}%`,
          inline: true
        },
        {
          name: '⛽ Gas Costs',
          value: `${ethers.formatEther(metrics.gasSpent)} ETH`,
          inline: true
        }
      ],
      footer: {
        text: 'Chain Academy Payment Bot - Daily Report',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Test notification
   */
  async sendTestNotification(): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '🧪 Discord Webhook Test',
      description: 'This is a test notification from Chain Academy Bot',
      color: AlertType.INFO,
      fields: [
        {
          name: '✅ Status',
          value: 'Webhook working correctly',
          inline: true
        },
        {
          name: '📅 Date',
          value: new Date().toLocaleDateString(),
          inline: true
        },
        {
          name: '⏰ Time',
          value: new Date().toLocaleTimeString(),
          inline: true
        }
      ],
      footer: {
        text: 'Chain Academy Bot - Test',
      },
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }

  /**
   * Internal webhook sender with retry logic
   */
  private async sendWebhook(payload: any): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = this.config.retryAttempts || 3;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.post(this.config.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        });

        if (response.status >= 200 && response.status < 300) {
          return true;
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Rate limited, wait longer
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay || 2000;
          console.log(`Discord rate limited, waiting ${delay}ms`);
          await this.sleep(delay);
          attempts++;
          continue;
        } else {
          console.error('Discord webhook error:', error.message);
          if (error.response) {
            console.error(`Status: ${error.response.status}, Data:`, error.response.data);
          }
          if (attempts < maxAttempts - 1) {
            await this.sleep(this.config.retryDelay || 2000);
          }
          attempts++;
        }
      }
    }

    console.error(`Discord webhook failed after ${maxAttempts} attempts`);
    return false;
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DiscordWebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Enable/disable notifications
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if webhook is configured and enabled
   */
  isEnabled(): boolean {
    return !!(this.config.enabled && this.config.webhookUrl);
  }
}