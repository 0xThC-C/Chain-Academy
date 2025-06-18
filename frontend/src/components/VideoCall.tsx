import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { validateMediaStream } from '../utils/webrtcSecurity';
import { MediaStreamValidation, SecurityEvent, WebRTCSecurityError } from '../types/webrtc';
import {
  VideoCameraSlashIcon,
  MicrophoneIcon,
  NoSymbolIcon as MicrophoneSlashIcon,
  ComputerDesktopIcon,
  ArrowsPointingOutIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

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

interface VideoCallProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  currentUser: string;
  localStream?: MediaStream | null;
  onForceRefreshVideo?: () => void;
  onSecurityEvent?: (event: SecurityEvent) => void;
  securityEnabled?: boolean;
}

const VideoCall: React.FC<VideoCallProps> = ({
  localVideoRef,
  remoteStreams,
  participants,
  currentUser,
  localStream,
  onForceRefreshVideo,
  onSecurityEvent,
  securityEnabled = true
}) => {
  const { isDarkMode } = useTheme();
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localVideoWrapperRef = useRef<HTMLDivElement>(null);
  const remoteVideoWrapperRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [mainParticipant, setMainParticipant] = useState<string>('');
  const [isLocalMinimized, setIsLocalMinimized] = useState(false);
  
  // Video diagnostic states
  const [showDebugMode, setShowDebugMode] = useState(false);
  const [videoHealthData, setVideoHealthData] = useState<any>(null);
  const [autoRecoveryAttempts, setAutoRecoveryAttempts] = useState(0);
  const [securityValidation, setSecurityValidation] = useState<MediaStreamValidation | null>(null);
  const [streamSecurityStatus, setStreamSecurityStatus] = useState<'secure' | 'warning' | 'error'>('secure');

  // Security validation for media streams
  const validateStreamSecurity = useCallback(async (stream: MediaStream | null) => {
    if (!stream || !securityEnabled) {
      setSecurityValidation(null);
      setStreamSecurityStatus('secure');
      return;
    }
    
    try {
      const validation = validateMediaStream(stream);
      // Convert SecurityValidationResult to MediaStreamValidation
      const mediaValidation: MediaStreamValidation = {
        isValid: validation.isValid,
        trackCount: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        issues: validation.errors.concat(validation.warnings),
        recommendations: []
      };
      setSecurityValidation(mediaValidation);
      
      if (validation.errors.length === 0 && validation.warnings.length === 0) {
        setStreamSecurityStatus('secure');
      } else if (validation.warnings.some(warning => warning.includes('Multiple') || warning.includes('Unusual'))) {
        setStreamSecurityStatus('warning');
        onSecurityEvent?.({
          type: WebRTCSecurityError.MEDIA_VALIDATION_FAILED,
          severity: 'medium',
          message: `Media stream security warning: ${validation.warnings.join(', ')}`,
          timestamp: Date.now(),
          userAddress: currentUser
        });
      } else {
        setStreamSecurityStatus('error');
        onSecurityEvent?.({
          type: WebRTCSecurityError.MEDIA_VALIDATION_FAILED,
          severity: 'high',
          message: `Media stream security error: ${validation.errors.join(', ')}`,
          timestamp: Date.now(),
          userAddress: currentUser
        });
      }
    } catch (error) {
      console.error('Security validation failed:', error);
      setStreamSecurityStatus('error');
    }
  }, [securityEnabled, onSecurityEvent, currentUser]);

  // ULTRA ROBUST VIDEO DIAGNOSTIC SYSTEM
  const runVideoStreamDiagnostic = useCallback(async () => {
    console.log('🔍 RUNNING ULTRA VIDEO DIAGNOSTIC...');
    
    const diagnostic = {
      timestamp: new Date().toISOString(),
      getUserMediaStatus: 'unknown',
      streamStatus: 'unknown',
      videoElementStatus: 'unknown',
      permissionsStatus: 'unknown',
      compatibilityStatus: 'unknown',
      videoTrackStatus: 'unknown',
      playbackStatus: 'unknown',
      issues: [] as string[],
      recommendations: [] as string[]
    };

    try {
      // 1. Check getUserMedia permissions
      console.log('📋 Checking getUserMedia permissions...');
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        diagnostic.permissionsStatus = permissions.state;
        console.log(`Camera permission: ${permissions.state}`);
        
        if (permissions.state === 'denied') {
          diagnostic.issues.push('Camera permission denied');
          diagnostic.recommendations.push('Enable camera permission in browser settings');
        }
      } catch (permError) {
        console.warn('Permission query failed:', permError);
        diagnostic.permissionsStatus = 'error';
      }

      // 2. Test getUserMedia functionality
      console.log('📹 Testing getUserMedia capability...');
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: false 
        });
        diagnostic.getUserMediaStatus = 'working';
        console.log('✅ getUserMedia test successful');
        
        // Check video tracks
        const videoTracks = testStream.getVideoTracks();
        diagnostic.videoTrackStatus = videoTracks.length > 0 ? 'active' : 'missing';
        
        if (videoTracks.length > 0) {
          const track = videoTracks[0];
          console.log('Video track details:', {
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted,
            settings: track.getSettings()
          });
          
          if (track.readyState !== 'live') {
            diagnostic.issues.push('Video track not live');
          }
          if (track.muted) {
            diagnostic.issues.push('Video track muted');
          }
        }
        
        // Clean up test stream
        testStream.getTracks().forEach(track => track.stop());
      } catch (mediaError) {
        diagnostic.getUserMediaStatus = 'failed';
        diagnostic.issues.push(`getUserMedia failed: ${mediaError instanceof Error ? mediaError.message : String(mediaError)}`);
        console.error('❌ getUserMedia test failed:', mediaError);
      }

      // 3. Check existing local stream
      console.log('🔄 Checking existing local stream...');
      if (localStream) {
        diagnostic.streamStatus = 'present';
        const videoTracks = localStream.getVideoTracks();
        
        console.log('Local stream analysis:', {
          id: localStream.id,
          active: localStream.active,
          videoTrackCount: videoTracks.length,
          videoTrackDetails: videoTracks.map(track => ({
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted
          }))
        });
        
        if (!localStream.active) {
          diagnostic.issues.push('Local stream inactive');
        }
        if (videoTracks.length === 0) {
          diagnostic.issues.push('No video tracks in local stream');
        }
      } else {
        diagnostic.streamStatus = 'missing';
        diagnostic.issues.push('Local stream not available');
      }

      // 4. Check video element
      console.log('📺 Checking video element...');
      if (localVideoRef.current) {
        const videoEl = localVideoRef.current;
        diagnostic.videoElementStatus = 'present';
        
        const videoElData = {
          srcObject: !!videoEl.srcObject,
          readyState: videoEl.readyState,
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight,
          paused: videoEl.paused,
          currentTime: videoEl.currentTime,
          autoplay: videoEl.autoplay,
          muted: videoEl.muted,
          playsInline: videoEl.playsInline
        };
        
        console.log('Video element analysis:', videoElData);
        
        if (!videoEl.srcObject) {
          diagnostic.issues.push('Video element has no srcObject');
          diagnostic.recommendations.push('Reassign stream to video element');
        }
        if (videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
          diagnostic.issues.push('Video element has zero dimensions');
          diagnostic.recommendations.push('Force reload video element');
        }
        if (videoEl.paused && videoEl.srcObject) {
          diagnostic.issues.push('Video element is paused');
          diagnostic.recommendations.push('Call video.play()');
        }
        
        diagnostic.playbackStatus = videoEl.paused ? 'paused' : 'playing';
      } else {
        diagnostic.videoElementStatus = 'missing';
        diagnostic.issues.push('Video element ref not available');
      }

      // 5. Browser compatibility check
      console.log('🌐 Checking browser compatibility...');
      diagnostic.compatibilityStatus = 'compatible';
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        diagnostic.compatibilityStatus = 'incompatible';
        diagnostic.issues.push('Browser does not support getUserMedia');
      }

      console.log('🔍 DIAGNOSTIC COMPLETE:', diagnostic);
      setVideoHealthData(diagnostic);
      
      // Run security validation as part of diagnostic
      if (securityEnabled) {
        await validateStreamSecurity(localStream || null);
      }
      
      return diagnostic;
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      diagnostic.issues.push(`Diagnostic error: ${error instanceof Error ? error.message : String(error)}`);
      setVideoHealthData(diagnostic);
      return diagnostic;
    }
  }, [localStream, localVideoRef, securityEnabled, validateStreamSecurity]);

  // ULTRA FORCE REFRESH FUNCTION
  const forceRefreshVideoStream = useCallback(async () => {
    console.log('🔄 FORCE REFRESHING VIDEO STREAM...');
    
    try {
      const videoEl = localVideoRef.current;
      if (!videoEl) {
        console.error('❌ No video element available for refresh');
        return false;
      }

      // Step 1: Clear existing stream
      console.log('1️⃣ Clearing existing video element...');
      videoEl.srcObject = null;
      videoEl.load();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 2: Reassign stream if available
      if (localStream) {
        console.log('2️⃣ Reassigning local stream...');
        videoEl.srcObject = localStream;
        videoEl.load();
        
        // Step 3: Configure video element
        console.log('3️⃣ Configuring video element...');
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.autoplay = true;
        
        // Step 4: Force play with multiple attempts
        console.log('4️⃣ Attempting to play video...');
        const maxAttempts = 5;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            await videoEl.play();
            console.log(`✅ Video playing after ${attempt + 1} attempts`);
            break;
          } catch (playError) {
            console.warn(`❌ Play attempt ${attempt + 1} failed:`, playError);
            if (attempt < maxAttempts - 1) {
              await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
            }
          }
        }
        
        // Step 5: Verify success
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('5️⃣ Verifying refresh success...');
        
        const success = videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && !videoEl.paused;
        console.log(success ? '✅ REFRESH SUCCESSFUL!' : '❌ REFRESH FAILED');
        
        return success;
      } else {
        console.log('🔄 No local stream - triggering external refresh...');
        if (onForceRefreshVideo) {
          onForceRefreshVideo();
        }
        return false;
      }
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      return false;
    }
  }, [localStream, localVideoRef, onForceRefreshVideo]);

  // AUTO RECOVERY SYSTEM
  const performAutoRecovery = useCallback(async () => {
    if (autoRecoveryAttempts >= 3) {
      console.log('⚠️ Max auto-recovery attempts reached');
      return;
    }

    console.log(`🚑 PERFORMING AUTO RECOVERY (attempt ${autoRecoveryAttempts + 1}/3)...`);
    setAutoRecoveryAttempts(prev => prev + 1);
    
    const success = await forceRefreshVideoStream();
    if (success) {
      console.log('✅ Auto-recovery successful!');
      setAutoRecoveryAttempts(0);
    } else {
      console.log('❌ Auto-recovery failed');
    }
  }, [autoRecoveryAttempts, forceRefreshVideoStream]);

  // CONTINUOUS HEALTH MONITORING
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      if (!showDebugMode) return;
      
      const videoEl = localVideoRef.current;
      if (videoEl && localStream) {
        const isHealthy = videoEl.videoWidth > 0 && videoEl.videoHeight > 0 && videoEl.srcObject;
        
        if (!isHealthy && autoRecoveryAttempts < 3) {
          console.log('🔴 Video health issue detected - triggering auto-recovery');
          performAutoRecovery();
        }
      }
    }, 3000);

    return () => clearInterval(healthCheckInterval);
  }, [showDebugMode, localVideoRef, localStream, autoRecoveryAttempts, performAutoRecovery]);

  // Monitor local stream security
  useEffect(() => {
    if (securityEnabled && localStream) {
      validateStreamSecurity(localStream);
    }
  }, [localStream, securityEnabled, validateStreamSecurity]);

  // Update remote video elements when streams change with security validation
  useEffect(() => {
    remoteStreams.forEach(async (stream, participantAddress) => {
      const videoElement = remoteVideoRefs.current.get(participantAddress);
      if (videoElement && videoElement.srcObject !== stream) {
        // Security: Validate remote stream before using
        if (securityEnabled) {
          const validation = validateMediaStream(stream);
          if (!validation.isValid) {
            console.warn(`Security validation failed for remote stream from ${participantAddress}:`, validation.errors);
            onSecurityEvent?.({
              type: WebRTCSecurityError.MEDIA_VALIDATION_FAILED,
              severity: 'high',
              message: `Remote stream validation failed: ${validation.errors.join(', ')}`,
              timestamp: Date.now(),
              userAddress: participantAddress
            });
            return; // Don't use invalid stream
          }
        }
        
        videoElement.srcObject = stream;
        // Ensure remote video plays when stream is updated
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          playPromise.catch(playError => {
            console.warn(`Error playing remote video for ${participantAddress}:`, playError);
          });
        }
      }
    });
  }, [remoteStreams, securityEnabled, onSecurityEvent]);

  const getParticipantMediaState = (address: string): MediaState | null => {
    const participant = participants.find(p => p.address === address);
    return participant?.mediaState || null;
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const remoteParticipants = participants.filter(p => p.address !== currentUser);
  
  // ✅ PRODUCTION MODE - Real 2-participant functionality implemented
  
  // No mirroring needed - camera comes naturally mirrored from browser
  useEffect(() => {
    if (!document.getElementById('video-mirror-styles')) {
      const style = document.createElement('style');
      style.id = 'video-mirror-styles';
      style.textContent = `
        /* No transforms needed - natural camera behavior is correct */
        .video-wrapper {
          transform: none;
        }
        .video-wrapper:fullscreen {
          transform: none;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Use real participants
  const effectiveRemoteParticipants = remoteParticipants;
  
  const localParticipant = participants.find(p => p.address === currentUser);

  // Main participant selection logic
  useEffect(() => {
    // Set first remote participant as main when they join
    if (!mainParticipant && effectiveRemoteParticipants.length > 0) {
      setMainParticipant(effectiveRemoteParticipants[0].address);
    }
    // Clear main participant when no remote participants
    if (effectiveRemoteParticipants.length === 0) {
      setMainParticipant('');
    }
  }, [effectiveRemoteParticipants.length, mainParticipant]);

  // Listen for toggle view events from MediaControls
  useEffect(() => {
    const handleToggleView = () => {
      // 2-participant mode: Toggle between local and remote
      if (effectiveRemoteParticipants.length === 1) {
        if (!mainParticipant) {
          // Local is main, switch to remote main
          setMainParticipant(effectiveRemoteParticipants[0].address);
          setIsLocalMinimized(true);
        } else {
          // Remote is main, switch to local main
          setMainParticipant('');
          setIsLocalMinimized(false);
        }
      }
    };

    window.addEventListener('toggleVideoView', handleToggleView);
    return () => window.removeEventListener('toggleVideoView', handleToggleView);
  }, [effectiveRemoteParticipants, mainParticipant]);

  const handleSwitchMain = (participantAddress: string) => {
    if (effectiveRemoteParticipants.length === 1) {
      // 2-participant mode: Toggle between local and remote
      if (participantAddress === currentUser) {
        // Show local main, remote in PiP
        setMainParticipant('');
        setIsLocalMinimized(false);
      } else {
        // Show remote main, local in PiP
        setMainParticipant(participantAddress);
        setIsLocalMinimized(true);
      }
    } else {
      // Multi-participant mode: Standard logic
      if (participantAddress === currentUser) {
        setMainParticipant('');
        setIsLocalMinimized(false);
      } else {
        setMainParticipant(participantAddress);
        setIsLocalMinimized(true);
      }
    }
  };

  const handleFullscreen = (wrapperElement: HTMLDivElement | null) => {
    if (!wrapperElement) return;
    
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        wrapperElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const renderVideoElement = (
    participant: Participant | null, 
    isLocal: boolean = false, 
    className: string = "",
    showControls: boolean = true,
    isMainVideo: boolean = false
  ) => {
    const mediaState = isLocal ? localParticipant?.mediaState : getParticipantMediaState(participant?.address || '');
    const address = isLocal ? currentUser : participant?.address || '';
    
    
    // Regular video rendering logic
    const effectiveStream = isLocal ? localStream : remoteStreams.get(address);
    
    return (
      <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
        <div 
          ref={isLocal ? localVideoWrapperRef : (el) => {
            if (el && participant) {
              remoteVideoWrapperRefs.current.set(participant.address, el);
            }
          }}
          className={`video-wrapper w-full h-full`}
        >
          <video
          ref={isLocal ? localVideoRef : (el) => {
            if (el && participant) {
              console.log(`Setting up video element for ${participant.address}`);
              
              // Set up remote participant video
              remoteVideoRefs.current.set(participant.address, el);
              const stream = effectiveStream;
              if (stream && el.srcObject !== stream) {
                console.log(`Setting remote stream for ${participant.address}:`, {
                  streamId: stream.id,
                  active: stream.active,
                  videoTracks: stream.getVideoTracks().length,
                  audioTracks: stream.getAudioTracks().length
                });
                
                try {
                  el.srcObject = stream;
                  el.load(); // Force reload
                  
                  // Ensure remote video plays
                  setTimeout(() => {
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(playError => {
                        console.warn('Error playing remote video:', playError);
                      });
                    }
                  }, 100);
                } catch (error) {
                  console.error('Error setting remote video stream:', error);
                }
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
            minWidth: '100%',
            minHeight: '100%'
          }}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            console.log(`Video metadata loaded for ${isLocal ? 'local' : 'remote'} video:`, {
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
            console.log(`Video can play for ${isLocal ? 'local' : 'remote'} video:`, {
              readyState: video.readyState,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              srcObject: !!video.srcObject
            });
            
            // Force play if paused
            if (video.paused) {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  console.log(`Successfully auto-played ${isLocal ? 'local' : 'remote'} video from canPlay event`);
                }).catch(error => {
                  console.warn(`Error auto-playing ${isLocal ? 'local' : 'remote'} video from canPlay:`, error);
                });
              }
            }
          }}
          onError={(e) => {
            const video = e.target as HTMLVideoElement;
            console.error(`Video error for ${isLocal ? 'local' : 'remote'} video:`, {
              error: video.error,
              networkState: video.networkState,
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
                {isLocal ? `You (${formatAddress(currentUser)})` : formatAddress(address)}
              </span>
            </div>
            
            {/* Screen Share Indicator */}
            {mediaState?.screenShare && (
              <div className="bg-red-500 rounded-lg px-1 py-1 sm:px-2 sm:py-1 flex items-center space-x-1">
                <ComputerDesktopIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                <span className="text-white text-xs hidden sm:inline">Sharing</span>
              </div>
            )}
          </div>

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
            </div>

            {/* Video Debug Controls - Only show for local video */}
            {isLocal && (
              <div className="flex items-center space-x-1">
                {/* Security Status Indicator */}
                {securityEnabled && (
                  <div 
                    className={`rounded p-1 transition-all duration-200 ${
                      streamSecurityStatus === 'secure' 
                        ? 'bg-green-500 bg-opacity-80'
                        : streamSecurityStatus === 'warning'
                        ? 'bg-yellow-500 bg-opacity-80'
                        : 'bg-red-500 bg-opacity-80'
                    }`}
                    title={`Security status: ${streamSecurityStatus}${securityValidation ? ` - ${securityValidation.issues.length} issues` : ''}`}
                  >
                    {streamSecurityStatus === 'secure' ? (
                      <ShieldCheckIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    ) : (
                      <ShieldExclamationIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    )}
                  </div>
                )}
                
                {/* Debug Mode Toggle */}
                <button
                  onClick={() => setShowDebugMode(!showDebugMode)}
                  className={`rounded p-1 transition-all duration-200 ${
                    showDebugMode 
                      ? 'bg-blue-500 bg-opacity-80' 
                      : 'bg-black bg-opacity-50 hover:bg-opacity-70'
                  }`}
                  title="Toggle debug mode"
                >
                  <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>

                {/* Quick Diagnostic */}
                <button
                  onClick={runVideoStreamDiagnostic}
                  className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded p-1 transition-all duration-200"
                  title="Run video diagnostic"
                >
                  <WrenchScrewdriverIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>

                {/* Force Refresh */}
                <button
                  onClick={forceRefreshVideoStream}
                  className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded p-1 transition-all duration-200"
                  title="Force refresh video"
                >
                  <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </button>

                {/* Health Status Indicator */}
                {videoHealthData && videoHealthData.issues.length > 0 && (
                  <div className="bg-red-500 bg-opacity-80 rounded p-1" title={`${videoHealthData.issues.length} issues detected`}>
                    <ExclamationTriangleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                )}

                {/* Auto-recovery attempts indicator */}
                {autoRecoveryAttempts > 0 && (
                  <div className="bg-yellow-500 bg-opacity-80 rounded px-1 py-0.5">
                    <span className="text-white text-xs font-bold">{autoRecoveryAttempts}</span>
                  </div>
                )}
              </div>
            )}

            {/* Video Control Button - Different for main vs PiP */}
            {showControls && (
              <>
                {isMainVideo ? (
                  /* Fullscreen button for main video */
                  <button
                    onClick={() => {
                      const wrapperElement = isLocal ? localVideoWrapperRef.current : remoteVideoWrapperRefs.current.get(address) || null;
                      handleFullscreen(wrapperElement);
                    }}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-1 sm:p-2 transition-all duration-200"
                    title="Fullscreen"
                  >
                    <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                ) : (
                  /* Switch to main button for PiP video */
                  <button
                    onClick={() => handleSwitchMain(address)}
                    className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg p-1 sm:p-2 transition-all duration-200"
                    title="Switch to main view"
                  >
                    <ArrowsPointingOutIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Debug Information Overlay - Only show for local video in debug mode */}
        {isLocal && showDebugMode && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-80 rounded-lg p-2 text-white text-xs max-w-xs">
            <div className="font-bold mb-1">🔍 Video Stream Debug</div>
            {localStream && localVideoRef.current && (
              <div className="space-y-1">
                <div>Stream: {localStream.active ? '✅ Active' : '❌ Inactive'}</div>
                <div>Video: {localVideoRef.current.videoWidth}x{localVideoRef.current.videoHeight}</div>
                <div>Playing: {localVideoRef.current.paused ? '❌ Paused' : '✅ Playing'}</div>
                <div>Time: {localVideoRef.current.currentTime.toFixed(2)}s</div>
                <div>Tracks: {localStream.getVideoTracks().length} video, {localStream.getAudioTracks().length} audio</div>
                
                {/* Security Information */}
                {securityEnabled && (
                  <>
                    <div className="border-t border-gray-600 my-1 pt-1">
                      <div className="font-bold text-xs">🔒 Security Status</div>
                      <div className={`text-xs ${
                        streamSecurityStatus === 'secure' ? 'text-green-400' :
                        streamSecurityStatus === 'warning' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        Status: {streamSecurityStatus.toUpperCase()}
                      </div>
                      {securityValidation && (
                        <>
                          <div className="text-xs">Valid: {securityValidation.isValid ? '✅' : '❌'}</div>
                          <div className="text-xs">Tracks: {securityValidation.trackCount}</div>
                          {securityValidation.issues.length > 0 && (
                            <div className="text-red-400 text-xs">
                              Issues: {securityValidation.issues.length}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
                
                {videoHealthData && videoHealthData.issues.length > 0 && (
                  <div className="text-red-400">
                    Issues: {videoHealthData.issues.length}
                  </div>
                )}
                {autoRecoveryAttempts > 0 && (
                  <div className="text-yellow-400">
                    Recovery: {autoRecoveryAttempts}/3
                  </div>
                )}
              </div>
            )}
            {!localStream && (
              <div className="text-red-400">❌ No Local Stream</div>
            )}
          </div>
        )}

        {/* No Video Placeholder - only show when video is explicitly disabled */}
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
                <p className="text-gray-400 text-xs mt-1">Initializing video stream...</p>
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

  // Debug logging for 2-participant mode
  console.log('📹 Video Call State:', {
    remoteParticipants: effectiveRemoteParticipants.length,
    mainParticipant,
    isLocalMinimized,
    mode: effectiveRemoteParticipants.length === 1 ? '2-participant' : 'multi-participant'
  });

  return (
    <div className="h-full flex flex-col relative">
      {/* Main Video Area */}
      <div className="flex-1 relative">
        {effectiveRemoteParticipants.length === 0 ? (
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
                <VideoCameraSlashIcon className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
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
          /* Video Session Layout */
          <div className="h-full relative">
            {/* Main Video (Featured Participant) - Centered with margins for popups */}
            <div className="h-full flex items-center justify-center px-80 py-8">
              <div className="w-full max-w-3xl aspect-video">
                {effectiveRemoteParticipants.length === 1 ? (
                  /* 2-participant mode: Optimized layout */
                  !mainParticipant ? (
                    /* Local camera is main */
                    renderVideoElement(null, true, "h-full", true, true)
                  ) : (
                    /* Remote participant is main */
                    renderVideoElement(effectiveRemoteParticipants[0], false, "h-full", true, true)
                  )
                ) : (
                  /* Multi-participant mode: Standard logic */
                  mainParticipant ? (
                    renderVideoElement(
                      effectiveRemoteParticipants.find(p => p.address === mainParticipant) || null,
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
              {effectiveRemoteParticipants.length === 1 ? (
                /* 2-participant mode: Always show exactly one PiP */
                !mainParticipant ? (
                  /* Local is main, show remote in PiP */
                  <div className="w-40 sm:w-48 lg:w-64 aspect-video">
                    {renderVideoElement(effectiveRemoteParticipants[0], false, "shadow-lg border-2 border-white", true, false)}
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
                  {effectiveRemoteParticipants
                    .filter(p => p.address !== mainParticipant)
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
            {effectiveRemoteParticipants.length > 4 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded-lg p-3 text-white z-10">
                <span className="text-sm">
                  +{effectiveRemoteParticipants.length - 4} more participants
                </span>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;