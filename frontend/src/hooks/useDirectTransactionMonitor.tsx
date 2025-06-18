import { useState, useEffect, useRef } from 'react';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

interface DirectTransactionMonitorResult {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isCancelled: boolean;
  receipt: any;
  error: Error | null;
}

/**
 * Direct transaction monitoring using manual polling
 * More reliable than wagmi hooks for transaction monitoring
 */
export const useDirectTransactionMonitor = (
  hash: `0x${string}` | undefined
): DirectTransactionMonitorResult => {
  const [state, setState] = useState<DirectTransactionMonitorResult>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    isCancelled: false,
    receipt: null,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);
  const maxAttempts = 120; // 2 minutes with 1s intervals

  // Create multiple public clients for redundancy
  const createClients = () => {
    const rpcs = [
      'https://eth-sepolia.public.blastapi.io',
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://1rpc.io/sepolia',
      'https://rpc.sepolia.org'
    ];
    
    return rpcs.map(rpc => createPublicClient({
      chain: sepolia,
      transport: http(rpc, {
        timeout: 5000,
        retryCount: 2,
      }),
    }));
  };

  const checkTransaction = async (txHash: `0x${string}`) => {
    const clients = createClients();
    attemptCountRef.current++;

    console.log(`🔍 Direct monitoring attempt ${attemptCountRef.current}/${maxAttempts} for ${txHash}`);

    // Try each client in parallel
    const promises = clients.map(async (client, index) => {
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash });
        console.log(`✅ Got receipt from RPC ${index}:`, receipt);
        return receipt;
      } catch (error) {
        console.log(`❌ RPC ${index} failed:`, error);
        return null;
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      
      // Find first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const receipt = result.value;
          
          if (receipt.status === 'success') {
            console.log('🎉 DIRECT MONITOR: Transaction successful!', receipt);
            setState({
              isLoading: false,
              isSuccess: true,
              isError: false,
              isCancelled: false,
              receipt,
              error: null,
            });
            return true; // Success found
          } else if (receipt.status === 'reverted') {
            console.log('❌ DIRECT MONITOR: Transaction failed');
            setState({
              isLoading: false,
              isSuccess: false,
              isError: true,
              isCancelled: false,
              receipt,
              error: new Error('Transaction reverted'),
            });
            return true; // Definitive result found
          }
        }
      }

      // No receipt found yet, continue polling if under max attempts
      if (attemptCountRef.current < maxAttempts) {
        console.log(`⏳ No receipt yet, continuing... (${attemptCountRef.current}/${maxAttempts})`);
        return false; // Continue polling
      } else {
        console.log('⏰ Max attempts reached, stopping monitoring');
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: new Error('Transaction monitoring timeout'),
        }));
        return true; // Stop polling
      }

    } catch (error) {
      console.error('❌ Error in direct monitoring:', error);
      
      if (attemptCountRef.current < maxAttempts) {
        return false; // Continue polling
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: error as Error,
        }));
        return true; // Stop polling
      }
    }
  };

  // Start monitoring when hash is provided
  useEffect(() => {
    if (hash) {
      console.log(`🚀 Starting direct transaction monitoring for: ${hash}`);
      
      // Reset state
      setState({
        isLoading: true,
        isSuccess: false,
        isError: false,
        isCancelled: false,
        receipt: null,
        error: null,
      });
      
      attemptCountRef.current = 0;

      // Start polling
      const startPolling = async () => {
        const shouldStop = await checkTransaction(hash);
        
        if (!shouldStop) {
          intervalRef.current = setTimeout(startPolling, 1000);
        }
      };

      startPolling();

      return () => {
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Reset state when no hash
      setState({
        isLoading: false,
        isSuccess: false,
        isError: false,
        isCancelled: false,
        receipt: null,
        error: null,
      });
    }
    
    // Return empty cleanup function for TypeScript
    return () => {};
  }, [hash]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  return state;
};