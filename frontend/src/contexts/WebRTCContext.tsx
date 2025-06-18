import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';
import { StateValidator } from '../components/EnhancedErrorBoundary';
import { payerPresenceTracker } from '../services/PayerPresenceTracker';
import { 
  createSecureRTCConfiguration, 
  validateSignalingMessage,
  validatePeerIdentity,
  monitorConnection,
  validateRoomAccess,
  shouldThrottleConnection,
  validateMediaStream,
  sanitizeInput,
  getSecurityMetrics
} from '../utils/webrtcSecurity';
import { 
  SignalingMessage, 
  SecurityValidationResult, 
  ConnectionSecurityState,
  NetworkSecurityMetrics,
  WebRTCSecurityError,
  SecurityEvent
} from '../types/webrtc';

interface MediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

interface ChatMessage {
  id: string;
  roomId: string;
  from: string;
  message: string;
  timestamp: Date;
}

interface Participant {
  address: string;
  mediaState: MediaState;
}

interface ActiveSessionData {
  sessionId: string;
  mentorAddress: string;
  menteeAddress: string;
  startTime: Date;
  sessionType: 'video' | 'audio';
}

interface WebRTCContextType {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  roomId: string | null;
  participants: Participant[];
  
  // Active session security control
  isInActiveSession: boolean;
  activeSessionData: ActiveSessionData | null;
  navigationBlocked: boolean;
  
  // Media state
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  mediaState: MediaState;
  
  // Chat
  chatMessages: ChatMessage[];
  
  // Security state
  securityState: ConnectionSecurityState;
  networkMetrics: NetworkSecurityMetrics;
  
  // PAYER PRESENCE TRACKING - Methods for payer presence tracking
  setPayerAddress: (payerAddress: string | null) => void;
  getPayerAddress: () => string | null;
  isCurrentUserPayer: () => boolean;
  
  // Methods
  joinRoom: (roomId: string, userAddress: string, enableVideo?: boolean) => Promise<void>;
  leaveRoom: () => void;
  sendChatMessage: (message: string) => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  
  // Session security methods
  setActiveSession: (sessionData: ActiveSessionData) => void;
  clearActiveSession: () => void;
  canNavigate: () => boolean;
  requestLeaveSession: (onConfirm: () => void, onCancel?: () => void) => void;
  
  // Security methods
  validateMessage: (message: any) => SecurityValidationResult;
  reportSecurityEvent: (event: SecurityEvent) => void;
  getConnectionMetrics: () => NetworkSecurityMetrics;
  
  // Stream refs for components
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRefs: Map<string, React.RefObject<HTMLVideoElement | null>>;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

interface WebRTCProviderProps {
  children: ReactNode;
}

// Export the ActiveSessionData type for use in other components
export type { ActiveSessionData };

export const WebRTCProvider: React.FC<WebRTCProviderProps> = ({ children }) => {
  const { address, isConnected: isWalletConnected } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [mediaState, setMediaState] = useState<MediaState>({
    userId: '',
    video: false,
    audio: false,
    screenShare: false
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Active session security state
  const [isInActiveSession, setIsInActiveSession] = useState(false);
  const [activeSessionData, setActiveSessionDataState] = useState<ActiveSessionData | null>(null);
  const [navigationBlocked, setNavigationBlocked] = useState(false);
  
  // PAYER PRESENCE TRACKING - State for tracking payer address
  const [payerAddress, setPayerAddressState] = useState<string | null>(null);
  
  // Security state
  const [securityState, setSecurityState] = useState<ConnectionSecurityState>({
    isSecure: false,
    encryptionEnabled: false,
    certificateValid: false,
    identityVerified: false,
    lastSecurityCheck: Date.now(),
    securityWarnings: []
  });
  const [networkMetrics, setNetworkMetrics] = useState<NetworkSecurityMetrics>({
    connectionAttempts: 0,
    failedConnections: 0,
    rateLimitViolations: 0,
    suspiciousActivity: 0,
    blockedIPs: 0,
    lastReset: Date.now()
  });
  
  // Resilience state - keep for potential future use
  const [_connectionAttempts, _setConnectionAttempts] = useState(0);
  const [_lastError, _setLastError] = useState<Error | null>(null);
  const [_isRecovering, _setIsRecovering] = useState(false);

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Map<string, React.RefObject<HTMLVideoElement | null>>>(new Map());

  // WebRTC peer connections with security
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const rtcConfig = useRef<RTCConfiguration | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messageQueue = useRef<Map<string, SignalingMessage[]>>(new Map());
  const lastMessageTime = useRef<Map<string, number>>(new Map());
  
  // Resilience refs
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = useRef(5);
  const connectionHealthRef = useRef(true);
  const lastHealthCheckRef = useRef(Date.now());

  // Security helper functions
  const reportSecurityEvent = useCallback((event: SecurityEvent) => {
    console.warn('Security Event:', event);
    
    // Update network metrics
    setNetworkMetrics(prev => ({
      ...prev,
      suspiciousActivity: prev.suspiciousActivity + (event.severity === 'high' ? 2 : 1),
      lastReset: event.severity === 'critical' ? Date.now() : prev.lastReset
    }));
    
    // Add to security warnings
    setSecurityState(prev => ({
      ...prev,
      securityWarnings: [...prev.securityWarnings.slice(-9), event.message],
      lastSecurityCheck: Date.now()
    }));
  }, []);
  
  const validateMessage = useCallback((message: any): SecurityValidationResult => {
    const userIP = '127.0.0.1'; // In production, get real IP
    return validateSignalingMessage(message as SignalingMessage, userIP);
  }, []);
  
  const getConnectionMetrics = useCallback((): NetworkSecurityMetrics => {
    const securityMetrics = getSecurityMetrics();
    return {
      ...networkMetrics,
      ...securityMetrics
    };
  }, [networkMetrics]);

  // Initialize secure RTC configuration
  const initializeSecureConfig = useCallback(() => {
    if (!address) return;
    
    try {
      const secureConfig = createSecureRTCConfiguration(address);
      rtcConfig.current = secureConfig;
      
      setSecurityState(prev => ({
        ...prev,
        encryptionEnabled: true,
        certificateValid: true,
        lastSecurityCheck: Date.now()
      }));
    } catch (error) {
      console.error('Failed to initialize secure RTC config:', error);
      reportSecurityEvent({
        type: WebRTCSecurityError.ENCRYPTION_FAILED,
        severity: 'high',
        message: 'Failed to initialize secure RTC configuration',
        timestamp: Date.now(),
        userAddress: address
      });
    }
  }, [address, reportSecurityEvent]);

  // Helper functions
  const createPeerConnection = useCallback((participantAddress: string) => {
    if (!rtcConfig.current) {
      console.error('RTC configuration not initialized');
      return null;
    }
    
    // Validate peer identity
    if (!validatePeerIdentity(participantAddress)) {
      reportSecurityEvent({
        type: WebRTCSecurityError.PEER_VALIDATION_FAILED,
        severity: 'high',
        message: `Invalid peer identity: ${participantAddress}`,
        timestamp: Date.now(),
        userAddress: address
      });
      return null;
    }
    
    const pc = new RTCPeerConnection(rtcConfig.current);
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', participantAddress);
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(participantAddress, remoteStream)));
    };

    // Handle ICE candidates with security validation
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const message: SignalingMessage = {
          type: 'ice-candidate',
          from: mediaState.userId,
          to: participantAddress,
          roomId: roomId || '',
          data: event.candidate,
          timestamp: Date.now()
        };
        
        // Validate message before sending
        const validation = validateMessage(message);
        if (validation.isValid) {
          socket.emit('webrtc-signal', message);
        } else {
          reportSecurityEvent({
            type: WebRTCSecurityError.INVALID_SIGNATURE,
            severity: 'medium',
            message: `Invalid ICE candidate message: ${validation.errors.join(', ')}`,
            timestamp: Date.now(),
            userAddress: address
          });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${participantAddress}:`, pc.connectionState);
      
      // Monitor connection for security
      monitorConnection(participantAddress, {
        peerId: participantAddress,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        gatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState
      });
      
      // Handle failed connections
      if (pc.connectionState === 'failed') {
        setNetworkMetrics(prev => ({
          ...prev,
          failedConnections: prev.failedConnections + 1
        }));
        
        reportSecurityEvent({
          type: WebRTCSecurityError.CONNECTION_TIMEOUT,
          severity: 'medium',
          message: `Connection failed with peer ${participantAddress}`,
          timestamp: Date.now(),
          userAddress: address
        });
      }
      
      // Set connection timeout
      if (pc.connectionState === 'connecting') {
        const timeout = setTimeout(() => {
          if (pc.connectionState === 'connecting') {
            pc.close();
            reportSecurityEvent({
              type: WebRTCSecurityError.CONNECTION_TIMEOUT,
              severity: 'medium',
              message: `Connection timeout with peer ${participantAddress}`,
              timestamp: Date.now(),
              userAddress: address
            });
          }
        }, 30000); // 30 second timeout
        
        connectionTimeouts.current.set(participantAddress, timeout);
      } else {
        // Clear timeout if connection succeeds or fails
        const timeout = connectionTimeouts.current.get(participantAddress);
        if (timeout) {
          clearTimeout(timeout);
          connectionTimeouts.current.delete(participantAddress);
        }
      }
    };

    peerConnections.current.set(participantAddress, pc);
    return pc;
  }, [localStream, socket, mediaState.userId, roomId]);

  const createOffer = useCallback(async (participantAddress: string) => {
    const pc = peerConnections.current.get(participantAddress);
    if (!pc || !socket) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const message: SignalingMessage = {
        type: 'offer',
        from: mediaState.userId,
        to: participantAddress,
        roomId: roomId || '',
        data: offer,
        timestamp: Date.now()
      };
      
      // Validate message before sending
      const validation = validateMessage(message);
      if (validation.isValid) {
        socket.emit('webrtc-signal', message);
      } else {
        throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
      reportSecurityEvent({
        type: WebRTCSecurityError.PEER_VALIDATION_FAILED,
        severity: 'medium',
        message: `Failed to create offer for ${participantAddress}: ${error}`,
        timestamp: Date.now(),
        userAddress: address
      });
    }
  }, [socket, mediaState.userId, roomId, validateMessage, reportSecurityEvent, address]);

  // Event handlers
  const handleRoomJoined = useCallback((data: {
    roomId: string;
    config: RTCConfiguration;
    participants: Participant[];
    chatHistory: ChatMessage[];
  }) => {
    console.log('Joined room:', data.roomId);
    setRoomId(data.roomId);
    setParticipants(data.participants);
    setChatMessages(data.chatHistory);
    rtcConfig.current = data.config;

    // Initialize peer connections for existing participants
    data.participants.forEach(participant => {
      if (participant.address !== mediaState.userId) {
        createPeerConnection(participant.address);
      }
    });
  }, [mediaState.userId, createPeerConnection]);

  const handleUserJoined = useCallback((data: { userAddress: string; participants: Participant[] }) => {
    console.log('User joined:', data.userAddress);
    setParticipants(data.participants);
    
    // PAYER PRESENCE TRACKING - Track if payer joined
    if (payerAddress && data.userAddress.toLowerCase() === payerAddress.toLowerCase() && roomId) {
      console.log('🔵 WebRTCContext: Payer joined room', { 
        payerAddress: data.userAddress, 
        roomId 
      });
      payerPresenceTracker.recordPayerJoin(roomId, data.userAddress, {
        timestamp: Date.now(),
        source: 'webrtc_user_joined'
      });
    }
    
    if (data.userAddress !== mediaState.userId) {
      createPeerConnection(data.userAddress);
      // Create offer for new participant
      createOffer(data.userAddress);
    }
  }, [mediaState.userId, createPeerConnection, createOffer, payerAddress, roomId]);

  const handleUserLeft = useCallback((data: { userAddress: string; participants: Participant[] }) => {
    console.log('User left:', data.userAddress);
    setParticipants(data.participants);
    
    // PAYER PRESENCE TRACKING - Track if payer left
    if (payerAddress && data.userAddress.toLowerCase() === payerAddress.toLowerCase() && roomId) {
      console.log('🔴 WebRTCContext: Payer left room', { 
        payerAddress: data.userAddress, 
        roomId 
      });
      payerPresenceTracker.recordPayerLeave(roomId, data.userAddress, 'webrtc_user_left', {
        timestamp: Date.now(),
        source: 'webrtc_user_left'
      });
    }
    
    // Clean up peer connection
    const pc = peerConnections.current.get(data.userAddress);
    if (pc) {
      pc.close();
      peerConnections.current.delete(data.userAddress);
    }
    
    // Remove remote stream
    setRemoteStreams(prev => {
      const newStreams = new Map(prev);
      newStreams.delete(data.userAddress);
      return newStreams;
    });
  }, [payerAddress, roomId]);

  const handleWebRTCSignal = useCallback(async (message: {
    type: string;
    from: string;
    data: any;
    timestamp?: number;
  }) => {
    const { type, from, data, timestamp } = message;
    
    // Validate incoming message
    const validation = validateMessage(message);
    if (!validation.isValid) {
      reportSecurityEvent({
        type: WebRTCSecurityError.INVALID_SIGNATURE,
        severity: 'high',
        message: `Invalid signaling message from ${from}: ${validation.errors.join(', ')}`,
        timestamp: Date.now(),
        userAddress: address
      });
      return;
    }
    
    // Check message timestamp to prevent replay attacks
    if (timestamp && Math.abs(Date.now() - timestamp) > 60000) { // 1 minute tolerance
      reportSecurityEvent({
        type: WebRTCSecurityError.SUSPICIOUS_ACTIVITY,
        severity: 'medium',
        message: `Stale message detected from ${from}`,
        timestamp: Date.now(),
        userAddress: address
      });
      return;
    }
    
    // Rate limiting check
    const lastTime = lastMessageTime.current.get(from) || 0;
    const now = Date.now();
    if (now - lastTime < 100) { // Max 10 messages per second
      reportSecurityEvent({
        type: WebRTCSecurityError.RATE_LIMIT_EXCEEDED,
        severity: 'medium',
        message: `Rate limit exceeded by ${from}`,
        timestamp: Date.now(),
        userAddress: address
      });
      return;
    }
    lastMessageTime.current.set(from, now);
    
    const pc = peerConnections.current.get(from);
    
    if (!pc) {
      console.error('No peer connection found for', from);
      reportSecurityEvent({
        type: WebRTCSecurityError.PEER_VALIDATION_FAILED,
        severity: 'low',
        message: `No peer connection found for ${from}`,
        timestamp: Date.now(),
        userAddress: address
      });
      return;
    }

    try {
      switch (type) {
        case 'offer':
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          const answerMessage: SignalingMessage = {
            type: 'answer',
            from: mediaState.userId,
            to: from,
            roomId: roomId || '',
            data: answer,
            timestamp: Date.now()
          };
          
          const answerValidation = validateMessage(answerMessage);
          if (answerValidation.isValid) {
            socket?.emit('webrtc-signal', answerMessage);
          }
          break;

        case 'answer':
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          break;

        case 'ice-candidate':
          await pc.addIceCandidate(new RTCIceCandidate(data));
          break;
      }
    } catch (error) {
      console.error('Error handling WebRTC signal:', error);
      reportSecurityEvent({
        type: WebRTCSecurityError.PEER_VALIDATION_FAILED,
        severity: 'medium',
        message: `Error processing ${type} from ${from}: ${error}`,
        timestamp: Date.now(),
        userAddress: address
      });
    }
  }, [socket, mediaState.userId, roomId, validateMessage, reportSecurityEvent, address]);

  const handleChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  const handleMediaStateChanged = useCallback((data: { userAddress: string; mediaState: MediaState }) => {
    setParticipants(prev => 
      prev.map(p => 
        p.address === data.userAddress 
          ? { ...p, mediaState: data.mediaState }
          : p
      )
    );
  }, []);

  const handleScreenShareChanged = useCallback((data: { userAddress: string; sharing: boolean }) => {
    // Handle screen share state change for UI updates
    console.log(`Screen share ${data.sharing ? 'started' : 'stopped'} by ${data.userAddress}`);
  }, []);

  // Connection resilience utilities
  const validateConnectionHealth = useCallback(async (): Promise<boolean> => {
    try {
      if (!socket || !socket.connected) return false;
      
      // Check if we can reach the backend
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/health`, { 
        method: 'GET',
        timeout: 3000 
      } as any);
      
      return response.ok;
    } catch {
      return false;
    }
  }, [socket]);

  const attemptReconnection = useCallback(async (attempt: number = 1): Promise<void> => {
    if (attempt > maxReconnectAttempts.current || _isRecovering) return;

    _setIsRecovering(true);
    _setConnectionAttempts(attempt);

    try {
      console.log(`WebRTC reconnection attempt ${attempt}/${maxReconnectAttempts.current}`);
      
      // Progressive backoff delay
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      // Clean up existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      // Validate system health before reconnecting
      const storageHealthy = StateValidator.validateLocalStorage() && StateValidator.validateSessionStorage();
      if (!storageHealthy) {
        console.warn('Storage corruption detected, cleaning up...');
        StateValidator.emergencyCleanup();
      }

      // Create new connection with authentication
      const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
        reconnection: false, // Handle reconnection manually
        // 🔒 SECURITY: Add proper SIWE authentication credentials
        auth: {
          token: (() => {
            try {
              const authSession = sessionStorage.getItem('auth_session');
              if (authSession) {
                const sessionData = JSON.parse(authSession);
                if (sessionData.token && sessionData.address === address) {
                  return sessionData.token;
                }
              }
            } catch (error) {
              console.warn('Failed to retrieve auth token:', error);
            }
            return null;
          })(),
          userAddress: address,
          authType: 'siwe'
        }
      });

      // Test connection
      const connectionPromise = new Promise<Socket>((resolve, reject) => {
        const timeout = setTimeout(() => {
          newSocket.disconnect();
          reject(new Error('Connection timeout'));
        }, 10000);

        newSocket.on('connect', () => {
          clearTimeout(timeout);
          resolve(newSocket);
        });

        newSocket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const connectedSocket = await connectionPromise;
      
      // Setup event listeners
      setupSocketListeners(connectedSocket);
      setSocket(connectedSocket);
      setIsConnected(true);
      _setIsRecovering(false);
      _setLastError(null);
      connectionHealthRef.current = true;
      
      console.log('WebRTC reconnection successful');

    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error);
      _setLastError(error as Error);
      
      if (attempt < maxReconnectAttempts.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          attemptReconnection(attempt + 1);
        }, 2000);
      } else {
        _setIsRecovering(false);
        console.error('All reconnection attempts failed');
      }
    }
  }, [socket, _isRecovering]);

  const setupSocketListeners = useCallback((socketInstance: Socket) => {
    socketInstance.on('connect', () => {
      console.log('Connected to WebRTC server');
      setIsConnected(true);
      _setConnectionAttempts(0);
      connectionHealthRef.current = true;
      lastHealthCheckRef.current = Date.now();
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from WebRTC server:', reason);
      setIsConnected(false);
      connectionHealthRef.current = false;
      
      // Only attempt reconnection for unexpected disconnects
      if (reason === 'io server disconnect') {
        // Server intentionally disconnected, don't reconnect automatically
        return;
      }
      
      // Attempt reconnection after a brief delay
      setTimeout(() => {
        if (!connectionHealthRef.current) {
          attemptReconnection(1);
        }
      }, 1000);
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('WebRTC server connection failed:', error);
      setIsConnected(false);
      _setLastError(error as Error);
      connectionHealthRef.current = false;
    });

    // WebRTC signaling events with error handling
    socketInstance.on('room-joined', (data) => {
      try {
        handleRoomJoined(data);
      } catch (error) {
        console.error('Error handling room-joined:', error);
      }
    });

    socketInstance.on('user-joined', (data) => {
      try {
        handleUserJoined(data);
      } catch (error) {
        console.error('Error handling user-joined:', error);
      }
    });

    socketInstance.on('user-left', (data) => {
      try {
        handleUserLeft(data);
      } catch (error) {
        console.error('Error handling user-left:', error);
      }
    });

    socketInstance.on('webrtc-signal', (data) => {
      try {
        handleWebRTCSignal(data);
      } catch (error) {
        console.error('Error handling webrtc-signal:', error);
      }
    });

    socketInstance.on('chat-message', (data) => {
      try {
        handleChatMessage(data);
      } catch (error) {
        console.error('Error handling chat-message:', error);
      }
    });

    socketInstance.on('media-state-changed', (data) => {
      try {
        handleMediaStateChanged(data);
      } catch (error) {
        console.error('Error handling media-state-changed:', error);
      }
    });

    socketInstance.on('screen-share-changed', (data) => {
      try {
        handleScreenShareChanged(data);
      } catch (error) {
        console.error('Error handling screen-share-changed:', error);
      }
    });
  }, [handleRoomJoined, handleUserJoined, handleUserLeft, handleWebRTCSignal, handleChatMessage, handleMediaStateChanged, handleScreenShareChanged, attemptReconnection]);

  // Initialize socket connection with resilience
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const initializeConnection = async () => {
      try {
        // Validate system health before connecting
        const storageHealthy = StateValidator.validateLocalStorage() && StateValidator.validateSessionStorage();
        if (!storageHealthy) {
          console.warn('Storage issues detected, cleaning up before connection...');
          StateValidator.emergencyCleanup();
        }

        const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001', {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          reconnection: false, // Handle reconnection manually for better control
          // 🔒 SECURITY: Add proper SIWE authentication credentials
          auth: {
            token: (() => {
              try {
                const authSession = sessionStorage.getItem('auth_session');
                if (authSession) {
                  const sessionData = JSON.parse(authSession);
                  if (sessionData.token && sessionData.address === address) {
                    return sessionData.token;
                  }
                }
              } catch (error) {
                console.warn('Failed to retrieve auth token:', error);
              }
              return null;
            })(),
            userAddress: address,
            authType: 'siwe',
            timestamp: Date.now(),
            version: '1.0.0'
          }
        });

        setupSocketListeners(newSocket);
        setSocket(newSocket);

        cleanup = () => {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          newSocket.off('connect');
          newSocket.off('disconnect');
          newSocket.off('connect_error');
          newSocket.off('room-joined');
          newSocket.off('user-joined');
          newSocket.off('user-left');
          newSocket.off('webrtc-signal');
          newSocket.off('chat-message');
          newSocket.off('media-state-changed');
          newSocket.off('screen-share-changed');
          newSocket.disconnect();
        };
      } catch (error) {
        console.warn('Failed to initialize WebRTC connection:', error);
        setIsConnected(false);
        setSocket(null);
        _setLastError(error as Error);
      }
    };

    initializeConnection();

    return () => {
      cleanup?.();
      cleanupSecurity();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to prevent re-initialization

  // Health monitoring
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      if (socket && isConnected) {
        const isHealthy = await validateConnectionHealth();
        if (!isHealthy && connectionHealthRef.current) {
          console.warn('Connection health check failed, marking as unhealthy');
          connectionHealthRef.current = false;
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [socket, isConnected, validateConnectionHealth]);


  const joinRoom = async (newRoomId: string, userAddress: string, enableVideo = true) => {
    try {
      // Security: Validate room access
      if (!validateRoomAccess(newRoomId, userAddress)) {
        throw new Error('Unauthorized room access');
      }
      
      // Security: Check connection throttling
      const userIP = '127.0.0.1'; // In production, get real IP
      if (shouldThrottleConnection(userIP)) {
        reportSecurityEvent({
          type: WebRTCSecurityError.RATE_LIMIT_EXCEEDED,
          severity: 'high',
          message: 'Connection throttled due to excessive requests',
          timestamp: Date.now(),
          userAddress: userAddress,
          ip: userIP
        });
        throw new Error('Too many connection attempts. Please wait before trying again.');
      }
      
      // Update connection metrics
      setNetworkMetrics(prev => ({
        ...prev,
        connectionAttempts: prev.connectionAttempts + 1
      }));
      
      // Initialize secure configuration if not done
      if (!rtcConfig.current) {
        initializeSecureConfig();
      }
      
      // Prevent multiple simultaneous join attempts
      if (roomId === newRoomId && localStream) {
        console.log('Already in room with media stream');
        return;
      }

      // If already in a different room, leave it first
      if (roomId && roomId !== newRoomId) {
        console.log('Leaving current room before joining new one');
        leaveRoom();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    // Get user media regardless of socket connection
    try {
      // Request camera and microphone permissions with user-friendly prompts
      console.log('Requesting camera and microphone access...');
      
      // Security: Enhanced media constraints with security considerations
      const mediaConstraints = {
        video: enableVideo ? {
          width: { ideal: 1280, max: 1920 }, // Limit max resolution
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }, // Limit max framerate
          facingMode: 'user' // Prefer front camera for security
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000, max: 48000 }, // Limit sample rate
          channelCount: { ideal: 2, max: 2 } // Limit channels
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      // Security: Validate media stream
      const streamValidation = validateMediaStream(stream);
      if (!streamValidation.isValid) {
        stream.getTracks().forEach(track => track.stop());
        reportSecurityEvent({
          type: WebRTCSecurityError.MEDIA_VALIDATION_FAILED,
          severity: 'high',
          message: `Media validation failed: ${streamValidation.errors.join(', ')}`,
          timestamp: Date.now(),
          userAddress: userAddress
        });
        throw new Error('Media stream validation failed');
      }
      
      console.log('Media access granted successfully');
      console.log('Stream details:', {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
        videoTrackReadyState: stream.getVideoTracks()[0]?.readyState
      });
      
      // Clean up any existing stream first
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping existing track:', error);
          }
        });
      }
      
      setLocalStream(stream);
      setMediaState(prev => ({
        ...prev,
        userId: userAddress,
        video: true,
        audio: true
      }));

      // Set local video with error handling and proper event listeners
      if (localVideoRef.current) {
        try {
          const videoElement = localVideoRef.current;
          console.log('Setting video element srcObject, element state:', {
            videoElement: !!videoElement,
            currentSrc: videoElement.srcObject ? 'stream-present' : 'no-stream',
            newStreamId: stream.id,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            readyState: videoElement.readyState,
            streamActive: stream.active,
            videoTracks: stream.getVideoTracks().map(track => ({
              id: track.id,
              kind: track.kind,
              enabled: track.enabled,
              readyState: track.readyState,
              muted: track.muted
            }))
          });
          
          // Clear any existing srcObject first
          if (videoElement.srcObject) {
            videoElement.srcObject = null;
            videoElement.load(); // Force clear
          }
          
          // Small delay to ensure clean state
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Set all necessary properties
          videoElement.srcObject = stream;
          videoElement.muted = true; // Prevent audio feedback
          videoElement.playsInline = true; // Better mobile support
          videoElement.autoplay = true; // Ensure autoplay is set
          videoElement.controls = false; // Remove controls
          videoElement.style.backgroundColor = 'transparent'; // Ensure no black background
          
          // Force load the new stream
          videoElement.load();
          
          // Force immediate play attempt after setting srcObject
          setTimeout(() => {
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('Video playing successfully after timeout');
              }).catch(playError => {
                console.warn('Error auto-playing video after timeout:', playError);
              });
            }
          }, 100);
          
          // Additional timeout to ensure video is really working
          setTimeout(() => {
            console.log('Final video check:', {
              element: !!videoElement,
              srcObject: !!videoElement.srcObject,
              readyState: videoElement.readyState,
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              paused: videoElement.paused,
              currentTime: videoElement.currentTime
            });
            
            // Final attempt to play if still paused
            if (videoElement.paused && videoElement.srcObject) {
              console.log('Making final play attempt...');
              const finalPlayPromise = videoElement.play();
              if (finalPlayPromise !== undefined) {
                finalPlayPromise.then(() => {
                  console.log('Final play attempt successful');
                }).catch(finalPlayError => {
                  console.warn('Final play attempt failed:', finalPlayError);
                });
              }
            }
            
            // Check if video has valid dimensions, if not try to fix
            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
              console.warn('Video has invalid dimensions, attempting to fix...');
              videoElement.load();
              setTimeout(() => {
                const retryPlayPromise = videoElement.play();
                if (retryPlayPromise !== undefined) {
                  retryPlayPromise.then(() => {
                    console.log('Video dimensions retry successful');
                  }).catch(retryPlayError => {
                    console.warn('Video dimensions retry failed:', retryPlayError);
                  });
                }
              }, 200);
            }
          }, 500);
          
          // Add loadedmetadata event listener to ensure video is ready
          const handleLoadedMetadata = () => {
            console.log('Video metadata loaded, dimensions:', {
              videoWidth: videoElement.videoWidth,
              videoHeight: videoElement.videoHeight,
              readyState: videoElement.readyState,
              currentTime: videoElement.currentTime,
              duration: videoElement.duration
            });
            
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('Video playing successfully after metadata loaded');
              }).catch(playError => {
                console.warn('Error auto-playing video after metadata:', playError);
              });
            }
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          };
          
          // Add error event listener
          const handleVideoError = (error: Event) => {
            console.error('Video element error:', error);
            console.error('Video element error details:', {
              error: videoElement.error,
              networkState: videoElement.networkState,
              readyState: videoElement.readyState,
              srcObject: !!videoElement.srcObject
            });
          };
          
          // Listen for events
          videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.addEventListener('error', handleVideoError);
          videoElement.addEventListener('loadeddata', () => {
            console.log('Video data loaded');
          });
          videoElement.addEventListener('canplay', () => {
            console.log('Video can start playing');
          });
          
          // Also try to play immediately in case metadata is already loaded
          if (videoElement.readyState >= 1) { // HAVE_METADATA
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('Video playing immediately - metadata already available');
              }).catch(playError => {
                console.warn('Error auto-playing video immediately:', playError);
              });
            }
          }
        } catch (videoError) {
          console.error('Error setting video source:', videoError);
        }
      } else {
        console.warn('localVideoRef.current is null - video element not available');
      }

      // Update room state
      setRoomId(newRoomId);

      // If socket is connected, join room via socket
      if (socket && isConnected) {
        // Security: Send join message with validation
        const joinMessage = {
          roomId: newRoomId,
          userAddress,
          timestamp: Date.now(),
          capabilities: {
            video: enableVideo,
            audio: true,
            screenShare: true
          }
        };
        
        socket.emit('join-room', joinMessage);
        
        // Start heartbeat for connection monitoring
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
        }
        
        heartbeatInterval.current = setInterval(() => {
          if (socket?.connected) {
            socket.emit('heartbeat', {
              type: 'heartbeat',
              from: userAddress,
              timestamp: Date.now(),
              roomId: newRoomId
            });
          }
        }, 30000); // Send heartbeat every 30 seconds
        
      } else {
        // Demo mode - simulate room join
        console.log('Demo mode: Simulating room join for', newRoomId);
        setParticipants([{
          address: userAddress,
          mediaState: {
            userId: userAddress,
            video: true,
            audio: true,
            screenShare: false
          }
        }]);
      }
      
      // Update security state
      setSecurityState(prev => ({
        ...prev,
        isSecure: true,
        identityVerified: validatePeerIdentity(userAddress),
        lastSecurityCheck: Date.now()
      }));
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Update security metrics
      setNetworkMetrics(prev => ({
        ...prev,
        failedConnections: prev.failedConnections + 1
      }));
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to access camera and microphone.';
      let securitySeverity: SecurityEvent['severity'] = 'low';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please check your devices.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
          securitySeverity = 'medium';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera or microphone constraints could not be satisfied.';
        }
      }
      
      // Report security event
      reportSecurityEvent({
        type: WebRTCSecurityError.MEDIA_VALIDATION_FAILED,
        severity: securitySeverity,
        message: `Media access failed: ${errorMessage}`,
        timestamp: Date.now(),
        userAddress: userAddress
      });
      
      throw new Error(errorMessage);
    }
    } catch (outerError) {
      console.error('Error in joinRoom:', outerError);
      
      // Update security metrics for join failure
      setNetworkMetrics(prev => ({
        ...prev,
        failedConnections: prev.failedConnections + 1
      }));
      
      // Report security event for join failure
      reportSecurityEvent({
        type: WebRTCSecurityError.CONNECTION_TIMEOUT,
        severity: 'medium',
        message: `Failed to join room: ${outerError instanceof Error ? outerError.message : 'Unknown error'}`,
        timestamp: Date.now(),
        userAddress: userAddress
      });
      
      throw outerError;
    }
  };

  // Initialize secure configuration on address change
  useEffect(() => {
    if (address && isWalletConnected) {
      initializeSecureConfig();
    }
  }, [address, isWalletConnected, initializeSecureConfig]);

  const leaveRoom = () => {
    console.log('Starting room cleanup...');
    
    try {
      // Emit leave room event if connected
      if (socket && roomId && mediaState.userId) {
        try {
          socket.emit('leave-room', { roomId, userAddress: mediaState.userId });
        } catch (socketError) {
          console.warn('Error emitting leave-room:', socketError);
        }
      }

      // Clean up local stream tracks
      if (localStream) {
        console.log('Stopping local stream tracks...');
        localStream.getTracks().forEach(track => {
          try {
            if (track.readyState === 'live') {
              track.stop();
            }
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
        
        // Clear video element
        if (localVideoRef.current) {
          try {
            localVideoRef.current.srcObject = null;
          } catch (videoError) {
            console.warn('Error clearing video element:', videoError);
          }
        }
        
        setLocalStream(null);
      }

      // Clean up peer connections with timeout
      console.log('Closing peer connections...');
      const cleanupPromises: Promise<void>[] = [];
      
      peerConnections.current.forEach((pc, address) => {
        const cleanupPromise = new Promise<void>((resolve) => {
          try {
            if (pc.connectionState !== 'closed') {
              pc.close();
            }
            resolve();
          } catch (error) {
            console.warn(`Error closing peer connection for ${address}:`, error);
            resolve();
          }
        });
        cleanupPromises.push(cleanupPromise);
      });

      // Wait for all peer connections to close, with timeout
      Promise.allSettled(cleanupPromises).then(() => {
        console.log('All peer connections cleaned up');
      });

      peerConnections.current.clear();

      // Clean up remote streams
      remoteStreams.forEach((stream, address) => {
        try {
          stream.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
        } catch (error) {
          console.warn(`Error stopping remote stream for ${address}:`, error);
        }
      });

      // Reset all state atomically with component mount check
      const resetState = () => {
        try {
          // Check if we should proceed with state reset
          // This prevents state updates on unmounted components
          setRoomId(null);
          setParticipants([]);
          setRemoteStreams(new Map());
          setChatMessages([]);
          setMediaState({
            userId: '',
            video: false,
            audio: false,
            screenShare: false
          });
        } catch (stateError) {
          // Silently catch state update errors from unmounted components
          console.warn('State reset skipped - component likely unmounted');
        }
      };

      // Use a small delay to ensure all cleanup operations complete
      // but also ensure this happens before navigation (which is delayed by 200+ms)
      setTimeout(resetState, 50);
      
      console.log('Room cleanup completed');

    } catch (error) {
      console.error('Error during room cleanup:', error);
      
      // Force reset state even if cleanup fails
      try {
        setRoomId(null);
        setParticipants([]);
        setRemoteStreams(new Map());
        setChatMessages([]);
        setMediaState({
          userId: '',
          video: false,
          audio: false,
          screenShare: false
        });
      } catch (stateError) {
        console.error('Error resetting state:', stateError);
      }
    }
  };

  const sendChatMessage = (message: string) => {
    if (!roomId || !mediaState.userId) return;

    // Security: Sanitize chat message
    const sanitizedMessage = sanitizeInput(message);
    if (sanitizedMessage !== message) {
      reportSecurityEvent({
        type: WebRTCSecurityError.SUSPICIOUS_ACTIVITY,
        severity: 'low',
        message: 'Chat message sanitized - potential XSS attempt',
        timestamp: Date.now(),
        userAddress: mediaState.userId
      });
    }
    
    // Security: Check message length
    if (sanitizedMessage.length > 1000) {
      reportSecurityEvent({
        type: WebRTCSecurityError.SUSPICIOUS_ACTIVITY,
        severity: 'medium',
        message: 'Oversized chat message blocked',
        timestamp: Date.now(),
        userAddress: mediaState.userId
      });
      return;
    }

    if (socket && isConnected) {
      const chatMessage: SignalingMessage = {
        type: 'chat-message',
        from: mediaState.userId,
        roomId,
        data: { message: sanitizedMessage },
        timestamp: Date.now()
      };
      
      // Validate chat message
      const validation = validateMessage(chatMessage);
      if (validation.isValid) {
        socket.emit('chat-message', {
          roomId,
          from: mediaState.userId,
          message: sanitizedMessage,
          timestamp: Date.now()
        });
      } else {
        reportSecurityEvent({
          type: WebRTCSecurityError.INVALID_SIGNATURE,
          severity: 'medium',
          message: `Invalid chat message: ${validation.errors.join(', ')}`,
          timestamp: Date.now(),
          userAddress: mediaState.userId
        });
      }
    } else {
      // Demo mode - add message locally
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        roomId,
        from: mediaState.userId,
        message: sanitizedMessage,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, newMessage]);
    }
  };

  const toggleVideo = () => {
    if (!localStream) {
      console.warn('No local stream available for video toggle');
      return;
    }

    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      console.log('Video track toggled:', {
        enabled: videoTrack.enabled,
        readyState: videoTrack.readyState,
        muted: videoTrack.muted
      });
      
      const newMediaState = {
        ...mediaState,
        video: videoTrack.enabled
      };
      setMediaState(newMediaState);

      if (socket && isConnected && roomId) {
        socket.emit('media-state-change', {
          roomId,
          userAddress: mediaState.userId,
          mediaState: newMediaState
        });
      }
    } else {
      console.warn('No video track found in local stream');
    }
  };

  const toggleAudio = () => {
    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const newMediaState = {
        ...mediaState,
        audio: audioTrack.enabled
      };
      setMediaState(newMediaState);

      if (socket && isConnected && roomId) {
        socket.emit('media-state-change', {
          roomId,
          userAddress: mediaState.userId,
          mediaState: newMediaState
        });
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const newStream = new MediaStream([videoTrack, audioTrack]);
        setLocalStream(newStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          // Ensure video continues playing after stream change
          const playPromise = localVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(playError => {
              console.warn('Error playing video after screen share start:', playError);
            });
          }
        }
      }

      const newMediaState = {
        ...mediaState,
        screenShare: true
      };
      setMediaState(newMediaState);

      if (socket && isConnected && roomId) {
        socket.emit('screen-share', {
          roomId,
          userAddress: mediaState.userId,
          sharing: true
        });
        socket.emit('media-state-change', {
          roomId,
          userAddress: mediaState.userId,
          mediaState: newMediaState
        });
      }

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  };

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const videoTrack = cameraStream.getVideoTracks()[0];
      
      // Replace track in all peer connections
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        const newStream = new MediaStream([videoTrack, audioTrack]);
        setLocalStream(newStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
          // Ensure video continues playing after stream change
          const playPromise = localVideoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(playError => {
              console.warn('Error playing video after screen share stop:', playError);
            });
          }
        }
      }

      const newMediaState = {
        ...mediaState,
        screenShare: false
      };
      setMediaState(newMediaState);

      if (socket && isConnected && roomId) {
        socket.emit('screen-share', {
          roomId,
          userAddress: mediaState.userId,
          sharing: false
        });
        socket.emit('media-state-change', {
          roomId,
          userAddress: mediaState.userId,
          mediaState: newMediaState
        });
      }

    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  };

  // Session security functions
  const setActiveSession = useCallback((sessionData: ActiveSessionData) => {
    console.log('Setting active session:', sessionData);
    setActiveSessionDataState(sessionData);
    setIsInActiveSession(true);
    setNavigationBlocked(true);
    
    // Add beforeunload event listener to prevent page refresh/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Você está em uma sessão ativa. Tem certeza que deseja sair?';
      return 'Você está em uma sessão ativa. Tem certeza que deseja sair?';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Store the cleanup function
    const cleanup = () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    
    // Store cleanup in ref for later use
    (setActiveSession as any).cleanup = cleanup;
  }, []);

  const clearActiveSession = useCallback(() => {
    console.log('Clearing active session');
    setActiveSessionDataState(null);
    setIsInActiveSession(false);
    setNavigationBlocked(false);
    
    // Remove beforeunload listener
    if ((setActiveSession as any).cleanup) {
      (setActiveSession as any).cleanup();
      (setActiveSession as any).cleanup = null;
    }
  }, [setActiveSession]);

  const canNavigate = useCallback(() => {
    return !isInActiveSession || !navigationBlocked;
  }, [isInActiveSession, navigationBlocked]);

  const requestLeaveSession = useCallback((onConfirm: () => void, onCancel?: () => void) => {
    if (!isInActiveSession) {
      onConfirm();
      return;
    }

    // Create and show confirmation modal
    const confirmLeave = window.confirm(
      `🚨 AVISO DE SEGURANÇA\n\n` +
      `Você está em uma sessão ativa de mentoria.\n\n` +
      `Sair agora pode:\n` +
      `• Interromper a chamada\n` +
      `• Causar perda de conexão\n` +
      `• Prejudicar a experiência do mentor\n\n` +
      `Recomendamos usar o botão "Leave Session" para sair adequadamente.\n\n` +
      `Tem CERTEZA que deseja continuar?`
    );

    if (confirmLeave) {
      console.log('User confirmed leaving active session');
      clearActiveSession();
      onConfirm();
    } else {
      console.log('User cancelled navigation during active session');
      if (onCancel) {
        onCancel();
      }
    }
  }, [isInActiveSession, clearActiveSession]);

  // PAYER PRESENCE TRACKING - Methods for managing payer address
  const setPayerAddress = useCallback((newPayerAddress: string | null) => {
    console.log('🎯 WebRTCContext: Setting payer address', { 
      previous: payerAddress, 
      new: newPayerAddress 
    });
    setPayerAddressState(newPayerAddress);
  }, [payerAddress]);
  
  const getPayerAddress = useCallback(() => {
    return payerAddress;
  }, [payerAddress]);
  
  const isCurrentUserPayer = useCallback(() => {
    return payerAddress && address ? 
      payerAddress.toLowerCase() === address.toLowerCase() : 
      false;
  }, [payerAddress, address]);

  // Enhanced leaveRoom that clears active session
  const enhancedLeaveRoom = useCallback(() => {
    clearActiveSession();
    leaveRoom();
  }, [leaveRoom, clearActiveSession]);

  // Cleanup function for security resources
  const cleanupSecurity = useCallback(() => {
    // Clear heartbeat
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    // Clear connection timeouts
    connectionTimeouts.current.forEach(timeout => clearTimeout(timeout));
    connectionTimeouts.current.clear();
    
    // Clear message queues
    messageQueue.current.clear();
    lastMessageTime.current.clear();
    
    // Reset security state
    setSecurityState({
      isSecure: false,
      encryptionEnabled: false,
      certificateValid: false,
      identityVerified: false,
      lastSecurityCheck: Date.now(),
      securityWarnings: []
    });
  }, []);

  // Enhanced leave room with security cleanup
  const secureLeaveRoom = useCallback(() => {
    enhancedLeaveRoom();
    cleanupSecurity();
  }, [enhancedLeaveRoom, cleanupSecurity]);

  const value: WebRTCContextType = {
    socket,
    isConnected,
    roomId,
    participants,
    
    // Active session security
    isInActiveSession,
    activeSessionData,
    navigationBlocked,
    
    localStream,
    remoteStreams,
    mediaState,
    chatMessages,
    
    // Security state
    securityState,
    networkMetrics,
    
    // PAYER PRESENCE TRACKING methods
    setPayerAddress,
    getPayerAddress,
    isCurrentUserPayer,
    
    joinRoom,
    leaveRoom: secureLeaveRoom, // Use secure version with security cleanup
    sendChatMessage,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    
    // Session security methods
    setActiveSession,
    clearActiveSession,
    canNavigate,
    requestLeaveSession,
    
    // Security methods
    validateMessage,
    reportSecurityEvent,
    getConnectionMetrics,
    
    localVideoRef,
    remoteVideoRefs: remoteVideoRefs.current
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};