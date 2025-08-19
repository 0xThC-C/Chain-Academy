#!/usr/bin/env ts-node

/**
 * Trapped Funds Monitor - Detects and alerts on fund-trapping scenarios
 * Monitors ProgressiveEscrowV7 contracts for sessions that may have trapped funds
 * Provides early warning system and automated recovery triggers
 */

import { ethers } from 'ethers';
import { DiscordNotifier, DiscordWebhookConfig } from './DiscordNotifier';
import { SessionStatus, ProgressiveSession } from './types';
import cron from 'node-cron';

// Monitor-specific interfaces
interface TrappedFund {
  sessionId: string;
  chainId: number;
  student: string;
  mentor: string;
  amount: bigint;
  createdAt: number;
  timeTrapped: number; // Hours since trapped
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  suggestedAction: string;
}

interface MonitorMetrics {
  totalScanned: number;
  trappedFound: number;
  alertsSent: number;
  criticalAlerts: number;
  lastScanTime: number;
  chainMetrics: {
    [chainId: number]: {
      scanned: number;
      trapped: number;
      totalTrappedValue: bigint;
    };
  };
}

// Enhanced ABI for monitoring
const MONITOR_ABI = [
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function getAvailablePayment(bytes32 sessionId) external view returns (uint256)',
  'function checkAndExpireSession(bytes32 sessionId) external',
  'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
  'function owner() external view returns (address)',
  
  // Events for scanning
  'event SessionCreated(bytes32 indexed sessionId, address indexed student, address indexed mentor, uint256 amount, address token)',
  'event SessionStarted(bytes32 indexed sessionId, uint256 startTime)',
  'event SessionExpired(bytes32 indexed sessionId, uint256 refundAmount)',
  'event SessionCancelled(bytes32 indexed sessionId, uint256 refundAmount, uint256 cancelledAt)',
  'event EmergencyRelease(bytes32 indexed sessionId, uint256 amount, string reason)'
];

// Contract addresses
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

export class TrappedFundsMonitor {
  private providers: Map<number, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<number, ethers.Contract> = new Map();
  private discordNotifier: DiscordNotifier;
  private metrics: MonitorMetrics;
  private knownSessions: Map<string, {chainId: number, lastChecked: number}> = new Map();
  private isRunning: boolean = false;
  private monitorTask: cron.ScheduledTask | null = null;

  constructor() {
    // Setup Discord notifications
    const discordConfig: DiscordWebhookConfig = {
      webhookUrl: process.env.MONITOR_DISCORD_WEBHOOK_URL || process.env.BOT_DISCORD_WEBHOOK_URL || '',
      username: 'Trapped Funds Monitor',
      enabled: true,
      retryAttempts: 3,
      retryDelay: 2000
    };
    this.discordNotifier = new DiscordNotifier(discordConfig);

    // Initialize metrics
    this.metrics = {
      totalScanned: 0,
      trappedFound: 0,
      alertsSent: 0,
      criticalAlerts: 0,
      lastScanTime: 0,
      chainMetrics: {}
    };

    this.initializeChains();
    console.log('[TrappedFundsMonitor] Initialized monitoring system');
  }

  private initializeChains(): void {
    Object.entries(V7_CONTRACTS).forEach(([chainIdStr, contractAddress]) => {
      const chainId = parseInt(chainIdStr);
      const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS];
      
      if (rpcUrl) {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contract = new ethers.Contract(contractAddress, MONITOR_ABI, provider);
        
        this.providers.set(chainId, provider);
        this.contracts.set(chainId, contract);
        
        // Initialize chain metrics
        this.metrics.chainMetrics[chainId] = {
          scanned: 0,
          trapped: 0,
          totalTrappedValue: BigInt(0)
        };
        
        console.log(`[TrappedFundsMonitor] Initialized chain ${chainId}: ${contractAddress}`);
      }
    });
  }

  /**
   * Start continuous monitoring with cron schedule
   */
  public startMonitoring(cronSchedule: string = '*/15 * * * *'): void { // Every 15 minutes
    if (this.isRunning) {
      console.log('[TrappedFundsMonitor] Monitor already running');
      return;
    }

    console.log(`[TrappedFundsMonitor] Starting monitoring with schedule: ${cronSchedule}`);
    
    this.monitorTask = cron.schedule(cronSchedule, async () => {
      await this.scanForTrappedFunds();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.monitorTask.start();
    this.isRunning = true;

    // Send startup notification
    if (this.discordNotifier.isEnabled()) {
      this.discordNotifier.notifyBotStartup(
        'Trapped Funds Monitor v1.0',
        Object.keys(V7_CONTRACTS).length
      ).catch(console.error);
    }

    console.log('[TrappedFundsMonitor] Monitoring started successfully');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitorTask) {
      this.monitorTask.stop();
      this.monitorTask = null;
    }
    this.isRunning = false;
    console.log('[TrappedFundsMonitor] Monitoring stopped');
  }

  /**
   * Manual scan trigger
   */
  public async scanForTrappedFunds(): Promise<TrappedFund[]> {
    if (this.isRunning && this.monitorTask) {
      // Prevent overlapping scans
      return [];
    }

    console.log('[TrappedFundsMonitor] Starting trapped funds scan...');
    const startTime = Date.now();
    const allTrappedFunds: TrappedFund[] = [];

    try {
      // Scan each chain
      for (const [chainId, contract] of this.contracts) {
        console.log(`[TrappedFundsMonitor] Scanning chain ${chainId}...`);
        const chainTrapped = await this.scanChainForTrappedFunds(chainId, contract);
        allTrappedFunds.push(...chainTrapped);
        
        // Update metrics
        this.metrics.chainMetrics[chainId].scanned++;
        this.metrics.chainMetrics[chainId].trapped += chainTrapped.length;
        this.metrics.chainMetrics[chainId].totalTrappedValue += chainTrapped.reduce(
          (sum, fund) => sum + fund.amount, BigInt(0)
        );
      }

      // Update global metrics
      this.metrics.totalScanned++;
      this.metrics.trappedFound += allTrappedFunds.length;
      this.metrics.lastScanTime = Date.now();

      // Process alerts
      if (allTrappedFunds.length > 0) {
        await this.processAlerts(allTrappedFunds);
      }

      const scanDuration = Date.now() - startTime;
      console.log(`[TrappedFundsMonitor] Scan completed in ${scanDuration}ms`);
      console.log(`[TrappedFundsMonitor] Found ${allTrappedFunds.length} trapped funds`);

      if (allTrappedFunds.length > 0) {
        console.log('\n🚨 TRAPPED FUNDS DETECTED:');
        allTrappedFunds.forEach(fund => {
          console.log(`  ${fund.sessionId} (${this.getChainName(fund.chainId)}): ${ethers.formatEther(fund.amount)} ETH - ${fund.severity}`);
        });
      }

      return allTrappedFunds;

    } catch (error) {
      console.error('[TrappedFundsMonitor] Scan failed:', error);
      
      if (this.discordNotifier.isEnabled()) {
        await this.discordNotifier.notifyError(
          'Trapped Funds Monitor Error',
          (error as Error).message,
          {
            'Scan Time': new Date().toISOString(),
            'Duration': `${Date.now() - startTime}ms`
          }
        );
      }
      
      throw error;
    }
  }

  /**
   * Scan a specific chain for trapped funds
   */
  private async scanChainForTrappedFunds(chainId: number, contract: ethers.Contract): Promise<TrappedFund[]> {
    const trappedFunds: TrappedFund[] = [];
    
    try {
      // Since V7 doesn't have session enumeration, we need to scan recent events
      const provider = this.providers.get(chainId);
      if (!provider) return trappedFunds;

      // Get recent blocks to scan (last 24 hours approximately)
      const currentBlock = await provider.getBlockNumber();
      const blocksPerHour = chainId === 42161 ? 250 : 300; // Arbitrum vs others
      const fromBlock = Math.max(0, currentBlock - (24 * blocksPerHour));

      console.log(`[TrappedFundsMonitor] Scanning blocks ${fromBlock} to ${currentBlock} on chain ${chainId}`);

      // Get SessionCreated events
      const createdEvents = await contract.queryFilter(
        contract.filters.SessionCreated(),
        fromBlock,
        currentBlock
      );

      console.log(`[TrappedFundsMonitor] Found ${createdEvents.length} SessionCreated events`);

      // Check each session for trapped funds
      for (const event of createdEvents) {
        if (!event.args) continue;
        
        const sessionId = event.args.sessionId;
        const sessionKey = `${chainId}-${sessionId}`;
        
        // Skip if we've checked this recently (within last hour)
        const knownSession = this.knownSessions.get(sessionKey);
        if (knownSession && (Date.now() - knownSession.lastChecked) < 3600000) {
          continue;
        }

        try {
          const trappedFund = await this.checkSessionForTrappedFunds(sessionId, chainId, contract);
          if (trappedFund) {
            trappedFunds.push(trappedFund);
          }
          
          // Mark as checked
          this.knownSessions.set(sessionKey, {
            chainId,
            lastChecked: Date.now()
          });
          
        } catch (sessionError) {
          console.warn(`[TrappedFundsMonitor] Error checking session ${sessionId}: ${(sessionError as Error).message}`);
        }
      }

    } catch (error) {
      console.error(`[TrappedFundsMonitor] Error scanning chain ${chainId}:`, error);
    }

    return trappedFunds;
  }

  /**
   * Check a specific session for trapped funds
   */
  private async checkSessionForTrappedFunds(
    sessionId: string, 
    chainId: number, 
    contract: ethers.Contract
  ): Promise<TrappedFund | null> {
    
    try {
      const session: ProgressiveSession = await contract.getSession(sessionId);
      
      if (session.student === ethers.ZeroAddress) {
        return null; // Session doesn't exist
      }

      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      const refundAmount = session.totalAmount - session.releasedAmount;

      // Check for various trapped fund scenarios
      const isTrapped = this.identifyTrappedScenario(session, timeSinceCreated, refundAmount);
      
      if (isTrapped) {
        const timeTrappedHours = Math.floor(timeSinceCreated / 3600);
        const severity = this.calculateSeverity(timeTrappedHours, refundAmount);
        
        return {
          sessionId,
          chainId,
          student: session.student,
          mentor: session.mentor,
          amount: refundAmount,
          createdAt: Number(session.createdAt),
          timeTrapped: timeTrappedHours,
          severity,
          reason: this.getTrappedReason(session, timeSinceCreated),
          suggestedAction: this.getSuggestedAction(session, timeSinceCreated, severity)
        };
      }

      return null;
      
    } catch (error) {
      console.warn(`[TrappedFundsMonitor] Failed to check session ${sessionId}:`, (error as Error).message);
      return null;
    }
  }

  /**
   * Identify if a session has trapped funds
   */
  private identifyTrappedScenario(
    session: ProgressiveSession, 
    timeSinceCreated: number, 
    refundAmount: bigint
  ): boolean {
    
    if (refundAmount <= 0) return false; // No funds to be trapped
    
    const SESSION_START_TIMEOUT = 15 * 60; // 15 minutes
    
    // Scenario 1: No-show session (Created status past timeout)
    if (session.status === SessionStatus.Created && timeSinceCreated > SESSION_START_TIMEOUT) {
      return true;
    }
    
    // Scenario 2: Session stuck in other states with unreleased funds
    if ((session.status === SessionStatus.Active || session.status === SessionStatus.Paused) &&
        timeSinceCreated > 24 * 3600 && // 24 hours old
        refundAmount > 0) {
      // Could be stuck due to bugs or missing heartbeats
      return true;
    }
    
    // Scenario 3: Completed sessions with unreleased funds (unusual)
    if (session.status === SessionStatus.Completed && 
        refundAmount > 0 && 
        timeSinceCreated > 2 * 3600) { // 2 hours
      return true;
    }
    
    return false;
  }

  /**
   * Calculate severity based on time and amount
   */
  private calculateSeverity(timeTrappedHours: number, amount: bigint): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const amountInEth = parseFloat(ethers.formatEther(amount));
    
    if (timeTrappedHours >= 72 || amountInEth >= 1.0) { // 3+ days or 1+ ETH
      return 'CRITICAL';
    } else if (timeTrappedHours >= 24 || amountInEth >= 0.1) { // 1+ day or 0.1+ ETH
      return 'HIGH';
    } else if (timeTrappedHours >= 4 || amountInEth >= 0.01) { // 4+ hours or 0.01+ ETH
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Get human-readable reason for trapped funds
   */
  private getTrappedReason(session: ProgressiveSession, timeSinceCreated: number): string {
    const hours = Math.floor(timeSinceCreated / 3600);
    
    if (session.status === SessionStatus.Created) {
      return `No-show session - Created ${hours} hours ago but never started`;
    } else if (session.status === SessionStatus.Active || session.status === SessionStatus.Paused) {
      return `Stuck session - ${session.status} for ${hours} hours with unreleased funds`;
    } else if (session.status === SessionStatus.Completed) {
      return `Completed session with unreleased funds - ${hours} hours ago`;
    }
    
    return `Unknown trapped scenario - Status: ${session.status}, Age: ${hours}h`;
  }

  /**
   * Get suggested action based on scenario
   */
  private getSuggestedAction(
    session: ProgressiveSession, 
    timeSinceCreated: number, 
    severity: string
  ): string {
    
    if (session.status === SessionStatus.Created && timeSinceCreated > 900) { // 15+ minutes
      return 'Use checkAndExpireSession() or emergencyRelease()';
    } else if (severity === 'CRITICAL') {
      return 'IMMEDIATE: Use emergencyRelease() or manual-refund-script.ts';
    } else if (severity === 'HIGH') {
      return 'Use RefundBot.triggerRefund() or EmergencyRefundBot';
    }
    
    return 'Monitor and escalate if needed';
  }

  /**
   * Process alerts for trapped funds
   */
  private async processAlerts(trappedFunds: TrappedFund[]): Promise<void> {
    const criticalFunds = trappedFunds.filter(f => f.severity === 'CRITICAL');
    const highFunds = trappedFunds.filter(f => f.severity === 'HIGH');
    
    // Send critical alerts immediately
    if (criticalFunds.length > 0) {
      this.metrics.criticalAlerts += criticalFunds.length;
      
      for (const fund of criticalFunds) {
        await this.sendCriticalAlert(fund);
      }
    }
    
    // Send summary for all trapped funds
    if (this.discordNotifier.isEnabled()) {
      await this.sendTrappedFundsSummary(trappedFunds);
    }
    
    this.metrics.alertsSent += trappedFunds.length;
  }

  /**
   * Send critical alert for individual trapped fund
   */
  private async sendCriticalAlert(fund: TrappedFund): Promise<void> {
    if (!this.discordNotifier.isEnabled()) return;
    
    const embed = {
      title: '🚨 CRITICAL: Trapped Funds Detected',
      color: 0xFF0000, // Red
      fields: [
        {
          name: '💰 Amount',
          value: `${ethers.formatEther(fund.amount)} ETH`,
          inline: true
        },
        {
          name: '⏰ Trapped For',
          value: `${fund.timeTrapped} hours`,
          inline: true
        },
        {
          name: '🌐 Chain',
          value: this.getChainName(fund.chainId),
          inline: true
        },
        {
          name: '📋 Session ID',
          value: `\`${fund.sessionId}\``,
          inline: false
        },
        {
          name: '👤 Student',
          value: `\`${fund.student}\``,
          inline: false
        },
        {
          name: '🔍 Reason',
          value: fund.reason,
          inline: false
        },
        {
          name: '⚡ Suggested Action',
          value: fund.suggestedAction,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Chain Academy Trapped Funds Monitor`
      }
    };

    try {
      await this.discordNotifier.sendCustomMessage({
        embeds: [embed]
      });
      console.log(`[TrappedFundsMonitor] Critical alert sent for session ${fund.sessionId}`);
    } catch (error) {
      console.error('[TrappedFundsMonitor] Failed to send critical alert:', error);
    }
  }

  /**
   * Send summary of all trapped funds found
   */
  private async sendTrappedFundsSummary(trappedFunds: TrappedFund[]): Promise<void> {
    if (!this.discordNotifier.isEnabled() || trappedFunds.length === 0) return;
    
    const criticalCount = trappedFunds.filter(f => f.severity === 'CRITICAL').length;
    const highCount = trappedFunds.filter(f => f.severity === 'HIGH').length;
    const mediumCount = trappedFunds.filter(f => f.severity === 'MEDIUM').length;
    const lowCount = trappedFunds.filter(f => f.severity === 'LOW').length;
    
    const totalValue = trappedFunds.reduce((sum, f) => sum + f.amount, BigInt(0));
    
    const embed = {
      title: '📊 Trapped Funds Scan Results',
      color: criticalCount > 0 ? 0xFF0000 : highCount > 0 ? 0xFF8000 : 0xFFFF00,
      fields: [
        {
          name: '📈 Total Found',
          value: trappedFunds.length.toString(),
          inline: true
        },
        {
          name: '💰 Total Value',
          value: `${ethers.formatEther(totalValue)} ETH`,
          inline: true
        },
        {
          name: '⏰ Scan Time',
          value: new Date().toLocaleTimeString(),
          inline: true
        },
        {
          name: '🚨 Critical',
          value: criticalCount.toString(),
          inline: true
        },
        {
          name: '⚠️ High',
          value: highCount.toString(),
          inline: true
        },
        {
          name: '🟡 Medium/Low',
          value: (mediumCount + lowCount).toString(),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
    
    // Add chain breakdown if multiple chains have trapped funds
    const chainBreakdown = {};
    trappedFunds.forEach(fund => {
      const chainName = this.getChainName(fund.chainId);
      if (!chainBreakdown[chainName]) {
        chainBreakdown[chainName] = { count: 0, value: BigInt(0) };
      }
      chainBreakdown[chainName].count++;
      chainBreakdown[chainName].value += fund.amount;
    });
    
    if (Object.keys(chainBreakdown).length > 1) {
      const chainField = Object.entries(chainBreakdown)
        .map(([chain, data]: [string, any]) => 
          `${chain}: ${data.count} (${ethers.formatEther(data.value)} ETH)`
        )
        .join('\n');
      
      embed.fields.push({
        name: '🌐 By Chain',
        value: chainField,
        inline: false
      });
    }

    try {
      await this.discordNotifier.sendCustomMessage({
        embeds: [embed]
      });
      console.log(`[TrappedFundsMonitor] Summary alert sent for ${trappedFunds.length} trapped funds`);
    } catch (error) {
      console.error('[TrappedFundsMonitor] Failed to send summary alert:', error);
    }
  }

  /**
   * Check a specific session manually
   */
  public async checkSpecificSession(sessionId: string, chainId: number): Promise<TrappedFund | null> {
    const contract = this.contracts.get(chainId);
    if (!contract) {
      throw new Error(`No contract found for chain ${chainId}`);
    }
    
    console.log(`[TrappedFundsMonitor] Checking specific session ${sessionId} on chain ${chainId}`);
    return await this.checkSessionForTrappedFunds(sessionId, chainId, contract);
  }

  /**
   * Get monitoring status and metrics
   */
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      metrics: this.metrics,
      knownSessions: this.knownSessions.size,
      lastScan: new Date(this.metrics.lastScanTime).toISOString(),
      chains: Array.from(this.contracts.keys())
    };
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
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🔍 Trapped Funds Monitor - Chain Academy V7

Commands:
  start [cronSchedule]          Start continuous monitoring (default: every 15min)
  scan                          Run one-time scan
  check <sessionId> <chainId>   Check specific session
  status                        Show monitor status

Examples:
  ts-node TrappedFundsMonitor.ts start "*/30 * * * *"  # Every 30 minutes
  ts-node TrappedFundsMonitor.ts scan                   # One-time scan
  ts-node TrappedFundsMonitor.ts check 0x1234... 8453  # Check specific session
  ts-node TrappedFundsMonitor.ts status                 # Show status

Environment Variables:
  MONITOR_DISCORD_WEBHOOK_URL   Discord webhook for alerts
  BOT_DISCORD_WEBHOOK_URL       Fallback Discord webhook
`);
    process.exit(1);
  }

  const monitor = new TrappedFundsMonitor();
  const command = args[0];

  switch (command) {
    case 'start':
      const cronSchedule = args[1] || '*/15 * * * *';
      monitor.startMonitoring(cronSchedule);
      
      console.log('🔍 Trapped Funds Monitor started');
      console.log('   Press Ctrl+C to stop');
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n⏹️  Stopping monitor...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      
      // Run initial scan
      await monitor.scanForTrappedFunds();
      break;

    case 'scan':
      console.log('🔍 Running one-time trapped funds scan...');
      const results = await monitor.scanForTrappedFunds();
      
      if (results.length === 0) {
        console.log('✅ No trapped funds detected');
      } else {
        console.log(`\n🚨 Found ${results.length} trapped funds:`);
        results.forEach(fund => {
          console.log(`  ${fund.sessionId} (${monitor.getChainName(fund.chainId)}): ${ethers.formatEther(fund.amount)} ETH - ${fund.severity}`);
          console.log(`    Reason: ${fund.reason}`);
          console.log(`    Action: ${fund.suggestedAction}\n`);
        });
      }
      break;

    case 'check':
      if (args.length < 3) {
        console.error('Usage: check <sessionId> <chainId>');
        process.exit(1);
      }
      const sessionId = args[1];
      const chainId = parseInt(args[2]);
      
      const result = await monitor.checkSpecificSession(sessionId, chainId);
      
      if (result) {
        console.log('🚨 TRAPPED FUNDS DETECTED:');
        console.log(`  Session: ${result.sessionId}`);
        console.log(`  Chain: ${monitor.getChainName(result.chainId)}`);
        console.log(`  Amount: ${ethers.formatEther(result.amount)} ETH`);
        console.log(`  Severity: ${result.severity}`);
        console.log(`  Trapped for: ${result.timeTrapped} hours`);
        console.log(`  Reason: ${result.reason}`);
        console.log(`  Suggested action: ${result.suggestedAction}`);
      } else {
        console.log('✅ Session is not trapped or does not exist');
      }
      break;

    case 'status':
      console.log('📊 Trapped Funds Monitor Status:');
      console.log(JSON.stringify(monitor.getStatus(), null, 2));
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TrappedFundsMonitor };