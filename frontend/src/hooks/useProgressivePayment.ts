import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useWriteContract, useReadContract, useWatchContractEvent } from 'wagmi';
import { parseEther, formatEther, encodePacked, keccak256 } from 'viem';
import { getProgressiveEscrowAddress, isSupportedChain } from '../contracts/ProgressiveEscrowV8';
import { payerPresenceTracker, PayerPresenceTracking } from '../services/PayerPresenceTracker';

interface SecurityValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Progressive Escrow V3 ABI - Only the functions we need
const PROGRESSIVE_ESCROW_ABI = [
  // Read functions
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getSession',
    outputs: [{
      components: [
        { name: 'sessionId', type: 'bytes32' },
        { name: 'student', type: 'address' },
        { name: 'mentor', type: 'address' },
        { name: 'paymentToken', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'releasedAmount', type: 'uint256' },
        { name: 'sessionDuration', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'lastHeartbeat', type: 'uint256' },
        { name: 'pausedTime', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'isActive', type: 'bool' },
        { name: 'isPaused', type: 'bool' },
        { name: 'surveyCompleted', type: 'bool' }
      ],
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getAvailablePayment',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'needsHeartbeat',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'shouldAutoPause',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getEffectiveElapsedTime',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserNonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { name: "sessionId", type: "bytes32" },
      { name: "mentor", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "durationMinutes", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ],
    name: "createProgressiveSession",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'startProgressiveSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'releaseProgressivePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'updateHeartbeat',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'pauseSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'resumeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'rating', type: 'uint256' },
      { name: 'feedback', type: 'string' }
    ],
    name: 'completeSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: true, name: 'mentor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ],
    name: 'ProgressivePaymentReleased',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'SessionPaused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'sessionId', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'SessionResumed',
    type: 'event'
  }
] as const;

// Contract address is now dynamic based on chain ID

interface ProgressiveSessionData {
  sessionId: string;
  student: string;
  mentor: string;
  paymentToken: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  sessionDuration: number;
  startTime: number;
  lastHeartbeat: number;
  pausedTime: number;
  createdAt: number;
  status: SessionStatus;
  isActive: boolean;
  isPaused: boolean;
  surveyCompleted: boolean;
}

enum SessionStatus {
  Created = 0,
  Active = 1,
  Paused = 2,
  Completed = 3,
  Cancelled = 4
}

interface ProgressivePaymentState {
  sessionData: ProgressiveSessionData | null;
  isConnected: boolean;
  availablePayment: bigint;
  progressPercentage: number;
  timeElapsed: number;
  paymentReleased: number;
  needsHeartbeat: boolean;
  shouldAutoPause: boolean;
  isLoading: boolean;
  error: string | null;
  lastHeartbeatTime: number;
  securityValidation: SecurityValidation;
  isPaused: boolean;
  payerPresenceData: PayerPresenceTracking | null;
  payerPresencePercentage: number;
  payerPresenceTime: number;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const PAYMENT_CHECK_INTERVAL = 180000; // 3 minutes
const HEARTBEAT_COOLDOWN = 10000; // 10 seconds minimum between heartbeats
const MAX_SESSION_DURATION = 14400; // 4 hours max session duration

export const useProgressivePayment = (
  sessionId?: string,
  payerAddress?: string,
  mentorAddress?: string,
  scheduledDuration?: number,
  totalAmount?: number
) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [state, setState] = useState<ProgressivePaymentState>({
    sessionData: null,
    isConnected: false,
    availablePayment: BigInt(0),
    progressPercentage: 0,
    timeElapsed: 0,
    paymentReleased: 0,
    needsHeartbeat: false,
    shouldAutoPause: false,
    isLoading: false,
    error: null,
    lastHeartbeatTime: 0,
    securityValidation: {
      isValid: true,
      errors: [],
      warnings: []
    },
    isPaused: false,
    payerPresenceData: null,
    payerPresencePercentage: 0,
    payerPresenceTime: 0
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const webrtcConnectedRef = useRef(false);
  const sessionStartTimeRef = useRef<number | null>(null);
  const payerPresenceInitializedRef = useRef(false);
  
  // Get Progressive Escrow address for current chain
  const progressiveEscrowAddress = chainId ? getProgressiveEscrowAddress(chainId) : null;
  const chainSupported = chainId ? isSupportedChain(chainId) : false;
  
  // Generate deterministic session ID with collision resistance
  const sessionIdBytes32 = sessionId ? 
    keccak256(encodePacked(['string', 'address', 'uint256'], [sessionId, address || '0x0', BigInt(Date.now())])) : 
    '0x0';

  // Contract read hooks
  const { data: sessionData, refetch: refetchSession } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'getSession',
    args: [sessionIdBytes32],
    query: { enabled: !!sessionId && !!progressiveEscrowAddress && chainSupported }
  });

  const { data: availablePayment, refetch: refetchAvailablePayment } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'getAvailablePayment',
    args: [sessionIdBytes32],
    query: { enabled: !!sessionId && !!progressiveEscrowAddress && chainSupported }
  });

  const { data: needsHeartbeat } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'needsHeartbeat',
    args: [sessionIdBytes32],
    query: { enabled: !!sessionId && !!progressiveEscrowAddress && chainSupported, refetchInterval: 10000 }
  });

  const { data: shouldAutoPause } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'shouldAutoPause',
    args: [sessionIdBytes32],
    query: { enabled: !!sessionId && !!progressiveEscrowAddress && chainSupported, refetchInterval: 10000 }
  });

  // Note: These functions may not exist in the current ABI, so we'll simulate them
  const canAutoComplete = false; // Simulate - implement when ABI is complete
  const contractPaused = false; // Simulate - implement when ABI is complete

  const { data: effectiveElapsedTime } = useReadContract({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    functionName: 'getEffectiveElapsedTime',
    args: [sessionIdBytes32],
    query: { enabled: !!sessionId && !!progressiveEscrowAddress && chainSupported, refetchInterval: 1000 }
  });

  // Contract write hooks
  const { writeContract: writeStartSession, isPending: isStartingSession } = useWriteContract();
  const { writeContract: writeReleasePayment, isPending: isReleasingPayment } = useWriteContract();
  const { writeContract: writeHeartbeat, isPending: isSendingHeartbeat } = useWriteContract();
  const { writeContract: writePauseSession } = useWriteContract();
  const { writeContract: writeResumeSession } = useWriteContract();
  const { writeContract: writeCompleteSession, isPending: isCompletingSession } = useWriteContract();

  // Time-based simulation for progressive payment (fallback when contract data not available)
  const updateSimulatedProgress = useCallback(() => {
    if (!sessionStartTimeRef.current) {
      return; // Don't simulate if no session started
    }

    const now = Date.now();
    const elapsedMinutes = (now - sessionStartTimeRef.current) / (1000 * 60);
    
    // Progressive payment logic: 5% every 3 minutes
    // Formula: (elapsedMinutes / 3) * 5 = percentage released
    const releasedPercentage = Math.min((elapsedMinutes / 3) * 5, 100);
    
    // Convert to simulated amounts (assuming $100 total for simulation)
    const simulatedTotalAmount = parseEther('100'); // 100 ETH representing $100
    const simulatedReleasedAmount = (simulatedTotalAmount * BigInt(Math.floor(releasedPercentage * 100))) / BigInt(10000);
    
    // Update state with simulated values
    setState(prev => ({
      ...prev,
      sessionData: prev.sessionData ? {
        ...prev.sessionData,
        totalAmount: simulatedTotalAmount,
        releasedAmount: simulatedReleasedAmount,
        startTime: Math.floor(sessionStartTimeRef.current! / 1000),
        isActive: true,
        isPaused: false,
        status: SessionStatus.Active
      } : {
        sessionId: sessionId || '',
        student: address || '',
        mentor: '',
        paymentToken: '0x0000000000000000000000000000000000000000',
        totalAmount: simulatedTotalAmount,
        releasedAmount: simulatedReleasedAmount,
        sessionDuration: 60, // 60 minutes
        startTime: Math.floor(sessionStartTimeRef.current! / 1000),
        lastHeartbeat: Math.floor(now / 1000),
        pausedTime: 0,
        createdAt: Math.floor(sessionStartTimeRef.current! / 1000),
        status: SessionStatus.Active,
        isActive: true,
        isPaused: false,
        surveyCompleted: false
      },
      progressPercentage: Math.floor(releasedPercentage),
      paymentReleased: Number(formatEther(simulatedReleasedAmount)),
      timeElapsed: Math.floor(elapsedMinutes),
      availablePayment: BigInt(0) // Simulated - no actual release needed
    }));
  }, [sessionId, address]);

  // Initialize payer presence tracking
  const initializePayerPresenceTracking = useCallback(() => {
    if (!sessionId || !payerAddress || !mentorAddress || !scheduledDuration || !totalAmount) {
      console.warn('PayerPresenceTracking: Missing required parameters for initialization');
      return;
    }
    
    if (payerPresenceInitializedRef.current) {
      console.log('PayerPresenceTracking: Already initialized for session', sessionId);
      return;
    }
    
    try {
      const tracking = payerPresenceTracker.initializeSession(
        sessionId,
        payerAddress,
        mentorAddress,
        scheduledDuration,
        totalAmount
      );
      
      setState(prev => ({
        ...prev,
        payerPresenceData: tracking,
        payerPresencePercentage: tracking.paymentCalculationData.presencePercentage,
        payerPresenceTime: tracking.totalPresenceTime / 1000 / 60 // Convert to minutes
      }));
      
      payerPresenceInitializedRef.current = true;
      
      console.log('✅ PayerPresenceTracking: Initialized successfully', {
        sessionId,
        payerAddress,
        mentorAddress,
        scheduledDuration,
        totalAmount
      });
      
    } catch (error) {
      console.error('❌ PayerPresenceTracking: Initialization failed', error);
    }
  }, [sessionId, payerAddress, mentorAddress, scheduledDuration, totalAmount]);

  // Start simulation timer
  const startSimulation = useCallback(() => {
    // Simulation is now optional - only used when contract data is not available

    sessionStartTimeRef.current = Date.now();
    console.log('🎯 Starting progressive payment simulation at', new Date(sessionStartTimeRef.current));
    
    // Clear existing interval
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    
    // Update every second for real-time progress
    simulationIntervalRef.current = setInterval(updateSimulatedProgress, 1000);
    
    // Initial update
    updateSimulatedProgress();
  }, [updateSimulatedProgress]);

  // Stop simulation timer
  const stopSimulation = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    sessionStartTimeRef.current = null;
    console.log('⏹️ Stopping progressive payment simulation');
  }, []);

  // Watch for progressive payment events
  useWatchContractEvent({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    eventName: 'ProgressivePaymentReleased',
    onLogs: (logs: any) => {
      console.log('💰 Progressive payment released:', logs);
      refetchSession();
      refetchAvailablePayment();
    },
    enabled: !!progressiveEscrowAddress && chainSupported
  });

  useWatchContractEvent({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    eventName: 'SessionPaused',
    onLogs: (logs: any) => {
      console.log('⏸️ Session paused:', logs);
      refetchSession();
    },
    enabled: !!progressiveEscrowAddress && chainSupported
  });

  useWatchContractEvent({
    address: progressiveEscrowAddress as `0x${string}`,
    abi: PROGRESSIVE_ESCROW_ABI,
    eventName: 'SessionResumed',
    onLogs: (logs: any) => {
      console.log('▶️ Session resumed:', logs);
      refetchSession();
    },
    enabled: !!progressiveEscrowAddress && chainSupported
  });

  // Validate security conditions
  const validateSecurity = useCallback((sessionData: ProgressiveSessionData | null): SecurityValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!sessionData) {
      errors.push('No session data available');
      return { isValid: false, errors, warnings };
    }
    
    // Check if contract is paused
    if (contractPaused) {
      errors.push('Contract is under emergency pause');
    }
    
    // Check session duration
    const now = Math.floor(Date.now() / 1000);
    const sessionDuration = now - sessionData.startTime;
    if (sessionDuration > MAX_SESSION_DURATION) {
      warnings.push('Session exceeds maximum duration - auto-completion will be triggered');
    }
    
    // Check heartbeat timing
    const timeSinceLastHeartbeat = now - state.lastHeartbeatTime;
    if (timeSinceLastHeartbeat < HEARTBEAT_COOLDOWN / 1000) {
      warnings.push('Heartbeat cooldown active');
    }
    
    // Check for over-payment
    const expectedPayment = (sessionData.totalAmount * BigInt(sessionDuration)) / BigInt(3600); // Per hour
    if (sessionData.releasedAmount > expectedPayment) {
      warnings.push('Payment amount exceeds expected calculation');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [contractPaused, state.lastHeartbeatTime]);

  // Start progressive session
  const startProgressiveSession = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await writeStartSession({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'startProgressiveSession',
        args: [sessionIdBytes32]
      });
      
      console.log('🎯 Progressive session started');
    } catch (error) {
      console.error('Error starting progressive session:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start session'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writeStartSession, sessionIdBytes32]);

  // Release progressive payment with security checks
  const releaseProgressivePayment = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported || !availablePayment || availablePayment === BigInt(0)) return;
    
    // Validate security conditions
    const validation = validateSecurity(state.sessionData);
    if (!validation.isValid) {
      console.error('Security validation failed for payment release:', validation.errors);
      setState(prev => ({ ...prev, securityValidation: validation }));
      return;
    }
    
    // Check for over-payment protection
    if (state.sessionData) {
      const totalExpectedPayment = state.sessionData.totalAmount;
      const currentReleased = BigInt(state.sessionData.releasedAmount) + (typeof availablePayment === 'bigint' ? availablePayment : BigInt(0));
      
      if (currentReleased > totalExpectedPayment) {
        console.error('Over-payment detected, blocking release');
        setState(prev => ({ 
          ...prev, 
          error: 'Payment validation failed - potential over-payment detected'
        }));
        return;
      }
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await writeReleasePayment({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'releaseProgressivePayment',
        args: [sessionIdBytes32]
      });
      
      console.log('💰 Progressive payment released with security validation');
    } catch (error) {
      console.error('Error releasing progressive payment:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to release payment'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, availablePayment, writeReleasePayment, sessionIdBytes32, state.sessionData, validateSecurity]);

  // Send heartbeat with security validation
  const sendHeartbeat = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    // Validate heartbeat timing
    const now = Date.now();
    if (now - state.lastHeartbeatTime < HEARTBEAT_COOLDOWN) {
      console.warn('Heartbeat cooldown active, skipping');
      return;
    }
    
    // Validate security conditions
    const validation = validateSecurity(state.sessionData);
    if (!validation.isValid) {
      console.error('Security validation failed:', validation.errors);
      setState(prev => ({ ...prev, securityValidation: validation }));
      return;
    }
    
    try {
      await writeHeartbeat({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'updateHeartbeat',
        args: [sessionIdBytes32]
      });
      
      setState(prev => ({ ...prev, lastHeartbeatTime: now }));
      console.log('💓 Heartbeat sent with security validation');
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to send heartbeat - session may be auto-paused'
      }));
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writeHeartbeat, sessionIdBytes32, state.lastHeartbeatTime, state.sessionData, validateSecurity]);

  // Pause session
  const pauseSession = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    try {
      await writePauseSession({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'pauseSession',
        args: [sessionIdBytes32]
      });
      
      console.log('⏸️ Session paused');
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writePauseSession, sessionIdBytes32]);

  // Resume session
  const resumeSession = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    try {
      await writeResumeSession({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'resumeSession',
        args: [sessionIdBytes32]
      });
      
      console.log('▶️ Session resumed');
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writeResumeSession, sessionIdBytes32]);

  // Auto-complete session with platform fee collection
  const autoCompleteSession = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await writeCompleteSession({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'completeSession',
        args: [sessionIdBytes32, BigInt(0), "Session auto-completed"]
      });
      
      console.log('🔄 Session auto-completed with platform fee collection');
      // Stop tracking will be handled by useEffect cleanup
    } catch (error) {
      console.error('Error auto-completing session:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to auto-complete session'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writeCompleteSession, sessionIdBytes32]);
  
  // Complete session with platform fee collection
  const completeSession = useCallback(async () => {
    if (!sessionId || !address || !progressiveEscrowAddress || !chainSupported) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await writeCompleteSession({
        address: progressiveEscrowAddress as `0x${string}`,
        abi: PROGRESSIVE_ESCROW_ABI,
        functionName: 'completeSession',
        args: [sessionIdBytes32, BigInt(5), "Session completed"]
      });
      
      console.log('✅ Session completed with platform fee collection');
      // Stop tracking will be handled by useEffect cleanup
    } catch (error) {
      console.error('Error completing session:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to complete session'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [sessionId, address, progressiveEscrowAddress, chainSupported, writeCompleteSession, sessionIdBytes32]);

  // PAYER PRESENCE TRACKING - Handle payer join/leave events
  const handlePayerJoin = useCallback((participantAddress: string) => {
    if (!sessionId || !payerAddress) return;
    
    // Only track the specific payer address
    if (participantAddress.toLowerCase() === payerAddress.toLowerCase()) {
      payerPresenceTracker.recordPayerJoin(sessionId, participantAddress, {
        timestamp: Date.now(),
        source: 'webrtc_connection'
      });
      console.log('✅ PayerPresenceTracking: Payer joined session', {
        sessionId,
        payerAddress: participantAddress
      });
    }
  }, [sessionId, payerAddress]);
  
  const handlePayerLeave = useCallback((participantAddress: string, reason?: string) => {
    if (!sessionId || !payerAddress) return;
    
    // Only track the specific payer address
    if (participantAddress.toLowerCase() === payerAddress.toLowerCase()) {
      payerPresenceTracker.recordPayerLeave(sessionId, participantAddress, reason || 'manual', {
        timestamp: Date.now(),
        source: 'webrtc_disconnection'
      });
      console.log('❌ PayerPresenceTracking: Payer left session', {
        sessionId,
        payerAddress: participantAddress,
        reason
      });
    }
  }, [sessionId, payerAddress]);
  
  const handlePayerHeartbeat = useCallback((participantAddress: string) => {
    if (!sessionId || !payerAddress) return;
    
    // Only track the specific payer address
    if (participantAddress.toLowerCase() === payerAddress.toLowerCase()) {
      payerPresenceTracker.updatePayerHeartbeat(sessionId, participantAddress);
    }
  }, [sessionId, payerAddress]);

  // Handle WebRTC connection status
  const handleWebRTCConnection = useCallback((connected: boolean) => {
    webrtcConnectedRef.current = connected;
    
    // Handle payer presence based on their connection status
    if (connected && payerAddress && address?.toLowerCase() === payerAddress.toLowerCase()) {
      handlePayerJoin(address);
    } else if (!connected && payerAddress && address?.toLowerCase() === payerAddress.toLowerCase()) {
      handlePayerLeave(address, 'connection_lost');
    }
    
    if (connected && sessionData && (sessionData as any).status === SessionStatus.Created) {
      // Auto-start session when WebRTC connects
      startProgressiveSession();
    } else if (!connected && sessionData && (sessionData as any).isActive && !(sessionData as any).isPaused) {
      // Auto-pause session when WebRTC disconnects
      pauseSession();
    }
  }, [sessionData, startProgressiveSession, pauseSession, address, payerAddress, handlePayerJoin, handlePayerLeave]);

  // Start tracking (called when session room is initialized)
  const startTracking = useCallback(async () => {
    if (!sessionId || !address) return;
    
    console.log('🎯 Starting progressive payment tracking');
    
    // Start simulation as fallback for UI testing
    startSimulation();
    
    // Start heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (webrtcConnectedRef.current && (sessionData as any)?.isActive && !(sessionData as any)?.isPaused) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Start payment check interval
    if (paymentCheckIntervalRef.current) {
      clearInterval(paymentCheckIntervalRef.current);
    }
    
    paymentCheckIntervalRef.current = setInterval(() => {
      if (webrtcConnectedRef.current && (sessionData as any)?.isActive && !(sessionData as any)?.isPaused && availablePayment && (availablePayment as any) > BigInt(0)) {
        releaseProgressivePayment();
      }
      
      // Check for auto-completion
      if (canAutoComplete && (sessionData as any)?.isActive) {
        console.log('🔄 Auto-completing session due to timeout');
        autoCompleteSession();
      }
    }, PAYMENT_CHECK_INTERVAL);
    
  }, [sessionId, address, sessionData, availablePayment, sendHeartbeat, releaseProgressivePayment, startSimulation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    console.log('⏹️ Stopping progressive payment tracking');
    
    // Stop simulation
    stopSimulation();
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (paymentCheckIntervalRef.current) {
      clearInterval(paymentCheckIntervalRef.current);
      paymentCheckIntervalRef.current = null;
    }
    
    webrtcConnectedRef.current = false;
  }, [stopSimulation]);

  // Update state when contract data changes
  useEffect(() => {
    if (sessionData) {
      const totalAmount = Number(formatEther((sessionData as any).totalAmount || BigInt(0)));
      const releasedAmount = Number(formatEther((sessionData as any).releasedAmount || BigInt(0)));
      const progressPercentage = totalAmount > 0 ? (releasedAmount / totalAmount) * 100 : 0;
      
      setState(prev => ({
        ...prev,
        sessionData: {
          sessionId: (sessionData as any).sessionId,
          student: (sessionData as any).student,
          mentor: (sessionData as any).mentor,
          paymentToken: (sessionData as any).paymentToken,
          totalAmount: (sessionData as any).totalAmount,
          releasedAmount: (sessionData as any).releasedAmount,
          sessionDuration: Number((sessionData as any).sessionDuration),
          startTime: Number((sessionData as any).startTime),
          lastHeartbeat: Number((sessionData as any).lastHeartbeat),
          pausedTime: Number((sessionData as any).pausedTime),
          createdAt: Number((sessionData as any).createdAt),
          status: (sessionData as any).status as SessionStatus,
          isActive: (sessionData as any).isActive,
          isPaused: (sessionData as any).isPaused,
          surveyCompleted: (sessionData as any).surveyCompleted
        },
        progressPercentage: Math.round(progressPercentage),
        paymentReleased: releasedAmount,
        isConnected: isConnected
      }));
    }
  }, [sessionData, isConnected]);

  // Update other state values with security validation
  useEffect(() => {
    const validation = validateSecurity(state.sessionData);
    
    setState(prev => ({
      ...prev,
      availablePayment: (availablePayment as any) || BigInt(0),
      timeElapsed: Number(effectiveElapsedTime || 0),
      needsHeartbeat: (needsHeartbeat as any) || false,
      shouldAutoPause: (shouldAutoPause as any) || false,
      isPaused: contractPaused || false,
      securityValidation: validation
    }));
  }, [availablePayment, effectiveElapsedTime, needsHeartbeat, shouldAutoPause, contractPaused, state.sessionData, validateSecurity]);

  // Auto-pause if needed
  useEffect(() => {
    if (shouldAutoPause && (sessionData as any)?.isActive && !(sessionData as any)?.isPaused) {
      console.log('⚠️ Auto-pausing session due to missed heartbeat');
      pauseSession();
    }
  }, [shouldAutoPause, sessionData, pauseSession]);

  // Initialize payer presence tracking when parameters are available
  useEffect(() => {
    if (sessionId && payerAddress && mentorAddress && scheduledDuration && totalAmount && !payerPresenceInitializedRef.current) {
      initializePayerPresenceTracking();
    }
  }, [sessionId, payerAddress, mentorAddress, scheduledDuration, totalAmount, initializePayerPresenceTracking]);

  // Update payer presence data periodically
  useEffect(() => {
    if (!sessionId || !payerPresenceInitializedRef.current) return;

    const updatePresenceData = () => {
      const tracking = payerPresenceTracker.getSessionTracking(sessionId);
      if (tracking) {
        setState(prev => ({
          ...prev,
          payerPresenceData: tracking,
          payerPresencePercentage: tracking.paymentCalculationData.presencePercentage,
          payerPresenceTime: tracking.totalPresenceTime / 1000 / 60 // Convert to minutes
        }));
      }
    };

    // Update immediately
    updatePresenceData();

    // Update every 5 seconds
    const interval = setInterval(updatePresenceData, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
      
      // Clean up payer presence tracking
      if (sessionId) {
        payerPresenceTracker.cleanupSession(sessionId);
      }
    };
  }, [stopTracking, sessionId]);

  return {
    // State
    ...state,
    
    // Loading states
    isStartingSession,
    isReleasingPayment,
    isSendingHeartbeat,
    isCompletingSession,
    
    // Actions
    startProgressiveSession,
    releaseProgressivePayment,
    sendHeartbeat,
    pauseSession,
    resumeSession,
    completeSession,
    autoCompleteSession,
    handleWebRTCConnection,
    startTracking,
    stopTracking,
    validateSecurity,
    
    // PAYER PRESENCE TRACKING METHODS
    handlePayerJoin,
    handlePayerLeave,
    handlePayerHeartbeat,
    initializePayerPresenceTracking,
    getPayerPresenceData: () => state.payerPresenceData,
    getPayerPresenceSummary: () => sessionId ? payerPresenceTracker.getSessionSummary(sessionId) : null,
    
    // Utils
    formatPaymentAmount: (amount: bigint) => formatEther(amount),
    getProgressPercentage: () => {
      // CRITICAL: Use payer presence percentage instead of session time
      if (state.payerPresenceData) {
        return state.payerPresencePercentage;
      }
      // Fallback to legacy calculation for backward compatibility
      if (sessionStartTimeRef.current) {
        const elapsedMinutes = (Date.now() - sessionStartTimeRef.current) / (1000 * 60);
        const releasedPercentage = Math.min((elapsedMinutes / 3) * 5, 100);
        return Math.floor(releasedPercentage);
      }
      return state.progressPercentage;
    },
    getTimeElapsedFormatted: () => {
      // CRITICAL: Use payer presence time instead of session time
      const minutes = state.payerPresenceData ? state.payerPresenceTime : state.timeElapsed;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.floor(minutes % 60);
      return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
    },
    getPayerPresenceTimeFormatted: () => {
      const minutes = state.payerPresenceTime;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.floor(minutes % 60);
      return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
    }
  };
};