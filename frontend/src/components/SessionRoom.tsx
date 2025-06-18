import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '../contexts/WebRTCContext';
import { safeCleanupAndNavigate, safeNavigate } from '../utils/navigation';
import { useSessionManager, detectMemoryLeaks } from '../utils/sessionManager';
import { useProgressivePayment } from '../hooks/useProgressivePayment';
import VideoCall from './VideoCall';
import ChatPanel from './ChatPanel';
import MediaControls from './MediaControls';
import ParticipantsList from './ParticipantsList';
import SatisfactionSurvey from './SatisfactionSurvey';
import ConfirmationModal from './ConfirmationModal';
import AlertModal from './AlertModal';
// import PaymentProgressIndicator from './PaymentProgressIndicator';
import { useTheme } from '../contexts/ThemeContext';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface SessionRoomProps {
  sessionId: string;
  userAddress: string;
  onLeave: () => void;
  isStudent?: boolean; // Add prop to identify if user is a student
  mentorAddress?: string; // Add mentor address for survey
  mentorName?: string; // Add mentor name for better UX
  sessionTitle?: string; // Add session title for context
  sessionDuration?: number; // Session duration in minutes
  totalAmount?: number; // Total session cost for payment tracking
}

const SessionRoom: React.FC<SessionRoomProps> = ({ 
  sessionId, 
  userAddress, 
  onLeave, 
  isStudent = true, // Default to student for demo
  mentorAddress = '',
  mentorName = 'Mentor',
  sessionTitle = 'Mentorship Session',
  sessionDuration = 60, // Default 60 minutes
  totalAmount = 100 // Default $100 for demo
}) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const {
    // isConnected,
    // roomId,
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
    // Session security methods
    setActiveSession,
    clearActiveSession
  } = useWebRTC();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSatisfactionSurvey, setShowSatisfactionSurvey] = useState(false);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [showPaymentProgress, setShowPaymentProgress] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [realTimeProgress, setRealTimeProgress] = useState(0);

  // Smart positioning system to avoid overlaps and screen cuts
  const getPopupPositions = () => {
    const positions = {
      chat: '',
      participants: '',
      payment: ''
    };


    // FIXED POSITIONS - Each popup always has the same position regardless of others
    // This completely prevents any overlapping issues
    
    // Chat: Always top-right when open
    positions.chat = 'top-4 right-4';
    
    // Participants: Always top-left when open  
    positions.participants = 'top-4 left-4';
    
    // Payment: ALWAYS bottom-left when open (never changes)
    // This is the key fix - payment position is FIXED and never depends on other panels
    // Positioned lower to avoid overlapping with participants popup
    positions.payment = 'bottom-4 left-4';

    return positions;
  };

  const popupPositions = getPopupPositions();

  // Progressive Payment System V3
  const {
    sessionData: sessionProgress,
    progressPercentage: _progressPercentage,
    paymentReleased: _paymentReleased,
    startTracking,
    stopTracking,
    handleWebRTCConnection,
    getProgressPercentage: _getProgressPercentage,
    getTimeElapsedFormatted: _getTimeElapsedFormatted
  } = useProgressivePayment(sessionId);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // Use ref to prevent multiple initialization attempts
  const initializationRef = useRef(false);

  // Session manager for resource cleanup
  const { startSession, endSession, addCleanup } = useSessionManager(sessionId);

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // Create room and join on component mount
  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initializationRef.current || hasJoinedRoom) {
      console.log('Skipping initialization - already in progress or completed');
      return;
    }

    let isMounted = true; // Track if component is still mounted

    const initializeRoom = async () => {
      try {
        initializationRef.current = true;
        
        if (!isMounted) return; // Check if component is still mounted
        
        // Start session management
        startSession();
        
        setIsLoading(true);
        setError(null);

        // Check memory usage
        const memoryInfo = detectMemoryLeaks();
        if (memoryInfo && memoryInfo.usagePercentage > 70) {
          console.warn('High memory usage before starting session:', memoryInfo);
        }

        // Small delay to ensure WebRTC context is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) return; // Check again after delay

        // Try to connect to backend first, if fails proceed without server
        let roomId = sessionId;
        
        try {
          // Attempt to create room via API with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001'}/api/webrtc/rooms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              participants: [userAddress]
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            roomId = data.room.roomId;
          } else {
            console.warn('Backend not available, using session ID as room ID');
          }
        } catch (backendError) {
          if (backendError instanceof Error && backendError.name === 'AbortError') {
            console.warn('Backend request timed out, proceeding with local session');
          } else {
            console.warn('Backend not available, proceeding with local session:', backendError);
          }
        }

        if (!isMounted) return; // Check before proceeding with room join

        // Join the room with camera/microphone access
        console.log('Attempting to join room and request media access...');
        // Enable video for all users - both mentors and students can use camera
        await joinRoom(roomId, userAddress, true);
        
        if (isMounted) {
          setHasJoinedRoom(true);
          setIsLoading(false);
          
          // 🔒 SECURITY: Mark session as active to block navigation
          console.log('🔒 Marking session as active - Navigation protection enabled');
          const callStartTime = new Date();
          setSessionStartTime(callStartTime);
          setActiveSession({
            sessionId: sessionId,
            mentorAddress: mentorAddress,
            menteeAddress: userAddress,
            startTime: callStartTime,
            sessionType: 'video'
          });
          
          
          // Start progressive payment tracking when session successfully starts
          console.log('🎯 Starting progressive payment tracking');
          startTracking();
          handleWebRTCConnection(true); // Mark WebRTC as connected
          
          // Add cleanup functions to session manager
          addCleanup(() => {
            console.log('Session manager cleanup triggered');
            try {
              clearActiveSession(); // Clear active session on cleanup
              leaveRoom();
              stopTracking(); // Stop escrow tracking on cleanup
            } catch (error) {
              console.warn('Error during session manager cleanup:', error);
            }
          });
        }

      } catch (err) {
        console.error('Error initializing room:', err);
        
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize session room');
          setIsLoading(false);
        }
        
        initializationRef.current = false; // Reset on error to allow retry
      }
    };

    // Initialize room
    initializeRoom();

    // Cleanup on unmount
    return () => {
      isMounted = false; // Mark component as unmounted
      
      console.log('SessionRoom unmounting, cleaning up...');
      
      // Use session manager for cleanup
      try {
        endSession();
      } catch (sessionError) {
        console.warn('Error during session manager cleanup:', sessionError);
      }
      
      if (hasJoinedRoom) {
        try {
          leaveRoom();
        } catch (cleanupError) {
          console.warn('Error during session cleanup:', cleanupError);
        }
        
        // Safely reset state if component is still mounted
        if (mountedRef.current) {
          try {
            setHasJoinedRoom(false);
          } catch (stateError) {
            console.warn('State update skipped during unmount');
          }
        }
      }
      
      initializationRef.current = false;
      
      // Final memory check with longer delay to avoid conflicts
      setTimeout(() => {
        if (mountedRef.current) {
          try {
            const memoryInfo = detectMemoryLeaks();
            if (memoryInfo) {
              console.log('Memory usage after cleanup:', memoryInfo);
            }
          } catch (memoryError) {
            console.warn('Memory check skipped:', memoryError);
          }
        }
      }, 2000); // Increased delay to avoid conflicts with navigation
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userAddress]); // Include sessionId and userAddress as dependencies

  // Calculate real-time payment progress
  useEffect(() => {
    if (!sessionStartTime || !hasJoinedRoom) {
      setRealTimeProgress(0);
      return;
    }

    const updateProgress = () => {
      const now = new Date();
      const elapsedMinutes = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60);
      const sessionDurationMinutes = sessionDuration;
      
      // Calculate session completion percentage
      const sessionCompletionPercent = Math.min((elapsedMinutes / sessionDurationMinutes) * 100, 100);
      
      // Updated Payment stages with automatic completion:
      // 20% - Immediate upon joining (session start)
      // 60% - Progressive from 20% to 80% as session progresses to 70%
      // 20% - Final 20% released automatically when session reaches 70%
      
      let progressPercentage = 0;
      
      if (hasJoinedRoom) {
        // Stage 1: 20% immediate
        progressPercentage = 20;
        
        // Stage 2: Progressive increase from 20% to 100% as session reaches 70%
        if (sessionCompletionPercent > 0) {
          const progressToSeventyPercent = Math.min(sessionCompletionPercent / 70, 1); // Cap at 70% session completion
          const additionalProgress = progressToSeventyPercent * 80; // 80% additional progress (60% + final 20%)
          progressPercentage = 20 + additionalProgress;
        }
        
        // Auto-complete at 70% session progress
        if (sessionCompletionPercent >= 70) {
          progressPercentage = 100;
        }
      }
      
      setRealTimeProgress(Math.round(progressPercentage));
    };

    // Update immediately
    updateProgress();

    // Set up interval to update every second
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, hasJoinedRoom, sessionDuration, sessionProgress?.status]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Note: Survey is only shown when user clicks Leave Session, not automatically at 70%

  const handleLeaveRoom = () => {
    try {
      console.log('Attempting to leave room...');
      
      // 🔒 SECURITY: Clear active session to allow navigation
      console.log('🔓 Clearing active session - Navigation protection disabled');
      clearActiveSession();
      
      // Check if user is a student and show optional survey
      if (isStudent && hasJoinedRoom) {
        // Check if session has significant progress (>30 minutes or >50%) to create notification
        const currentProgress = sessionStartTime ? 
          Math.min(((Date.now() - sessionStartTime.getTime()) / (1000 * 60 * sessionDuration)) * 100, 100) : 0;
        const sessionMinutes = sessionStartTime ? 
          Math.floor((Date.now() - sessionStartTime.getTime()) / (1000 * 60)) : 0;
        
        if (currentProgress >= 50 || sessionMinutes >= 30) {
          // Session has significant progress - satisfaction surveys are now optional, no notifications created
          console.log('📝 Session completed with significant progress - satisfaction surveys are optional', {
            currentProgress,
            sessionMinutes,
            sessionId,
            userAddress
          });
          // Note: No notification created as satisfaction surveys are now optional
        } else {
          console.log('⏭️ Session too short for feedback tracking', {
            currentProgress,
            sessionMinutes,
            threshold: '50% or 30min'
          });
        }
        
        // Survey is now always optional - show for feedback
        console.log('📝 Showing optional survey for feedback');
        setShowSatisfactionSurvey(true);
      } else {
        // Direct leave for mentors or if not a student
        console.log('Cleaning up room resources...');
        
        // Use safe cleanup and navigation with consistent delay
        safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
      }
    } catch (error) {
      console.error('Error during leave room:', error);
      // Force safe navigation even if there's an error
      try {
        clearActiveSession(); // Ensure session is cleared even on error
        leaveRoom();
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError);
      }
      onLeave();
    }
  };

  const handleSurveySubmit = async (rating: number, feedback: string, confirmReceived: boolean) => {
    try {
      // Here you would typically send the survey data to your backend
      // and trigger smart contract payment release
      console.log('Survey submitted:', {
        sessionId,
        mentorAddress,
        studentAddress: userAddress,
        rating,
        feedback,
        confirmReceived,
        timestamp: new Date().toISOString()
      });

      // Simulate API call to submit survey and release payment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // TODO: Integrate with smart contract to release payment
      // await releasePaymentToMentor(sessionId, mentorAddress);

      // Note: Satisfaction surveys are now optional, no notifications to mark as completed

      // Update progress to 100% when survey is completed
      setRealTimeProgress(100);

      // Close survey first
      setShowSatisfactionSurvey(false);
      
      // Show success message with auto-close functionality
      showAlert('success', 'Feedback Submitted', 'Thank you for your feedback! Your input helps improve our platform.');
      
      // Navigate to home page after a delay to allow user to see the success message
      setTimeout(() => {
        closeAlert();
        safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      throw error;
    }
  };

  const handleSurveyClose = () => {
    // Show custom confirmation modal instead of browser confirm
    setShowConfirmationModal(true);
  };

  const handleConfirmSurveyClose = () => {
    // Close confirmation modal
    setShowConfirmationModal(false);
    
    // Note: Satisfaction surveys are now optional, no pending notifications created

    setShowSatisfactionSurvey(false);
    
    // Navigate to home page after closing survey without feedback
    safeCleanupAndNavigate(leaveRoom, navigate, '/', 150);
  };

  const handleCancelSurveyClose = () => {
    // Just close the confirmation modal, keep survey open
    setShowConfirmationModal(false);
  };

  const handleScreenShare = async () => {
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
  };

  const handleSendMessage = (message: string) => {
    sendChatMessage(message);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold mb-4">Joining Session...</h2>
          <div className="space-y-3 text-gray-500">
            <p>Setting up your mentorship session</p>
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Please allow camera and microphone access when prompted
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-blue-500 rounded-full mt-0.5"></div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Camera & Microphone Required
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Your browser will request permission to access your camera and microphone. Click "Allow" to start your video session.
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
    const isMediaError = error.includes('access') || error.includes('camera') || error.includes('microphone');
    
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
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
                  
                  // Small delay before retrying to allow cleanup
                  setTimeout(() => {
                    if (initializationRef.current === false) {
                      // This will trigger the useEffect to reinitialize
                      setError(null);
                    }
                  }, 500);
                } catch (retryError) {
                  console.error('Error during retry:', retryError);
                  // Fallback: safe navigation to refresh
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
                  // Use safe cleanup and navigation
                  safeCleanupAndNavigate(leaveRoom, navigate, '/', 100);
                } catch (error) {
                  console.error('Error during cleanup:', error);
                  // Force safe navigation even if cleanup fails
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
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Mentorship Session
            </h1>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {participants.length} {participants.length !== 1 ? 'participants' : 'participant'}
              </span>
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

            {/* Payment Progress - Subtle indicator */}
            {isStudent && (
              <div className="relative">
                <button
                  onClick={() => setShowPaymentProgress(!showPaymentProgress)}
                  className={`p-2 rounded-lg transition-colors ${
                    showPaymentProgress
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
                  title="Payment Progress"
                >
                  💰
                </button>
                {/* Small progress indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            )}


            {/* Leave Room */}
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 rounded-lg transition-colors bg-red-500 hover:bg-red-600 text-white"
              title="Leave session"
            >
              Leave Session
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
            onForceRefreshVideo={() => {
              console.log('🔄 External force refresh requested');
              // Trigger a re-join to refresh the entire video stream
              if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
              }
              // Force a new getUserMedia request
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }}
          />
        </div>

        {/* Floating Chat Panel - Only when toggled */}
        {showChat && (
          <div className={`absolute ${popupPositions.chat} w-80 h-96 ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-lg z-10`}>
            <div className="flex items-center justify-between p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}">
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

        {/* Floating Participants Panel - Only when toggled */}
        {showParticipants && (
          <div className={`absolute ${popupPositions.participants} w-64 max-h-96 overflow-y-auto ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-lg z-10`}>
            <div className="flex items-center justify-between p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}">
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

        {/* Floating Payment Progress Panel - Only when toggled */}
        {showPaymentProgress && isStudent && (
          <div className={`absolute ${popupPositions.payment} w-64 max-h-80 overflow-y-auto ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-lg z-10`}>
            <div className="flex items-center justify-between p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}">
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment Progress</h3>
              <button
                onClick={() => setShowPaymentProgress(false)}
                className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2">
              {/* Compact Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Payment Release
                  </span>
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {realTimeProgress}%
                  </span>
                </div>
                
                {/* Compact Progress Bar */}
                <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
                    style={{ width: `${realTimeProgress}%` }}
                  />
                </div>
              </div>

              {/* Compact Payment Summary */}
              <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Released:</span>
                  <span className={`font-medium text-green-500`}>
                    ${Math.round((totalAmount * realTimeProgress) / 100)}/${totalAmount}
                  </span>
                </div>
                {sessionStartTime && (
                  <div className="flex justify-between text-xs">
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Time:</span>
                    <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {Math.floor((new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60))} / {sessionDuration} min
                    </span>
                  </div>
                )}
              </div>
              
              {/* Compact Status */}
              <div className="mt-2 text-center">
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {realTimeProgress < 100 ? 'Next: 70% session completion' : 'Payment complete!'}
                </span>
              </div>
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
              // Toggle view logic - works for both test mode and normal mode
              window.dispatchEvent(new CustomEvent('toggleVideoView'));
            }}
            isLocalMain={participants.length === 0} // This will be determined by VideoCall state
            hasRemoteParticipants={participants.length > 0} // Show toggle when there are remote participants
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
        isMandatory={false} // Survey is now always optional
      />

      {/* Confirmation Modal for Survey Close */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleCancelSurveyClose}
        onConfirm={handleConfirmSurveyClose}
        title="Skip Feedback?"
        message="Would you like to skip providing feedback? Your feedback helps improve our platform and assists other students. Satisfaction surveys are now optional."
        confirmText="Skip Feedback"
        cancelText="Continue Review"
        variant="info"
      />

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

export default SessionRoom;