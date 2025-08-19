#!/usr/bin/env ts-node

/**
 * Manual Refund Script - One-time solution for specific trapped session
 * For the reported 0.000306 ETH trapped for 3.8 days
 */

import { ethers } from 'ethers';

// Emergency function signatures for manual intervention
const EMERGENCY_ABI = [
  'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function owner() external view returns (address)',
  'function emergencyWithdrawETH(address payable to, uint256 amount) external',
  'function balanceOf(address token, address account) external view returns (uint256)',
  'function checkAndExpireSession(bytes32 sessionId) external'
];

// V7 Contracts - Updated addresses from your deployment
const CONTRACTS = {
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

/**
 * IMMEDIATE FIX: Free the 0.000306 ETH trapped session
 * Usage: ts-node manual-refund-script.ts <sessionId> <chainId>
 */
async function executeEmergencyRefund(sessionId: string, chainId: number) {
  console.log(`🚨 EMERGENCY REFUND: Processing session ${sessionId} on chain ${chainId}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  
  // Validate inputs
  if (!sessionId.startsWith('0x') || sessionId.length !== 66) {
    throw new Error('Session ID must be 32-byte hex string (0x + 64 chars)');
  }
  
  if (!CONTRACTS[chainId as keyof typeof CONTRACTS]) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  // Setup connection
  const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS];
  const contractAddress = CONTRACTS[chainId as keyof typeof CONTRACTS];
  
  console.log(`📡 RPC: ${rpcUrl}`);
  console.log(`📋 Contract: ${contractAddress}`);
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Setup wallet (MUST be contract owner)
  const privateKey = process.env.EMERGENCY_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('EMERGENCY_PRIVATE_KEY or BOT_PRIVATE_KEY required');
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, EMERGENCY_ABI, wallet);
  
  console.log(`🔐 Wallet: ${wallet.address}`);
  
  try {
    // Step 1: Get session details
    console.log('\n📊 Fetching session details...');
    const session = await contract.getSession(sessionId);
    
    if (session.student === ethers.ZeroAddress) {
      throw new Error('❌ Session not found or already processed');
    }
    
    console.log('✅ Session found:');
    console.log('  Student:', session.student);
    console.log('  Mentor:', session.mentor);
    console.log('  Token:', session.paymentToken === ethers.ZeroAddress ? 'ETH' : session.paymentToken);
    console.log('  Total Amount:', ethers.formatEther(session.totalAmount), 'ETH');
    console.log('  Released Amount:', ethers.formatEther(session.releasedAmount), 'ETH');
    console.log('  Status:', getStatusName(session.status));
    console.log('  Created:', new Date(Number(session.createdAt) * 1000).toISOString());
    
    const refundAmount = session.totalAmount - session.releasedAmount;
    console.log('  🎯 REFUND AMOUNT:', ethers.formatEther(refundAmount), 'ETH');
    
    if (refundAmount <= 0) {
      console.log('❌ No funds to refund - session already processed');
      return;
    }
    
    // Step 2: Verify ownership
    console.log('\n🔐 Verifying contract ownership...');
    const owner = await contract.owner();
    
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error(`❌ NOT CONTRACT OWNER!`);
      console.error(`   Contract Owner: ${owner}`);
      console.error(`   Your Address:   ${wallet.address}`);
      throw new Error('Must be contract owner to execute emergency refund');
    }
    
    console.log('✅ Confirmed contract ownership');
    
    // Step 3: Check if we can use regular expiry function first
    console.log('\n🔍 Trying regular expiry function first...');
    try {
      // Check if session can be expired normally
      const now = Math.floor(Date.now() / 1000);
      const timeSinceCreated = now - Number(session.createdAt);
      const SESSION_START_TIMEOUT = 15 * 60; // 15 minutes
      
      console.log(`   Time since created: ${Math.floor(timeSinceCreated / 60)} minutes`);
      console.log(`   Session status: ${session.status} (${getStatusName(session.status)})`);
      
      if (session.status === 0 && timeSinceCreated > SESSION_START_TIMEOUT) {
        console.log('🔄 Attempting normal expiry function...');
        
        const expireTx = await contract.checkAndExpireSession(sessionId, {
          gasLimit: 150000
        });
        
        console.log(`📝 Expiry transaction: ${expireTx.hash}`);
        const expireReceipt = await expireTx.wait();
        
        if (expireReceipt.status === 1) {
          console.log('🎉 SUCCESS! Normal expiry function worked');
          console.log('💰 Refund processed successfully');
          return;
        } else {
          throw new Error('Expiry transaction failed');
        }
      } else {
        console.log('⚠️  Regular expiry not applicable, proceeding with emergency release...');
      }
    } catch (expireError) {
      console.log('❌ Regular expiry failed:', (expireError as Error).message);
      console.log('🚨 Proceeding with EMERGENCY RELEASE...');
    }
    
    // Step 4: Execute emergency release
    console.log('\n🚀 EXECUTING EMERGENCY RELEASE...');
    console.log(`   Releasing ${ethers.formatEther(refundAmount)} ETH to ${session.student}`);
    
    const emergencyTx = await contract.emergencyRelease(
      sessionId,
      session.student, // Send refund to student
      refundAmount,
      'Emergency refund: No-show session with trapped funds - 3.8 days overdue',
      {
        gasLimit: 200000,
        // Add extra gas price for priority
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
      }
    );
    
    console.log(`📝 Emergency transaction sent: ${emergencyTx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await emergencyTx.wait();
    
    if (receipt.status === 1) {
      console.log('\n🎉 EMERGENCY REFUND SUCCESSFUL! 🎉');
      console.log('✅ Transaction confirmed');
      console.log(`💰 ${ethers.formatEther(refundAmount)} ETH refunded to ${session.student}`);
      console.log(`🔗 Transaction hash: ${emergencyTx.hash}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Send summary
      console.log('\n📋 REFUND SUMMARY:');
      console.log('='.repeat(50));
      console.log(`Session ID: ${sessionId}`);
      console.log(`Chain: ${getChainName(chainId)}`);
      console.log(`Amount: ${ethers.formatEther(refundAmount)} ETH`);
      console.log(`Student: ${session.student}`);
      console.log(`Transaction: ${emergencyTx.hash}`);
      console.log(`Status: COMPLETED ✅`);
      console.log('='.repeat(50));
      
    } else {
      throw new Error('❌ Emergency transaction failed');
    }
    
  } catch (error) {
    console.error('\n💥 EMERGENCY REFUND FAILED:');
    console.error('Error:', (error as Error).message);
    
    // Diagnostic information
    console.log('\n🔍 DIAGNOSTIC INFO:');
    console.log('- Check that the wallet has contract owner permissions');
    console.log('- Verify the session ID is correct and in bytes32 format');
    console.log('- Ensure sufficient ETH for gas fees in the wallet');
    console.log('- Try calling getSession() first to verify session exists');
    
    throw error;
  }
}

function getStatusName(status: number): string {
  const statusNames = {
    0: 'Created',
    1: 'Active', 
    2: 'Paused',
    3: 'Completed',
    4: 'Cancelled',
    5: 'Expired'
  };
  return statusNames[status as keyof typeof statusNames] || `Unknown(${status})`;
}

function getChainName(chainId: number): string {
  const names = {
    8453: 'Base',
    10: 'Optimism',
    42161: 'Arbitrum',
    137: 'Polygon'
  };
  return names[chainId as keyof typeof names] || `Chain ${chainId}`;
}

// CLI interface
async function main() {
  console.log('🚨 MANUAL EMERGENCY REFUND SCRIPT');
  console.log('🎯 PURPOSE: Free trapped funds in ProgressiveEscrowV7');
  console.log('⚠️  WARNING: This uses emergencyRelease() - only for genuine emergencies\n');
  
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`Usage: ts-node manual-refund-script.ts <sessionId> <chainId>

Examples:
  ts-node manual-refund-script.ts 0x1234...abcd 8453    # Base mainnet
  ts-node manual-refund-script.ts 0x5678...efgh 42161   # Arbitrum

Environment Variables:
  EMERGENCY_PRIVATE_KEY  Private key of contract owner (required)
  
Supported Chains:
  8453  - Base
  10    - Optimism
  42161 - Arbitrum
  137   - Polygon

⚠️  IMPORTANT: This script requires CONTRACT OWNER permissions!
`);
    process.exit(1);
  }
  
  const sessionId = args[0];
  const chainId = parseInt(args[1]);
  
  // Confirmation prompt
  console.log(`🎯 TARGET SESSION: ${sessionId}`);
  console.log(`🌐 CHAIN: ${getChainName(chainId)} (${chainId})`);
  console.log(`⏰ TIMESTAMP: ${new Date().toISOString()}`);
  console.log('\n⚠️  This will execute an EMERGENCY REFUND');
  console.log('   Funds will be returned to the student address');
  console.log('   This action is irreversible');
  
  // In production, you might want to add a confirmation prompt here
  // For now, proceeding directly for emergency use
  
  try {
    await executeEmergencyRefund(sessionId, chainId);
    process.exit(0);
  } catch (error) {
    console.error('\n💥 SCRIPT FAILED:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { executeEmergencyRefund };