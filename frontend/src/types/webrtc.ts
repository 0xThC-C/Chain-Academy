/**
 * WebRTC Security Types
 * Type definitions for secure WebRTC implementation
 */

// Base signaling message interface
export interface SignalingMessage {
  type: string;
  from: string;
  to?: string;
  roomId: string;
  data?: any;
  timestamp?: number;
  signature?: string;
}

// Security validation result
export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  risk: 'low' | 'medium' | 'high';
}

// Peer connection metrics for monitoring
export interface PeerConnectionMetrics {
  connectionId: string;
  peerId: string;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  gatheringState: RTCIceGatheringState;
  signalingState: RTCSignalingState;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  rtt: number; // Round-trip time
  connectionTime: number;
  lastActivity: number;
}

// Enhanced media state with security context
export interface SecureMediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
  encrypted: boolean;
  validated: boolean;
  lastValidation: number;
}

// Secure participant interface
export interface SecureParticipant {
  address: string;
  mediaState: SecureMediaState;
  connectionMetrics?: PeerConnectionMetrics;
  isAuthenticated: boolean;
  joinTime: number;
  lastActivity: number;
}

// Room security configuration
export interface RoomSecurityConfig {
  maxParticipants: number;
  requireAuthentication: boolean;
  allowAnonymous: boolean;
  sessionTimeout: number;
  encryptionRequired: boolean;
  allowedOrigins: string[];
}

// Connection security state
export interface ConnectionSecurityState {
  isSecure: boolean;
  encryptionEnabled: boolean;
  certificateValid: boolean;
  identityVerified: boolean;
  lastSecurityCheck: number;
  securityWarnings: string[];
}

// Network security metrics
export interface NetworkSecurityMetrics {
  connectionAttempts: number;
  failedConnections: number;
  rateLimitViolations: number;
  suspiciousActivity: number;
  blockedIPs: number;
  lastReset: number;
}

// Secure WebRTC configuration
export interface SecureWebRTCConfig {
  iceServers: RTCIceServer[];
  enableTURN: boolean;
  requireEncryption: boolean;
  maxConnectionTime: number;
  heartbeatInterval: number;
  securityChecks: {
    validatePeers: boolean;
    monitorTraffic: boolean;
    detectAnomalies: boolean;
    blockSuspicious: boolean;
  };
}

// Authentication context for WebRTC
export interface WebRTCAuthContext {
  userAddress: string;
  signature?: string;
  timestamp: number;
  sessionId: string;
  permissions: string[];
  expiresAt: number;
}

// Media stream validation result
export interface MediaStreamValidation {
  isValid: boolean;
  trackCount: number;
  audioTracks: number;
  videoTracks: number;
  issues: string[];
  recommendations: string[];
}

// Room access validation
export interface RoomAccessValidation {
  hasAccess: boolean;
  reason?: string;
  permissions: string[];
  restrictions: string[];
  expiration?: number;
}

// Error types for WebRTC security
export enum WebRTCSecurityError {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  PEER_VALIDATION_FAILED = 'PEER_VALIDATION_FAILED',
  MEDIA_VALIDATION_FAILED = 'MEDIA_VALIDATION_FAILED'
}

// Security event for logging
export interface SecurityEvent {
  type: WebRTCSecurityError;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  userAddress?: string;
  ip?: string;
  additionalData?: any;
}

// TURN server configuration with security
export interface SecureTURNConfig {
  urls: string[];
  username: string;
  credential: string;
  credentialType?: 'password' | 'oauth';
  expiresAt: number;
  secure: boolean;
}

// Heartbeat message for connection monitoring
export interface HeartbeatMessage {
  type: 'heartbeat';
  from: string;
  timestamp: number;
  sequenceNumber: number;
  metrics?: {
    connectionQuality: number;
    latency: number;
    packetLoss: number;
  };
}

// Secure chat message with validation
export interface SecureChatMessage {
  id: string;
  roomId: string;
  from: string;
  message: string;
  timestamp: Date;
  encrypted: boolean;
  validated: boolean;
  signature?: string;
}

// Connection state security validation
export interface ConnectionStateValidation {
  state: RTCPeerConnectionState;
  isSecure: boolean;
  lastStateChange: number;
  stateHistory: Array<{
    state: RTCPeerConnectionState;
    timestamp: number;
  }>;
  anomalies: string[];
}

// Signaling security context
export interface SignalingSecurityContext {
  messageCount: number;
  lastMessage: number;
  rateLimitRemaining: number;
  isBlocked: boolean;
  suspiciousPatterns: string[];
  validationHistory: SecurityValidationResult[];
}

// Media device security validation
export interface MediaDeviceValidation {
  deviceId: string;
  kind: MediaDeviceKind;
  isAuthorized: boolean;
  permissions: PermissionState;
  lastAccess: number;
  accessHistory: Array<{
    timestamp: number;
    granted: boolean;
    reason?: string;
  }>;
}

// Enhanced WebRTC context with security
export interface SecureWebRTCContext {
  // Basic WebRTC functionality
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: SecureParticipant[];
  
  // Security state
  securityState: ConnectionSecurityState;
  authContext: WebRTCAuthContext | null;
  networkMetrics: NetworkSecurityMetrics;
  
  // Security methods
  validateMessage: (message: SignalingMessage) => SecurityValidationResult;
  authenticatePeer: (peerId: string) => Promise<boolean>;
  validateMediaAccess: () => Promise<MediaDeviceValidation[]>;
  reportSecurityEvent: (event: SecurityEvent) => void;
  
  // Enhanced connection methods
  secureJoinRoom: (roomId: string, authToken: string) => Promise<void>;
  secureLeaveRoom: () => Promise<void>;
  sendSecureMessage: (message: string) => Promise<void>;
}

// Configuration for security monitoring
export interface SecurityMonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  alertThresholds: {
    failedConnections: number;
    rateLimitViolations: number;
    suspiciousActivity: number;
  };
  reporting: {
    endpoint?: string;
    interval: number;
    includeMetrics: boolean;
  };
}

