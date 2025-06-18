import { Server as SocketIOServer } from 'socket.io';
import { WebRTCRoom, WebRTCMessage, ChatMessage, RoomParticipant, MediaState } from '../types';
import { logger } from '../utils/logger';

export class WebRTCService {
  private static instance: WebRTCService;
  private rooms: Map<string, WebRTCRoom> = new Map();
  private roomParticipants: Map<string, RoomParticipant[]> = new Map();
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  // private _io: SocketIOServer | null = null;

  public static getInstance(): WebRTCService {
    if (!WebRTCService.instance) {
      WebRTCService.instance = new WebRTCService();
    }
    return WebRTCService.instance;
  }

  /**
   * Initialize Socket.io server for WebRTC signaling
   */
  public initializeSocketIO(io: SocketIOServer): void {
    // 🔒 SECURITY: Add authentication middleware for Socket.io connections
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const userAddress = socket.handshake.auth.userAddress;
        
        // Validate required authentication parameters
        if (!token || !userAddress) {
          logger.warn(`🔒 WebRTC authentication failed: Missing credentials for ${socket.id}`);
          return next(new Error('Authentication required'));
        }
        
        // TODO: Implement proper SIWE token validation here
        // For now, we'll do basic validation
        if (typeof token !== 'string' || typeof userAddress !== 'string') {
          logger.warn(`🔒 WebRTC authentication failed: Invalid credentials format for ${socket.id}`);
          return next(new Error('Invalid credentials format'));
        }
        
        // Store authenticated user info in socket
        socket.data.userAddress = userAddress;
        socket.data.authenticated = true;
        
        logger.info(`🔒 WebRTC authentication successful for ${userAddress} (${socket.id})`);
        next();
      } catch (error) {
        logger.error(`🔒 WebRTC authentication error for ${socket.id}:`, error);
        next(new Error('Authentication failed'));
      }
    });
    
    io.on('connection', (socket) => {
      logger.info(`🔒 Authenticated socket connected: ${socket.id} (${socket.data.userAddress})`);

      // Handle joining a room
      socket.on('join-room', (data: { roomId: string; userAddress: string }) => {
        this.handleJoinRoom(socket, data.roomId, data.userAddress);
      });

      // Handle leaving a room
      socket.on('leave-room', (data: { roomId: string; userAddress: string }) => {
        this.handleLeaveRoom(socket, data.roomId, data.userAddress);
      });

      // Handle WebRTC signaling
      socket.on('webrtc-signal', (message: WebRTCMessage) => {
        this.handleWebRTCSignal(socket, message);
      });

      // Handle chat messages
      socket.on('chat-message', (data: { roomId: string; from: string; message: string }) => {
        this.handleChatMessage(socket, data);
      });

      // Handle media state changes
      socket.on('media-state-change', (data: { roomId: string; userAddress: string; mediaState: MediaState }) => {
        this.handleMediaStateChange(socket, data);
      });

      // Handle screen sharing
      socket.on('screen-share', (data: { roomId: string; userAddress: string; sharing: boolean }) => {
        this.handleScreenShare(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Create a new WebRTC room for a mentorship session
   */
  public createRoom(sessionId: string, participants: string[]): WebRTCRoom {
    const roomId = `room_${sessionId}_${Date.now()}`;
    
    const room: WebRTCRoom = {
      roomId,
      sessionId,
      participants,
      createdAt: new Date(),
      config: {
        iceServers: [
          {
            urls: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
          },
          // Add TURN servers if configured
          ...(process.env.WEBRTC_TURN_SERVER ? [{
            urls: process.env.WEBRTC_TURN_SERVER,
            username: process.env.WEBRTC_TURN_USERNAME,
            credential: process.env.WEBRTC_TURN_PASSWORD,
          }] : []),
        ],
      },
    };

    this.rooms.set(roomId, room);
    logger.info(`WebRTC room created: ${roomId} for session: ${sessionId}`);
    
    return room;
  }

  /**
   * Get room by ID
   */
  public getRoom(roomId: string): WebRTCRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add participant to room
   */
  public addParticipant(roomId: string, participantAddress: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (!room.participants.includes(participantAddress)) {
      room.participants.push(participantAddress);
      logger.info(`Participant ${participantAddress} added to room ${roomId}`);
    }

    return true;
  }

  /**
   * Remove participant from room
   */
  public removeParticipant(roomId: string, participantAddress: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const index = room.participants.indexOf(participantAddress);
    if (index > -1) {
      room.participants.splice(index, 1);
      logger.info(`Participant ${participantAddress} removed from room ${roomId}`);
    }

    // Clean up empty rooms
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      logger.info(`Empty room ${roomId} deleted`);
    }

    return true;
  }

  /**
   * Get all active rooms
   */
  public getActiveRooms(): WebRTCRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Clean up old rooms (rooms older than 24 hours)
   */
  public cleanupOldRooms(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.createdAt < oneDayAgo) {
        this.rooms.delete(roomId);
        this.roomParticipants.delete(roomId);
        this.chatMessages.delete(roomId);
        logger.info(`Old room ${roomId} cleaned up`);
      }
    }
  }

  /**
   * Socket.io event handlers
   */
  private handleJoinRoom(socket: any, roomId: string, userAddress: string): void {
    // 🔒 SECURITY: Verify authenticated user matches the requested user address
    if (!socket.data.authenticated || socket.data.userAddress !== userAddress) {
      logger.warn(`🔒 Unauthorized join attempt: ${socket.data.userAddress} tried to join as ${userAddress}`);
      socket.emit('error', { message: 'Unauthorized: User address mismatch' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Check if user is authorized to join the room
    if (!room.participants.includes(userAddress)) {
      logger.warn(`🔒 User ${userAddress} not authorized for room ${roomId}`);
      socket.emit('error', { message: 'Unauthorized to join room' });
      return;
    }

    socket.join(roomId);

    // Add participant to room
    const participants = this.roomParticipants.get(roomId) || [];
    const existingParticipant = participants.find(p => p.address === userAddress);
    
    if (!existingParticipant) {
      const participant: RoomParticipant = {
        address: userAddress,
        socketId: socket.id,
        mediaState: {
          userId: userAddress,
          video: false,
          audio: false,
          screenShare: false
        },
        joinedAt: new Date()
      };
      participants.push(participant);
      this.roomParticipants.set(roomId, participants);
    } else {
      existingParticipant.socketId = socket.id;
    }

    // Notify other participants
    socket.to(roomId).emit('user-joined', {
      userAddress,
      participants: participants.map(p => ({
        address: p.address,
        mediaState: p.mediaState
      }))
    });

    // Send room config and chat history to new participant
    socket.emit('room-joined', {
      roomId,
      config: room.config,
      participants: participants.map(p => ({
        address: p.address,
        mediaState: p.mediaState
      })),
      chatHistory: this.chatMessages.get(roomId) || []
    });

    logger.info(`User ${userAddress} joined room ${roomId}`);
  }

  private handleLeaveRoom(socket: any, roomId: string, userAddress: string): void {
    socket.leave(roomId);

    const participants = this.roomParticipants.get(roomId) || [];
    const updatedParticipants = participants.filter(p => p.address !== userAddress);
    this.roomParticipants.set(roomId, updatedParticipants);

    // Notify other participants
    socket.to(roomId).emit('user-left', {
      userAddress,
      participants: updatedParticipants.map(p => ({
        address: p.address,
        mediaState: p.mediaState
      }))
    });

    logger.info(`User ${userAddress} left room ${roomId}`);
  }

  private handleWebRTCSignal(socket: any, message: WebRTCMessage): void {
    const { roomId, to, type } = message;

    if (to) {
      // Send to specific participant
      const participants = this.roomParticipants.get(roomId) || [];
      const targetParticipant = participants.find(p => p.address === to);
      
      if (targetParticipant) {
        socket.to(targetParticipant.socketId).emit('webrtc-signal', {
          ...message,
          timestamp: new Date()
        });
      }
    } else {
      // Broadcast to room
      socket.to(roomId).emit('webrtc-signal', {
        ...message,
        timestamp: new Date()
      });
    }

    logger.debug(`WebRTC signal (${type}) relayed in room ${roomId}`);
  }

  private handleChatMessage(socket: any, data: { roomId: string; from: string; message: string }): void {
    const { roomId, from, message } = data;

    // 🔒 SECURITY: Verify authenticated user matches sender
    if (!socket.data.authenticated || socket.data.userAddress !== from) {
      logger.warn(`🔒 Unauthorized chat message: ${socket.data.userAddress} tried to send as ${from}`);
      socket.emit('error', { message: 'Unauthorized: User address mismatch' });
      return;
    }

    // 🔒 SECURITY: Sanitize message content (basic validation)
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      socket.emit('error', { message: 'Invalid message content' });
      return;
    }

    // 🔒 SECURITY: Message length limit
    const sanitizedMessage = message.trim().substring(0, 500);
    
    // Verify user is in the room
    const participants = this.roomParticipants.get(roomId) || [];
    const isParticipant = participants.some(p => p.address === from);
    
    if (!isParticipant) {
      logger.warn(`🔒 User ${from} not a participant of room ${roomId}`);
      socket.emit('error', { message: 'Unauthorized: Not a room participant' });
      return;
    }

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      from,
      message: sanitizedMessage,
      timestamp: new Date()
    };

    // Store message (limit chat history to 100 messages per room)
    const messages = this.chatMessages.get(roomId) || [];
    messages.push(chatMessage);
    
    // Keep only last 100 messages to prevent memory bloat
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
    
    this.chatMessages.set(roomId, messages);

    // Broadcast to room
    socket.to(roomId).emit('chat-message', chatMessage);
    socket.emit('chat-message-sent', chatMessage);

    logger.info(`🔒 Secure chat message from ${from} in room ${roomId}`);
  }

  private handleMediaStateChange(socket: any, data: { roomId: string; userAddress: string; mediaState: MediaState }): void {
    const { roomId, userAddress, mediaState } = data;

    const participants = this.roomParticipants.get(roomId) || [];
    const participant = participants.find(p => p.address === userAddress);
    
    if (participant) {
      participant.mediaState = mediaState;
      this.roomParticipants.set(roomId, participants);

      // Broadcast media state change to room
      socket.to(roomId).emit('media-state-changed', {
        userAddress,
        mediaState
      });

      logger.info(`Media state changed for ${userAddress} in room ${roomId}`);
    }
  }

  private handleScreenShare(socket: any, data: { roomId: string; userAddress: string; sharing: boolean }): void {
    const { roomId, userAddress, sharing } = data;

    // Broadcast screen share state to room
    socket.to(roomId).emit('screen-share-changed', {
      userAddress,
      sharing
    });

    logger.info(`Screen share ${sharing ? 'started' : 'stopped'} by ${userAddress} in room ${roomId}`);
  }

  private handleDisconnection(socket: any): void {
    // Find and remove participant from all rooms
    for (const [roomId, participants] of this.roomParticipants.entries()) {
      const participant = participants.find(p => p.socketId === socket.id);
      if (participant) {
        this.handleLeaveRoom(socket, roomId, participant.address);
        break;
      }
    }

    logger.info(`Socket disconnected: ${socket.id}`);
  }

  /**
   * Get chat messages for a room
   */
  public getChatMessages(roomId: string): ChatMessage[] {
    return this.chatMessages.get(roomId) || [];
  }

  /**
   * Get participants for a room
   */
  public getRoomParticipants(roomId: string): RoomParticipant[] {
    return this.roomParticipants.get(roomId) || [];
  }
}