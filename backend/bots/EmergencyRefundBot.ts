#!/usr/bin/env ts-node

/**
 * Emergency Refund Bot - Fixes trapped funds in ProgressiveEscrowV7
 * Uses emergencyRelease function to free funds from broken sessions
 */

import { ethers } from 'ethers';
import { DiscordNotifier, DiscordWebhookConfig } from './DiscordNotifier';

// V7 Emergency ABI
const EMERGENCY_ABI = [
  'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function owner() external view returns (address)'
];

// Contract addresses for V7
const V7_CONTRACTS = {
  8453: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3', // Base
  10: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3',   // Optimism  
  42161: '0x2a9d167e30195ba5fd29cfc09622be0d02da91be', // Arbitrum
  137: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3'   // Polygon
};

const RPC_URLS = {
  8453: 'https://mainnet.base.org',
  10: 'https://mainnet.optimism.io', 
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-rpc.com'
};

export class EmergencyRefundBot {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<number, ethers.Contract> = new Map();
  private wallet: ethers.Wallet;
  private discordNotifier: DiscordNotifier;

  constructor() {
    const privateKey = process.env.BOT_OWNER_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BOT_OWNER_PRIVATE_KEY environment variable required for emergency operations');
    }

    this.wallet = new ethers.Wallet(privateKey);
    
    // Setup Discord notifications
    const discordConfig: DiscordWebhookConfig = {
      webhookUrl: process.env.EMERGENCY_DISCORD_WEBHOOK_URL || process.env.BOT_DISCORD_WEBHOOK_URL || '',
      username: 'Emergency Refund Bot',
      enabled: true,
      retryAttempts: 3,
      retryDelay: 2000
    };
    this.discordNotifier = new DiscordNotifier(discordConfig);

    this.initializeChains();
  }

  private initializeChains(): void {
    Object.entries(V7_CONTRACTS).forEach(([chainIdStr, contractAddress]) => {
      const chainId = parseInt(chainIdStr);
      const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS];
      
      if (rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const connectedWallet = this.wallet.connect(provider);
        const contract = new ethers.Contract(contractAddress, EMERGENCY_ABI, connectedWallet);
        
        this.providers.set(chainId, provider);
        this.contracts.set(chainId, contract);
        
        console.log(`[Emergency] Initialized chain ${chainId}: ${contractAddress}`);
      }
    });
  }

  /**
   * Execute emergency refund for a specific trapped session
   */
  async emergencyRefund(sessionId: string, chainId: number, reason: string = 'No-show refund - trapped funds'): Promise<void> {
    console.log(`🚨 [Emergency] Processing refund for session ${sessionId} on chain ${chainId}`);
    
    try {
      const contract = this.contracts.get(chainId);
      if (!contract) {
        throw new Error(`No contract found for chain ${chainId}`);
      }

      // Get session details
      const session = await contract.getSession(sessionId);
      
      console.log('📋 Session Details:');
      console.log('  Student:', session.student);
      console.log('  Status:', session.status);
      console.log('  Total Amount:', ethers.formatEther(session.totalAmount));
      console.log('  Released Amount:', ethers.formatEther(session.releasedAmount));
      console.log('  Created:', new Date(Number(session.createdAt) * 1000).toISOString());

      // Validate this is a trapped session
      if (session.student === ethers.ZeroAddress) {
        throw new Error('Session does not exist');
      }

      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      const refundAmount = session.totalAmount - session.releasedAmount;

      console.log(`⏰ Time since created: ${Math.floor(timeSinceCreated / 3600)} hours`);
      console.log(`💰 Refund amount: ${ethers.formatEther(refundAmount)} tokens`);

      if (refundAmount <= 0) {
        console.log('❌ No funds available for refund');
        return;
      }

      // Conditions for emergency refund:
      // 1. Session in Created status for > 15 minutes (no-show)
      // 2. Session stuck in any status with time passed
      const isNoShow = session.status === 0 && timeSinceCreated > 900; // 15 minutes
      const isStuck = timeSinceCreated > 3600; // 1 hour for any stuck session

      if (!isNoShow && !isStuck) {
        throw new Error(`Session not eligible for emergency refund yet. Status: ${session.status}, Time: ${timeSinceCreated}s`);
      }

      console.log('✅ Session eligible for emergency refund');

      // Check we're the owner
      const owner = await contract.owner();
      const ourAddress = await this.wallet.getAddress();
      
      if (owner.toLowerCase() !== ourAddress.toLowerCase()) {
        throw new Error(`Not contract owner. Owner: ${owner}, Our address: ${ourAddress}`);
      }

      console.log('🔐 Confirmed contract ownership');

      // Execute emergency refund
      console.log(`🚀 Executing emergency refund to student: ${session.student}`);
      
      const tx = await contract.emergencyRelease(
        sessionId,
        session.student, // Refund to student
        refundAmount,
        reason,
        {
          gasLimit: 200000 // Conservative gas limit
        }
      );

      console.log(`📝 Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Emergency refund successful!');
        
        // Send Discord notification
        if (this.discordNotifier.isEnabled()) {
          await this.discordNotifier.notifyRefundProcessed(
            sessionId,
            session.student,
            refundAmount,
            'ETH',
            this.getChainName(chainId),
            tx.hash,
            reason
          );
        }
        
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('❌ Emergency refund failed:', error);
      
      // Send error notification
      if (this.discordNotifier.isEnabled()) {
        await this.discordNotifier.notifyError(
          'Emergency Refund Failed',
          (error as Error).message,
          {
            'Session ID': sessionId,
            'Chain ID': chainId.toString(),
            'Timestamp': new Date().toISOString()
          }
        );
      }
      
      throw error;
    }
  }

  /**
   * Scan for trapped sessions across all chains
   */
  async scanTrappedSessions(): Promise<Array<{sessionId: string, chainId: number, timeSinceCreated: number, amount: bigint}>> {
    console.log('🔍 Scanning for trapped sessions across all chains...');
    
    const trappedSessions: Array<{sessionId: string, chainId: number, timeSinceCreated: number, amount: bigint}> = [];
    
    // Note: Since V7 doesn't have getAllActiveSessions, we'd need to:
    // 1. Monitor SessionCreated events from recent blocks
    // 2. Use the session tracker from the main bot
    // 3. Manually provide session IDs to check
    
    console.log('⚠️  Manual session ID input required - V7 doesn't support full session enumeration');
    console.log('📋 To check specific session: emergencyBot.emergencyRefund(sessionId, chainId)');
    
    return trappedSessions;
  }

  /**
   * Check if a session is trapped and eligible for emergency refund
   */
  async isSessionTrapped(sessionId: string, chainId: number): Promise<boolean> {
    try {
      const contract = this.contracts.get(chainId);
      if (!contract) return false;

      const session = await contract.getSession(sessionId);
      
      if (session.student === ethers.ZeroAddress) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      const refundAmount = session.totalAmount - session.releasedAmount;
      
      // Conditions for trapped session:
      const isNoShow = session.status === 0 && timeSinceCreated > 900; // 15+ minutes in Created status
      const hasUnreleasedFunds = refundAmount > 0;
      const isOldEnough = timeSinceCreated > 900; // At least 15 minutes old
      
      return isNoShow && hasUnreleasedFunds && isOldEnough;
      
    } catch (error) {
      console.error(`Error checking session ${sessionId}:`, error);
      return false;
    }
  }

  private getChainName(chainId: number): string {
    const names: Record<number, string> = {
      8453: 'Base',
      10: 'Optimism',
      42161: 'Arbitrum',
      137: 'Polygon'
    };
    return names[chainId] || `Chain ${chainId}`;
  }

  /**
   * Get emergency refund status
   */
  getStatus(): any {
    return {
      initialized: true,
      chains: Array.from(this.contracts.keys()),
      walletAddress: this.wallet.address,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI interface for emergency operations
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🚨 Emergency Refund Bot - Chain Academy V7

Commands:
  refund <sessionId> <chainId> [reason]     Execute emergency refund
  check <sessionId> <chainId>               Check if session is trapped
  status                                    Show bot status

Examples:
  ts-node EmergencyRefundBot.ts refund 0x1234... 8453 "No-show refund"
  ts-node EmergencyRefundBot.ts check 0x1234... 8453
  ts-node EmergencyRefundBot.ts status

Environment Variables Required:
  BOT_OWNER_PRIVATE_KEY          Private key with contract owner permissions
  EMERGENCY_DISCORD_WEBHOOK_URL  Discord webhook for notifications (optional)
`);
    process.exit(1);
  }

  const bot = new EmergencyRefundBot();
  const command = args[0];

  switch (command) {
    case 'refund':
      if (args.length < 3) {
        console.error('Usage: refund <sessionId> <chainId> [reason]');
        process.exit(1);
      }
      const sessionId = args[1];
      const chainId = parseInt(args[2]);
      const reason = args[3] || 'Emergency refund - trapped funds';
      
      await bot.emergencyRefund(sessionId, chainId, reason);
      break;

    case 'check':
      if (args.length < 3) {
        console.error('Usage: check <sessionId> <chainId>');
        process.exit(1);
      }
      const checkSessionId = args[1];
      const checkChainId = parseInt(args[2]);
      
      const isTrapped = await bot.isSessionTrapped(checkSessionId, checkChainId);
      console.log(`Session ${checkSessionId} on chain ${checkChainId}: ${isTrapped ? '🚨 TRAPPED' : '✅ OK'}`);
      break;

    case 'status':
      console.log('🤖 Emergency Refund Bot Status:');
      console.log(JSON.stringify(bot.getStatus(), null, 2));
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}