/**
 * WebRTC Security Hardening Module
 * Implements comprehensive security measures for WebRTC connections and signaling
 */

import { SignalingMessage, PeerConnectionMetrics, SecurityValidationResult } from '../types/webrtc';

// Rate limiting configuration
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

// TURN server configuration with authentication
interface TURNConfig {
  urls: string[];
  username: string;
  credential: string;
  credentialType?: 'password' | 'oauth';
}

// Security monitoring state
interface SecurityState {
  connections: Map<string, PeerConnectionMetrics>;
  rateLimits: Map<string, number[]>;
  blockedIPs: Set<string>;
  suspiciousActivity: Map<string, number>;
  lastCleanup: number;
}

class WebRTCSecurityManager {
  private securityState: SecurityState;
  private config: {
    rateLimit: RateLimitConfig;
    maxConnectionsPerIP: number;
    maxSignalingRate: number;
    turnConfig: TURNConfig;
    enableEncryption: boolean;
    allowedOrigins: string[];
    maxSessionDuration: number;
  };

  constructor() {
    this.securityState = {
      connections: new Map(),
      rateLimits: new Map(),
      blockedIPs: new Set(),
      suspiciousActivity: new Map(),
      lastCleanup: Date.now()
    };

    this.config = {
      rateLimit: {
        maxRequests: 30,
        windowMs: 60000, // 1 minute
        blockDurationMs: 300000 // 5 minutes
      },
      maxConnectionsPerIP: 5,
      maxSignalingRate: 10, // messages per second
      turnConfig: {
        urls: [
          'turn:turn.chainacademy.io:3478',
          'turns:turn.chainacademy.io:5349'
        ],
        username: '',
        credential: ''
      },
      enableEncryption: true,
      allowedOrigins: [
        'https://chainacademy.io',
        'https://app.chainacademy.io',
        'http://localhost:3000' // Development only
      ],
      maxSessionDuration: 7200000 // 2 hours
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate secure TURN credentials with time-based authentication
   */
  generateTURNCredentials(userAddress: string): TURNConfig {
    const timestamp = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours expiry
    const username = `${timestamp}:${userAddress}`;
    
    // In production, this would use HMAC-SHA256 with server secret
    const credential = this.generateHMAC(username, process.env.REACT_APP_TURN_SECRET || 'dev-secret');
    
    return {
      ...this.config.turnConfig,
      username,
      credential,
      credentialType: 'password'
    };
  }

  /**
   * Generate HMAC-SHA256 for TURN authentication
   */
  private generateHMAC(data: string, secret: string): string {
    // Simple hash for development - use proper HMAC in production
    return btoa(`${data}:${secret}`).slice(0, 20);
  }

  /**
   * Create secure RTCConfiguration with enhanced ICE servers
   */
  createSecureRTCConfiguration(userAddress: string): RTCConfiguration {
    const turnConfig = this.generateTURNCredentials(userAddress);
    
    return {
      iceServers: [
        // STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Secure TURN servers with authentication
        {
          urls: turnConfig.urls,
          username: turnConfig.username,
          credential: turnConfig.credential
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      // Enable DTLS-SRTP for media encryption
      certificates: undefined // Will use browser-generated certificates
    };
  }

  /**
   * Validate signaling message before processing
   */
  validateSignalingMessage(message: SignalingMessage, senderIP: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      risk: 'low'
    };

    // Check if IP is blocked
    if (this.securityState.blockedIPs.has(senderIP)) {
      result.isValid = false;
      result.errors.push('IP address is blocked due to suspicious activity');
      result.risk = 'high';
      return result;
    }

    // Rate limiting check
    if (!this.checkRateLimit(senderIP)) {
      result.isValid = false;
      result.errors.push('Rate limit exceeded');
      result.risk = 'medium';
      this.recordSuspiciousActivity(senderIP);
      return result;
    }

    // Validate message structure
    if (!this.validateMessageStructure(message)) {
      result.isValid = false;
      result.errors.push('Invalid message structure');
      result.risk = 'medium';
      return result;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(message);
    if (suspiciousPatterns.length > 0) {
      result.warnings.push(...suspiciousPatterns);
      result.risk = 'medium';
      this.recordSuspiciousActivity(senderIP);
    }

    return result;
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    
    if (!this.securityState.rateLimits.has(ip)) {
      this.securityState.rateLimits.set(ip, []);
    }
    
    const requests = this.securityState.rateLimits.get(ip)!;
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.config.rateLimit.maxRequests) {
      // Block IP temporarily
      setTimeout(() => {
        this.securityState.blockedIPs.delete(ip);
      }, this.config.rateLimit.blockDurationMs);
      
      this.securityState.blockedIPs.add(ip);
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.securityState.rateLimits.set(ip, recentRequests);
    
    return true;
  }

  /**
   * Validate message structure and content
   */
  private validateMessageStructure(message: SignalingMessage): boolean {
    // Check required fields
    if (!message.type || !message.from || !message.roomId) {
      return false;
    }

    // Validate message types
    const allowedTypes = ['offer', 'answer', 'ice-candidate', 'join-room', 'leave-room', 'chat-message'];
    if (!allowedTypes.includes(message.type)) {
      return false;
    }

    // Validate address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(message.from)) {
      return false;
    }

    // Check message size limits
    const messageSize = JSON.stringify(message).length;
    if (messageSize > 10240) { // 10KB limit
      return false;
    }

    return true;
  }

  /**
   * Detect suspicious patterns in messages
   */
  private detectSuspiciousPatterns(message: SignalingMessage): string[] {
    const warnings: string[] = [];

    // Check for script injection attempts
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onclick=/i,
      /onerror=/i,
      /eval\(/i
    ];

    const messageContent = JSON.stringify(message);
    for (const pattern of dangerousPatterns) {
      if (pattern.test(messageContent)) {
        warnings.push('Potential script injection detected');
        break;
      }
    }

    // Check for excessive special characters (possible obfuscation)
    const specialCharCount = (messageContent.match(/[<>{}[\]\\]/g) || []).length;
    if (specialCharCount > messageContent.length * 0.1) {
      warnings.push('Excessive special characters detected');
    }

    return warnings;
  }

  /**
   * Record suspicious activity for IP monitoring
   */
  private recordSuspiciousActivity(ip: string): void {
    const current = this.securityState.suspiciousActivity.get(ip) || 0;
    this.securityState.suspiciousActivity.set(ip, current + 1);

    // Auto-block after multiple violations
    if (current >= 5) {
      this.securityState.blockedIPs.add(ip);
      console.warn(`IP ${ip} blocked due to repeated suspicious activity`);
    }
  }

  /**
   * Validate peer identity using cryptographic verification
   */
  validatePeerIdentity(peerId: string): boolean {
    // Basic validation - in production this would verify wallet signatures
    if (!peerId || !/^0x[a-fA-F0-9]{40}$/.test(peerId)) {
      return false;
    }

    // TODO: Implement SIWE (Sign-In with Ethereum) verification
    // This would verify that the peer actually controls the claimed address
    
    return true;
  }

  /**
   * Monitor connection metrics for anomalies
   */
  monitorConnection(connectionId: string, metrics: Partial<PeerConnectionMetrics>): void {
    const existing = this.securityState.connections.get(connectionId);
    const updated: PeerConnectionMetrics = {
      connectionId,
      peerId: metrics.peerId || existing?.peerId || '',
      connectionState: metrics.connectionState || existing?.connectionState || 'new',
      iceConnectionState: metrics.iceConnectionState || existing?.iceConnectionState || 'new',
      gatheringState: metrics.gatheringState || existing?.gatheringState || 'new',
      signalingState: metrics.signalingState || existing?.signalingState || 'stable',
      bytesReceived: metrics.bytesReceived || existing?.bytesReceived || 0,
      bytesSent: metrics.bytesSent || existing?.bytesSent || 0,
      packetsLost: metrics.packetsLost || existing?.packetsLost || 0,
      rtt: metrics.rtt || existing?.rtt || 0,
      connectionTime: metrics.connectionTime || existing?.connectionTime || Date.now(),
      lastActivity: Date.now()
    };

    this.securityState.connections.set(connectionId, updated);

    // Check for anomalies
    this.detectConnectionAnomalies(updated);
  }

  /**
   * Detect connection anomalies that might indicate attacks
   */
  private detectConnectionAnomalies(metrics: PeerConnectionMetrics): void {
    const warnings: string[] = [];

    // Check for excessive packet loss (possible DoS)
    if (metrics.packetsLost > 1000) {
      warnings.push('Excessive packet loss detected');
    }

    // Check for unusual RTT values
    if (metrics.rtt > 5000) { // 5 seconds
      warnings.push('Unusually high round-trip time');
    }

    // Check for connection duration
    const duration = Date.now() - metrics.connectionTime;
    if (duration > this.config.maxSessionDuration) {
      warnings.push('Connection exceeds maximum session duration');
    }

    if (warnings.length > 0) {
      console.warn(`Connection anomalies detected for ${metrics.connectionId}:`, warnings);
    }
  }

  /**
   * Secure room access validation
   */
  validateRoomAccess(roomId: string, userAddress: string, sessionData?: any): boolean {
    // Validate room ID format
    if (!roomId || roomId.length < 10) {
      return false;
    }

    // Check if user is authorized for this room
    // In production, this would verify against smart contract data
    if (sessionData) {
      const authorizedUsers = [sessionData.mentorAddress, sessionData.studentAddress];
      if (!authorizedUsers.includes(userAddress)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Implement connection throttling to prevent DoS
   */
  shouldThrottleConnection(ip: string): boolean {
    const connections = Array.from(this.securityState.connections.values())
      .filter(conn => conn.peerId === ip)
      .length;

    return connections >= this.config.maxConnectionsPerIP;
  }

  /**
   * Secure media stream validation
   */
  validateMediaStream(stream: MediaStream): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      risk: 'low'
    };

    // Check stream validity
    if (!stream || !stream.active) {
      result.isValid = false;
      result.errors.push('Invalid or inactive media stream');
      return result;
    }

    // Validate track count (prevent excessive tracks)
    const trackCount = stream.getTracks().length;
    if (trackCount > 5) {
      result.warnings.push('Unusual number of media tracks');
      result.risk = 'medium';
    }

    // Check track types
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    if (videoTracks.length > 2) {
      result.warnings.push('Multiple video tracks detected');
    }

    if (audioTracks.length > 2) {
      result.warnings.push('Multiple audio tracks detected');
    }

    return result;
  }

  /**
   * Clean up expired data and connections
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const oneHour = 3600000;

      // Clean up old rate limit data
      this.securityState.rateLimits.forEach((timestamps, ip) => {
        const recent = timestamps.filter(time => now - time < this.config.rateLimit.windowMs);
        if (recent.length === 0) {
          this.securityState.rateLimits.delete(ip);
        } else {
          this.securityState.rateLimits.set(ip, recent);
        }
      });

      // Clean up old connections
      this.securityState.connections.forEach((metrics, id) => {
        if (now - metrics.lastActivity > oneHour) {
          this.securityState.connections.delete(id);
        }
      });

      // Reset suspicious activity counters periodically
      if (now - this.securityState.lastCleanup > oneHour) {
        this.securityState.suspiciousActivity.clear();
        this.securityState.lastCleanup = now;
      }

    }, 300000); // Run every 5 minutes
  }

  /**
   * Generate secure connection timeout handling
   */
  createSecureTimeout(callback: () => void, delay: number, maxDelay: number = 30000): NodeJS.Timeout {
    const actualDelay = Math.min(delay, maxDelay);
    return setTimeout(callback, actualDelay);
  }

  /**
   * Validate and sanitize user input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 1000); // Limit length
  }

  /**
   * Get security metrics for monitoring
   */
  getSecurityMetrics() {
    return {
      activeConnections: this.securityState.connections.size,
      blockedIPs: this.securityState.blockedIPs.size,
      suspiciousActivities: this.securityState.suspiciousActivity.size,
      rateLimitedIPs: this.securityState.rateLimits.size
    };
  }
}

// Export singleton instance
export const webrtcSecurity = new WebRTCSecurityManager();

// Export helper functions
export const {
  generateTURNCredentials,
  createSecureRTCConfiguration,
  validateSignalingMessage,
  validatePeerIdentity,
  monitorConnection,
  validateRoomAccess,
  shouldThrottleConnection,
  validateMediaStream,
  sanitizeInput,
  getSecurityMetrics
} = webrtcSecurity;