#!/usr/bin/env node

// Simple script to debug contract state
const ARBITRUM_RPC = 'https://arbitrum-one.public.blastapi.io';
const CONTRACT_ADDRESS = '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48';
const USER_ADDRESS = '0xA0E74B53ece3207488c1c2A4178412846209b454';

// getUserNonce function selector: 0x5a18c830
// supportedTokens function selector: 0x5a3b7e42

async function checkContractState() {
  console.log('🔍 Debugging contract state...');
  
  // Check user nonce
  try {
    const nonceResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x5a18c830' + USER_ADDRESS.slice(2).padStart(64, '0')
        }, 'latest'],
        id: 1
      })
    });
    
    const nonceResult = await nonceResponse.json();
    console.log('📊 User nonce:', parseInt(nonceResult.result || '0x0', 16));
    
  } catch (error) {
    console.error('❌ Error checking nonce:', error.message);
  }
  
  // Check ETH token support (address(0))
  try {
    const ethSupportResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x5a3b7e42' + '0000000000000000000000000000000000000000000000000000000000000000'
        }, 'latest'],
        id: 2
      })
    });
    
    const ethSupportResult = await ethSupportResponse.json();
    const isEthSupported = parseInt(ethSupportResult.result || '0x0', 16) === 1;
    console.log('💰 ETH token supported:', isEthSupported);
    
  } catch (error) {
    console.error('❌ Error checking ETH support:', error.message);
  }
  
  // Check USDC token support (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
  try {
    const usdcSupportResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x5a3b7e42' + 'af88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase().padStart(64, '0')
        }, 'latest'],
        id: 3
      })
    });
    
    const usdcSupportResult = await usdcSupportResponse.json();
    const isUsdcSupported = parseInt(usdcSupportResult.result || '0x0', 16) === 1;
    console.log('💰 USDC token supported:', isUsdcSupported);
    
  } catch (error) {
    console.error('❌ Error checking USDC support:', error.message);
  }
}

checkContractState();