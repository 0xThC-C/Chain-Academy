import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '../contexts/WebRTCContext';
import { safeCleanupAndNavigate, safeNavigate } from '../utils/navigation';
import { useSessionManager } from '../utils/sessionManager';
import { useProgressivePayment } from '../hooks/useProgressivePayment';
import { useTheme } from '../contexts/ThemeContext';
import type { SessionRoomProps, AlertModalState } from '@/types';
import VideoCall from './VideoCall';
import ChatPanel from './ChatPanel';
import MediaControls from './MediaControls';
import ParticipantsList from './ParticipantsList';
import SatisfactionSurvey from './SatisfactionSurvey';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Error Boundary Component for State Corruption
class SessionErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SessionRoom Error Boundary caught error:', error, errorInfo);
    this.props.onError(error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-red-500">Session Error</h2>
            <p className="text-gray-400 mb-4">
              A critical error occurred. Reloading the session...
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Reload Session
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Use the imported type from @/types
// interface SessionRoomV3Props is now SessionRoomProps

const SessionRoomV3: React.FC<SessionRoomProps> = ({ 
  sessionId, 
  userAddress, 
  onLeave, 
  isStudent = true,
  mentorAddress = '',
  mentorName = 'Mentor',
  sessionTitle = 'Progressive Mentorship Session',
  sessionDuration: _sessionDuration = 60,
  totalAmount: _totalAmount = 100
}) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  
  const {
    participants,
    localStream,
    remoteStreams,
    mediaState,
    chatMessages,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    localVideoRef,
    setActiveSession,
    clearActiveSession,
    securityState,
    networkMetrics,
    reportSecurityEvent,
    getConnectionMetrics
  } = useWebRTC();

  // PAYER PRESENCE TRACKING - Progressive Payment System with payer presence tracking
  const payerAddress = isStudent ? userAddress : undefined; // Student is the payer
  const {
    sessionData: _sessionData,
    isConnected: _paymentConnected,
    availablePayment: _availablePayment,
    progressPercentage: _progressPercentage,
    timeElapsed: _timeElapsed,
    paymentReleased: _paymentReleased,
    needsHeartbeat: _needsHeartbeat,
    shouldAutoPause: _shouldAutoPause,
    isLoading: _paymentLoading,
    error: _paymentError,
    isStartingSession: _isStartingSession,
    isReleasingPayment: _isReleasingPayment,
    isSendingHeartbeat: _isSendingHeartbeat,
    isCompletingSession: _isCompletingSession,
    startProgressiveSession: _startProgressiveSession,
    releaseProgressivePayment: _releaseProgressivePayment,
    sendHeartbeat: _sendHeartbeat,
    pauseSession: _pauseSession,
    resumeSession: _resumeSession,
    completeSession: _completeSession,
    handleWebRTCConnection,
    startTracking: _startTracking,
    stopTracking: _stopTracking,
    formatPaymentAmount: _formatPaymentAmount,
    getProgressPercentage: _getProgressPercentage,
    getTimeElapsedFormatted: _getTimeElapsedFormatted,
    // PAYER PRESENCE TRACKING methods
    handlePayerJoin,
    handlePayerLeave,
    handlePayerHeartbeat
  } = useProgressivePayment(
    sessionId,
    payerAddress,
    mentorAddress,
    _sessionDuration,
    _totalAmount
  );


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSatisfactionSurvey, setShowSatisfactionSurvey] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [showSecurityWarnings, setShowSecurityWarnings] = useState(false);
  const [_securityMetrics, setSecurityMetrics] = useState({
    connectionAttempts: 0,
    warnings: 0,
    lastCheck: Date.now()
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  const initializationRef = useRef(false);
  const { startSession, endSession, addCleanup } = useSessionManager(sessionId);

  // Memoized popup positions for better performance
  const popupPositions = useMemo(() => ({
    chat: 'top-4 right-4',
    participants: 'top-4 left-4'
  }), []);

  // Optimized alert functions with useCallback
  const showAlert = useCallback((
    type: AlertModalState['type'], 
    title: string, 
    message: string
  ) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Memoized theme classes for performance
  const themeClasses = useMemo(() => ({
    bg: isDarkMode ? 'bg-gray-900' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200'
  }), [isDarkMode]);

  // Handle WebRTC connection changes - DIRECT UPDATES with PAYER PRESENCE TRACKING
  useEffect(() => {
    const isCurrentlyConnected = participants.length > 0 || localStream !== null;
    
    setWebrtcConnected(isCurrentlyConnected);
    // Notify progressive payment system about connection status
    handleWebRTCConnection(isCurrentlyConnected);
    
    // PAYER PRESENCE TRACKING - Handle connection status for payer
    if (payerAddress && userAddress.toLowerCase() === payerAddress.toLowerCase()) {
      if (isCurrentlyConnected) {
        console.log('🔵 SessionRoomV3: Payer connected via WebRTC', { userAddress, payerAddress });
        handlePayerJoin(userAddress);
      } else {
        console.log('🔴 SessionRoomV3: Payer disconnected from WebRTC', { userAddress, payerAddress });
        handlePayerLeave(userAddress, 'webrtc_disconnection');
      }
    }
  }, [participants, localStream, handleWebRTCConnection, payerAddress, userAddress, handlePayerJoin, handlePayerLeave]);

  // PAYER PRESENCE TRACKING - Send heartbeats for payer
  useEffect(() => {
    if (!payerAddress || userAddress.toLowerCase() !== payerAddress.toLowerCase() || !webrtcConnected) {
      return;
    }
    
    const heartbeatInterval = setInterval(() => {
      handlePayerHeartbeat(userAddress);
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(heartbeatInterval);
  }, [payerAddress, userAddress, webrtcConnected, handlePayerHeartbeat]);

  // ULTRATHINK: Direct initialization without problematic batching
  useEffect(() => {
    if (initializationRef.current || hasJoinedRoom) {
      console.log('⚠️ Skipping initialization - already in progress or completed');
      return;
    }

    let isMounted = true;
    initializationRef.current = true;

    const initializeRoom = async () => {
      try {
        console.log('🎯 ULTRATHINK: Direct session initialization without batching');
        
        // Start session manager
        startSession();
        
        // CRITICAL: Direct state updates for loading states - NO BATCHING
        if (isMounted) {
          setIsLoading(true);
          setError(null);
        }

        // Minimal delay to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) {
          console.log('⚠️ Component unmounted during initialization');
          return;
        }

        // Join room directly
        console.log('🎯 Attempting to join room:', sessionId);
        await joinRoom(sessionId, userAddress, true);
        console.log('✅ Successfully joined room');
        
        if (isMounted) {
          const callStartTime = new Date();
          
          // CRITICAL: Direct state updates for completion - NO BATCHING
          setHasJoinedRoom(true);
          setIsLoading(false); // This is the key update that was getting delayed
          setSessionStartTime(callStartTime);
          
          console.log('✅ Session initialization complete - loading should be false');
          
          // Set active session
          setActiveSession({
            sessionId: sessionId,
            mentorAddress: mentorAddress,
            menteeAddress: userAddress,
            startTime: callStartTime,
            sessionType: 'video'
          });
          
          // Start progressive payment tracking
          console.log('🎯 Starting progressive payment tracking');
          _startTracking();
          
          // Add cleanup
          addCleanup(() => {
            console.log('🧹 Cleanup triggered');
            try {
              clearActiveSession();
              leaveRoom();
              _stopTracking();
            } catch (error) {
              console.warn('Cleanup error:', error);
            }
          });
        }

      } catch (err) {
        console.error('❌ Session initialization error:', err);
        
        if (isMounted) {
          // CRITICAL: Direct state updates for errors - NO BATCHING
          setError(err instanceof Error ? err.message : 'Failed to initialize session');
          setIsLoading(false);
        }
        initializationRef.current = false;
      }
    };

    initializeRoom();

    return () => {
      console.log('🧹 SessionRoom cleanup starting');
      isMounted = false;
      
      if (initializationRef.current) {
        try {
          endSession();
          if (hasJoinedRoom) {
            leaveRoom();
          }
        } catch (error) {
          console.warn('Unmount cleanup error:', error);
        }
        initializationRef.current = false;
      }
    };
  }, [sessionId, userAddress, startSession, joinRoom, setActiveSession, _startTracking, addCleanup, clearActiveSession, leaveRoom, _stopTracking, endSession, hasJoinedRoom]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleLeaveRoom = useCallback(() => {
    try {
      console.log('Attempting to leave room...');
      
      // Clear active session to allow navigation
      clearActiveSession();
      
      // Check if user is a student and show survey (RESTORED from old SessionRoom)
      if (isStudent && hasJoinedRoom) {
        // Note: Satisfaction surveys are now optional, no notifications created
        // Survey is always optional - show for feedback (SAME AS OLD SESSIONROOM)
        console.log('📝 Showing optional survey for feedback');
        setShowSatisfactionSurvey(true);
      } else {
        // Direct leave for mentors or if not a student
        console.log('Cleaning up room resources...');
        safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
      }
    } catch (error) {
      console.error('Error during leave room:', error);
      try {
        clearActiveSession();
        leaveRoom();
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError);
      }
      onLeave();
    }
  }, [
    clearActiveSession, 
    isStudent, 
    hasJoinedRoom, 
    leaveRoom, 
    navigate, 
    onLeave
  ]);

  const handleSurveySubmit = useCallback(async (rating: number, feedback: string, confirmReceived: boolean) => {
    try {
      // IMPORTANT: Survey submission is LOCAL ONLY - NO BLOCKCHAIN TRANSACTION
      // This was the source of the wallet signature request issue
      console.log('Survey submitted (local only - no blockchain):', {
        sessionId,
        mentorAddress,
        studentAddress: userAddress,
        rating,
        feedback,
        confirmReceived,
        timestamp: new Date().toISOString()
      });

      // Simulate brief processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Note: Satisfaction surveys are now optional, no notification management needed

      // Close survey first
      setShowSatisfactionSurvey(false);
      
      // Show success message
      showAlert('success', 'Feedback Submitted', 'Thank you for your feedback! Your input helps improve our platform.');
      
      // Navigate to home page after a delay to allow user to see the success message
      setTimeout(() => {
        closeAlert();
        safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      showAlert('error', 'Submission Error', 'Failed to submit feedback. Please try again.');
    }
  }, [
    sessionId,
    mentorAddress,
    userAddress,
    showAlert,
    closeAlert,
    leaveRoom,
    navigate
  ]);

  const handleSurveyClose = useCallback(() => {
    setShowConfirmationModal(true);
  }, []);

  const handleConfirmSurveyClose = useCallback(() => {
    // Close confirmation modal
    setShowConfirmationModal(false);
    
    // Note: Satisfaction surveys are now optional, no notifications created
    setShowSatisfactionSurvey(false);
    
    // Navigate to home page after closing survey without feedback
    safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
  }, [
    leaveRoom,
    navigate
  ]);

  const handleCancelSurveyClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  const handleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [isScreenSharing, stopScreenShare, startScreenShare]);

  const handleSendMessage = useCallback((message: string) => {
    sendChatMessage(message);
  }, [sendChatMessage]);
  
  const handleSecurityEvent = useCallback((event: any) => {
    reportSecurityEvent(event);
    
    // Update local security metrics
    setSecurityMetrics(prev => ({
      ...prev,
      warnings: prev.warnings + 1,
      lastCheck: Date.now()
    }));
    
    // Show security warnings if severity is high
    if (event.severity === 'high' || event.severity === 'critical') {
      setShowSecurityWarnings(true);
    }
  }, [reportSecurityEvent]);
  
  // Simplified security monitoring - DIRECT UPDATES
  useEffect(() => {
    try {
      const metrics = getConnectionMetrics();
      setSecurityMetrics({
        connectionAttempts: metrics.connectionAttempts || 0,
        warnings: metrics.suspiciousActivity || 0,
        lastCheck: Date.now()
      });
    } catch (error) {
      console.warn('Security metrics update failed:', error);
    }
  }, [networkMetrics, getConnectionMetrics]);

  // Memoized loading and error components for better performance
  const loadingComponent = useMemo(() => {
    if (!isLoading) return null;
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold mb-4">Initializing Progressive Session...</h2>
          <div className="space-y-3 text-gray-500">
            <p>Setting up your progressive payment session</p>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Please allow camera and microphone access when prompted
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-0.5"></div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Progressive Payment Active
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Payments will be released gradually as the session progresses, with automatic heartbeat monitoring.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [isLoading, themeClasses]);

  const errorComponent = useMemo(() => {
    if (!error) return null;
    const isMediaError = error.includes('access') || error.includes('camera') || error.includes('microphone');
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.bg} ${themeClasses.text}`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <XMarkIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-red-500">
            {isMediaError ? 'Media Access Required' : 'Connection Error'}
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          
          {isMediaError && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                How to enable camera and microphone:
              </h3>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 text-left">
                <li>• Click the camera icon in your browser's address bar</li>
                <li>• Select "Allow" for camera and microphone</li>
                <li>• Refresh the page and try again</li>
              </ul>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => {
                try {
                  initializationRef.current = false;
                  setHasJoinedRoom(false);
                  setError(null);
                  setIsLoading(true);
                  
                  setTimeout(() => {
                    if (initializationRef.current === false) {
                      setError(null);
                    }
                  }, 500);
                } catch (retryError) {
                  console.error('Error during retry:', retryError);
                  safeCleanupAndNavigate(leaveRoom, navigate, `/session/${sessionId}`, 100);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors mr-3"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                try {
                  safeCleanupAndNavigate(leaveRoom, navigate, '/', 100);
                } catch (error) {
                  console.error('Error during cleanup:', error);
                  safeNavigate(navigate, '/', { replace: true });
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }, [error, themeClasses, initializationRef, hasJoinedRoom, leaveRoom, navigate, sessionId]);

  // Early returns for loading and error states
  if (loadingComponent) return loadingComponent;
  if (errorComponent) return errorComponent;

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Header */}
      <div className={`border-b p-4 ${themeClasses.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className={`text-xl font-semibold ${themeClasses.text}`}>
              Progressive Mentorship Session
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${webrtcConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {participants.length} {participants.length !== 1 ? 'participants' : 'participant'}
              </span>
            </div>
            {/* Progressive Payment Status Badge */}
            {_sessionData && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                _sessionData.isActive 
                  ? _sessionData.isPaused
                    ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                    : 'bg-green-500/20 text-green-600 border border-green-500/30'
                  : 'bg-gray-500/20 text-gray-600 border border-gray-500/30'
              }`}>
                {_sessionData.isActive 
                  ? _sessionData.isPaused ? 'Paused' : 'Active'
                  : 'Inactive'
                } • {_getProgressPercentage()}% • ${_paymentReleased.toFixed(2)} released
              </div>
            )}
            
            {/* Security Status Badge */}
            {securityState && (
              <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                securityState.isSecure && securityState.encryptionEnabled
                  ? 'bg-green-500/20 text-green-600 border border-green-500/30'
                  : securityState.securityWarnings.length > 0
                  ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                  : 'bg-red-500/20 text-red-600 border border-red-500/30'
              }`}>
                <span>🔒</span>
                <span>
                  {securityState.isSecure && securityState.encryptionEnabled ? 'Secure' :
                   securityState.securityWarnings.length > 0 ? `${securityState.securityWarnings.length} Warning(s)` :
                   'Not Secure'
                  }
                </span>
              </div>
            )}
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
              onClick={handleLeaveRoom}
              className={`px-4 py-2 rounded-lg transition-colors ${
                _sessionData && _timeElapsed >= 30
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={_sessionData && _timeElapsed >= 30 ? 'Survey recommended for payment completion' : 'Leave session'}
            >
              {_sessionData && _timeElapsed >= 30 ? 'Complete & Leave' : 'Leave Session'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative h-[calc(100vh-80px-80px)] flex">
        {/* Video Call - Takes full space */}
        <div className="flex-1 relative">
          <VideoCall
            localVideoRef={localVideoRef}
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            currentUser={userAddress}
            onSecurityEvent={handleSecurityEvent}
            securityEnabled={true}
            onForceRefreshVideo={() => {
              console.log('🔄 External force refresh requested');
              if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
              }
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }}
          />
        </div>

        {/* Floating Chat Panel - RESTORED from old SessionRoom */}
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

        {/* Floating Participants Panel - RESTORED from old SessionRoom */}
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
                screenShareCount={participants.filter(p => p.mediaState?.screenShare).length}
              />
            </div>
          </div>
        )}

      </div>

      {/* Bottom Media Controls Bar */}
      <div className={`fixed bottom-0 left-0 right-0 border-t ${isDarkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} z-50 shadow-lg`}>
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <MediaControls
            mediaState={mediaState}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onScreenShare={handleScreenShare}
            isScreenSharing={isScreenSharing}
            onToggleView={() => {
              window.dispatchEvent(new CustomEvent('toggleVideoView'));
            }}
            isLocalMain={participants.length === 0}
            hasRemoteParticipants={participants.length > 0}
          />
        </div>
      </div>

      {/* Satisfaction Survey Modal */}
      <SatisfactionSurvey
        isOpen={showSatisfactionSurvey}
        onClose={handleSurveyClose}
        onSubmit={handleSurveySubmit}
        mentorAddress={mentorAddress}
        mentorName={mentorName}
        sessionId={sessionId}
        sessionTitle={sessionTitle}
        sessionDate={new Date().toISOString().split('T')[0]}
        sessionTime={new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        studentAddress={userAddress}
        studentName="Student"
        isMandatory={false} // Survey is now always optional (SAME AS OLD SESSIONROOM)
      />

      {/* Confirmation Modal for Survey Close */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleCancelSurveyClose}
        onConfirm={handleConfirmSurveyClose}
        title="Skip Feedback?"
        message="Would you like to skip providing feedback? Your feedback helps improve our platform and assists other students. You can always provide feedback later through notifications."
        confirmText="Skip Feedback"
        cancelText="Continue Review"
        variant="info"
      />

      {/* Security Warnings Modal */}
      {showSecurityWarnings && securityState.securityWarnings.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-yellow-500 rounded-full p-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Security Warnings
              </h3>
            </div>
            
            <div className="space-y-2 mb-4">
              {securityState.securityWarnings.slice(-3).map((warning, index) => (
                <div key={index} className={`text-sm p-2 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {warning}
                </div>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSecurityWarnings(false)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

// Wrapped component with error boundary to prevent state corruption
const SessionRoomV3WithErrorBoundary: React.FC<SessionRoomProps> = (props) => {
  const handleError = useCallback((error: Error) => {
    console.error('🚨 SessionRoom Error Boundary triggered:', error);
    
    // Clean up any existing sessions
    try {
      localStorage.removeItem(`session_${props.sessionId}`);
    } catch (e) {
      console.warn('Failed to clean up session data:', e);
    }
    
    // Auto-reload after 3 seconds
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }, [props.sessionId]);

  return (
    <SessionErrorBoundary onError={handleError}>
      <SessionRoomV3 {...props} />
    </SessionErrorBoundary>
  );
};

// Export memoized component with error boundary for state corruption protection
export default memo(SessionRoomV3WithErrorBoundary);