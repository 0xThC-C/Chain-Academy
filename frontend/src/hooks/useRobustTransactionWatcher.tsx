import { useState, useEffect, useRef, useCallback } from 'react';
import { useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

interface TransactionWatcherState {
  isLoading: boolean;
  isSuccess: boolean;
  data: any;
  error: any;
  debugInfo: {
    wagmiWorking: boolean;
    manualPollingWorking: boolean;
    lastChecked: string;
    rpcResults: Record<string, any>;
    attempts: number;
  };
}

/**
 * Hook robusto para monitorar transações que combina:
 * 1. useWaitForTransactionReceipt do wagmi (método primário)
 * 2. Polling manual com múltiplos RPCs (backup)
 * 3. Sistema de race condition (primeiro sucesso vence)
 * 4. Debugging detalhado
 */
export const useRobustTransactionWatcher = (hash: `0x${string}` | undefined) => {
  const chainId = useChainId();
  const [state, setState] = useState<TransactionWatcherState>({
    isLoading: false,
    isSuccess: false,
    data: null,
    error: null,
    debugInfo: {
      wagmiWorking: false,
      manualPollingWorking: false,
      lastChecked: '',
      rpcResults: {},
      attempts: 0,
    },
  });

  // Refs para controle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManualPollingActiveRef = useRef(false);
  const successReportedRef = useRef(false);

  // wagmi hook (método primário)
  const wagmiResult = useWaitForTransactionReceipt({
    hash,
    timeout: 600000, // 10 minutos
    confirmations: 1,
    pollingInterval: 1000,
    query: {
      enabled: !!hash,
      retry: 20,
      retryDelay: 1000,
      refetchInterval: 1000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    }
  });

  // Criar cliente público para sepolia
  const createPublicClients = useCallback(() => {
    const rpcs = [
      'https://eth-sepolia.public.blastapi.io',
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://1rpc.io/sepolia'
    ];
    
    return rpcs.map((rpc, index) => ({
      client: createPublicClient({
        chain: sepolia,
        transport: http(rpc, {
          timeout: 5000,
          retryCount: 2,
          retryDelay: 500,
        }),
      }),
      rpc,
      index,
    }));
  }, []);

  // Verificar transação em um RPC específico
  const checkTransactionOnRPC = useCallback(async (client: any, rpc: string, hash: `0x${string}`) => {
    try {
      console.log(`🔍 Checking transaction ${hash} on RPC: ${rpc}`);
      const receipt = await client.getTransactionReceipt({ hash });
      
      if (receipt && receipt.status === 'success') {
        console.log(`✅ Transaction found on ${rpc}:`, receipt);
        return receipt;
      }
      
      console.log(`⏳ Transaction not yet confirmed on ${rpc}`);
      return null;
      
    } catch (error: any) {
      console.log(`❌ Error checking ${rpc}:`, error.message);
      return null;
    }
  }, []);

  // Polling manual - verifica todos os RPCs em paralelo
  const startManualPolling = useCallback(async (hash: `0x${string}`) => {
    if (isManualPollingActiveRef.current || successReportedRef.current) {
      return;
    }

    isManualPollingActiveRef.current = true;
    console.log(`🚀 Starting manual polling for transaction: ${hash}`);

    const clients = createPublicClients();
    let attempts = 0;
    const maxAttempts = 120; // 2 minutos com polling de 1s

    const pollTransaction = async () => {
      if (successReportedRef.current) {
        console.log('✅ Success already reported, stopping manual polling');
        return;
      }

      attempts++;
      console.log(`🔄 Manual polling attempt ${attempts}/${maxAttempts} for ${hash}`);

      // Verificar todos os RPCs em paralelo
      const promises = clients.map(({ client, rpc }) => 
        checkTransactionOnRPC(client, rpc, hash)
      );

      try {
        const results = await Promise.allSettled(promises);
        const rpcResults: Record<string, any> = {};

        // Processar resultados
        results.forEach((result, index) => {
          const rpc = clients[index].rpc;
          
          if (result.status === 'fulfilled' && result.value) {
            rpcResults[rpc] = 'SUCCESS';
            
            // Primeira resposta positiva vence!
            if (!successReportedRef.current) {
              successReportedRef.current = true;
              console.log(`🎉 TRANSACTION SUCCESS DETECTED via manual polling on ${rpc}!`);
              
              // Log to localStorage for persistence across page reloads
              const successLog = {
                timestamp: new Date().toISOString(),
                method: 'manual_polling',
                rpc,
                hash,
                receipt: result.value,
                attempts
              };
              localStorage.setItem('lastTransactionSuccess', JSON.stringify(successLog));
              
              setState(prev => ({
                ...prev,
                isLoading: false,
                isSuccess: true,
                data: result.value,
                debugInfo: {
                  ...prev.debugInfo,
                  manualPollingWorking: true,
                  lastChecked: new Date().toISOString(),
                  rpcResults,
                  attempts,
                },
              }));

              // Parar polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              isManualPollingActiveRef.current = false;
              return;
            }
          } else if (result.status === 'fulfilled') {
            rpcResults[rpc] = 'PENDING';
          } else {
            rpcResults[rpc] = 'ERROR';
          }
        });

        // Atualizar debug info
        setState(prev => ({
          ...prev,
          debugInfo: {
            ...prev.debugInfo,
            lastChecked: new Date().toISOString(),
            rpcResults,
            attempts,
          },
        }));

        // Continuar polling se não encontrou
        if (attempts < maxAttempts && !successReportedRef.current) {
          pollingIntervalRef.current = setTimeout(pollTransaction, 1000);
        } else if (attempts >= maxAttempts) {
          console.log('⏰ Manual polling timeout reached');
          isManualPollingActiveRef.current = false;
          setState(prev => ({
            ...prev,
            error: new Error('Manual polling timeout - transaction not confirmed within 2 minutes'),
            debugInfo: {
              ...prev.debugInfo,
              manualPollingWorking: false,
            },
          }));
        }

      } catch (error) {
        console.error('❌ Error in manual polling:', error);
        if (attempts < maxAttempts && !successReportedRef.current) {
          pollingIntervalRef.current = setTimeout(pollTransaction, 2000); // Longer delay on error
        }
      }
    };

    // Iniciar polling
    await pollTransaction();
  }, [createPublicClients, checkTransactionOnRPC]);

  // Monitorar resultado do wagmi
  useEffect(() => {
    if (wagmiResult.isSuccess && wagmiResult.data && !successReportedRef.current) {
      successReportedRef.current = true;
      console.log('🎉 TRANSACTION SUCCESS DETECTED via wagmi!');
      
      // Log to localStorage for persistence across page reloads
      const successLog = {
        timestamp: new Date().toISOString(),
        method: 'wagmi',
        hash,
        receipt: wagmiResult.data,
        attempts: 0
      };
      localStorage.setItem('lastTransactionSuccess', JSON.stringify(successLog));
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        data: wagmiResult.data,
        debugInfo: {
          ...prev.debugInfo,
          wagmiWorking: true,
          lastChecked: new Date().toISOString(),
        },
      }));

      // Parar polling manual
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isManualPollingActiveRef.current = false;
    }

    if (wagmiResult.error && !successReportedRef.current) {
      console.log('⚠️ wagmi error:', wagmiResult.error);
      setState(prev => ({
        ...prev,
        error: wagmiResult.error,
      }));
    }
  }, [wagmiResult.isSuccess, wagmiResult.data, wagmiResult.error]);

  // Iniciar monitoramento quando hash é fornecido
  useEffect(() => {
    if (hash && !successReportedRef.current) {
      console.log(`🎯 Starting robust transaction monitoring for: ${hash}`);
      
      // Reset state
      setState({
        isLoading: true,
        isSuccess: false,
        data: null,
        error: null,
        debugInfo: {
          wagmiWorking: false,
          manualPollingWorking: false,
          lastChecked: '',
          rpcResults: {},
          attempts: 0,
        },
      });

      // Iniciar polling manual após delay curto (deixar wagmi tentar primeiro)
      const delayTimer = setTimeout(() => {
        startManualPolling(hash);
      }, 2000);

      return () => {
        clearTimeout(delayTimer);
      };
    }
    
    // Return empty cleanup function for TypeScript
    return () => {};
  }, [hash, startManualPolling]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isManualPollingActiveRef.current = false;
    };
  }, []);

  // Debug logging
  useEffect(() => {
    if (hash) {
      const debugTimer = setInterval(() => {
        console.log('🔍 Transaction Watcher Status:', {
          hash,
          chainId,
          wagmi: {
            isLoading: wagmiResult.isLoading,
            isSuccess: wagmiResult.isSuccess,
            error: wagmiResult.error?.message,
          },
          manual: {
            isActive: isManualPollingActiveRef.current,
            attempts: state.debugInfo.attempts,
            lastChecked: state.debugInfo.lastChecked,
          },
          state: {
            isLoading: state.isLoading,
            isSuccess: state.isSuccess,
            successReported: successReportedRef.current,
          },
        });
      }, 5000);

      return () => clearInterval(debugTimer);
    }
    
    // Return empty cleanup function for TypeScript
    return () => {};
  }, [hash, chainId, wagmiResult, state]);

  return {
    isLoading: state.isLoading || (wagmiResult.isLoading && !successReportedRef.current),
    isSuccess: state.isSuccess,
    data: state.data,
    error: state.error,
    debugInfo: state.debugInfo,
  };
};