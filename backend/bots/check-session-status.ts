#!/usr/bin/env ts-node

/**
 * Script para verificar status de uma sessão específica
 * Usage: ts-node check-session-status.ts <sessionId> <chainId>
 */

import { ethers } from 'ethers';

// V7 ABI para verificar sessão
const ESCROW_ABI = [
  'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint256 lastHeartbeat, uint256 pausedTime, uint256 createdAt, uint8 status, bool isActive, bool isPaused, bool surveyCompleted))',
  'function getAvailablePayment(bytes32 sessionId) external view returns (uint256)',
  'function shouldAutoPause(bytes32 sessionId) external view returns (bool)'
];

// V4 ABI para compatibilidade (caso seja sessão V4)
const V4_ESCROW_ABI = [
  'function getSessionDetails(uint256 sessionId) external view returns (tuple(address mentor, address student, uint256 amount, address token, uint8 status, uint256 completedAt, bool manuallyConfirmed))'
];

// Contratos V7
const V7_CONTRACTS = {
  8453: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3', // Base
  10: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3',   // Optimism  
  42161: '0x2a9d167e30195ba5fd29cfc09622be0d02da91be', // Arbitrum
  137: '0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3'   // Polygon
};

// RPC URLs
const RPC_URLS = {
  8453: 'https://mainnet.base.org',
  10: 'https://mainnet.optimism.io', 
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon-rpc.com'
};

async function checkSessionStatus(sessionId: string, chainId: number) {
  console.log(`🔍 Checking session ${sessionId} on chain ${chainId}`);
  
  try {
    const rpcUrl = RPC_URLS[chainId as keyof typeof RPC_URLS];
    const contractAddress = V7_CONTRACTS[chainId as keyof typeof V7_CONTRACTS];
    
    if (!rpcUrl || !contractAddress) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ESCROW_ABI, provider);
    
    console.log(`📡 Connected to ${rpcUrl}`);
    console.log(`📋 Contract: ${contractAddress}`);
    
    // Try V7 format first (bytes32)
    try {
      const sessionDetails = await contract.getSession(sessionId);
      
      console.log('\n📊 Session Details (V7):');
      console.log('  Session ID:', sessionDetails.sessionId);
      console.log('  Student:', sessionDetails.student);
      console.log('  Mentor:', sessionDetails.mentor);
      console.log('  Token:', sessionDetails.paymentToken);
      console.log('  Total Amount:', ethers.formatEther(sessionDetails.totalAmount), 'tokens');
      console.log('  Released Amount:', ethers.formatEther(sessionDetails.releasedAmount), 'tokens');
      console.log('  Duration (min):', sessionDetails.sessionDuration.toString());
      console.log('  Start Time:', new Date(Number(sessionDetails.startTime) * 1000).toISOString());
      console.log('  Created At:', new Date(Number(sessionDetails.createdAt) * 1000).toISOString());
      console.log('  Status:', getStatusName(Number(sessionDetails.status)));
      console.log('  Is Active:', sessionDetails.isActive);
      console.log('  Is Paused:', sessionDetails.isPaused);
      console.log('  Survey Completed:', sessionDetails.surveyCompleted);
      
      // Check available payment
      const availablePayment = await contract.getAvailablePayment(sessionId);
      console.log('  Available Payment:', ethers.formatEther(availablePayment), 'tokens');
      
      // Check if should auto-pause
      const shouldPause = await contract.shouldAutoPause(sessionId);
      console.log('  Should Auto Pause:', shouldPause);
      
      // Analyze the situation
      analyzeSituation(sessionDetails, availablePayment);
      
    } catch (error) {
      console.log('❌ V7 format failed, might be V4 session or invalid ID');
      console.log('Error:', (error as Error).message);
    }
    
  } catch (error) {
    console.error('❌ Failed to check session:', error);
  }
}

function getStatusName(status: number): string {
  const statusNames = {
    0: 'Created',
    1: 'Started', 
    2: 'Paused',
    3: 'Completed',
    4: 'Cancelled',
    5: 'Expired'
  };
  return statusNames[status as keyof typeof statusNames] || `Unknown (${status})`;
}

function analyzeSituation(sessionDetails: any, availablePayment: bigint) {
  console.log('\n🔍 Analysis:');
  
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(sessionDetails.startTime);
  const duration = Number(sessionDetails.sessionDuration) * 60; // Convert to seconds
  const sessionEndTime = startTime + duration;
  
  const status = Number(sessionDetails.status);
  const isActive = sessionDetails.isActive;
  
  if (status === 0) { // Created but not started
    if (now > sessionEndTime) {
      console.log('🚨 ISSUE: Session expired (never started) - Should be refunded automatically');
      console.log('   Recommendation: Bot should process this as no-show refund');
    } else {
      console.log('⏳ Session created but not yet started (within time window)');
    }
  } else if (status === 1) { // Started
    console.log('▶️ Session is in progress');
  } else if (status === 2) { // Paused
    console.log('⏸️ Session is paused');
  } else if (status === 3) { // Completed
    if (availablePayment > 0) {
      console.log('💰 Session completed but payment not yet released');
      console.log('   Available for release:', ethers.formatEther(availablePayment), 'tokens');
    } else {
      console.log('✅ Session completed and payment already released');
    }
  } else if (status === 4) { // Cancelled
    console.log('❌ Session was cancelled');
  } else if (status === 5) { // Expired
    if (availablePayment > 0) {
      console.log('⏰ Session expired with funds available for refund');
    } else {
      console.log('⏰ Session expired and already processed');
    }
  }
  
  // Check if bot action is needed
  if ((status === 0 && now > sessionEndTime) || // Expired no-show
      (status === 3 && availablePayment > 0) ||  // Completed but not paid
      (status === 5 && availablePayment > 0)) {  // Expired but not refunded
    console.log('\n🤖 BOT ACTION NEEDED:');
    console.log('   This session should be processed by the payment bot');
    console.log('   Run: npm run bot:v7:test to check if bot can detect it');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Usage: ts-node check-session-status.ts <sessionId> <chainId>

Examples:
  ts-node check-session-status.ts 0x1234... 8453    # Base
  ts-node check-session-status.ts 0x1234... 10      # Optimism  
  ts-node check-session-status.ts 0x1234... 42161   # Arbitrum
  ts-node check-session-status.ts 0x1234... 137     # Polygon

Note: For V7 contracts, sessionId should be bytes32 (0x + 64 hex chars)
      For V4 contracts, sessionId might be uint256
`);
    process.exit(1);
  }
  
  const sessionId = args[0];
  const chainId = parseInt(args[1]);
  
  await checkSessionStatus(sessionId, chainId);
}

if (require.main === module) {
  main().catch(console.error);
}