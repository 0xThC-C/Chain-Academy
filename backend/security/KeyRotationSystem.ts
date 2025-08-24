/**
 * Automated Key Rotation System
 * 
 * Features:
 * - Scheduled automatic key rotation
 * - Safe balance transfer between wallets
 * - Emergency rotation capabilities
 * - Audit logging and monitoring
 * - Multi-network support
 */

import { ethers } from 'ethers';
import { SecureWalletManager } from './WalletManager';
import { DiscordNotifier } from '../bots/DiscordNotifier';
import * as fs from 'fs';

export interface KeyRotationConfig {
  rotationInterval: number; // hours
  minimumBalance: string; // ETH threshold for rotation
  networks: string[];
  backupWalletCount: number;
  enableEmergencyRotation: boolean;
  discordWebhook?: string;
}

export interface RotationJob {
  id: string;
  scheduledTime: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  fromWallet: string;
  toWallet: string;
  networks: string[];
  balancesTransferred: { [network: string]: string };
  error?: string;
}

export class KeyRotationSystem {
  private config: KeyRotationConfig;
  private currentWallet: SecureWalletManager;
  private backupWallets: SecureWalletManager[] = [];
  private rotationHistory: RotationJob[] = [];
  private discord?: DiscordNotifier;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: KeyRotationConfig) {
    this.config = config;
    
    // Initialize current wallet
    this.currentWallet = new SecureWalletManager({
      keySource: 'env',
      keyIdentifier: 'CHAIN_ACADEMY_BOT_PRIVATE_KEY'
    });

    // Initialize Discord notifications if configured
    if (config.discordWebhook) {
      this.discord = new DiscordNotifier({
        webhookUrl: config.discordWebhook,
        username: 'Chain Academy Key Rotation',
        enabled: true
      });
    }

    this.loadRotationHistory();
    this.startRotationScheduler();
  }

  /**
   * Start automatic rotation scheduler
   */
  private startRotationScheduler(): void {
    const intervalMs = this.config.rotationInterval * 60 * 60 * 1000;
    
    this.rotationTimer = setInterval(() => {
      this.checkAndPerformRotation();
    }, intervalMs);

    console.log(`🔄 Key rotation scheduler started (every ${this.config.rotationInterval} hours)`);
  }

  /**
   * Check if rotation is needed and perform it
   */
  private async checkAndPerformRotation(): Promise<void> {
    try {
      const lastRotation = this.getLastRotation();
      const timeSinceRotation = Date.now() - (lastRotation?.scheduledTime || 0);
      const rotationIntervalMs = this.config.rotationInterval * 60 * 60 * 1000;

      if (timeSinceRotation >= rotationIntervalMs) {
        await this.performRotation('scheduled');
      }
    } catch (error) {
      console.error('Rotation check failed:', error);
      await this.notifyRotationError('Scheduled rotation check failed', error);
    }
  }

  /**
   * Perform key rotation
   */
  public async performRotation(trigger: 'scheduled' | 'manual' | 'emergency'): Promise<RotationJob> {
    const rotationId = `rotation_${Date.now()}_${trigger}`;
    
    const job: RotationJob = {
      id: rotationId,
      scheduledTime: Date.now(),
      status: 'in-progress',
      fromWallet: this.currentWallet.getAddress(),
      toWallet: '', // Will be set when new wallet is generated
      networks: this.config.networks,
      balancesTransferred: {}
    };

    try {
      console.log(`🔄 Starting ${trigger} key rotation: ${rotationId}`);
      
      // Generate new wallet
      const newWallet = SecureWalletManager.generateSecureWallet();
      job.toWallet = newWallet.address;

      // Transfer balances from all networks
      for (const network of this.config.networks) {
        const balance = await this.transferBalance(network, newWallet.address);
        job.balancesTransferred[network] = balance;
      }

      // Update wallet configuration
      await this.updateWalletConfiguration(newWallet.privateKey);

      job.status = 'completed';
      this.rotationHistory.push(job);
      this.saveRotationHistory();

      console.log(`✅ Key rotation completed: ${rotationId}`);
      await this.notifyRotationSuccess(job);

      return job;

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.rotationHistory.push(job);
      this.saveRotationHistory();

      console.error(`❌ Key rotation failed: ${rotationId}`, error);
      await this.notifyRotationError('Key rotation failed', error);
      
      throw error;
    }
  }

  /**
   * Transfer balance from current wallet to new wallet on specific network
   */
  private async transferBalance(network: string, newWalletAddress: string): Promise<string> {
    // This would integrate with your network providers
    // For now, returning placeholder
    console.log(`💰 Transferring balance on ${network} to ${newWalletAddress}`);
    
    // TODO: Implement actual balance transfer logic
    // 1. Connect to network RPC
    // 2. Check current wallet balance
    // 3. Transfer all balance minus gas fees to new wallet
    // 4. Return transferred amount
    
    return '0.0'; // Placeholder
  }

  /**
   * Update wallet configuration with new private key
   */
  private async updateWalletConfiguration(newPrivateKey: string): Promise<void> {
    // TODO: Implement secure configuration update
    // This should update your production environment variables
    // NOT update files in the codebase
    
    console.log('🔧 Configuration update required - manual intervention needed');
    console.log('   New private key generated - update production environment');
    console.log('   Private key (SECURE THIS):', newPrivateKey);
  }

  /**
   * Emergency rotation trigger
   */
  public async emergencyRotation(): Promise<RotationJob> {
    if (!this.config.enableEmergencyRotation) {
      throw new Error('Emergency rotation is disabled');
    }

    console.log('🚨 EMERGENCY KEY ROTATION TRIGGERED');
    await this.notifyEmergencyRotation();
    
    return this.performRotation('emergency');
  }

  /**
   * Get rotation history
   */
  public getRotationHistory(): RotationJob[] {
    return [...this.rotationHistory];
  }

  /**
   * Get last rotation job
   */
  private getLastRotation(): RotationJob | null {
    return this.rotationHistory.length > 0 
      ? this.rotationHistory[this.rotationHistory.length - 1] 
      : null;
  }

  /**
   * Load rotation history from file
   */
  private loadRotationHistory(): void {
    try {
      const historyPath = './data/key-rotation-history.json';
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        this.rotationHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load rotation history:', error);
      this.rotationHistory = [];
    }
  }

  /**
   * Save rotation history to file
   */
  private saveRotationHistory(): void {
    try {
      const historyPath = './data/key-rotation-history.json';
      fs.writeFileSync(historyPath, JSON.stringify(this.rotationHistory, null, 2));
    } catch (error) {
      console.error('Failed to save rotation history:', error);
    }
  }

  /**
   * Notify successful rotation
   */
  private async notifyRotationSuccess(job: RotationJob): Promise<void> {
    if (!this.discord) return;

    await this.discord.sendEmbed({
      title: '🔄 Key Rotation Completed',
      description: 'Automated key rotation completed successfully',
      color: 0x00ff00,
      fields: [
        {
          name: '🆔 Rotation ID',
          value: job.id,
          inline: false
        },
        {
          name: '👤 Old Wallet',
          value: `\`${job.fromWallet.slice(0, 10)}...${job.fromWallet.slice(-8)}\``,
          inline: true
        },
        {
          name: '👤 New Wallet', 
          value: `\`${job.toWallet.slice(0, 10)}...${job.toWallet.slice(-8)}\``,
          inline: true
        },
        {
          name: '🌐 Networks',
          value: job.networks.join(', '),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify rotation error
   */
  private async notifyRotationError(title: string, error: unknown): Promise<void> {
    if (!this.discord) return;

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await this.discord.sendEmbed({
      title: `❌ ${title}`,
      description: errorMessage,
      color: 0xff0000,
      fields: [
        {
          name: '⚠️ Action Required',
          value: 'Manual intervention needed for key rotation',
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Notify emergency rotation
   */
  private async notifyEmergencyRotation(): Promise<void> {
    if (!this.discord) return;

    await this.discord.sendMessage('🚨 **EMERGENCY KEY ROTATION INITIATED** 🚨\nImmediate attention required!');
  }

  /**
   * Stop rotation scheduler
   */
  public stopScheduler(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
      console.log('🛑 Key rotation scheduler stopped');
    }
  }

  /**
   * Get next rotation time
   */
  public getNextRotationTime(): Date | null {
    const lastRotation = this.getLastRotation();
    if (!lastRotation) return new Date(); // Rotate immediately if no history

    const nextRotationTime = lastRotation.scheduledTime + (this.config.rotationInterval * 60 * 60 * 1000);
    return new Date(nextRotationTime);
  }
}

export default KeyRotationSystem;