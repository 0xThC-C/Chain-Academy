# WebRTC Implementation for Chain Academy V2

This implementation provides a complete WebRTC communication system with video/audio calls, real-time chat, and screen sharing capabilities following the Discord-style design pattern with black/white/red color scheme.

## Architecture Overview

### Backend Components

1. **WebRTC Service** (`/backend/src/services/webrtc.service.ts`)
   - Room management and participant tracking
   - Socket.io signaling server
   - Chat message handling
   - Media state management
   - Screen sharing coordination

2. **Socket.io Server** (`/backend/src/index.ts`)
   - WebRTC signaling
   - Real-time communication
   - Room-based event handling
   - CORS configuration for frontend

3. **API Endpoints**
   - `POST /api/webrtc/rooms` - Create new room
   - `GET /api/webrtc/rooms/:roomId` - Get room information

### Frontend Components

1. **WebRTC Context** (`/frontend/src/contexts/WebRTCContext.tsx`)
   - WebRTC peer connection management
   - Media stream handling
   - Socket.io client integration
   - State management for participants and chat

2. **SessionRoom** (`/frontend/src/components/SessionRoom.tsx`)
   - Main session interface
   - Layout management
   - Navigation and controls

3. **VideoCall** (`/frontend/src/components/VideoCall.tsx`)
   - Video stream rendering
   - Grid layout for multiple participants
   - Media state indicators
   - Connection status display

4. **ChatPanel** (`/frontend/src/components/ChatPanel.tsx`)
   - Real-time messaging
   - Message history
   - User identification
   - Discord-style chat interface

5. **MediaControls** (`/frontend/src/components/MediaControls.tsx`)
   - Video/audio toggle controls
   - Screen sharing controls
   - Settings panel
   - Media state indicators

6. **ParticipantsList** (`/frontend/src/components/ParticipantsList.tsx`)
   - Participant management
   - Connection quality indicators
   - Session statistics

## Features

### Core WebRTC Features
- ✅ Peer-to-peer video/audio calls
- ✅ Screen sharing with seamless switching
- ✅ Multiple participant support
- ✅ Real-time chat messaging
- ✅ Media state synchronization
- ✅ Connection quality monitoring

### UI/UX Features
- ✅ Discord-style interface design
- ✅ Black/White/Red color scheme
- ✅ Dark/Light mode support
- ✅ Responsive grid layout
- ✅ Professional media controls
- ✅ Connection status indicators

### Technical Features
- ✅ Socket.io signaling
- ✅ STUN/TURN server configuration
- ✅ Automatic room cleanup
- ✅ Error handling and recovery
- ✅ Mobile-responsive design
- ✅ TypeScript implementation

## Installation & Setup

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
```

4. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
REACT_APP_BACKEND_URL=http://localhost:3001
```

4. Start the frontend:
```bash
npm start
```

## Usage

### Starting a Session

1. Navigate to the dashboard at `/dashboard`
2. Go to "My Mentorships" tab
3. Click "Join Session" on any upcoming mentorship
4. Allow camera/microphone permissions when prompted

### Session Controls

- **Video Toggle**: Click camera icon to turn video on/off
- **Audio Toggle**: Click microphone icon to mute/unmute
- **Screen Share**: Click screen icon to start/stop screen sharing
- **Chat**: Click chat icon to open/close real-time chat
- **Participants**: Click users icon to view participants list
- **Settings**: Click gear icon for audio/video device settings

### Chat Features

- Real-time messaging with all participants
- Message history persistence during session
- User identification with wallet addresses
- Character limit (500 characters)
- Enter to send, Shift+Enter for new line

## Configuration

### STUN/TURN Servers

For production deployment, configure TURN servers for NAT traversal:

```env
# Backend .env
WEBRTC_TURN_SERVER=turn:your-turn-server.com:3478
WEBRTC_TURN_USERNAME=your-username
WEBRTC_TURN_PASSWORD=your-password
```

### Security Headers

The backend includes Content Security Policy headers for WebRTC:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"]
    }
  }
}));
```

## Testing

### Manual Testing

1. Open multiple browser tabs/windows
2. Navigate to same session URL
3. Test video/audio controls
4. Test screen sharing
5. Test chat functionality
6. Test participant management

### Browser Compatibility

- Chrome 60+ (recommended)
- Firefox 55+
- Safari 11+
- Edge 79+

## Troubleshooting

### Common Issues

1. **No video/audio**: Check browser permissions
2. **Connection issues**: Verify STUN/TURN configuration
3. **Chat not working**: Check Socket.io connection
4. **Screen share fails**: Ensure HTTPS in production

### Debug Information

Enable debug logs:
```typescript
// In WebRTCContext.tsx
console.log('WebRTC Debug:', {
  connectionState: pc.connectionState,
  iceConnectionState: pc.iceConnectionState,
  signalingState: pc.signalingState
});
```

## Production Deployment

### Backend Requirements

- Node.js 16+
- HTTPS certificate (required for WebRTC)
- TURN server for NAT traversal
- Load balancer for multiple instances

### Frontend Requirements

- HTTPS serving
- CDN for static assets
- Browser compatibility polyfills

### Infrastructure

- TURN server (coturn, Twilio, etc.)
- WebSocket-compatible load balancer
- SSL certificate for secure contexts

## Integration with Chain Academy

This WebRTC implementation integrates with the Chain Academy ecosystem:

- **Wallet Authentication**: Uses SIWE for participant identification
- **Smart Contracts**: Room creation tied to mentorship sessions
- **Payment System**: Session access controlled by payment status
- **User Profiles**: Participant information from user profiles

## Future Enhancements

- Recording functionality
- File sharing capabilities
- Whiteboard/annotation tools
- Mobile app support
- AI-powered transcription
- Advanced analytics
- Breakout room support

## API Reference

### Socket.io Events

#### Client → Server
- `join-room`: Join a WebRTC room
- `leave-room`: Leave a WebRTC room
- `webrtc-signal`: WebRTC signaling data
- `chat-message`: Send chat message
- `media-state-change`: Update media state
- `screen-share`: Screen sharing state

#### Server → Client
- `room-joined`: Successfully joined room
- `user-joined`: New user joined room
- `user-left`: User left room
- `webrtc-signal`: WebRTC signaling data
- `chat-message`: New chat message
- `media-state-changed`: Media state update
- `screen-share-changed`: Screen share update

### REST Endpoints

#### POST /api/webrtc/rooms
Create a new WebRTC room.

**Request:**
```json
{
  "sessionId": "session-123",
  "participants": ["0x123...", "0x456..."]
}
```

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "room_session-123_1640995200000",
    "sessionId": "session-123",
    "participants": ["0x123...", "0x456..."],
    "config": { "iceServers": [...] }
  }
}
```

#### GET /api/webrtc/rooms/:roomId
Get room information.

**Response:**
```json
{
  "success": true,
  "room": { ... },
  "participants": [...],
  "chatMessages": [...]
}
```

## License

This WebRTC implementation is part of Chain Academy V2 and follows the same MIT license.