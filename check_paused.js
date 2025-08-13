#!/usr/bin/env node

// Check if contract is paused
const ARBITRUM_RPC = 'https://arbitrum-one.public.blastapi.io';
const CONTRACT_ADDRESS = '0x8B173c2E4C84b4bdD8c656F3d47Bc4259594Bd48';

// paused() function selector: 0x5c975abb
// owner() function selector: 0x8da5cb5b

async function checkContractStatus() {
  console.log('🔍 Checking if contract is paused...');
  
  try {
    // Check if contract is paused
    const pausedResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x5c975abb'
        }, 'latest'],
        id: 1
      })
    });
    
    const pausedResult = await pausedResponse.json();
    const isPaused = parseInt(pausedResult.result || '0x0', 16) === 1;
    console.log('⏸️  Contract paused:', isPaused);
    
    // Check owner
    const ownerResponse = await fetch(ARBITRUM_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESS,
          data: '0x8da5cb5b'
        }, 'latest'],
        id: 2
      })
    });
    
    const ownerResult = await ownerResponse.json();
    const owner = '0x' + ownerResult.result.slice(-40);
    console.log('👑 Contract owner:', owner);
    
    if (isPaused) {
      console.log('');
      console.log('❌ PROBLEMA ENCONTRADO: O contrato está PAUSADO!');
      console.log('💡 Solução: Chame a função unpause() primeiro');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContractStatus();