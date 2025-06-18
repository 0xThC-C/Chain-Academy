import { useState, useCallback, useRef } from 'react';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: number;
}

interface VideoStreamDiagnosticHook {
  // State
  isRunning: boolean;
  results: DiagnosticResult[];
  currentTest: string;
  lastRun: number | null;
  
  // Actions
  runQuickDiagnostic: (
    videoElement: HTMLVideoElement | null,
    stream: MediaStream | null
  ) => Promise<DiagnosticResult[]>;
  runFullDiagnostic: () => Promise<DiagnosticResult[]>;
  clearResults: () => void;
  
  // Utilities
  getStreamInfo: (stream: MediaStream) => any;
  getVideoElementInfo: (video: HTMLVideoElement) => any;
  forceVideoRefresh: (
    videoElement: HTMLVideoElement,
    stream: MediaStream
  ) => Promise<boolean>;
}

export const useVideoStreamDiagnostic = (): VideoStreamDiagnosticHook => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [lastRun, setLastRun] = useState<number | null>(null);
  
  const testStreamRef = useRef<MediaStream | null>(null);


  const logDebug = useCallback((message: string, data?: any) => {
    console.log(`[VideoStreamDiagnostic] ${message}`, data || '');
  }, []);

  // Get detailed stream information
  const getStreamInfo = useCallback((stream: MediaStream) => {
    if (!stream) return null;
    
    return {
      id: stream.id,
      active: stream.active,
      videoTracks: stream.getVideoTracks().map(track => ({
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        settings: track.getSettings(),
        constraints: track.getConstraints()
      })),
      audioTracks: stream.getAudioTracks().map(track => ({
        id: track.id,
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted,
        settings: track.getSettings(),
        constraints: track.getConstraints()
      }))
    };
  }, []);

  // Get detailed video element information
  const getVideoElementInfo = useCallback((video: HTMLVideoElement) => {
    if (!video) return null;
    
    return {
      // Basic properties
      srcObject: !!video.srcObject,
      readyState: video.readyState,
      networkState: video.networkState,
      
      // Dimensions
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      clientWidth: video.clientWidth,
      clientHeight: video.clientHeight,
      
      // Playback state
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      ended: video.ended,
      seeking: video.seeking,
      
      // Configuration
      autoplay: video.autoplay,
      controls: video.controls,
      loop: video.loop,
      muted: video.muted,
      playsInline: video.playsInline,
      preload: video.preload,
      
      // Computed styles
      computedStyle: {
        display: getComputedStyle(video).display,
        visibility: getComputedStyle(video).visibility,
        opacity: getComputedStyle(video).opacity,
        width: getComputedStyle(video).width,
        height: getComputedStyle(video).height
      },
      
      // Error state
      error: video.error ? {
        code: video.error.code,
        message: video.error.message
      } : null
    };
  }, []);

  // Force refresh a video element with a stream
  const forceVideoRefresh = useCallback(async (
    videoElement: HTMLVideoElement,
    stream: MediaStream
  ): Promise<boolean> => {
    if (!videoElement || !stream) {
      logDebug('Cannot refresh - missing video element or stream');
      return false;
    }

    try {
      logDebug('Force refreshing video element...', {
        videoElement: getVideoElementInfo(videoElement),
        stream: getStreamInfo(stream)
      });
      
      // Step 1: Stop current playback
      videoElement.pause();
      
      // Step 2: Clear srcObject and load
      videoElement.srcObject = null;
      videoElement.load();
      
      // Step 3: Wait for clean state
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Step 4: Reconfigure element with optimal settings
      videoElement.muted = true;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.controls = false;
      videoElement.style.backgroundColor = 'transparent';
      
      // Step 5: Reattach stream
      videoElement.srcObject = stream;
      videoElement.load();
      
      // Step 6: Wait for metadata to load
      const metadataLoaded = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          logDebug('Timeout waiting for metadata after refresh');
          resolve(false);
        }, 5000);

        const handleLoadedMetadata = () => {
          clearTimeout(timeout);
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          logDebug('Video metadata loaded after refresh');
          resolve(true);
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        // Check if metadata is already loaded
        if (videoElement.readyState >= 1) {
          clearTimeout(timeout);
          resolve(true);
        }
      });
      
      if (!metadataLoaded) {
        throw new Error('Failed to load video metadata after refresh');
      }
      
      // Step 7: Attempt to play
      try {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (playError) {
        logDebug('Play failed after refresh, but metadata loaded:', playError);
        // Consider this a partial success since metadata loaded
      }
      
      // Step 8: Verify final state
      const finalState = getVideoElementInfo(videoElement);
      logDebug('Video refresh completed:', finalState);
      
      const success = (
        videoElement.readyState >= 1 &&
        videoElement.videoWidth > 0 &&
        videoElement.videoHeight > 0 &&
        !!videoElement.srcObject
      );
      
      return success;
      
    } catch (error) {
      logDebug('Force refresh failed:', error);
      return false;
    }
  }, [getVideoElementInfo, getStreamInfo, logDebug]);

  // Quick diagnostic for existing video/stream
  const runQuickDiagnostic = useCallback(async (
    videoElement: HTMLVideoElement | null,
    stream: MediaStream | null
  ): Promise<DiagnosticResult[]> => {
    const quickResults: DiagnosticResult[] = [];
    const timestamp = Date.now();
    
    logDebug('Running quick diagnostic...', { 
      hasVideo: !!videoElement, 
      hasStream: !!stream 
    });
    
    // Test 1: Stream Health
    if (stream) {
      const streamInfo = getStreamInfo(stream);
      const streamIssues = [];
      
      if (!stream.active) streamIssues.push('Stream is not active');
      if (stream.getVideoTracks().length === 0) streamIssues.push('No video tracks');
      if (stream.getAudioTracks().length === 0) streamIssues.push('No audio tracks');
      
      stream.getVideoTracks().forEach((track, index) => {
        if (!track.enabled) streamIssues.push(`Video track ${index} disabled`);
        if (track.readyState !== 'live') streamIssues.push(`Video track ${index} not live`);
        if (track.muted) streamIssues.push(`Video track ${index} muted`);
      });
      
      quickResults.push({
        test: 'Stream Health',
        status: streamIssues.length === 0 ? 'pass' : 'warning',
        message: streamIssues.length === 0 
          ? 'Stream appears healthy'
          : `Found ${streamIssues.length} stream issue(s)`,
        details: { streamInfo, issues: streamIssues },
        timestamp
      });
    } else {
      quickResults.push({
        test: 'Stream Health',
        status: 'fail',
        message: 'No stream provided',
        timestamp
      });
    }
    
    // Test 2: Video Element Health
    if (videoElement) {
      const videoInfo = getVideoElementInfo(videoElement);
      const videoIssues = [];
      
      if (!videoElement.srcObject) videoIssues.push('No srcObject assigned');
      if (videoElement.readyState === 0) videoIssues.push('No video data loaded');
      if (videoElement.videoWidth === 0) videoIssues.push('Invalid video width');
      if (videoElement.videoHeight === 0) videoIssues.push('Invalid video height');
      if (videoElement.paused && videoElement.srcObject) videoIssues.push('Video is paused');
      if (!videoElement.autoplay) videoIssues.push('Autoplay disabled');
      if (!videoElement.playsInline) videoIssues.push('playsInline disabled');
      if (videoElement.error) videoIssues.push(`Video error: ${videoElement.error.message}`);
      
      quickResults.push({
        test: 'Video Element Health',
        status: videoIssues.length === 0 ? 'pass' : 'warning',
        message: videoIssues.length === 0 
          ? 'Video element appears healthy'
          : `Found ${videoIssues.length} video element issue(s)`,
        details: { videoInfo, issues: videoIssues },
        timestamp
      });
    } else {
      quickResults.push({
        test: 'Video Element Health',
        status: 'fail',
        message: 'No video element provided',
        timestamp
      });
    }
    
    // Test 3: Stream-Video Binding
    if (videoElement && stream) {
      const bindingIssues = [];
      
      if (videoElement.srcObject !== stream) {
        bindingIssues.push('Video element srcObject does not match provided stream');
      }
      
      if (videoElement.readyState < 1) {
        bindingIssues.push('Video metadata not loaded');
      }
      
      quickResults.push({
        test: 'Stream-Video Binding',
        status: bindingIssues.length === 0 ? 'pass' : 'warning',
        message: bindingIssues.length === 0 
          ? 'Stream properly bound to video element'
          : `Found ${bindingIssues.length} binding issue(s)`,
        details: { 
          streamId: stream.id, 
          videoSrcObjectId: videoElement.srcObject ? (videoElement.srcObject as MediaStream).id : null,
          issues: bindingIssues 
        },
        timestamp
      });
    }
    
    return quickResults;
  }, [getStreamInfo, getVideoElementInfo, logDebug]);

  // Full diagnostic with getUserMedia test
  const runFullDiagnostic = useCallback(async (): Promise<DiagnosticResult[]> => {
    if (isRunning) {
      logDebug('Diagnostic already running, skipping...');
      return results;
    }
    
    setIsRunning(true);
    setResults([]);
    setCurrentTest('');
    
    const fullResults: DiagnosticResult[] = [];
    
    try {
      logDebug('Starting full video stream diagnostic...');
      
      // Test 1: getUserMedia Capabilities
      setCurrentTest('Testing getUserMedia');
      
      const getUserMediaResult: DiagnosticResult = {
        test: 'getUserMedia Test',
        status: 'pending',
        message: 'Testing camera and microphone access...',
        timestamp: Date.now()
      };
      
      fullResults.push(getUserMediaResult);
      setResults([...fullResults]);
      
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: true
        });
        
        testStreamRef.current = testStream;
        const streamInfo = getStreamInfo(testStream);
        
        getUserMediaResult.status = 'pass';
        getUserMediaResult.message = 'Successfully obtained media stream';
        getUserMediaResult.details = streamInfo;
        
        logDebug('getUserMedia test passed:', streamInfo);
        
      } catch (error: any) {
        getUserMediaResult.status = 'fail';
        getUserMediaResult.message = `getUserMedia failed: ${error.message}`;
        getUserMediaResult.details = { error: error.toString() };
        
        logDebug('getUserMedia test failed:', error);
      }
      
      setResults([...fullResults]);
      
      // Test 2: Video Element Creation and Binding
      if (testStreamRef.current) {
        setCurrentTest('Testing Video Element Binding');
        
        const bindingResult: DiagnosticResult = {
          test: 'Video Element Binding',
          status: 'pending',
          message: 'Creating and binding video element...',
          timestamp: Date.now()
        };
        
        fullResults.push(bindingResult);
        setResults([...fullResults]);
        
        try {
          // Create test video element
          const testVideo = document.createElement('video');
          testVideo.muted = true;
          testVideo.autoplay = true;
          testVideo.playsInline = true;
          testVideo.style.position = 'absolute';
          testVideo.style.top = '-9999px';
          testVideo.style.left = '-9999px';
          document.body.appendChild(testVideo);
          
          // Bind stream
          testVideo.srcObject = testStreamRef.current;
          testVideo.load();
          
          // Wait for metadata
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout waiting for video metadata'));
            }, 5000);

            const handleLoadedMetadata = () => {
              clearTimeout(timeout);
              testVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
              resolve();
            };

            testVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
            
            if (testVideo.readyState >= 1) {
              clearTimeout(timeout);
              resolve();
            }
          });
          
          const videoInfo = getVideoElementInfo(testVideo);
          
          // Cleanup
          document.body.removeChild(testVideo);
          
          bindingResult.status = 'pass';
          bindingResult.message = 'Video element binding successful';
          bindingResult.details = videoInfo;
          
          logDebug('Video binding test passed:', videoInfo);
          
        } catch (error: any) {
          bindingResult.status = 'fail';
          bindingResult.message = `Video binding failed: ${error.message}`;
          bindingResult.details = { error: error.toString() };
          
          logDebug('Video binding test failed:', error);
        }
        
        setResults([...fullResults]);
      }
      
      setCurrentTest('Diagnostic Complete');
      setLastRun(Date.now());
      
      return fullResults;
      
    } catch (error) {
      logDebug('Full diagnostic failed:', error);
      return fullResults;
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      
      // Cleanup test stream
      if (testStreamRef.current) {
        testStreamRef.current.getTracks().forEach(track => track.stop());
        testStreamRef.current = null;
      }
    }
  }, [isRunning, results, getStreamInfo, getVideoElementInfo, logDebug]);

  const clearResults = useCallback(() => {
    setResults([]);
    setLastRun(null);
  }, []);

  return {
    // State
    isRunning,
    results,
    currentTest,
    lastRun,
    
    // Actions
    runQuickDiagnostic,
    runFullDiagnostic,
    clearResults,
    
    // Utilities
    getStreamInfo,
    getVideoElementInfo,
    forceVideoRefresh
  };
};

export default useVideoStreamDiagnostic;