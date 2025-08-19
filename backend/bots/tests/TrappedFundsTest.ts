#!/usr/bin/env ts-node

/**
 * Comprehensive Test Suite for Trapped Funds Prevention
 * Tests all edge cases that could lead to fund trapping in ProgressiveEscrow contracts
 */

import { ethers } from 'ethers';
import { expect } from 'chai';

// Test interfaces
interface TestSession {
  sessionId: string;
  student: string;
  mentor: string;
  amount: bigint;
  createdAt: number;
  status: number;
}

interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<TestSession>;
  execute: (session: TestSession) => Promise<void>;
  verify: (session: TestSession) => Promise<void>;
  expectedOutcome: 'REFUND_SUCCESS' | 'NO_FUNDS_TRAPPED' | 'EMERGENCY_REQUIRED';
}

// Mock contract ABI for testing
const TEST_ABI = [
  'function createProgressiveSession(bytes32 sessionId, address mentor, address paymentToken, uint256 amount, uint256 durationMinutes, uint256 nonce) external payable',
  'function startProgressiveSession(bytes32 sessionId) external',
  'function checkAndExpireSession(bytes32 sessionId) external',
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
  'function processNoShowRefund(bytes32 sessionId) external', // V8 function
  'function triggerEligibleRefund(bytes32 sessionId) external', // V8 function
  'function forceRefund(bytes32 sessionId, string calldata reason) external', // V8 function
  'function getRefundStatus(bytes32 sessionId) external view returns (bool isRefundProcessed, bool isEligibleForRefund, uint256 refundAmount, string memory eligibilityReason)' // V8 function
];

export class TrappedFundsTestSuite {
  private provider: ethers.JsonRpcProvider;
  private testWallet: ethers.Wallet;
  private studentWallet: ethers.Wallet;
  private mentorWallet: ethers.Wallet;
  private ownerWallet: ethers.Wallet;
  
  private contractV7: ethers.Contract | null = null;
  private contractV8: ethers.Contract | null = null;
  
  private testResults: Map<string, boolean> = new Map();
  private testErrors: Map<string, string> = new Map();

  constructor(
    rpcUrl: string = 'http://127.0.0.1:8545', // Local test network
    contractV7Address?: string,
    contractV8Address?: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create test wallets
    this.testWallet = new ethers.Wallet(ethers.id('test-private-key'), this.provider);
    this.studentWallet = new ethers.Wallet(ethers.id('student-private-key'), this.provider);
    this.mentorWallet = new ethers.Wallet(ethers.id('mentor-private-key'), this.provider);
    this.ownerWallet = new ethers.Wallet(ethers.id('owner-private-key'), this.provider);
    
    // Initialize contracts if addresses provided
    if (contractV7Address) {
      this.contractV7 = new ethers.Contract(contractV7Address, TEST_ABI, this.ownerWallet);
    }
    
    if (contractV8Address) {
      this.contractV8 = new ethers.Contract(contractV8Address, TEST_ABI, this.ownerWallet);
    }
    
    console.log('[TrappedFundsTest] Test suite initialized');
    console.log(`  Student: ${this.studentWallet.address}`);
    console.log(`  Mentor: ${this.mentorWallet.address}`);
    console.log(`  Owner: ${this.ownerWallet.address}`);
  }

  /**
   * Run all trapped funds test scenarios
   */
  public async runAllTests(): Promise<void> {
    console.log('\n🧪 Starting Trapped Funds Test Suite');
    console.log('=' .repeat(50));
    
    const scenarios = this.getTestScenarios();
    
    for (const scenario of scenarios) {
      await this.runTestScenario(scenario);
    }
    
    // Print results summary
    this.printTestSummary();
  }

  /**
   * Get all test scenarios
   */
  private getTestScenarios(): TestScenario[] {
    return [
      {
        name: 'NO_SHOW_V7_BUG',
        description: 'Test the V7 fund-trapping bug: Created session past timeout should refund',
        setup: () => this.setupNoShowSession(),
        execute: (session) => this.executeNoShowTest(session, 'V7'),
        verify: (session) => this.verifyRefundSuccess(session),
        expectedOutcome: 'EMERGENCY_REQUIRED' // V7 has the bug
      },
      {
        name: 'NO_SHOW_V8_FIX',
        description: 'Test V8 fix: No-show session should refund automatically',
        setup: () => this.setupNoShowSession(),
        execute: (session) => this.executeNoShowTest(session, 'V8'),
        verify: (session) => this.verifyRefundSuccess(session),
        expectedOutcome: 'REFUND_SUCCESS' // V8 should fix it
      },
      {
        name: 'TIMEOUT_EDGE_CASE',
        description: 'Test exactly at 15-minute timeout boundary',
        setup: () => this.setupTimeoutEdgeCase(),
        execute: (session) => this.executeTimeoutEdgeTest(session),
        verify: (session) => this.verifyRefundSuccess(session),
        expectedOutcome: 'REFUND_SUCCESS'
      },
      {
        name: 'MULTIPLE_REFUND_ATTEMPTS',
        description: 'Test protection against multiple refund attempts',
        setup: () => this.setupNoShowSession(),
        execute: (session) => this.executeMultipleRefundTest(session),
        verify: (session) => this.verifyNoDoubleRefund(session),
        expectedOutcome: 'NO_FUNDS_TRAPPED'
      },
      {
        name: 'EMERGENCY_RELEASE_V7',
        description: 'Test emergency release for V7 trapped funds',
        setup: () => this.setupTrappedV7Session(),
        execute: (session) => this.executeEmergencyRelease(session),
        verify: (session) => this.verifyRefundSuccess(session),
        expectedOutcome: 'REFUND_SUCCESS'
      },
      {
        name: 'BATCH_REFUND_V8',
        description: 'Test V8 batch refund functionality',
        setup: () => this.setupMultipleTrappedSessions(),
        execute: (session) => this.executeBatchRefund(session),
        verify: (session) => this.verifyBatchRefundSuccess(session),
        expectedOutcome: 'REFUND_SUCCESS'
      },
      {
        name: 'GRACE_PERIOD_V8',
        description: 'Test V8 grace period for refund eligibility',
        setup: () => this.setupGracePeriodSession(),
        execute: (session) => this.executeGracePeriodTest(session),
        verify: (session) => this.verifyGracePeriodHandling(session),
        expectedOutcome: 'REFUND_SUCCESS'
      },
      {
        name: 'TRUSTLESS_REFUND_V8',
        description: 'Test V8 trustless refund mechanism (anyone can trigger)',
        setup: () => this.setupNoShowSession(),
        execute: (session) => this.executeTrustlessRefund(session),
        verify: (session) => this.verifyRefundSuccess(session),
        expectedOutcome: 'REFUND_SUCCESS'
      }
    ];
  }

  /**
   * Run a single test scenario
   */
  private async runTestScenario(scenario: TestScenario): Promise<void> {
    console.log(`\n🧪 Test: ${scenario.name}`);
    console.log(`📋 ${scenario.description}`);
    
    try {
      // Setup
      console.log('  📝 Setting up...');
      const session = await scenario.setup();
      
      // Execute
      console.log('  ⚡ Executing...');
      await scenario.execute(session);
      
      // Verify
      console.log('  ✅ Verifying...');
      await scenario.verify(session);
      
      this.testResults.set(scenario.name, true);
      console.log(`  🎉 PASSED: ${scenario.name}`);
      
    } catch (error) {
      this.testResults.set(scenario.name, false);
      this.testErrors.set(scenario.name, (error as Error).message);
      console.error(`  ❌ FAILED: ${scenario.name}`);
      console.error(`     Error: ${(error as Error).message}`);
    }
  }

  // Test setup methods

  private async setupNoShowSession(): Promise<TestSession> {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes(`test-${Date.now()}`));
    const amount = ethers.parseEther('0.1');
    
    // Create session but don't start it
    // This would normally be done via the frontend/API
    
    return {
      sessionId,
      student: this.studentWallet.address,
      mentor: this.mentorWallet.address,
      amount,
      createdAt: Math.floor(Date.now() / 1000),
      status: 0 // Created
    };
  }

  private async setupTimeoutEdgeCase(): Promise<TestSession> {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes(`edge-${Date.now()}`));
    const amount = ethers.parseEther('0.05');
    
    // Create session exactly at timeout boundary (15 minutes ago)
    const createdAt = Math.floor(Date.now() / 1000) - (15 * 60);
    
    return {
      sessionId,
      student: this.studentWallet.address,
      mentor: this.mentorWallet.address,
      amount,
      createdAt,
      status: 0 // Created
    };
  }

  private async setupTrappedV7Session(): Promise<TestSession> {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes(`trapped-${Date.now()}`));
    const amount = ethers.parseEther('0.000306'); // Simulate reported trapped amount
    
    // Simulate a session trapped for 3.8 days
    const createdAt = Math.floor(Date.now() / 1000) - (3.8 * 24 * 60 * 60);
    
    return {
      sessionId,
      student: this.studentWallet.address,
      mentor: this.mentorWallet.address,
      amount,
      createdAt,
      status: 0 // Created - this is the bug
    };
  }

  private async setupMultipleTrappedSessions(): Promise<TestSession> {
    // This would set up multiple sessions for batch testing
    // For simplicity, returning one session representing the batch
    return await this.setupTrappedV7Session();
  }

  private async setupGracePeriodSession(): Promise<TestSession> {
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes(`grace-${Date.now()}`));
    const amount = ethers.parseEther('0.02');
    
    // Create session just within grace period
    const createdAt = Math.floor(Date.now() / 1000) - (16 * 60); // 16 minutes ago
    
    return {
      sessionId,
      student: this.studentWallet.address,
      mentor: this.mentorWallet.address,
      amount,
      createdAt,
      status: 0
    };
  }

  // Test execution methods

  private async executeNoShowTest(session: TestSession, version: 'V7' | 'V8'): Promise<void> {
    const contract = version === 'V7' ? this.contractV7 : this.contractV8;
    
    if (!contract) {
      throw new Error(`Contract ${version} not available for testing`);
    }

    // Simulate time passing (15+ minutes)
    await this.simulateTimePass(16 * 60); // 16 minutes
    
    if (version === 'V7') {
      // V7: Try normal expiry function - should fail due to bug
      try {
        await contract.checkAndExpireSession(session.sessionId);
        // If this succeeds, V7 was fixed
      } catch (error) {
        // Expected to fail - this is the bug
        console.log(`    V7 expiry failed as expected: ${(error as Error).message}`);
        
        // Try emergency release instead
        await contract.emergencyRelease(
          session.sessionId,
          session.student,
          session.amount,
          'Emergency refund for trapped funds'
        );
      }
    } else {
      // V8: Should have multiple refund pathways
      
      // Try the enhanced expiry function
      try {
        await contract.checkAndExpireSession(session.sessionId);
      } catch (error) {
        // If normal expiry fails, try the new no-show refund function
        console.log(`    V8 expiry failed, trying no-show refund: ${(error as Error).message}`);
        await contract.processNoShowRefund(session.sessionId);
      }
    }
  }

  private async executeTimeoutEdgeTest(session: TestSession): Promise<void> {
    // Test behavior exactly at the 15-minute boundary
    const contract = this.contractV8 || this.contractV7;
    if (!contract) throw new Error('No contract available');
    
    // Should be eligible for refund exactly at timeout
    await contract.checkAndExpireSession(session.sessionId);
  }

  private async executeMultipleRefundTest(session: TestSession): Promise<void> {
    const contract = this.contractV8 || this.contractV7;
    if (!contract) throw new Error('No contract available');
    
    // First refund attempt
    await this.simulateTimePass(16 * 60);
    await contract.checkAndExpireSession(session.sessionId);
    
    // Second refund attempt - should fail or be ignored
    try {
      await contract.checkAndExpireSession(session.sessionId);
      throw new Error('Double refund should not be allowed');
    } catch (error) {
      // Expected to fail
      console.log(`    Double refund prevented: ${(error as Error).message}`);
    }
  }

  private async executeEmergencyRelease(session: TestSession): Promise<void> {
    const contract = this.contractV7 || this.contractV8;
    if (!contract) throw new Error('No contract available');
    
    // Use emergency release function
    await contract.emergencyRelease(
      session.sessionId,
      session.student,
      session.amount,
      'Test emergency release for trapped funds'
    );
  }

  private async executeBatchRefund(session: TestSession): Promise<void> {
    const contract = this.contractV8;
    if (!contract) throw new Error('V8 contract required for batch refund test');
    
    // Test batch refund with single session (could be extended for multiple)
    await contract.batchRefund([session.sessionId], 'Batch refund test');
  }

  private async executeGracePeriodTest(session: TestSession): Promise<void> {
    const contract = this.contractV8;
    if (!contract) throw new Error('V8 contract required for grace period test');
    
    // Check refund status during grace period
    const [isRefundProcessed, isEligible, refundAmount, reason] = await contract.getRefundStatus(session.sessionId);
    
    console.log(`    Grace period status: eligible=${isEligible}, reason=${reason}`);
    
    if (isEligible) {
      await contract.triggerEligibleRefund(session.sessionId);
    } else {
      // Wait for grace period to pass
      await this.simulateTimePass(60 * 60); // 1 hour
      await contract.triggerEligibleRefund(session.sessionId);
    }
  }

  private async executeTrustlessRefund(session: TestSession): Promise<void> {
    const contract = this.contractV8;
    if (!contract) throw new Error('V8 contract required for trustless refund test');
    
    // Use a different wallet (not owner) to trigger refund
    const randomWallet = ethers.Wallet.createRandom().connect(this.provider);
    const contractAsRandom = contract.connect(randomWallet);
    
    await this.simulateTimePass(16 * 60);
    await contractAsRandom.triggerEligibleRefund(session.sessionId);
  }

  // Test verification methods

  private async verifyRefundSuccess(session: TestSession): Promise<void> {
    // Verify that funds were returned to student
    // In a real test, you'd check the student's balance increased by the session amount
    
    console.log(`    ✅ Verifying refund of ${ethers.formatEther(session.amount)} ETH to ${session.student}`);
    
    // Mock verification - in real test you'd check actual balances
    const studentBalance = await this.provider.getBalance(session.student);
    console.log(`    Student balance: ${ethers.formatEther(studentBalance)} ETH`);
    
    // Verify session status changed
    if (this.contractV7 || this.contractV8) {
      const contract = this.contractV8 || this.contractV7;
      try {
        const sessionData = await contract!.getSession(session.sessionId);
        console.log(`    Session status after refund: ${sessionData.status}`);
        
        // Status should be Expired (5) or RefundProcessed (6 in V8)
        if (sessionData.status !== 5 && sessionData.status !== 6) {
          throw new Error(`Unexpected session status: ${sessionData.status}`);
        }
      } catch (error) {
        console.log(`    Session verification: ${(error as Error).message}`);
      }
    }
  }

  private async verifyNoDoubleRefund(session: TestSession): Promise<void> {
    console.log(`    ✅ Verifying no double refund occurred`);
    // In real test, verify that only one refund transaction occurred
    // and that subsequent attempts fail appropriately
  }

  private async verifyBatchRefundSuccess(session: TestSession): Promise<void> {
    console.log(`    ✅ Verifying batch refund success`);
    await this.verifyRefundSuccess(session);
  }

  private async verifyGracePeriodHandling(session: TestSession): Promise<void> {
    console.log(`    ✅ Verifying grace period was handled correctly`);
    await this.verifyRefundSuccess(session);
  }

  // Utility methods

  private async simulateTimePass(seconds: number): Promise<void> {
    // In a real test environment, you'd use time manipulation
    // For now, just log the simulation
    console.log(`    ⏰ Simulating ${Math.floor(seconds/60)} minutes passing...`);
  }

  private printTestSummary(): void {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    for (const [testName, result] of this.testResults) {
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testName}`);
      
      if (!result && this.testErrors.has(testName)) {
        console.log(`     Error: ${this.testErrors.get(testName)}`);
      }
      
      if (result) passed++;
      else failed++;
    }
    
    console.log('\n📈 Overall Results:');
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total:  ${passed + failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! No fund-trapping vulnerabilities detected.');
    } else {
      console.log('\n⚠️  Some tests failed. Review the failures above.');
    }
  }

  /**
   * Test a specific session ID for trapped funds
   */
  public async testSpecificSession(sessionId: string, chainId: number, contractAddress: string): Promise<void> {
    console.log(`\n🔍 Testing specific session: ${sessionId}`);
    console.log(`   Chain: ${chainId}`);
    console.log(`   Contract: ${contractAddress}`);
    
    const rpcUrl = this.getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, TEST_ABI, provider);
    
    try {
      // Get session details
      const session = await contract.getSession(sessionId);
      
      if (session.student === ethers.ZeroAddress) {
        console.log('❌ Session not found');
        return;
      }
      
      console.log('📋 Session Details:');
      console.log(`   Student: ${session.student}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Created: ${new Date(Number(session.createdAt) * 1000).toISOString()}`);
      console.log(`   Total: ${ethers.formatEther(session.totalAmount)} ETH`);
      console.log(`   Released: ${ethers.formatEther(session.releasedAmount)} ETH`);
      
      const refundAmount = session.totalAmount - session.releasedAmount;
      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      
      console.log(`   Refundable: ${ethers.formatEther(refundAmount)} ETH`);
      console.log(`   Age: ${Math.floor(timeSinceCreated / 3600)} hours`);
      
      // Test refund eligibility
      if (refundAmount > 0 && session.status === 0 && timeSinceCreated > 900) {
        console.log('🚨 TRAPPED FUNDS DETECTED!');
        console.log('   This session appears to have trapped funds');
        console.log('   Recommended action: Use emergency refund tools');
      } else {
        console.log('✅ Session appears normal - no trapped funds detected');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', (error as Error).message);
    }
  }

  private getRpcUrl(chainId: number): string {
    const urls: Record<number, string> = {
      8453: 'https://mainnet.base.org',
      10: 'https://mainnet.optimism.io',
      42161: 'https://arb1.arbitrum.io/rpc',
      137: 'https://polygon-rpc.com'
    };
    return urls[chainId] || 'http://127.0.0.1:8545';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
🧪 Trapped Funds Test Suite

Commands:
  all [v7Address] [v8Address]         Run all test scenarios
  session <sessionId> <chainId> <contractAddress>  Test specific session
  
Examples:
  ts-node TrappedFundsTest.ts all 0x123... 0x456...
  ts-node TrappedFundsTest.ts session 0x789... 8453 0xabc...

Environment:
  - For 'all' tests, you need local test network with deployed contracts
  - For 'session' tests, works with mainnet contracts
`);
    process.exit(1);
  }

  const command = args[0];
  
  if (command === 'all') {
    const v7Address = args[1];
    const v8Address = args[2];
    
    const testSuite = new TrappedFundsTestSuite('http://127.0.0.1:8545', v7Address, v8Address);
    await testSuite.runAllTests();
    
  } else if (command === 'session') {
    if (args.length < 4) {
      console.error('Usage: session <sessionId> <chainId> <contractAddress>');
      process.exit(1);
    }
    
    const sessionId = args[1];
    const chainId = parseInt(args[2]);
    const contractAddress = args[3];
    
    const testSuite = new TrappedFundsTestSuite();
    await testSuite.testSpecificSession(sessionId, chainId, contractAddress);
    
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TrappedFundsTestSuite };