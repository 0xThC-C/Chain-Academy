import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebRTCService } from './services/webrtc.service';
import { generalLimiter, authLimiter, webrtcLimiter } from './middlewares/rateLimiter';
import { requireAuth, requireWebRTCAuth, validateSessionSecurity } from './middlewares/auth';
import { errorHandler } from './middlewares/errorHandler';
import { sanitizeInput, validateRequest, securityHeaders, apiVersioning, validateWebRTCAccess } from './middlewares/security';
import { serveAPIDocs } from './middlewares/documentation';
import { logger } from './utils/logger';
import rpcRoutes from './routes/rpc.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Configure Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize WebRTC service
const webrtcService = WebRTCService.getInstance();
webrtcService.initializeSocketIO(io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration with validation
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins.push(process.env.FRONTEND_URL || 'http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    // 🔒 SECURITY: Only allow requests from explicitly allowed origins
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!origin && process.env.NODE_ENV === 'development') {
      // Only allow no-origin requests in development (for testing tools)
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// 📚 API Documentation
app.use('/api', serveAPIDocs);

// API Routes
app.use('/api/rpc', rpcRoutes);

// Basic route
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chain Academy V2 Backend is running!',
    timestamp: new Date().toISOString(),
    webrtc: {
      activeRooms: webrtcService.getActiveRooms().length
    }
  });
});

// WebRTC room management routes with authentication and rate limiting
app.post('/api/webrtc/rooms', webrtcLimiter, requireWebRTCAuth, (req, res) => {
  try {
    const { sessionId, participants } = req.body;
    
    // Input validation
    if (!sessionId || !Array.isArray(participants) || participants.length !== 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request: sessionId and 2 participants required' 
      });
    }
    
    // Validate participant addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!participants.every(addr => addressRegex.test(addr))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid participant addresses' 
      });
    }
    
    const room = webrtcService.createRoom(sessionId, participants);
    res.json({ success: true, room });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

app.get('/api/webrtc/rooms/:roomId', requireAuth, (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const room = webrtcService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const participants = webrtcService.getRoomParticipants(roomId);
    const chatMessages = webrtcService.getChatMessages(roomId);
    
    return res.json({ 
      success: true, 
      room,
      participants: participants.map(p => ({
        address: p.address,
        mediaState: p.mediaState,
        joinedAt: p.joinedAt
      })),
      chatMessages
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to get room info' });
  }
});

// Cleanup old rooms every hour
setInterval(() => {
  webrtcService.cleanupOldRooms();
}, 60 * 60 * 1000);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Chain Academy V2 Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io server initialized`);
  console.log(`📹 WebRTC service ready`);
});

// 🔒 ENHANCED: Error handling middleware (must be last)
app.use(errorHandler);

// 🔒 SECURITY: 404 handler
app.use('*', (req, res) => {
  logger.warn(`🔒 404 - Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

export default app;
export { server, webrtcService };