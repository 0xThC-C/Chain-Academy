#!/usr/bin/env ts-node

/**
 * EMERGENCY REFUND - Immediate solution for trapped session
 * Usage: ts-node emergency-refund-now.ts
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function emergencyRefund() {
  console.log('🚨 EMERGENCY REFUND - Liberating trapped funds...');
  
  // Session específica presa
  const sessionId = '0x00000000000000000000000000000000000000000000000000000198a5e572a9';
  const studentAddress = '0xeD23509C050Ef0762482efaf7fa54952eddb07a7';
  const amount = '306000000000000'; // 0.000306 ETH em wei
  const reason = 'Emergency refund: Session created 90+ hours ago, student no-show, funds trapped due to V7 contract bug';
  
  const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  const contractAddress = '0x2a9d167e30195ba5fd29cfc09622be0d02da91be';
  
  const abi = [
    'function emergencyRelease(bytes32 sessionId, address recipient, uint256 amount, string calldata reason) external',
    'function owner() external view returns (address)',
    'function getSession(bytes32 sessionId) external view returns (tuple(bytes32 sessionId, address student, address mentor, address paymentToken, uint256 totalAmount, uint256 releasedAmount, uint256 sessionDuration, uint256 startTime, uint8 status, bool isActive, bool surveyCompleted))'
  ];
  
  // ATENÇÃO: Precisamos da private key do OWNER do contrato
  const ownerPrivateKey = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.BOT_PRIVATE_KEY;
  
  if (!ownerPrivateKey) {
    console.log('❌ ERRO: Precisa da private key do owner do contrato');
    console.log('   Set CONTRACT_OWNER_PRIVATE_KEY ou use BOT_PRIVATE_KEY se o bot for owner');
    return;
  }
  
  const wallet = new ethers.Wallet('0x' + ownerPrivateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  
  try {
    console.log('👤 Wallet:', wallet.address);
    
    // Verificar se é owner
    const contractOwner = await contract.owner();
    console.log('👑 Contract Owner:', contractOwner);
    
    if (wallet.address.toLowerCase() !== contractOwner.toLowerCase()) {
      console.log('❌ ERRO: Esta wallet não é o owner do contrato!');
      console.log('   Apenas o owner pode executar emergencyRelease()');
      return;
    }
    
    // Verificar estado da sessão antes
    console.log('\n📊 Estado ANTES do refund:');
    const sessionBefore = await contract.getSession(sessionId);
    console.log('   Status:', sessionBefore.status.toString());
    console.log('   Valor total:', ethers.formatEther(sessionBefore.totalAmount), 'ETH');
    console.log('   Valor liberado:', ethers.formatEther(sessionBefore.releasedAmount), 'ETH');
    console.log('   Estudante:', sessionBefore.student);
    
    // Executar emergency release
    console.log('\n🚀 Executando emergencyRelease...');
    const tx = await contract.emergencyRelease(sessionId, studentAddress, amount, reason, {
      gasLimit: 200000
    });
    
    console.log('📡 Transação enviada:', tx.hash);
    console.log('⏳ Aguardando confirmação...');
    
    const receipt = await tx.wait();
    console.log('✅ REFUND EXECUTADO COM SUCESSO!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas usado:', receipt.gasUsed.toString());
    console.log('   TX: https://arbiscan.io/tx/' + tx.hash);
    
    // Verificar estado após
    console.log('\n📊 Estado DEPOIS do refund:');
    const sessionAfter = await contract.getSession(sessionId);
    console.log('   Valor liberado:', ethers.formatEther(sessionAfter.releasedAmount), 'ETH');
    
    console.log('\n🎉 SUCESSO! Fundos liberados para:', studentAddress);
    console.log('💰 Valor:', ethers.formatEther(amount), 'ETH');
    
  } catch (error: any) {
    console.log('❌ ERRO:', error.reason || error.message || error);
    
    if (error.message?.includes('Ownable: caller is not the owner')) {
      console.log('💡 SOLUÇÃO: Use a private key do owner do contrato');
    }
  }
}

if (require.main === module) {
  emergencyRefund().catch(console.error);
}