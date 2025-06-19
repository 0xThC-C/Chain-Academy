import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { useReadContract, useWriteContract } from 'wagmi';
import { useBulletproofTransactionMonitor } from '../utils/bulletproofTransactionMonitor';
import { parseUnits, formatUnits } from 'viem';
import {
  ClockIcon,
  CalendarIcon,
  UserIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  ERC20_ABI,
  getTokenAddress,
  isNativeToken,
  SUPPORTED_TOKENS,
  getProgressiveEscrowAddress,
  PROGRESSIVE_ESCROW_ABI,
  getChainName,
  getBlockExplorerUrl,
  isSupportedChain,
  type SupportedToken
} from '../contracts/ProgressiveEscrowV4';

import PaymentSuccessModal from '../components/PaymentSuccessModal';
import PaymentErrorModal from '../components/PaymentErrorModal';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import UserAvatar from '../components/UserAvatar';
import TransactionToast from '../components/TransactionToast';

// Helper function to format duration
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  } else {
    return `${hours}h ${remainingMinutes}m`;
  }
};

interface BookingData {
  mentor: {
    id: number;
    name: string;
    title: string;
    description: string;
    priceUSDC: number;
    duration: number;
    category: string;
    skills: string[];
    mentorAddress?: string;
    prerequisites?: string;
  };
  date: string;
  time: string;
  student: string;
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chain = chainId ? {
    id: chainId,
    name: getChainName(chainId)
  } : null;

  // Get booking data from location state
  const bookingData: BookingData | null = location.state?.bookingData || null;

  // Component state
  const [selectedToken, setSelectedToken] = useState<SupportedToken>('ETH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [paymentError, setPaymentError] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [sessionId, setSessionId] = useState<number | undefined>();
  
  // Toast notifications
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Helper function to show toast and clear previous ones
  const showToast = (newToast: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }) => {
    console.log('📢 Attempting to show toast:', newToast);
    
    // ULTRA PROTECTION: Check if this toast type is muted
    const toastKey = `${newToast.type}-${newToast.title}`;
    if (mutedToastTypes.has(toastKey)) {
      console.log('🔇 Toast is MUTED by user, skipping:', toastKey);
      return;
    }
    
    // Prevent duplicate toasts
    if (toast && toast.type === newToast.type && toast.title === newToast.title) {
      console.log('📢 Duplicate toast prevented');
      return;
    }
    
    console.log('📢 Showing toast:', newToast);
    setToast(newToast);
  };

  // Redirect if no booking data
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      if (!bookingData) {
        navigate('/mentors');
      }
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [bookingData, navigate]);

  // URGENT: Clean up duplicate sessions on page load
  useEffect(() => {
    const cleanupDuplicates = () => {
      const existingBookings = JSON.parse(localStorage.getItem('mentorship_bookings') || '[]');
      console.log(`🧹 Found ${existingBookings.length} sessions in localStorage`);
      
      if (existingBookings.length > 50) { // If there are suspiciously many sessions
        console.log('🧹 CLEANING UP DUPLICATE SESSIONS...');
        
        // Keep only unique sessions by transaction hash
        const uniqueSessions = existingBookings.filter((session: any, index: number, arr: any[]) => {
          return index === arr.findIndex(s => s.transactionHash === session.transactionHash);
        });
        
        console.log(`🧹 Reduced from ${existingBookings.length} to ${uniqueSessions.length} sessions`);
        localStorage.setItem('mentorship_bookings', JSON.stringify(uniqueSessions));
        
        // Trigger update event
        window.dispatchEvent(new CustomEvent('mentorshipBookingUpdated', {
          detail: { type: 'cleanup' }
        }));
      }
    };

    cleanupDuplicates();
  }, []); // Run once on mount

  // Calculate amounts
  const calculateAmounts = () => {
    if (!bookingData) return { baseAmount: 0, platformFee: 0, totalAmount: 0 };
    
    const baseAmount = bookingData.mentor.priceUSDC;
    const platformFee = baseAmount * 0.1; // 10% platform fee
    const totalAmount = baseAmount + platformFee;
    
    return { baseAmount, platformFee, totalAmount };
  };

  const { baseAmount, platformFee, totalAmount } = calculateAmounts();

  // Get contract addresses using multi-L2 configuration
  const progressiveEscrowAddress = chainId ? getProgressiveEscrowAddress(chainId) : '0x';
  const tokenAddress = chain ? getTokenAddress(selectedToken, chain.id) : '0x';

  // Check if current chain is supported
  const chainSupported = chainId ? isSupportedChain(chainId) : false;

  // Check ETH balance for native token
  const { data: ethBalance, isLoading: isLoadingEthBalance, error: ethBalanceError } = useBalance({
    address: address as `0x${string}`,
    query: {
      enabled: isConnected && !!address && isNativeToken(selectedToken),
      refetchInterval: 5000,
    },
  });

  // Log ETH balance status
  useEffect(() => {
    if (isNativeToken(selectedToken)) {
      console.log('🔍 ETH Balance Hook Status:', {
        isConnected,
        address,
        selectedToken,
        isLoading: isLoadingEthBalance,
        ethBalance: ethBalance ? {
          value: ethBalance.value.toString(),
          formatted: ethBalance.formatted,
          symbol: ethBalance.symbol,
          decimals: ethBalance.decimals
        } : null,
        error: ethBalanceError?.message,
        hookEnabled: isConnected && !!address && isNativeToken(selectedToken)
      });
    }
  }, [isConnected, address, selectedToken, ethBalance, isLoadingEthBalance, ethBalanceError]);

  // Check ERC20 token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address && !isNativeToken(selectedToken),
      refetchInterval: 5000,
    },
  });

  // Check token allowance (not needed for native ETH)
  const { data: tokenAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, progressiveEscrowAddress as `0x${string}`],
    query: {
      enabled: isConnected && !!address && !isNativeToken(selectedToken) && chainSupported,
      refetchInterval: 5000,
    },
  });

  // Get token decimals (ETH has 18 decimals, ERC20 tokens query from contract)
  const { data: erc20Decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress && !isNativeToken(selectedToken),
    },
  });

  // Get the appropriate decimals based on token type
  const tokenDecimals = isNativeToken(selectedToken) ? 18 : erc20Decimals;

  // Get user nonce for the contract with fresh data
  const { data: userNonce, refetch: refetchNonce } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'getUserNonce',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address && chainSupported,
      refetchInterval: 5000, // More frequent updates
      staleTime: 0, // Always fetch fresh data
    },
  });

  // Prepare approval transaction
  const totalAmountWei = tokenDecimals ? parseUnits(totalAmount.toString(), tokenDecimals as any) : BigInt(0);
  const needsApproval = isNativeToken(selectedToken) ? false : (tokenAllowance ? (tokenAllowance as any) < totalAmountWei : true);

  // Approval transaction
  const { writeContract: approveWrite, isPending: isApproving, error: approveError } = useWriteContract();
  
  // Booking transaction  
  const { writeContract: bookWrite, data: bookData, isPending: isBooking, error: writeError } = useWriteContract();
  
  // Bulletproof transaction monitoring
  const { startMonitoring, stopMonitoring, markCancelled } = useBulletproofTransactionMonitor();
  
  // Transaction state managed by bulletproof monitor
  const [txState, setTxState] = useState<any>(null);
  const [hasProcessedSuccess, setHasProcessedSuccess] = useState(false);
  const [mutedToastTypes, setMutedToastTypes] = useState<Set<string>>(new Set());
  
  // Detect cancellations from writeContract errors  
  const transactionCancelled = (writeError || approveError) && (
    (writeError?.message?.toLowerCase().includes('user rejected') ||
     writeError?.message?.toLowerCase().includes('user denied') ||
     writeError?.message?.toLowerCase().includes('rejected') ||
     (writeError as any)?.code === 4001) ||
    (approveError?.message?.toLowerCase().includes('user rejected') ||
     approveError?.message?.toLowerCase().includes('user denied') ||
     approveError?.message?.toLowerCase().includes('rejected') ||
     (approveError as any)?.code === 4001)
  );

  // Derived state from bulletproof monitor
  const isBookingTx = txState?.status === 'pending';

  // Start bulletproof monitoring when transaction hash is available
  useEffect(() => {
    if (bookData) {
      console.log('🛡️ Starting bulletproof monitoring for:', bookData);
      
      // Show transaction sent toast
      showToast({
        type: 'info',
        title: 'Transaction Sent',
        message: 'Your payment is being processed on the blockchain...'
      });
      
      startMonitoring(bookData, (state) => {
        console.log('🛡️ Bulletproof callback:', state);
        setTxState(state);
      });
      
      // Cleanup function
      return () => {
        stopMonitoring(bookData);
      };
    }
    
    return () => {};
  }, [bookData, startMonitoring, stopMonitoring]);

  // Handle transaction cancellation - IMMEDIATE reset
  useEffect(() => {
    if (transactionCancelled) {
      console.log('🚫 TRANSACTION CANCELLED - Resetting immediately');
      
      // Show cancellation toast
      showToast({
        type: 'warning',
        title: 'Transaction Cancelled',
        message: 'Payment was cancelled. You can try again.'
      });
      
      // Mark as cancelled in bulletproof monitor
      if (bookData) {
        markCancelled(bookData);
      }
      
      setIsProcessing(false);
      setPaymentError(null);
      setShowErrorModal(false);
      setTxState(null);
    }
  }, [transactionCancelled, bookData, markCancelled]);

  // Handle bulletproof transaction updates
  useEffect(() => {
    if (!txState) return;
    if (hasProcessedSuccess && txState.status === 'success') {
      console.log('🛡️ Success already processed, skipping...');
      return;
    }

    console.log('🛡️ Processing bulletproof state update:', txState);

    if (txState.status === 'success' && !hasProcessedSuccess) {
      console.log('🎉 BULLETPROOF SUCCESS - Processing booking...');
      setHasProcessedSuccess(true); // PREVENT MULTIPLE EXECUTIONS
      
      const txHash = txState.receipt.transactionHash || txState.hash;
      setTransactionHash(txHash);
      const newSessionId = Date.now();
      setSessionId(newSessionId);
      
      // Save booking session
      if (bookingData && address) {
        try {
          const bookedSession = {
            id: newSessionId,
            sessionId: `session-${newSessionId}`,
            title: bookingData.mentor.title,
            description: bookingData.mentor.description,
            student: address,
            mentor: bookingData.mentor.mentorAddress,
            mentorName: bookingData.mentor.name,
            date: bookingData.date,
            time: bookingData.time,
            duration: bookingData.mentor.duration,
            price: totalAmount,
            token: selectedToken,
            category: bookingData.mentor.category,
            skills: bookingData.mentor.skills,
            status: 'upcoming',
            transactionHash: txHash,
            blockNumber: txState.receipt.blockNumber,
            createdAt: new Date().toISOString(),
          };

          const existingBookings = JSON.parse(localStorage.getItem('mentorship_bookings') || '[]');
          existingBookings.push(bookedSession);
          localStorage.setItem('mentorship_bookings', JSON.stringify(existingBookings));

          window.dispatchEvent(new CustomEvent('mentorshipBookingUpdated', {
            detail: { session: bookedSession, type: 'created' }
          }));

          console.log('✅ BULLETPROOF: Booking saved successfully');
          
          // Show success toast
          showToast({
            type: 'success',
            title: 'Payment Successful!',
            message: 'Your mentorship session has been booked successfully.'
          });
          
          // Clear any existing errors
          setPaymentError(null);
          setShowErrorModal(false);
          
          // Show success
          setShowSuccessModal(true);
          setIsProcessing(false);
          
        } catch (error) {
          console.error('❌ Error saving booking:', error);
          // Even if saving fails, show success since transaction worked
          setShowSuccessModal(true);
          setIsProcessing(false);
        }
      }
      
    } else if (txState.status === 'failed') {
      console.error('❌ BULLETPROOF FAILURE');
      
      // Show error toast
      showToast({
        type: 'error',
        title: 'Transaction Failed',
        message: txState.error || 'Transaction failed on blockchain.'
      });
      
      setPaymentError({
        title: 'Transaction Failed',
        message: txState.error || 'Transaction failed on blockchain.'
      });
      setShowErrorModal(true);
      setIsProcessing(false);
      
    } else if (txState.status === 'cancelled') {
      console.log('🚫 BULLETPROOF CANCELLATION');
      // Already handled in cancellation effect
    }
    
  }, [txState, bookingData, address, totalAmount, selectedToken, hasProcessedSuccess]);


  // Check if user has sufficient balance (including gas fees for ETH)
  const hasSufficientBalance = () => {
    // Enhanced bypass for ETH with better balance feedback
    if (isNativeToken(selectedToken) && isConnected) {
      console.log('⚡ BYPASS MODE: Allowing ETH payment (balance detection has wallet conflicts)');
      
      // Still try to get balance for display, but don't block payment
      if (ethBalance) {
        const balanceFormatted = parseFloat(formatUnits(ethBalance.value, 18));
        const gasEstimate = 0.005;
        const totalNeeded = totalAmount + gasEstimate;
        
        if (balanceFormatted >= totalNeeded) {
          console.log('✅ ETH balance sufficient:', { balance: balanceFormatted, needed: totalNeeded });
          return true;
        } else {
          console.log('⚠️ ETH balance may be insufficient, but allowing due to bypass mode:', { balance: balanceFormatted, needed: totalNeeded });
        }
      }
      
      return true; // Always allow in bypass mode
    }

    console.log('🔍 Balance Check Debug:', {
      tokenDecimals,
      selectedToken,
      isNativeToken: isNativeToken(selectedToken),
      ethBalance: ethBalance ? ethBalance.value.toString() : 'null',
      tokenBalance: tokenBalance ? tokenBalance.toString() : 'null',
      totalAmount,
      isConnected,
      address
    });

    if (!tokenDecimals) {
      console.log('❌ No token decimals');
      return false;
    }
    
    if (isNativeToken(selectedToken)) {
      if (!ethBalance) {
        console.log('❌ No ETH balance detected');
        return false;
      }
      
      const balanceFormatted = parseFloat(formatUnits(ethBalance.value, tokenDecimals as any));
      
      // For ETH, we need to account for gas fees (estimate ~0.005 ETH for safety)
      const gasEstimate = 0.005; // Conservative gas estimate in ETH
      const totalNeeded = totalAmount + gasEstimate;
      
      console.log('💰 ETH Balance Check:', {
        balance: balanceFormatted,
        transactionAmount: totalAmount,
        gasEstimate,
        totalNeeded,
        sufficient: balanceFormatted >= totalNeeded,
        rawBalance: ethBalance.value.toString(),
        decimals: tokenDecimals
      });
      
      return balanceFormatted >= totalNeeded;
    } else {
      if (!tokenBalance) {
        console.log('❌ No token balance detected');
        return false;
      }
      const balanceFormatted = parseFloat(formatUnits(tokenBalance as any, tokenDecimals as any));
      return balanceFormatted >= totalAmount;
    }
  };

  // Get current balance for display
  const getCurrentBalance = () => {
    if (!tokenDecimals) return '0';
    
    if (isNativeToken(selectedToken)) {
      if (!ethBalance) return '0';
      return parseFloat(formatUnits(ethBalance.value, tokenDecimals as any)).toFixed(4);
    } else {
      if (!tokenBalance) return '0';
      return parseFloat(formatUnits(tokenBalance as any, tokenDecimals as any)).toFixed(2);
    }
  };

  // Simplified payment handler
  const handlePayment = async () => {
    console.log('🚀 Starting payment...');

    if (!isConnected || !address || !bookingData) {
      console.log('❌ Missing requirements');
      return;
    }

    if (!bookWrite) {
      setPaymentError({
        title: 'Wallet Not Ready',
        message: 'Please ensure your wallet is connected and try again.'
      });
      setShowErrorModal(true);
      return;
    }
    
    try {
      setIsProcessing(true);
      setPaymentError(null);
      setHasProcessedSuccess(false); // RESET FLAG FOR NEW TRANSACTION
      setMutedToastTypes(new Set()); // CLEAR MUTED TOASTS FOR NEW TRANSACTION
      console.log('🔊 Cleared muted toasts for new transaction');

      // Handle token approval if needed
      if (needsApproval) {
        approveWrite({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [progressiveEscrowAddress as `0x${string}`, totalAmountWei],
        });
        return;
      }

      // Refresh nonce and create payment
      await refetchNonce();
      
      const sessionId = `0x${Date.now().toString(16).padStart(64, '0')}`;
      const currentNonce = userNonce || BigInt(0);
      
      console.log('💳 Creating payment with:', {
        sessionId,
        mentor: bookingData.mentor.mentorAddress,
        amount: totalAmountWei.toString(),
        token: selectedToken
      });

      await bookWrite({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'createProgressiveSession',
        args: [
          sessionId as `0x${string}`,
          bookingData.mentor.mentorAddress as `0x${string}`,
          tokenAddress as `0x${string}`,
          totalAmountWei,
          BigInt(bookingData.mentor.duration),
          currentNonce,
        ],
        ...(isNativeToken(selectedToken) && { value: totalAmountWei }),
      });

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      
      // Check if error is due to user cancellation
      const isCancellation = error.message?.toLowerCase().includes('user rejected') ||
                            error.message?.toLowerCase().includes('user denied') ||
                            error.message?.toLowerCase().includes('user cancelled') ||
                            error.message?.toLowerCase().includes('transaction rejected') ||
                            error.code === 4001 ||
                            error.code === 'ACTION_REJECTED' ||
                            error.message?.toLowerCase().includes('rejected');
      
      if (isCancellation) {
        console.log('🚫 Payment cancelled by user in handler');
        setIsProcessing(false);
        // Don't show error modal for cancellations
        return;
      }
      
      setPaymentError({
        title: 'Payment Failed',
        message: error.message || 'Transaction failed. Please try again.'
      });
      setShowErrorModal(true);
      setIsProcessing(false);
    }
  };

  // Handle retry payment
  const handleRetryPayment = () => {
    setShowErrorModal(false);
    setPaymentError(null);
    handlePayment();
  };


  // Removed complex wallet retry logic - keeping it simple


  // Handle success modal actions
  const handleViewDashboard = () => {
    setShowSuccessModal(false);
    navigate('/dashboard');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Booking Data Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Please return to the mentorship gallery to select a session.
          </p>
          <button
            onClick={() => {
              const timer = setTimeout(() => navigate('/mentors'), 0);
              return () => clearTimeout(timer);
            }}
            className="btn-primary"
          >
            Browse Mentors
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-red rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to complete the payment
          </p>
          <div className="flex justify-center">
            <WalletConnectionV2 />
          </div>
        </div>
      </div>
    );
  }

  if (isConnected && !chainSupported) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Unsupported Network
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Chain Academy supports Base, Optimism, Arbitrum, and Polygon networks.
            {chainId && <><br />Current network: {getChainName(chainId)} ({chainId})</>}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Please switch to a supported L2 network in your wallet.
          </p>
          <button
            onClick={() => navigate('/mentors')}
            className="btn-primary"
          >
            Browse Mentors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/mentors')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Mentors</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Complete Payment
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Review your session details and complete the secure payment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Session Details */}
          <div className="space-y-6">
            {/* Session Summary */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Session Details
              </h2>

              {/* Mentor Info */}
              <div className="flex items-center space-x-3 mb-4">
                <UserAvatar 
                  address={bookingData.mentor.mentorAddress} 
                  size="md" 
                  className="" 
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {bookingData.mentor.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {bookingData.mentor.category}
                  </p>
                </div>
              </div>

              {/* Session Title */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Session Topic
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {bookingData.mentor.title}
                </p>
              </div>

              {/* Session Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(bookingData.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {bookingData.time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center space-x-2 mb-4">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDuration(bookingData.mentor.duration)}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Skills Covered</p>
                <div className="flex flex-wrap gap-2">
                  {bookingData.mentor.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-primary-red/10 text-primary-red text-xs rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {bookingData.mentor.prerequisites && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Prerequisites</p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {bookingData.mentor.prerequisites}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="card p-4 border-l-4 border-green-500">
              <div className="flex items-start space-x-3">
                <ShieldCheckIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Progressive Escrow Payment
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Your payment is held in a secure smart contract escrow. Funds are released 
                    gradually to the mentor as the session progresses, ensuring fair payment 
                    for time spent. If cancelled early, unused funds are returned to you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment */}
          <div className="space-y-6">
            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Payment Method
              </h2>

              {/* Token Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Payment Token
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(SUPPORTED_TOKENS).map((token) => (
                    <button
                      key={token}
                      onClick={() => setSelectedToken(token as SupportedToken)}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedToken === token
                          ? 'border-primary-red bg-primary-red/5 text-primary-red'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{token}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {token === 'ETH' ? 'Ethereum' : token === 'USDC' ? 'USD Coin' : 'Tether USD'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown for ETH */}
              {isNativeToken(selectedToken) && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 ETH Payment Breakdown
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Session Payment:</span>
                      <span className="font-mono">{totalAmount.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Gas Fees (est.):</span>
                      <span className="font-mono">~0.005 ETH</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-blue-900 dark:text-blue-100">Total Needed:</span>
                        <span className="font-mono text-blue-900 dark:text-blue-100">{(totalAmount + 0.005).toFixed(4)} ETH</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-xs">
                    <span className="text-green-700 dark:text-green-300">
                      ⚡ Balance check temporarily bypassed due to wallet extension conflicts. 
                      Ensure you have sufficient ETH before proceeding.
                    </span>
                  </div>
                </div>
              )}

              {/* Balance Check */}
              {((isNativeToken(selectedToken) && ethBalance) || (!isNativeToken(selectedToken) && tokenBalance)) && tokenDecimals && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Your {selectedToken} Balance:
                    </span>
                    <span className={`font-medium ${
                      hasSufficientBalance() 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {getCurrentBalance()} {selectedToken}
                    </span>
                  </div>
                  {!hasSufficientBalance() && (
                    <div className="flex items-center space-x-2 mt-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Insufficient balance for this payment
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Session Price</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {baseAmount} {selectedToken}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Platform Fee (10%)</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {platformFee.toFixed(2)} {selectedToken}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                      {totalAmount.toFixed(2)} {selectedToken}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Notice */}
              {needsApproval && !isNativeToken(selectedToken) && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        First, you need to approve the smart contract to spend your {selectedToken}. 
                        This is a one-time approval for security.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clean wallet status check */}
              {isConnected && !bookWrite && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Wallet is connecting... Please wait a moment.
                  </p>
                </div>
              )}

              {/* ETH Payment Notice with Bypass Mode Info */}
              {isNativeToken(selectedToken) && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Paying with ETH - no approval needed! Your payment will be sent directly with the transaction.
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        ⚡ Balance check temporarily bypassed due to wallet extension conflicts. Ensure you have sufficient ETH before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ULTRA FEATURE: Payment Button OR Etherscan Box */}
              {bookData && !isBooking && !isBookingTx && !isApproving ? (
                /* 🚀 ETHERSCAN BOX - After wallet confirmation */
                <div className="w-full p-6 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 transition-all hover:border-blue-400 dark:hover:border-blue-500">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Transaction Submitted
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Your payment is being processed on the blockchain
                    </p>
                    <a 
                      href={`${getBlockExplorerUrl(chainId || 84532)}/tx/${bookData}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>View on {getChainName(chainId || 84532)} Explorer</span>
                    </a>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      Transaction Hash: {bookData.slice(0, 10)}...{bookData.slice(-8)}
                    </p>
                  </div>
                </div>
              ) : (
                /* 💳 NORMAL PAYMENT BUTTON */
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || isApproving || isBooking || isBookingTx || !hasSufficientBalance()}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                    isProcessing || isApproving || isBooking || isBookingTx || !hasSufficientBalance()
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-primary-red hover:bg-red-600 text-white'
                  }`}
                >
                  {isApproving ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Approving {selectedToken}...</span>
                    </div>
                  ) : (isBooking || isBookingTx) ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing Payment...</span>
                      </div>
                      {bookData && (
                        <div className="text-xs text-white/80">
                          <a 
                            href={`${getBlockExplorerUrl(chainId || 84532)}/tx/${bookData}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-white"
                          >
                            View on {getChainName(chainId || 84532)} Explorer
                          </a>
                        </div>
                      )}
                    </div>
                  ) : needsApproval ? (
                    `Approve ${selectedToken} Spending`
                  ) : (
                    `Pay ${totalAmount.toFixed(2)} ${selectedToken}`
                  )}
                </button>
              )}

              {!hasSufficientBalance() && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">
                    {isNativeToken(selectedToken) ? (
                      <>
                        <strong>Insufficient ETH:</strong> You need <strong>{(totalAmount + 0.005).toFixed(4)} ETH</strong> total
                        <br />
                        <span className="text-xs">({totalAmount.toFixed(4)} ETH for payment + ~0.005 ETH for gas fees)</span>
                        <br />
                        <span className="text-xs">Current balance: {getCurrentBalance()} ETH</span>
                      </>
                    ) : (
                      `Add more ${selectedToken} to your wallet to complete this payment`
                    )}
                  </p>
                </div>
              )}


              {/* Simple transaction status */}
              {(isBooking || isBookingTx) && bookData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
                  <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                    Transaction is being confirmed on the blockchain. This may take a few minutes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          sessionDetails={{
            sessionId,
            mentorName: bookingData.mentor.name,
            title: bookingData.mentor.title,
            date: new Date(bookingData.date).toLocaleDateString(),
            time: bookingData.time,
            duration: bookingData.mentor.duration,
            amount: totalAmount,
            token: selectedToken,
            transactionHash,
          }}
          onViewDashboard={handleViewDashboard}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && paymentError && (
        <PaymentErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          error={paymentError}
          onRetry={handleRetryPayment}
          onGoHome={handleGoHome}
          isRetrying={isProcessing}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <TransactionToast
          key={`${toast.type}-${toast.title}`}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => {
            console.log('🗙 User manually closed toast:', toast);
            
            // ULTRA SOLUTION: Add this toast type to muted list
            if (toast) {
              const toastKey = `${toast.type}-${toast.title}`;
              console.log('🔇 MUTING toast type:', toastKey);
              setMutedToastTypes(prev => new Set([...prev, toastKey]));
            }
            
            // Only stop monitor for final states (not processing)
            if (toast && bookData && !toast.message.includes('processing')) {
              stopMonitoring(bookData);
              console.log('🛡️ Bulletproof monitor stopped for final state close');
            }
            
            setToast(null);
          }}
        />
      )}
    </div>
  );
};

export default PaymentPage;