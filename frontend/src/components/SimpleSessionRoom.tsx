import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { safeNavigate } from '../utils/navigation';
import { useTheme } from '../contexts/ThemeContext';
import { useProgressivePayment } from '../hooks/useProgressivePayment';
import ChatPanel from './ChatPanel';
import MediaControls from './MediaControls';
import ParticipantsList from './ParticipantsList';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  MicrophoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface SimpleSessionRoomProps {
  sessionId: string;
  userAddress: string;
  onLeave: () => void;
  // PAYER PRESENCE TRACKING - Critical security fix parameters
  payerAddress?: string; // The wallet address that paid for the session
  mentorAddress?: string; // The mentor's wallet address
  scheduledDuration?: number; // Scheduled duration in minutes
  totalAmount?: number; // Total session amount
  isStudent?: boolean; // Whether current user is the student (payer)
}

// Compatible chat message interface
interface SimpleChatMessage {
  id: string;
  roomId: string;
  from: string;
  message: string;
  timestamp: Date;
}

// Compatible participant interface
interface SimpleParticipant {
  address: string;
  mediaState: {
    userId: string;
    video: boolean;
    audio: boolean;
    screenShare: boolean;
  };
}

const SimpleSessionRoom: React.FC<SimpleSessionRoomProps> = ({ 
  sessionId: _sessionId, 
  userAddress, 
  onLeave,
  payerAddress,
  mentorAddress,
  scheduledDuration = 60,
  totalAmount = 100
}) => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { isDarkMode } = useTheme();
  
  // PAYER PRESENCE TRACKING - Integrate progressive payment with payer presence
  const {
    progressPercentage,
    paymentReleased,
    handlePayerJoin,
    handlePayerLeave,
    handlePayerHeartbeat
  } = useProgressivePayment(
    _sessionId,
    payerAddress,
    mentorAddress,
    scheduledDuration,
    totalAmount
  );
  
  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI states
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  
  // Session time control - ULTRATHINK
  const [sessionExpired, setSessionExpired] = useState(false);
  const [entryTimedOut, setEntryTimedOut] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);
  
  // Progressive Payment System - ULTRATHINK (now using payer presence tracking)
  // Remove local state as these are now managed by useProgressivePayment hook
  // const [paymentReleased, setPaymentReleased] = useState(0);
  // const [progressPercentage, setProgressPercentage] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0); // in minutes (kept for local session timing)
  
  // Enhanced Video System
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [mainParticipant, setMainParticipant] = useState<string>('');
  const [isLocalMinimized, setIsLocalMinimized] = useState(false);
  
  // Simple data states
  const [chatMessages, setChatMessages] = useState<SimpleChatMessage[]>([]);
  const [participants, setParticipants] = useState<SimpleParticipant[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const initRef = useRef(false);
  
  // PAYER PRESENCE TRACKING - Track participant changes
  const prevParticipantsRef = useRef<SimpleParticipant[]>([]);

  // Memoized theme classes for performance
  const themeClasses = useMemo(() => ({
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200'
  }), [isDarkMode]);

  // Memoized popup positions
  const popupPositions = useMemo(() => ({
    chat: 'top-4 right-4',
    participants: 'top-4 left-4'
  }), []);

  // Media control handlers
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const handleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
          setScreenStream(null);
        }
        setIsScreenSharing(false);
        
        // Set video element back to camera
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        
        console.log('Screen sharing stopped');
      } else {
        // Start screen sharing
        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(newScreenStream);
        setIsScreenSharing(true);
        
        // Set video element to screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newScreenStream;
        }
        
        console.log('Screen sharing started');
        
        // Listen for user stopping sharing (browser UI)
        newScreenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          
          // Restore camera stream
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [isScreenSharing, screenStream, localStream, localVideoRef]);

  // PAYER PRESENCE TRACKING - Monitor participant join/leave events
  useEffect(() => {
    if (!sessionStartTime || !payerAddress) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - sessionStartTime.getTime()) / (1000 * 60);
      setSessionDuration(Math.floor(elapsedMinutes));
      
      // Send heartbeat for payer if they are the current user
      if (userAddress.toLowerCase() === payerAddress.toLowerCase()) {
        handlePayerHeartbeat(userAddress);
      }
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [sessionStartTime, payerAddress, userAddress, handlePayerHeartbeat]);

  // PAYER PRESENCE TRACKING - Monitor participant changes for payer join/leave events
  useEffect(() => {
    if (!payerAddress) return;
    
    const prevParticipants = prevParticipantsRef.current;
    const currentParticipantAddresses = participants.map(p => p.address.toLowerCase());
    const prevParticipantAddresses = prevParticipants.map(p => p.address.toLowerCase());
    
    // Check for new participants (joins)
    const newParticipants = currentParticipantAddresses.filter(addr => 
      !prevParticipantAddresses.includes(addr)
    );
    
    // Check for removed participants (leaves)
    const leftParticipants = prevParticipantAddresses.filter(addr => 
      !currentParticipantAddresses.includes(addr)
    );
    
    // Track payer joins
    newParticipants.forEach(address => {
      if (address === payerAddress.toLowerCase()) {
        console.log('🔵 SimpleSessionRoom: Detected payer join', { address, payerAddress });
        handlePayerJoin(address);
      }
    });
    
    // Track payer leaves
    leftParticipants.forEach(address => {
      if (address === payerAddress.toLowerCase()) {
        console.log('🔴 SimpleSessionRoom: Detected payer leave', { address, payerAddress });
        handlePayerLeave(address, 'participant_left');
      }
    });
    
    // Update ref for next comparison
    prevParticipantsRef.current = [...participants];
  }, [participants, payerAddress, handlePayerJoin, handlePayerLeave]);

  // Enhanced Video Functions - Adapted from VideoCall.tsx
  const formatAddress = useCallback((address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Session Time Control Functions - ULTRATHINK
  const getSessionSchedule = useCallback(() => {
    // MOCK: Simula dados da sessão agendada baseado no horário atual
    // Em produção, isso viria do backend/blockchain
    const now = new Date();
    
    // Para testes - você pode ajustar esses valores:
    // Para testar timeout de entrada: coloque 16 min atrás
    // Para testar fim de sessão: coloque 1 min no futuro
    const scheduledStart = new Date(now.getTime() - 65 * 60 * 1000);  // 65 min atrás 
    const scheduledEnd = new Date(now.getTime() - 5 * 60 * 1000);     // 5 min atrás (EXPIRADO!)
    
    const schedule = {
      scheduledStart,
      scheduledEnd,
      duration: 60, // 60 minutes
      paymentAmount: 100 // $100 USDC
    };
    
    console.log('📅 ULTRATHINK Session Schedule:', {
      start: scheduledStart.toLocaleTimeString(),
      end: scheduledEnd.toLocaleTimeString(),
      entryDeadline: new Date(scheduledStart.getTime() + 15 * 60 * 1000).toLocaleTimeString(),
      now: now.toLocaleTimeString()
    });
    
    return schedule;
  }, []);

  const processAutomaticRefund = useCallback(async (reason: 'timeout' | 'expired') => {
    if (refundProcessing) return;
    
    setRefundProcessing(true);
    console.log(`🔄 ULTRATHINK: Processing automatic refund - Reason: ${reason}`);
    
    try {
      // MOCK: Simula chamada para smart contract para devolver o dinheiro
      // Em produção, isso seria uma transação real
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Automatic refund processed successfully');
      
      // Navegar de volta ao dashboard com mensagem
      const message = reason === 'timeout' 
        ? 'Session entry timeout. Payment refunded automatically.'
        : 'Session expired. Payment refunded automatically.';
        
      localStorage.setItem('refund_message', message);
      
    } catch (error) {
      console.error('❌ Automatic refund failed:', error);
    }
    
    setRefundProcessing(false);
  }, [refundProcessing]);

  const validateSessionTime = useCallback(() => {
    const schedule = getSessionSchedule();
    const now = new Date();
    
    // Verificar se a sessão expirou (passou do horário de fim)
    if (now > schedule.scheduledEnd) {
      console.log('⏰ Session expired - past end time');
      setSessionExpired(true);
      processAutomaticRefund('expired');
      return false;
    }
    
    // Verificar se passou dos 15 minutos para entrada
    const entryDeadline = new Date(schedule.scheduledStart.getTime() + 15 * 60 * 1000);
    if (now > entryDeadline && !sessionStartTime) {
      console.log('⏰ Entry timeout - 15 minutes passed without joining');
      setEntryTimedOut(true);
      processAutomaticRefund('timeout');
      return false;
    }
    
    return true;
  }, [getSessionSchedule, processAutomaticRefund, sessionStartTime]);

  // Session Time Status Component - ULTRATHINK
  const SessionTimeStatus: React.FC<{ schedule: any; sessionStarted: boolean }> = ({ schedule, sessionStarted }) => {
    const [timeDisplay, setTimeDisplay] = useState('');
    const [urgency, setUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

    useEffect(() => {
      const updateTimeDisplay = () => {
        const now = new Date();
        
        if (!sessionStarted) {
          // Show entry countdown
          const entryDeadline = new Date(schedule.scheduledStart.getTime() + 15 * 60 * 1000);
          const timeLeft = entryDeadline.getTime() - now.getTime();
          
          if (timeLeft <= 0) {
            setTimeDisplay('Entry Expired');
            setUrgency('critical');
            return;
          }
          
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
          
          setTimeDisplay(`Entry: ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`);
          setUrgency(minutesLeft <= 5 ? 'critical' : minutesLeft <= 10 ? 'warning' : 'normal');
        } else {
          // Show session countdown
          const timeLeft = schedule.scheduledEnd.getTime() - now.getTime();
          
          if (timeLeft <= 0) {
            setTimeDisplay('Session Ended');
            setUrgency('critical');
            return;
          }
          
          const minutesLeft = Math.floor(timeLeft / (1000 * 60));
          setTimeDisplay(`${minutesLeft}min left`);
          setUrgency(minutesLeft <= 10 ? 'critical' : minutesLeft <= 20 ? 'warning' : 'normal');
        }
      };

      updateTimeDisplay();
      const interval = setInterval(updateTimeDisplay, 1000);
      return () => clearInterval(interval);
    }, [schedule, sessionStarted]);

    const getBadgeColor = () => {
      switch (urgency) {
        case 'critical': return 'bg-red-500/20 text-red-600 border-red-500/30';
        case 'warning': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
        default: return 'bg-blue-500/20 text-blue-600 border-blue-500/30';
      }
    };

    return (
      <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor()}`}>
        ⏰ {timeDisplay}
      </div>
    );
  };

  const handleSwitchMain = useCallback((participantAddress: string) => {
    if (participantAddress === userAddress) {
      setMainParticipant('');
      setIsLocalMinimized(false);
    } else {
      setMainParticipant(participantAddress);
      setIsLocalMinimized(true);
    }
  }, [userAddress]);

  // Enhanced Video Debug System
  const runVideoStreamDiagnostic = useCallback(async () => {
    console.log('🔍 RUNNING ULTRATHINK VIDEO DIAGNOSTIC...');
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      streamStatus: localStream ? 'active' : 'inactive',
      videoTracks: localStream?.getVideoTracks().length || 0,
      audioTracks: localStream?.getAudioTracks().length || 0,
      videoEnabled,
      audioEnabled,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    if (!localStream) {
      diagnostic.issues.push('No local stream available');
      diagnostic.recommendations.push('Restart session to reinitialize media');
    }

    if (!videoEnabled) {
      diagnostic.issues.push('Video track disabled');
    }

    if (!audioEnabled) {
      diagnostic.issues.push('Audio track disabled');
    }

    console.log('📊 Video Diagnostic Results:', diagnostic);
    alert(`Video Diagnostic:\n${JSON.stringify(diagnostic, null, 2)}`);
  }, [localStream, videoEnabled, audioEnabled]);

  // Camera Refresh Function - ULTRATHINK
  const refreshCameraStream = useCallback(async () => {
    console.log('🔄 ULTRATHINK: Refreshing camera stream...');
    
    try {
      // Stop current stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get new stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setLocalStream(newStream);
      
      // Set video element directly
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play();
      }

      // Update states
      const videoTrack = newStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      
      if (videoTrack) {
        setVideoEnabled(videoTrack.enabled);
      }
      
      if (audioTrack) {
        setAudioEnabled(audioTrack.enabled);
      }

      console.log('✅ Camera stream refreshed successfully');
      
    } catch (error) {
      console.error('❌ Failed to refresh camera:', error);
    }
  }, [localStream, localVideoRef]);

  // Enhanced Video Element Renderer
  const renderVideoElement = useCallback((
    participant: SimpleParticipant | null,
    isLocal: boolean,
    className: string = "",
    clickable: boolean = false,
    showControls: boolean = false
  ) => {
    const address = isLocal ? userAddress : participant?.address || '';
    const mediaState = isLocal 
      ? { userId: userAddress, video: videoEnabled, audio: audioEnabled, screenShare: isScreenSharing }
      : participant?.mediaState;

    return (
      <div 
        className={`relative rounded-lg overflow-hidden bg-gray-900 cursor-pointer ${className}`}
        onClick={clickable ? () => handleSwitchMain(address) : undefined}
      >
        {/* Video Element */}
        <div className="absolute inset-0">
          <video
            ref={isLocal ? localVideoRef : undefined}
            autoPlay
            muted={isLocal}
            playsInline
            className="w-full h-full object-cover"
            style={{
              minWidth: '100%',
              minHeight: '100%'
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              console.log(`📹 Video metadata loaded for ${isLocal ? 'local' : 'remote'}:`, {
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState
              });
            }}
          />
        </div>
        
        {/* Video Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-between p-2 sm:p-4">
          {/* Top: User Info */}
          <div className="flex items-center justify-between">
            <div className="bg-black bg-opacity-50 rounded-lg px-2 py-1 sm:px-3 sm:py-1">
              <span className="text-white text-xs sm:text-sm font-medium">
                {isLocal ? `You (${formatAddress(userAddress)})` : formatAddress(address)}
              </span>
            </div>
            
            {/* Screen Share Indicator */}
            {(isLocal ? isScreenSharing : mediaState?.screenShare) && (
              <div className="bg-red-500 rounded-lg px-1 py-1 sm:px-2 sm:py-1 flex items-center space-x-1">
                <span className="text-white text-xs">📺 Sharing Screen</span>
              </div>
            )}
          </div>

          {/* Bottom: Media State and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {!mediaState?.video && (
                <div className="bg-red-500 rounded-full p-1">
                  <VideoCameraIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              {!mediaState?.audio && (
                <div className="bg-red-500 rounded-full p-1">
                  <MicrophoneIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              {mediaState?.audio && mediaState?.video && (
                <div className="bg-green-500 rounded-full p-1">
                  <MicrophoneIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
            </div>

            {/* Debug Controls - Only for local video */}
            {isLocal && showControls && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDebugMode(!showDebugMode);
                  }}
                  className="bg-blue-500 bg-opacity-80 rounded p-1 hover:bg-opacity-100 transition-all"
                  title="Toggle debug mode"
                >
                  <span className="text-white text-xs">🔧</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshCameraStream();
                  }}
                  className="bg-green-500 bg-opacity-80 rounded p-1 hover:bg-opacity-100 transition-all"
                  title="Refresh camera stream"
                >
                  <span className="text-white text-xs">🔄</span>
                </button>
              </div>
            )}
          </div>

          {/* Debug Mode Info - Camera/Screen Debug */}
          {isLocal && showDebugMode && (
            <div className="absolute top-12 left-2 bg-black bg-opacity-80 rounded p-2 text-white text-xs max-w-xs">
              <div className="font-bold">🔧 {isScreenSharing ? 'SCREEN DEBUG' : 'CAMERA DEBUG'}</div>
              <div>Camera: {localStream ? '✅' : '❌'}</div>
              <div>Screen: {screenStream ? '✅' : '❌'}</div>
              <div>Video: {videoEnabled ? '✅' : '❌'}</div>
              <div>Audio: {audioEnabled ? '✅' : '❌'}</div>
              <div>Active: {isScreenSharing ? 'Screen Share' : 'Camera'}</div>
            </div>
          )}
        </div>

        {/* No Video Placeholder */}
        {!mediaState?.video && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-gray-600 rounded-full w-8 h-8 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <span className="text-white font-semibold text-xs sm:text-lg">
                  {address.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <p className="text-gray-300 text-xs sm:text-sm">Camera Off</p>
            </div>
          </div>
        )}
      </div>
    );
  }, [userAddress, videoEnabled, audioEnabled, isScreenSharing, formatAddress, handleSwitchMain, showDebugMode, runVideoStreamDiagnostic, refreshCameraStream, sessionDuration, paymentReleased, progressPercentage, localStream, screenStream]);

  // Chat handlers
  const handleSendMessage = useCallback((message: string) => {
    const newMessage: SimpleChatMessage = {
      id: Date.now().toString(),
      roomId: 'simple-session',
      from: userAddress,
      message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
  }, [userAddress]);

  // Simple initialization without complex state management
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initSession = async () => {
      try {
        console.log('🚀 ULTRATHINK: Enhanced session initialization with time validation');
        
        // CRITICAL: Validate session time before initialization
        if (!validateSessionTime()) {
          console.log('❌ Session time validation failed - aborting initialization');
          return;
        }
        
        // Get media directly without WebRTC context complexity
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        setLocalStream(stream);
        
        // Set video element directly
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play();
        }

        // Initialize session data
        const startTime = new Date();
        setSessionStartTime(startTime);
        
        // Add self as participant
        setParticipants([{
          address: userAddress,
          mediaState: {
            userId: userAddress,
            audio: true,
            video: true,
            screenShare: false
          }
        }]);
        
        // PAYER PRESENCE TRACKING - Record initial payer join if current user is the payer
        if (payerAddress && userAddress.toLowerCase() === payerAddress.toLowerCase()) {
          console.log('🎯 SimpleSessionRoom: Recording initial payer join', { userAddress, payerAddress });
          handlePayerJoin(userAddress);
        }

        // Event listener will be set up separately to access current state

        setIsLoading(false);
        console.log('✅ Enhanced session ready');
        
      } catch (err) {
        console.error('❌ Session failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize session');
        setIsLoading(false);
      }
    };

    // Small delay to prevent race conditions
    setTimeout(initSession, 100);

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [userAddress]);

  // Toggle view functionality - separate useEffect to access current state
  useEffect(() => {
    const handleToggleView = () => {
      const remoteParticipants = participants.filter(p => p.address !== userAddress);
      if (remoteParticipants.length === 1) {
        if (!mainParticipant) {
          setMainParticipant(remoteParticipants[0].address);
          setIsLocalMinimized(true);
        } else {
          setMainParticipant('');
          setIsLocalMinimized(false);
        }
      }
    };

    window.addEventListener('toggleVideoView', handleToggleView);
    
    return () => {
      window.removeEventListener('toggleVideoView', handleToggleView);
    };
  }, [participants, mainParticipant, userAddress]);

  // Session Time Control Monitor - ULTRATHINK
  useEffect(() => {
    // Verificação inicial
    if (!validateSessionTime()) {
      return;
    }

    // Monitor contínuo a cada 30 segundos
    const timeMonitor = setInterval(() => {
      if (!validateSessionTime()) {
        clearInterval(timeMonitor);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(timeMonitor);
  }, [validateSessionTime]);

  // Redirect on timeout or expiration
  useEffect(() => {
    if (sessionExpired || entryTimedOut) {
      const timer = setTimeout(() => {
        safeNavigate(navigate, '/', { replace: true });
      }, 3000); // Wait 3 seconds to show message

      return () => clearTimeout(timer);
    }
    // Explicit return for TypeScript
    return undefined;
  }, [sessionExpired, entryTimedOut, navigate]);

  const handleLeave = () => {
    // PAYER PRESENCE TRACKING - Record payer leave if current user is the payer
    if (payerAddress && userAddress.toLowerCase() === payerAddress.toLowerCase()) {
      console.log('🚪 SimpleSessionRoom: Recording payer leave (manual)', { userAddress, payerAddress });
      handlePayerLeave(userAddress, 'manual_leave');
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    onLeave();
    safeNavigate(navigate, '/', { replace: true });
  };

  // Session Time Control - Early returns for expired/timeout states
  if (sessionExpired) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-orange-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">⏰</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-orange-500">Session Expired</h2>
          <p className="text-gray-500 mb-4">
            This session has ended and is no longer accessible. 
            {refundProcessing ? ' Processing automatic refund...' : ' Payment has been refunded automatically.'}
          </p>
          {refundProcessing && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          )}
          <div className="text-sm text-gray-400 mb-4">
            Redirecting to dashboard in 3 seconds...
          </div>
        </div>
      </div>
    );
  }

  if (entryTimedOut) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl">⏱️</span>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-red-500">Entry Timeout</h2>
          <p className="text-gray-500 mb-4">
            The 15-minute entry window has expired. 
            {refundProcessing ? ' Processing automatic refund...' : ' Payment has been refunded automatically.'}
          </p>
          {refundProcessing && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          )}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> To ensure fair access, mentorship sessions must be joined within 15 minutes of the scheduled start time.
            </p>
          </div>
          <div className="text-sm text-gray-400 mb-4">
            Redirecting to dashboard in 3 seconds...
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-500 mb-4">Please connect your wallet to join the session</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold mb-4">Initializing Enhanced Session...</h2>
          <div className="space-y-3 text-gray-500">
            <p>Setting up your enhanced mentorship session</p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Validating session timing and access permissions
            </p>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Please allow camera and microphone access when prompted
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-0.5"></div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    ULTRATHINK Session Active
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Enhanced session room with simplified initialization for maximum stability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <XMarkIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-red-500">Session Error</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleLeave}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Header */}
      <div className={`border-b p-4 ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className={`text-xl font-semibold ${themeClasses.text}`}>
              Enhanced Mentorship Session
            </h1>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {participants.length} {participants.length !== 1 ? 'participants' : 'participant'}
              </span>
            </div>
            {/* Progressive Payment Status */}
            <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-600 border border-green-500/30">
              Active • {progressPercentage}% • ${paymentReleased.toFixed(2)} released
            </div>
            
            {/* Session Time Status Badge - ULTRATHINK */}
            <SessionTimeStatus schedule={getSessionSchedule()} sessionStarted={!!sessionStartTime} />
            
            {/* Security Status Badge */}
            <div className="px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 bg-green-500/20 text-green-600 border border-green-500/30">
              <span>🔒</span>
              <span>Secure</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Participants Toggle */}
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`p-2 rounded-lg transition-colors ${
                showParticipants
                  ? 'bg-red-500 text-white'
                  : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Participants"
            >
              <UserGroupIcon className="w-5 h-5" />
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-colors relative ${
                showChat
                  ? 'bg-red-500 text-white'
                  : isDarkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Chat"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              {chatMessages.length > 0 && !showChat && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chatMessages.length > 9 ? '9+' : chatMessages.length}
                </div>
              )}
            </button>

            {/* Leave Room Button */}
            <button
              onClick={handleLeave}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              title="Leave session"
            >
              Leave Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Enhanced Video Layout */}
      <div className="relative h-[calc(100vh-80px-80px)] flex">
        {/* Video Call - Full VideoCall.tsx Layout */}
        <div className="h-full flex flex-col relative w-full">
          {/* Main Video Area */}
          <div className="flex-1 relative">
            {participants.filter(p => p.address !== userAddress).length === 0 ? (
              /* Empty State - Show local video with waiting message */
              <div className="h-full flex flex-col items-center justify-center p-4 space-y-6">
                {/* Local Video */}
                <div className="w-full max-w-2xl aspect-video">
                  {renderVideoElement(null, true, "h-full", false, true)}
                </div>
                
                {/* Waiting Message */}
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-6 text-center max-w-md`}>
                  <div className={`rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <UserGroupIcon className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Waiting for others to join...
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Share the session link to invite participants
                  </p>
                </div>
              </div>
            ) : (
              /* Enhanced Video Session Layout */
              <div className="h-full relative">
                {/* Main Video (Featured Participant) - Centered with margins for popups */}
                <div className="h-full flex items-center justify-center px-80 py-8">
                  <div className="w-full max-w-3xl aspect-video">
                    {participants.filter(p => p.address !== userAddress).length === 1 ? (
                      /* 2-participant mode: Optimized layout */
                      !mainParticipant ? (
                        /* Local camera is main */
                        renderVideoElement(null, true, "h-full", true, true)
                      ) : (
                        /* Remote participant is main */
                        renderVideoElement(
                          participants.find(p => p.address === mainParticipant) || null, 
                          false, 
                          "h-full", 
                          true, 
                          true
                        )
                      )
                    ) : (
                      /* Multi-participant mode: Standard logic */
                      mainParticipant ? (
                        renderVideoElement(
                          participants.find(p => p.address === mainParticipant) || null,
                          false,
                          "h-full",
                          true,
                          true
                        )
                      ) : (
                        renderVideoElement(null, true, "h-full", true, true)
                      )
                    )}
                  </div>
                </div>

                {/* Picture-in-Picture Videos - Bottom Right */}
                <div className="absolute bottom-4 right-4 space-y-2 z-10 max-h-[calc(50%-4rem)] overflow-y-auto">
                  {participants.filter(p => p.address !== userAddress).length === 1 ? (
                    /* 2-participant mode: Always show exactly one PiP */
                    !mainParticipant ? (
                      /* Local is main, show remote in PiP */
                      <div className="w-40 sm:w-48 lg:w-64 aspect-video">
                        {renderVideoElement(
                          participants.find(p => p.address !== userAddress) || null, 
                          false, 
                          "shadow-lg border-2 border-white", 
                          true, 
                          false
                        )}
                      </div>
                    ) : (
                      /* Remote is main, show local in PiP */
                      <div className="w-40 sm:w-48 lg:w-64 aspect-video">
                        {renderVideoElement(null, true, "shadow-lg border-2 border-white", true, false)}
                      </div>
                    )
                  ) : (
                    /* Multi-participant mode: Standard logic */
                    <>
                      {/* Local Video PiP - Show when minimized */}
                      {isLocalMinimized && (
                        <div className="w-40 sm:w-48 lg:w-64 aspect-video">
                          {renderVideoElement(null, true, "shadow-lg border-2 border-white", true, false)}
                        </div>
                      )}

                      {/* Remote Videos PiP */}
                      {participants
                        .filter(p => p.address !== userAddress && p.address !== mainParticipant)
                        .slice(0, 3) // Limit to 3 PiP videos to avoid clutter
                        .map((participant) => (
                          <div key={participant.address} className="w-40 sm:w-48 lg:w-64 aspect-video">
                            {renderVideoElement(participant, false, "shadow-lg border-2 border-white", true, false)}
                          </div>
                        ))}
                    </>
                  )}
                </div>

                {/* Additional Participants Indicator */}
                {participants.filter(p => p.address !== userAddress).length > 4 && (
                  <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 text-white z-10">
                    <span className="text-sm">
                      +{participants.filter(p => p.address !== userAddress).length - 4} more participants
                    </span>
                  </div>
                )}

                {/* Enhanced Debug Panel - Floating */}
                {showDebugMode && (
                  <div className="absolute top-4 left-4 bg-black bg-opacity-90 rounded-lg p-4 text-white text-sm max-w-sm z-20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold">🔧 ULTRATHINK DEBUG PANEL</div>
                      <button
                        onClick={() => setShowDebugMode(false)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Local Stream: {localStream ? '✅' : '❌'}</div>
                      <div>Video: {videoEnabled ? '✅' : '❌'}</div>
                      <div>Audio: {audioEnabled ? '✅' : '❌'}</div>
                      <div>Screen Share: {isScreenSharing ? '✅' : '❌'}</div>
                      <div>Participants: {participants.length}</div>
                      <div>Main: {mainParticipant ? formatAddress(mainParticipant) : 'Local'}</div>
                      <div>Session: {sessionDuration}min</div>
                      <div>Local PiP: {isLocalMinimized ? '✅' : '❌'}</div>
                    </div>
                    {/* PROGRESSIVE PAYMENT DEBUG INFO */}
                    <div className="mt-2 pt-2 border-t border-gray-600">
                      <div className="font-bold text-xs mb-1">💰 PROGRESSIVE PAYMENT</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Progress: {progressPercentage}%</div>
                        <div>Payment: ${paymentReleased.toFixed(2)}</div>
                        <div>Is Payer: {payerAddress && userAddress.toLowerCase() === payerAddress.toLowerCase() ? '✅' : '❌'}</div>
                        <div>Tracking: {payerAddress ? '✅' : '❌'}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
                      <button
                        onClick={runVideoStreamDiagnostic}
                        className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-xs transition-colors w-full"
                      >
                        🔍 Run Full Diagnostic
                      </button>
                      <button
                        onClick={refreshCameraStream}
                        className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs transition-colors w-full"
                      >
                        🔄 Refresh Camera
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat Panel */}
        {showChat && (
          <div className={`absolute ${popupPositions.chat} w-80 h-96 ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-lg z-10`}>
            <div className={`flex items-center justify-between p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[calc(100%-48px)]">
              <ChatPanel
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                currentUser={userAddress}
              />
            </div>
          </div>
        )}

        {/* Floating Participants Panel */}
        {showParticipants && (
          <div className={`absolute ${popupPositions.participants} w-64 max-h-96 overflow-y-auto ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-lg z-10`}>
            <div className={`flex items-center justify-between p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Participants</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <ParticipantsList
                participants={participants}
                currentUser={userAddress}
                sessionStartTime={sessionStartTime}
                messageCount={chatMessages.length}
                screenShareCount={participants.filter(p => p.mediaState.screenShare).length}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Media Controls Bar */}
      <div className={`fixed bottom-0 left-0 right-0 border-t ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} z-50 shadow-lg`}>
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <MediaControls
            mediaState={{
              userId: userAddress,
              audio: audioEnabled,
              video: videoEnabled,
              screenShare: isScreenSharing
            }}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onScreenShare={handleScreenShare}
            isScreenSharing={isScreenSharing}
            onToggleView={() => {
              console.log('Toggle view requested');
            }}
            isLocalMain={true}
            hasRemoteParticipants={participants.length > 1}
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleSessionRoom;