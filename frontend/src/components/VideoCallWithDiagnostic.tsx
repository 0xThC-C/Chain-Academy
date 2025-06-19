import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  VideoCameraSlashIcon,
  MicrophoneIcon,
  NoSymbolIcon as MicrophoneSlashIcon,
  ComputerDesktopIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import VideoStreamDiagnostic from './VideoStreamDiagnostic';
import useVideoStreamDiagnostic from '../hooks/useVideoStreamDiagnostic';

interface MediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

interface Participant {
  address: string;
  mediaState: MediaState;
}

interface VideoCallWithDiagnosticProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  currentUser: string;
}

const VideoCallWithDiagnostic: React.FC<VideoCallWithDiagnosticProps> = ({
  localVideoRef,
  localStream,
  remoteStreams,
  participants,
  currentUser
}) => {
  const { isDarkMode } = useTheme();
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [mainParticipant, setMainParticipant] = useState<string>('');
  const [isLocalMinimized, setIsLocalMinimized] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0);
  const [lastDiagnosticRun, setLastDiagnosticRun] = useState<number>(0);

  // Diagnostic hook
  const {
    runQuickDiagnostic,
    forceVideoRefresh,
    getStreamInfo,
    getVideoElementInfo
  } = useVideoStreamDiagnostic();

  // Debug state tracking
  const [debugInfo, setDebugInfo] = useState<{
    streamInfo: any;
    videoInfo: any;
    lastUpdate: number;
  } | null>(null);

  // Update debug info periodically when in debug mode
  useEffect(() => {
    if (!debugMode) return;

    const interval = setInterval(() => {
      const streamInfo = localStream ? getStreamInfo(localStream) : null;
      const videoInfo = localVideoRef.current ? getVideoElementInfo(localVideoRef.current) : null;
      
      setDebugInfo({
        streamInfo,
        videoInfo,
        lastUpdate: Date.now()
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [debugMode, localStream, localVideoRef, getStreamInfo, getVideoElementInfo]);

  // Auto-diagnostic when video issues are detected
  useEffect(() => {
    if (!localVideoRef.current || !localStream) return;
    
    const videoElement = localVideoRef.current;
    const checkVideoHealth = () => {
      // Check if video has issues
      const hasIssues = (
        videoElement.readyState < 1 ||
        videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0 ||
        (videoElement.paused && videoElement.srcObject)
      );

      if (hasIssues && Date.now() - lastDiagnosticRun > 5000) {
        console.log('[VideoCallWithDiagnostic] Video issues detected, running auto-diagnostic...');
        runQuickDiagnostic(videoElement, localStream).then(results => {
          const failedTests = results.filter(r => r.status === 'fail');
          if (failedTests.length > 0 && autoRefreshAttempts < 3) {
            console.log('[VideoCallWithDiagnostic] Auto-refreshing video due to failed tests...');
            handleForceRefresh();
          }
        });
        setLastDiagnosticRun(Date.now());
      }
    };

    const healthCheckInterval = setInterval(checkVideoHealth, 3000);
    return () => clearInterval(healthCheckInterval);
  }, [localVideoRef, localStream, lastDiagnosticRun, autoRefreshAttempts, runQuickDiagnostic]);

  // Update remote video elements when streams change
  useEffect(() => {
    remoteStreams.forEach((stream, participantAddress) => {
      const videoElement = remoteVideoRefs.current.get(participantAddress);
      if (videoElement && videoElement.srcObject !== stream) {
        console.log('[VideoCallWithDiagnostic] Updating remote video stream:', participantAddress);
        videoElement.srcObject = stream;
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(playError => {
            console.warn(`Error playing remote video for ${participantAddress}:`, playError);
          });
        }
      }
    });
  }, [remoteStreams]);

  const getParticipantMediaState = (address: string): MediaState | null => {
    const participant = participants.find(p => p.address === address);
    return participant?.mediaState || null;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const remoteParticipants = participants.filter(p => p.address !== currentUser);
  const localParticipant = participants.find(p => p.address === currentUser);

  // Auto-select first remote participant as main if none selected
  useEffect(() => {
    if (!mainParticipant && remoteParticipants.length > 0) {
      setMainParticipant(remoteParticipants[0].address);
    }
    if (remoteParticipants.length === 0) {
      setMainParticipant('');
    }
  }, [remoteParticipants, mainParticipant]);

  const handleSwitchMain = (participantAddress: string) => {
    if (participantAddress === currentUser) {
      setMainParticipant('');
      setIsLocalMinimized(false);
    } else {
      setMainParticipant(participantAddress);
      setIsLocalMinimized(true);
    }
  };

  const handleForceRefresh = useCallback(async () => {
    if (!localVideoRef.current || !localStream) {
      console.warn('[VideoCallWithDiagnostic] Cannot refresh - missing video element or stream');
      return;
    }

    console.log('[VideoCallWithDiagnostic] Force refreshing video...');
    setAutoRefreshAttempts(prev => prev + 1);
    
    try {
      const success = await forceVideoRefresh(localVideoRef.current, localStream);
      console.log('[VideoCallWithDiagnostic] Force refresh result:', success);
      
      if (success) {
        setAutoRefreshAttempts(0); // Reset counter on success
      }
    } catch (error) {
      console.error('[VideoCallWithDiagnostic] Force refresh failed:', error);
    }
  }, [localVideoRef, localStream, forceVideoRefresh]);

  const handleRunDiagnostic = useCallback(async () => {
    if (!localVideoRef.current || !localStream) return;
    
    console.log('[VideoCallWithDiagnostic] Running manual diagnostic...');
    const results = await runQuickDiagnostic(localVideoRef.current, localStream);
    console.log('[VideoCallWithDiagnostic] Diagnostic results:', results);
    setLastDiagnosticRun(Date.now());
  }, [localVideoRef, localStream, runQuickDiagnostic]);

  const renderVideoElement = (
    participant: Participant | null, 
    isLocal: boolean = false, 
    className: string = "",
    showControls: boolean = true
  ) => {
    const mediaState = isLocal ? localParticipant?.mediaState : getParticipantMediaState(participant?.address || '');
    const address = isLocal ? currentUser : participant?.address || '';
    
    return (
      <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <video
          ref={isLocal ? localVideoRef : (el) => {
            if (el && participant) {
              console.log(`[VideoCallWithDiagnostic] Setting up ${isLocal ? 'local' : 'remote'} video element for ${participant.address}`);
              remoteVideoRefs.current.set(participant.address, el);
              const stream = remoteStreams.get(participant.address);
              if (stream && el.srcObject !== stream) {
                console.log(`[VideoCallWithDiagnostic] Setting remote stream for ${participant.address}:`, {
                  streamId: stream.id,
                  active: stream.active,
                  videoTracks: stream.getVideoTracks().length,
                  audioTracks: stream.getAudioTracks().length
                });
                
                try {
                  el.srcObject = stream;
                  el.load();
                  
                  setTimeout(() => {
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(playError => {
                        console.warn('[VideoCallWithDiagnostic] Error playing remote video:', playError);
                      });
                    }
                  }, 100);
                } catch (error) {
                  console.error('[VideoCallWithDiagnostic] Error setting remote video stream:', error);
                }
              }
            }
            if (isLocal && el) {
              console.log('[VideoCallWithDiagnostic] Local video element mounted:', {
                element: !!el,
                srcObject: !!el.srcObject,
                readyState: el.readyState,
                videoWidth: el.videoWidth,
                videoHeight: el.videoHeight
              });
              
              // Force refresh if needed
              if (el.srcObject && (el.videoWidth === 0 || el.videoHeight === 0)) {
                console.log('[VideoCallWithDiagnostic] Detected video with invalid dimensions, scheduling refresh...');
                setTimeout(() => {
                  handleForceRefresh();
                }, 1000);
              }
            }
          }}
          autoPlay
          muted={isLocal}
          playsInline
          className="w-full h-full object-cover"
          style={{
            backgroundColor: 'transparent',
            objectFit: 'cover',
            transform: isLocal ? 'scaleX(-1)' : 'none',
            minWidth: '100%',
            minHeight: '100%'
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            console.log(`[VideoCallWithDiagnostic] Video metadata loaded for ${isLocal ? 'local' : 'remote'} video:`, {
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
              readyState: video.readyState,
              currentTime: video.currentTime,
              paused: video.paused,
              srcObject: !!video.srcObject
            });
          }}
          onCanPlay={(e) => {
            const video = e.target as HTMLVideoElement;
            console.log(`[VideoCallWithDiagnostic] Video can play for ${isLocal ? 'local' : 'remote'} video:`, {
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              srcObject: !!video.srcObject
            });
            
            if (video.paused) {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  console.log(`[VideoCallWithDiagnostic] Successfully auto-played ${isLocal ? 'local' : 'remote'} video from canPlay event`);
                }).catch(error => {
                  console.warn(`[VideoCallWithDiagnostic] Error auto-playing ${isLocal ? 'local' : 'remote'} video from canPlay:`, error);
                });
              }
            }
          }}
          onError={(e) => {
            const video = e.target as HTMLVideoElement;
            console.error(`[VideoCallWithDiagnostic] Video error for ${isLocal ? 'local' : 'remote'} video:`, {
              error: video.error,
              networkState: video.networkState,
              readyState: video.readyState
            });
          }}
          onPlaying={() => {
            console.log(`[VideoCallWithDiagnostic] Video started playing for ${isLocal ? 'local' : 'remote'} video`);
          }}
          onWaiting={() => {
            console.log(`[VideoCallWithDiagnostic] Video waiting for data for ${isLocal ? 'local' : 'remote'} video`);
          }}
          onStalled={() => {
            console.log(`[VideoCallWithDiagnostic] Video stalled for ${isLocal ? 'local' : 'remote'} video`);
          }}
        />
        
        {/* Video Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30 flex flex-col justify-between p-2 sm:p-4">
          {/* Top: User Info and Debug Controls */}
          <div className="flex items-center justify-between">
            <div className="bg-black bg-opacity-50 rounded-lg px-2 py-1 sm:px-3 sm:py-1">
              <span className="text-white text-xs sm:text-sm font-medium">
                {isLocal ? `You (${formatAddress(currentUser)})` : formatAddress(address)}
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              {/* Screen Share Indicator */}
              {mediaState?.screenShare && (
                <div className="bg-red-500 rounded-lg px-1 py-1 sm:px-2 sm:py-1 flex items-center space-x-1">
                  <ComputerDesktopIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  <span className="text-white text-xs hidden sm:inline">Sharing</span>
                </div>
              )}
              
              {/* Debug Controls for Local Video */}
              {isLocal && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setDebugMode(!debugMode)}
                    className={`p-1 rounded ${debugMode ? 'bg-blue-500' : 'bg-black bg-opacity-50'} hover:bg-opacity-70 transition-colors`}
                    title="Toggle debug mode"
                  >
                    <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                  
                  <button
                    onClick={handleRunDiagnostic}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded p-1 transition-colors"
                    title="Run diagnostic"
                  >
                    <WrenchScrewdriverIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                  
                  <button
                    onClick={handleForceRefresh}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded p-1 transition-colors"
                    title="Force refresh video"
                  >
                    <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Debug Info Overlay */}
          {isLocal && debugMode && debugInfo && (
            <div className="absolute top-12 left-2 right-2 bg-black bg-opacity-80 text-white text-xs p-2 rounded max-h-32 overflow-auto">
              <div className="grid grid-cols-1 gap-1">
                <div>
                  <strong>Stream:</strong> {debugInfo.streamInfo ? 
                    `${debugInfo.streamInfo.id.slice(0, 8)}... (${debugInfo.streamInfo.videoTracks.length}V/${debugInfo.streamInfo.audioTracks.length}A)` : 
                    'None'
                  }
                </div>
                <div>
                  <strong>Video:</strong> {debugInfo.videoInfo ? 
                    `${debugInfo.videoInfo.videoWidth}x${debugInfo.videoInfo.videoHeight} (${debugInfo.videoInfo.readyState})` : 
                    'None'
                  }
                </div>
                <div>
                  <strong>Status:</strong> {debugInfo.videoInfo ? 
                    (debugInfo.videoInfo.paused ? 'Paused' : 'Playing') : 
                    'Unknown'
                  }
                </div>
                {autoRefreshAttempts > 0 && (
                  <div className="text-yellow-300">
                    <strong>Auto-refresh attempts:</strong> {autoRefreshAttempts}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom: Media State and Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 sm:space-x-2">
              {!mediaState?.video && (
                <div className="bg-red-500 rounded-full p-1">
                  <VideoCameraSlashIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              {!mediaState?.audio && (
                <div className="bg-red-500 rounded-full p-1">
                  <MicrophoneSlashIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              {mediaState?.audio && mediaState?.video && (
                <div className="bg-green-500 rounded-full p-1">
                  <MicrophoneIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
              )}
              
              {/* Video Quality Indicator */}
              {isLocal && localVideoRef.current && (
                <div className={`rounded-full p-1 text-white text-xs ${
                  localVideoRef.current.videoWidth > 0 && localVideoRef.current.videoHeight > 0
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}>
                  {localVideoRef.current.videoWidth > 0 && localVideoRef.current.videoHeight > 0 ? '●' : '○'}
                </div>
              )}
            </div>

            {/* Switch to Main Button */}
            {showControls && (
              <button
                onClick={() => handleSwitchMain(address)}
                className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-1 sm:p-2 transition-all duration-200"
                title="Switch to main view"
              >
                <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </button>
            )}
          </div>
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
              <p className="text-gray-300 text-xs sm:text-sm">
                {mediaState?.video ? 'Loading Camera...' : 'Camera Off'}
              </p>
              {isLocal && mediaState?.video && (
                <div className="mt-1">
                  <p className="text-gray-400 text-xs">Initializing video stream...</p>
                  {autoRefreshAttempts > 0 && (
                    <p className="text-yellow-400 text-xs">Auto-refresh attempts: {autoRefreshAttempts}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Status */}
        {!isLocal && (
          <div className="absolute top-2 right-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Diagnostic Panel */}
      {showDiagnostic && (
        <div className="absolute top-0 left-0 right-0 bottom-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-4xl w-full max-h-full overflow-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Video Stream Diagnostic</h2>
              <button
                onClick={() => setShowDiagnostic(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <VideoStreamDiagnostic
                localVideoRef={localVideoRef}
                localStream={localStream}
                autoRun={true}
                onDiagnosticComplete={(results) => {
                  console.log('[VideoCallWithDiagnostic] Diagnostic completed:', results);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {remoteParticipants.length === 0 ? (
          /* Empty State - Show local video with waiting message */
          <div className="h-full flex flex-col items-center justify-center p-4 space-y-6">
            {/* Local Video */}
            <div className="w-full max-w-2xl aspect-video">
              {renderVideoElement(null, true, "h-full", false)}
            </div>
            
            {/* Waiting Message with Debug Button */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-6 text-center max-w-md`}>
              <div className={`rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <VideoCameraSlashIcon className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Waiting for others to join
              </p>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Share the session link with participants
              </p>
              
              {/* Debug Button */}
              <button
                onClick={() => setShowDiagnostic(true)}
                className="flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <WrenchScrewdriverIcon className="w-4 h-4" />
                <span>Debug Video</span>
              </button>
              
              {/* Warning for video issues */}
              {localVideoRef.current && localStream && (
                localVideoRef.current.videoWidth === 0 || localVideoRef.current.videoHeight === 0
              ) && (
                <div className="mt-4 p-3 bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-300">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span className="text-sm">Video stream issue detected</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Video Session Layout */
          <div className="h-full relative">
            {/* Main Video (Featured Participant) */}
            <div className="h-full p-4">
              {mainParticipant ? (
                renderVideoElement(
                  remoteParticipants.find(p => p.address === mainParticipant) || null,
                  false,
                  "h-full",
                  true
                )
              ) : (
                renderVideoElement(null, true, "h-full", true)
              )}
            </div>

            {/* Picture-in-Picture Videos */}
            <div className="absolute top-4 right-4 space-y-2 z-10 max-h-[calc(100%-8rem)] overflow-y-auto">
              {/* Local Video PiP */}
              {isLocalMinimized && (
                <div className="w-40 sm:w-48 lg:w-64 aspect-video">
                  {renderVideoElement(null, true, "shadow-lg border-2 border-white", true)}
                </div>
              )}

              {/* Remote Videos PiP */}
              {remoteParticipants
                .filter(p => p.address !== mainParticipant)
                .slice(0, 3)
                .map((participant) => (
                  <div key={participant.address} className="w-40 sm:w-48 lg:w-64 aspect-video">
                    {renderVideoElement(participant, false, "shadow-lg border-2 border-white", true)}
                  </div>
                ))}
            </div>

            {/* Additional Participants Indicator */}
            {remoteParticipants.length > 4 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 text-white z-10">
                <span className="text-sm">
                  +{remoteParticipants.length - 4} more participants
                </span>
              </div>
            )}

            {/* Debug and View Toggle Buttons */}
            <div className="absolute bottom-4 left-4 z-10 flex space-x-2">
              <button
                onClick={() => {
                  if (mainParticipant) {
                    setMainParticipant('');
                    setIsLocalMinimized(false);
                  } else if (remoteParticipants.length > 0) {
                    setMainParticipant(remoteParticipants[0].address);
                    setIsLocalMinimized(true);
                  }
                }}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-lg p-3 transition-all duration-200 flex items-center space-x-2"
                title="Toggle main view"
              >
                <ArrowsPointingInIcon className="w-5 h-5" />
                <span className="text-sm hidden sm:inline">
                  {mainParticipant ? 'Show Your Camera' : 'Show Remote Camera'}
                </span>
              </button>
              
              <button
                onClick={() => setShowDiagnostic(true)}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-lg p-3 transition-all duration-200"
                title="Open video diagnostic"
              >
                <WrenchScrewdriverIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallWithDiagnostic;