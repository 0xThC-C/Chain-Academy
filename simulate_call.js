#!/usr/bin/env node

// Simulate the exact call to see what's failing
const ARBITRUM_RPC = 'https://arbitrum-one.public.blastapi.io';
const CONTRACT_ADDRESS = '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48';
const YOUR_WALLET = '0xA0E74B53ece3207488c1c2A4178412846209b454'; // Replace with your actual wallet

// addSupportedToken(address(0)) encoded data
const ADD_ETH_DATA = '0xeb0835bf0000000000000000000000000000000000000000000000000000000000000000';

async function simulateCall() {
  console.log('🧪 Simulating addSupportedToken call...');
  
  try {
    // First, let's simulate the call to see detailed error
    const simulateResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          from: YOUR_WALLET,
          to: CONTRACT_ADDRESS,
          data: ADD_ETH_DATA,
          gas: '0x7A120' // 500k gas
        }, 'latest'],
        id: 1
      })
    });
    
    const simulateResult = await simulateResponse.json();
    console.log('🔍 Simulation result:', simulateResult);
    
    if (simulateResult.error) {
      console.log('❌ Call would fail with error:', simulateResult.error.message);
    } else {
      console.log('✅ Call simulation successful - the problem might be gas or nonce');
      
      // Check if ETH is already supported
      const ethCheckResponse = await fetch(ARBITRUM_RPC, {
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
      
      const ethCheckResult = await ethCheckResponse.json();
      const isEthSupported = parseInt(ethCheckResult.result || '0x0', 16) === 1;
      console.log('💰 ETH already supported:', isEthSupported);
      
      if (isEthSupported) {
        console.log('💡 ETH is already enabled! Try USDC instead.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during simulation:', error.message);
  }
}

simulateCall();