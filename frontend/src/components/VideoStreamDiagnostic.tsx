import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  PlayIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: number;
}

interface VideoStreamDiagnosticProps {
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  localStream?: MediaStream | null;
  onDiagnosticComplete?: (results: DiagnosticResult[]) => void;
  autoRun?: boolean;
}

const VideoStreamDiagnostic: React.FC<VideoStreamDiagnosticProps> = ({
  localVideoRef,
  localStream,
  onDiagnosticComplete,
  autoRun = false
}) => {
  const { isDarkMode } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const diagnosticStreamRef = useRef<MediaStream | null>(null);

  const addResult = useCallback((result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  }, []);

  const updateResult = useCallback((testName: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(result => 
      result.test === testName 
        ? { ...result, ...updates, timestamp: Date.now() }
        : result
    ));
  }, []);

  const logDebug = useCallback((message: string, data?: any) => {
    console.log(`[VideoStreamDiagnostic] ${message}`, data || '');
  }, []);

  // Test 1: getUserMedia Permissions and Capabilities
  const testGetUserMedia = useCallback(async (): Promise<void> => {
    const testName = 'getUserMedia Permissions';
    setCurrentTest(testName);
    
    addResult({
      test: testName,
      status: 'pending',
      message: 'Testing camera and microphone access...',
      timestamp: Date.now()
    });

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      logDebug('Testing getUserMedia with various constraints...');

      // Test with different constraint combinations
      const constraints = [
        { video: true, audio: true },
        { video: { width: 640, height: 480 }, audio: true },
        { video: { width: 1280, height: 720 }, audio: true }
      ];

      let lastError = null;
      let successfulStream = null;

      for (const constraint of constraints) {
        try {
          logDebug('Trying constraint:', constraint);
          const stream = await navigator.mediaDevices.getUserMedia(constraint);
          
          logDebug('Successfully got stream with constraint:', {
            constraint,
            streamId: stream.id,
            active: stream.active,
            videoTracks: stream.getVideoTracks().map(track => ({
              id: track.id,
              label: track.label,
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted,
              settings: track.getSettings()
            })),
            audioTracks: stream.getAudioTracks().map(track => ({
              id: track.id,
              label: track.label,
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted,
              settings: track.getSettings()
            }))
          });

          successfulStream = stream;
          diagnosticStreamRef.current = stream;
          break;
        } catch (error) {
          logDebug('Constraint failed:', { constraint, error });
          lastError = error;
        }
      }

      if (!successfulStream) {
        throw lastError || new Error('All constraint attempts failed');
      }

      updateResult(testName, {
        status: 'pass',
        message: 'Camera and microphone access granted successfully',
        details: {
          streamId: successfulStream.id,
          active: successfulStream.active,
          videoTracks: successfulStream.getVideoTracks().length,
          audioTracks: successfulStream.getAudioTracks().length,
          videoTrackSettings: successfulStream.getVideoTracks()[0]?.getSettings(),
          audioTrackSettings: successfulStream.getAudioTracks()[0]?.getSettings()
        }
      });

    } catch (error: any) {
      logDebug('getUserMedia failed:', error);
      
      let errorMessage = 'Failed to access camera/microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission denied - user blocked camera/microphone access';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone devices found';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone already in use by another application';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints could not be satisfied';
      }

      updateResult(testName, {
        status: 'fail',
        message: errorMessage,
        details: {
          errorName: error.name,
          errorMessage: error.message,
          constraintName: error.constraintName
        }
      });
    }
  }, [addResult, updateResult, logDebug]);

  // Test 2: Video Element Creation and Configuration
  const testVideoElementSetup = useCallback(async (): Promise<void> => {
    const testName = 'Video Element Setup';
    setCurrentTest(testName);
    
    addResult({
      test: testName,
      status: 'pending',
      message: 'Testing video element configuration...',
      timestamp: Date.now()
    });

    try {
      const videoElement = testVideoRef.current;
      if (!videoElement) {
        throw new Error('Test video element not available');
      }

      logDebug('Video element initial state:', {
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        currentTime: videoElement.currentTime,
        duration: videoElement.duration,
        paused: videoElement.paused,
        muted: videoElement.muted,
        autoplay: videoElement.autoplay,
        playsInline: videoElement.playsInline,
        controls: videoElement.controls,
        srcObject: !!videoElement.srcObject
      });

      // Configure video element with optimal settings
      videoElement.muted = true;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.controls = false;
      videoElement.style.backgroundColor = 'transparent';

      updateResult(testName, {
        status: 'pass',
        message: 'Video element configured successfully',
        details: {
          element: 'available',
          muted: videoElement.muted,
          autoplay: videoElement.autoplay,
          playsInline: videoElement.playsInline,
          controls: videoElement.controls
        }
      });

    } catch (error: any) {
      logDebug('Video element setup failed:', error);
      updateResult(testName, {
        status: 'fail',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }, [addResult, updateResult, logDebug]);

  // Test 3: Stream-to-Video Binding
  const testStreamVideoBinding = useCallback(async (): Promise<void> => {
    const testName = 'Stream-Video Binding';
    setCurrentTest(testName);
    
    addResult({
      test: testName,
      status: 'pending',
      message: 'Testing stream binding to video element...',
      timestamp: Date.now()
    });

    try {
      const videoElement = testVideoRef.current;
      const stream = diagnosticStreamRef.current;

      if (!videoElement) {
        throw new Error('Video element not available');
      }

      if (!stream) {
        throw new Error('No stream available for binding');
      }

      logDebug('Binding stream to video element:', {
        streamId: stream.id,
        streamActive: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoElement: !!videoElement
      });

      // Clear any existing srcObject
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
        videoElement.load();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Bind stream to video element
      videoElement.srcObject = stream;
      videoElement.load();

      // Wait for metadata to load
      const metadataPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for video metadata'));
        }, 5000);

        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          resolve();
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Check if metadata is already loaded
        if (videoElement.readyState >= 1) {
          clearTimeout(timeout);
          resolve();
        }
      });

      await metadataPromise;

      logDebug('Video metadata loaded:', {
        readyState: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        duration: videoElement.duration,
        currentTime: videoElement.currentTime
      });

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        throw new Error('Video has invalid dimensions (0x0)');
      }

      updateResult(testName, {
        status: 'pass',
        message: 'Stream successfully bound to video element',
        details: {
          streamId: stream.id,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          readyState: videoElement.readyState,
          duration: videoElement.duration
        }
      });

    } catch (error: any) {
      logDebug('Stream-video binding failed:', error);
      updateResult(testName, {
        status: 'fail',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }, [addResult, updateResult, logDebug]);

  // Test 4: Video Playback
  const testVideoPlayback = useCallback(async (): Promise<void> => {
    const testName = 'Video Playback';
    setCurrentTest(testName);
    
    addResult({
      test: testName,
      status: 'pending',
      message: 'Testing video playback...',
      timestamp: Date.now()
    });

    try {
      const videoElement = testVideoRef.current;
      if (!videoElement) {
        throw new Error('Video element not available');
      }

      logDebug('Starting video playback test:', {
        paused: videoElement.paused,
        readyState: videoElement.readyState,
        currentTime: videoElement.currentTime,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight
      });

      // Attempt to play video
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      // Wait a moment for playback to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      logDebug('Video playback status:', {
        paused: videoElement.paused,
        currentTime: videoElement.currentTime,
        readyState: videoElement.readyState,
        played: videoElement.played.length > 0
      });

      if (videoElement.paused) {
        throw new Error('Video failed to start playing');
      }

      if (videoElement.currentTime === 0) {
        throw new Error('Video time not advancing');
      }

      updateResult(testName, {
        status: 'pass',
        message: 'Video playback working correctly',
        details: {
          paused: videoElement.paused,
          currentTime: videoElement.currentTime,
          readyState: videoElement.readyState,
          playedRanges: videoElement.played.length
        }
      });

    } catch (error: any) {
      logDebug('Video playback failed:', error);
      updateResult(testName, {
        status: 'fail',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }, [addResult, updateResult, logDebug]);

  // Test 5: Existing Stream Analysis (if provided)
  const testExistingStream = useCallback(async (): Promise<void> => {
    const testName = 'Existing Stream Analysis';
    setCurrentTest(testName);
    
    if (!localStream) {
      addResult({
        test: testName,
        status: 'warning',
        message: 'No existing stream provided for analysis',
        timestamp: Date.now()
      });
      return;
    }

    addResult({
      test: testName,
      status: 'pending',
      message: 'Analyzing existing stream...',
      timestamp: Date.now()
    });

    try {
      logDebug('Analyzing existing stream:', {
        streamId: localStream.id,
        active: localStream.active,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length
      });

      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();

      const videoTrackDetails = videoTracks.map(track => ({
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        settings: track.getSettings(),
        constraints: track.getConstraints()
      }));

      const audioTrackDetails = audioTracks.map(track => ({
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        settings: track.getSettings(),
        constraints: track.getConstraints()
      }));

      // Check for issues
      const issues = [];
      if (!localStream.active) {
        issues.push('Stream is not active');
      }
      if (videoTracks.length === 0) {
        issues.push('No video tracks found');
      }
      if (audioTracks.length === 0) {
        issues.push('No audio tracks found');
      }
      
      videoTracks.forEach((track, index) => {
        if (!track.enabled) {
          issues.push(`Video track ${index} is disabled`);
        }
        if (track.readyState !== 'live') {
          issues.push(`Video track ${index} is not live (${track.readyState})`);
        }
        if (track.muted) {
          issues.push(`Video track ${index} is muted`);
        }
      });

      const status = issues.length === 0 ? 'pass' : 'warning';
      const message = issues.length === 0 
        ? 'Existing stream appears healthy'
        : `Stream has ${issues.length} potential issue(s)`;

      updateResult(testName, {
        status,
        message,
        details: {
          streamId: localStream.id,
          active: localStream.active,
          videoTracks: videoTrackDetails,
          audioTracks: audioTrackDetails,
          issues
        }
      });

    } catch (error: any) {
      logDebug('Existing stream analysis failed:', error);
      updateResult(testName, {
        status: 'fail',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }, [localStream, addResult, updateResult, logDebug]);

  // Test 6: Existing Video Element Analysis (if provided)
  const testExistingVideoElement = useCallback(async (): Promise<void> => {
    const testName = 'Existing Video Element Analysis';
    setCurrentTest(testName);
    
    if (!localVideoRef?.current) {
      addResult({
        test: testName,
        status: 'warning',
        message: 'No existing video element provided for analysis',
        timestamp: Date.now()
      });
      return;
    }

    addResult({
      test: testName,
      status: 'pending',
      message: 'Analyzing existing video element...',
      timestamp: Date.now()
    });

    try {
      const videoElement = localVideoRef.current;
      
      logDebug('Analyzing existing video element:', {
        element: !!videoElement,
        srcObject: !!videoElement.srcObject,
        readyState: videoElement.readyState,
        networkState: videoElement.networkState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        currentTime: videoElement.currentTime,
        duration: videoElement.duration,
        paused: videoElement.paused,
        muted: videoElement.muted,
        autoplay: videoElement.autoplay,
        playsInline: videoElement.playsInline,
        controls: videoElement.controls
      });

      const issues = [];
      
      if (!videoElement.srcObject) {
        issues.push('No srcObject assigned to video element');
      }
      if (videoElement.readyState === 0) {
        issues.push('Video element has no data (HAVE_NOTHING)');
      }
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        issues.push('Video element has invalid dimensions');
      }
      if (videoElement.paused && videoElement.srcObject) {
        issues.push('Video element is paused despite having a stream');
      }
      if (!videoElement.autoplay) {
        issues.push('Video element autoplay is disabled');
      }
      if (!videoElement.playsInline) {
        issues.push('Video element playsInline is disabled');
      }

      const status = issues.length === 0 ? 'pass' : 'warning';
      const message = issues.length === 0 
        ? 'Existing video element appears properly configured'
        : `Video element has ${issues.length} potential issue(s)`;

      updateResult(testName, {
        status,
        message,
        details: {
          hasSrcObject: !!videoElement.srcObject,
          readyState: videoElement.readyState,
          networkState: videoElement.networkState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          currentTime: videoElement.currentTime,
          paused: videoElement.paused,
          muted: videoElement.muted,
          autoplay: videoElement.autoplay,
          playsInline: videoElement.playsInline,
          issues
        }
      });

    } catch (error: any) {
      logDebug('Existing video element analysis failed:', error);
      updateResult(testName, {
        status: 'fail',
        message: error.message,
        details: { error: error.toString() }
      });
    }
  }, [localVideoRef, addResult, updateResult, logDebug]);

  // Force refresh function for existing video
  const forceRefreshExistingVideo = useCallback(async (): Promise<void> => {
    if (!localVideoRef?.current || !localStream) {
      logDebug('Cannot refresh - missing video element or stream');
      return;
    }

    try {
      const videoElement = localVideoRef.current;
      
      logDebug('Force refreshing existing video element...');
      
      // Stop current playback
      videoElement.pause();
      
      // Clear srcObject
      videoElement.srcObject = null;
      videoElement.load();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconfigure element
      videoElement.muted = true;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.controls = false;
      
      // Reattach stream
      videoElement.srcObject = localStream;
      videoElement.load();
      
      // Wait for metadata
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for metadata after refresh'));
        }, 3000);

        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          resolve();
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        if (videoElement.readyState >= 1) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      // Attempt to play
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      logDebug('Video refresh completed:', {
        readyState: videoElement.readyState,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        paused: videoElement.paused,
        currentTime: videoElement.currentTime
      });
      
    } catch (error) {
      logDebug('Force refresh failed:', error);
    }
  }, [localVideoRef, localStream, logDebug]);

  // Run all diagnostic tests
  const runDiagnostic = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResults([]);
    setCurrentTest('');
    
    logDebug('Starting video stream diagnostic...');
    
    try {
      await testExistingStream();
      await testExistingVideoElement();
      await testGetUserMedia();
      await testVideoElementSetup();
      await testStreamVideoBinding();
      await testVideoPlayback();
      
      setCurrentTest('Diagnostic Complete');
      
      if (onDiagnosticComplete) {
        onDiagnosticComplete(results);
      }
      
    } catch (error) {
      logDebug('Diagnostic failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  }, [
    isRunning,
    testExistingStream,
    testExistingVideoElement,
    testGetUserMedia,
    testVideoElementSetup,
    testStreamVideoBinding,
    testVideoPlayback,
    onDiagnosticComplete,
    results,
    logDebug
  ]);

  // Auto-run diagnostic if requested
  useEffect(() => {
    if (autoRun && !isRunning && results.length === 0) {
      runDiagnostic();
    }
  }, [autoRun, isRunning, results.length, runDiagnostic]);

  // Cleanup test stream on unmount
  useEffect(() => {
    return () => {
      if (diagnosticStreamRef.current) {
        diagnosticStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700 text-white' 
        : 'bg-white border-gray-300 text-gray-900'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <CameraIcon className="w-6 h-6 mr-2" />
          Video Stream Diagnostic
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isRunning
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition-colors`}
          >
            {isRunning ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Running...' : 'Run Diagnostic'}</span>
          </button>
          
          {localVideoRef?.current && localStream && (
            <button
              onClick={forceRefreshExistingVideo}
              disabled={isRunning}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isRunning
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors`}
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Force Refresh Video</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Test */}
      {currentTest && (
        <div className={`mb-4 p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <p className="text-sm">
            <span className="font-medium">Current Test:</span> {currentTest}
          </p>
        </div>
      )}

      {/* Test Video Element */}
      <div className="mb-6">
        <h4 className="text-md font-medium mb-2">Test Video Preview</h4>
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={testVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      {/* Diagnostic Results */}
      <div className="space-y-3">
        <h4 className="text-md font-medium">Diagnostic Results</h4>
        
        {results.length === 0 && !isRunning && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Click "Run Diagnostic" to test video stream functionality
          </p>
        )}
        
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              isDarkMode ? 'border-gray-600' : 'border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h5 className="font-medium">{result.test}</h5>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {result.message}
                  </p>
                  
                  {result.details && (
                    <details className="mt-2">
                      <summary className={`text-xs cursor-pointer ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        View Details
                      </summary>
                      <pre className={`mt-2 text-xs p-2 rounded ${
                        isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'
                      } overflow-auto max-h-40`}>
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              
              <span className={`text-xs ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {results.length > 0 && !isRunning && (
        <div className={`mt-6 p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <h4 className="text-md font-medium mb-2">Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-500 font-semibold">
                {results.filter(r => r.status === 'pass').length}
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Passed
              </div>
            </div>
            <div className="text-center">
              <div className="text-yellow-500 font-semibold">
                {results.filter(r => r.status === 'warning').length}
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Warnings
              </div>
            </div>
            <div className="text-center">
              <div className="text-red-500 font-semibold">
                {results.filter(r => r.status === 'fail').length}
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Failed
              </div>
            </div>
            <div className="text-center">
              <div className="text-blue-500 font-semibold">
                {results.length}
              </div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Total
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoStreamDiagnostic;