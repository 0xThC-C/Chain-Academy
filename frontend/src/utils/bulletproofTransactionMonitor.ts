/**
 * BULLETPROOF Transaction Monitor
 * System OUTSIDE React hooks that uses pure JavaScript
 * Stores everything in localStorage for persistence
 * Uses setInterval for guaranteed execution
 */

interface TransactionState {
  hash: string;
  chainId: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  receipt: any;
  error: string | null;
  startTime: number;
  lastChecked: number;
  attempts: number;
}

class BulletproofTransactionMonitor {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, (state: TransactionState) => void> = new Map();

  // RPC endpoints for each supported L2 network (CORS-friendly endpoints)
  private rpcs = {
    [8453]: [ // Base - Using CORS-friendly endpoints
      'https://base.public.blastapi.io',
      'https://1rpc.io/base',
      'https://base.publicnode.com',
      'https://base-mainnet.public.blastapi.io'
    ],
    [10]: [ // Optimism - Using CORS-friendly endpoints
      'https://optimism.public.blastapi.io',
      'https://1rpc.io/op',
      'https://optimism.publicnode.com',
      'https://op-mainnet.public.blastapi.io'
    ],
    [42161]: [ // Arbitrum - Using CORS-friendly endpoints
      'https://arbitrum-one.public.blastapi.io',
      'https://1rpc.io/arb',
      'https://arbitrum.publicnode.com',
      'https://arbitrum-one.publicnode.com'
    ],
    [137]: [ // Polygon - Using CORS-friendly endpoints
      'https://polygon.public.blastapi.io',
      'https://1rpc.io/matic',
      'https://polygon.publicnode.com',
      'https://polygon-mainnet.public.blastapi.io'
    ]
  };

  startMonitoring(hash: string, callback: (state: TransactionState) => void, chainId: number = 8453) {
    console.log(`🛡️ BULLETPROOF: Starting monitoring for ${hash} on chain ${chainId}`);
    
    // Stop any existing monitoring for this hash
    this.stopMonitoring(hash);
    
    // Initialize state
    const state: TransactionState = {
      hash,
      chainId,
      status: 'pending',
      receipt: null,
      error: null,
      startTime: Date.now(),
      lastChecked: Date.now(),
      attempts: 0
    };
    
    // Store in localStorage for persistence
    localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
    
    // Store callback
    this.callbacks.set(hash, callback);
    
    // Start aggressive monitoring
    const interval = setInterval(() => {
      this.checkTransaction(hash);
    }, 1000); // Every second
    
    this.monitoringIntervals.set(hash, interval);
    
    // Initial check
    this.checkTransaction(hash);
  }

  private async checkTransaction(hash: string) {
    try {
      const storedState = localStorage.getItem(`tx_${hash}`);
      if (!storedState) return;
      
      const state: TransactionState = JSON.parse(storedState);
      state.attempts++;
      state.lastChecked = Date.now();
      
      console.log(`🛡️ BULLETPROOF: Check attempt ${state.attempts} for ${hash} on chain ${state.chainId}`);
      
      // Get RPCs for the current chain
      const chainRpcs = this.rpcs[state.chainId as keyof typeof this.rpcs];
      if (!chainRpcs) {
        console.warn(`🛡️ BULLETPROOF: No RPCs configured for chain ${state.chainId}`);
        return;
      }

      // Try each RPC for the current chain
      let corsErrorCount = 0;
      for (const rpc of chainRpcs) {
        try {
          const response = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionReceipt', 
              params: [hash],
              id: 1
            })
          });
          
          const result = await response.json();
          
          console.log(`🛡️ BULLETPROOF: RPC response from ${rpc}:`, result);
          
          if (result.result) {
            const receipt = result.result;
            
            if (receipt.status === '0x1') {
              // SUCCESS! - Check if already processed
              if (state.status === 'success') {
                console.log(`🛡️ BULLETPROOF: Success already processed for ${hash}, skipping...`);
                return;
              }
              
              console.log(`🛡️ BULLETPROOF: SUCCESS detected on chain ${state.chainId} via ${rpc}!`, receipt);
              state.status = 'success';
              state.receipt = receipt;
              localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
              
              // Trigger callback ONCE
              const callback = this.callbacks.get(hash);
              if (callback) {
                console.log(`🛡️ BULLETPROOF: Triggering callback for ${hash}`);
                callback(state);
              }
              
              // Stop monitoring
              this.stopMonitoring(hash);
              return;
              
            } else if (receipt.status === '0x0') {
              // FAILED - Check if already processed
              if (state.status === 'failed') {
                console.log(`🛡️ BULLETPROOF: Failure already processed for ${hash}, skipping...`);
                return;
              }
              
              console.log(`🛡️ BULLETPROOF: FAILURE detected on ${rpc}`);
              state.status = 'failed';
              state.error = 'Transaction failed on blockchain';
              state.receipt = receipt;
              localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
              
              const callback = this.callbacks.get(hash);
              if (callback) {
                console.log(`🛡️ BULLETPROOF: Triggering failure callback for ${hash}`);
                callback(state);
              }
              
              this.stopMonitoring(hash);
              return;
            }
          }
          
        } catch (rpcError) {
          const errorMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
          console.log(`🛡️ BULLETPROOF: Chain ${state.chainId} RPC ${rpc} failed:`, errorMessage);
          
          // Check for CORS errors specifically
          if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
            corsErrorCount++;
            console.warn(`🚨 BULLETPROOF: CORS error detected for ${rpc} - this RPC may not be browser-compatible`);
          }
          
          continue; // Try next RPC
        }
      }
      
      // If all RPCs failed with CORS, stop aggressive monitoring to prevent spam
      if (corsErrorCount === chainRpcs.length) {
        console.error(`🚨 BULLETPROOF: All RPCs failed with CORS for chain ${state.chainId} - reducing monitoring frequency`);
        
        // Only check every 30 seconds instead of every second for CORS issues
        if (state.attempts % 30 !== 0) {
          localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
          return;
        }
      }
      
      // Update state and continue monitoring
      localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
      
      // Stop after 5 minutes
      if (Date.now() - state.startTime > 300000) {
        console.log(`🛡️ BULLETPROOF: Timeout for ${hash}`);
        state.status = 'failed';
        state.error = 'Monitoring timeout';
        localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
        
        const callback = this.callbacks.get(hash);
        if (callback) {
          callback(state);
        }
        
        this.stopMonitoring(hash);
      }
      
    } catch (error) {
      console.error(`🛡️ BULLETPROOF: Error checking ${hash}:`, error);
    }
  }

  stopMonitoring(hash: string) {
    const interval = this.monitoringIntervals.get(hash);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(hash);
    }
    this.callbacks.delete(hash);
    console.log(`🛡️ BULLETPROOF: Stopped monitoring ${hash}`);
  }

  // Get current state from localStorage
  getState(hash: string): TransactionState | null {
    const stored = localStorage.getItem(`tx_${hash}`);
    return stored ? JSON.parse(stored) : null;
  }

  // Mark transaction as cancelled
  markCancelled(hash: string) {
    const state = this.getState(hash);
    if (state) {
      // Check if already cancelled
      if (state.status === 'cancelled') {
        console.log(`🛡️ BULLETPROOF: Already cancelled for ${hash}, skipping...`);
        return;
      }
      
      console.log(`🛡️ BULLETPROOF: Marking ${hash} as cancelled`);
      state.status = 'cancelled';
      localStorage.setItem(`tx_${hash}`, JSON.stringify(state));
      
      const callback = this.callbacks.get(hash);
      if (callback) {
        console.log(`🛡️ BULLETPROOF: Triggering cancellation callback for ${hash}`);
        callback(state);
      }
      
      this.stopMonitoring(hash);
    }
  }
}

// Global singleton instance
export const bulletproofMonitor = new BulletproofTransactionMonitor();

// React hook wrapper (but the real work is done outside React)
export const useBulletproofTransactionMonitor = () => {
  return {
    startMonitoring: (hash: string, callback: (state: TransactionState) => void, chainId?: number) => 
      bulletproofMonitor.startMonitoring(hash, callback, chainId),
    stopMonitoring: bulletproofMonitor.stopMonitoring.bind(bulletproofMonitor),
    getState: bulletproofMonitor.getState.bind(bulletproofMonitor),
    markCancelled: bulletproofMonitor.markCancelled.bind(bulletproofMonitor)
  };
};