import { useWaitForTransactionReceipt } from 'wagmi';
import { useEffect } from 'react';

interface UseTransactionMonitorResult {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isCancelled: boolean;
  receipt: any;
  error: Error | null;
}

/**
 * Enhanced transaction monitoring hook with detailed logging
 */
export const useTransactionMonitor = (
  hash: `0x${string}` | undefined
): UseTransactionMonitorResult => {
  const {
    data: receipt,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  // Check if transaction was cancelled by user
  const isCancelled = error && (
    error.message?.toLowerCase().includes('user rejected') ||
    error.message?.toLowerCase().includes('user denied') ||
    error.message?.toLowerCase().includes('user cancelled') ||
    error.message?.toLowerCase().includes('transaction rejected') ||
    (error as any).code === 4001 || // MetaMask user rejection
    (error as any).code === 'ACTION_REJECTED' ||
    error.message?.toLowerCase().includes('rejected')
  );

  // Detailed logging for debugging
  useEffect(() => {
    if (hash) {
      console.log('🔍 Transaction Monitor Status:', {
        hash,
        isLoading,
        isSuccess,
        isError,
        isCancelled,
        hasReceipt: !!receipt,
        error: error?.message,
        errorCode: (error as any)?.code,
        receipt: receipt ? {
          status: receipt.status,
          blockNumber: receipt.blockNumber?.toString(),
          transactionHash: receipt.transactionHash
        } : null,
        timestamp: new Date().toISOString()
      });
    }
  }, [hash, isLoading, isSuccess, isError, isCancelled, receipt, error]);

  return {
    isLoading: !!hash && isLoading,
    isSuccess: !!receipt && isSuccess,
    isError,
    isCancelled: !!isCancelled,
    receipt,
    error: error as Error | null,
  };
};