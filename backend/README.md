# Chain Academy V2 Backend

Backend API for Chain Academy V2 - A decentralized cryptocurrency and blockchain mentorship platform.

## Features

- **SIWE Authentication**: Sign-In with Ethereum (no passwords required)
- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **RESTful API**: Complete CRUD operations for mentorships and profiles
- **WebRTC Ready**: Structure prepared for real-time communication
- **TypeScript**: Full type safety and excellent developer experience
- **Express.js**: Fast and lightweight web framework

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot reload enabled.

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (Jest)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Authentication (`/api/auth`)
- `POST /nonce` - Generate SIWE nonce
- `POST /verify` - Verify SIWE signature
- `POST /logout` - Logout user
- `GET /me` - Get current user info

### Profile (`/api/profile`)
- `GET /` - Get user profile (authenticated)
- `PUT /` - Update user profile (authenticated)
- `GET /:address` - Get public profile by address

### Mentorships (`/api/mentorships`)
- `GET /` - Search mentorships (with filters)
- `POST /` - Create mentorship (authenticated)
- `GET /:id` - Get mentorship details
- `PUT /:id` - Update mentorship (authenticated)
- `DELETE /:id` - Delete mentorship (authenticated)
- `POST /book` - Book a session (authenticated)

### My Mentorships (`/api/my-mentorships`)
- `GET /sessions` - Get user's sessions
- `GET /mentorships` - Get user's created mentorships
- `PUT /sessions/:sessionId/status` - Update session status
- `POST /sessions/:sessionId/feedback` - Submit feedback
- `GET /sessions/:sessionId` - Get session details

### Financials (`/api/financials`)
- `GET /earnings` - Get earnings breakdown
- `GET /summary` - Get financial summary
- `GET /transactions` - Get transaction history

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Session Configuration
SESSION_SECRET=your-session-secret-here

# Supported Networks
SUPPORTED_CHAINS=1,137,42161,10,8453

# WebRTC Configuration (for future implementation)
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
WEBRTC_TURN_SERVER=
WEBRTC_TURN_USERNAME=
WEBRTC_TURN_PASSWORD=

# Logging
LOG_LEVEL=info
```

## Project Structure

```
src/
├── controllers/     # Route handlers
├── routes/         # API route definitions
├── middlewares/    # Express middlewares
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── config/         # Configuration files
├── utils/          # Utility functions
└── index.ts        # Application entry point
```

## Authentication Flow

1. Frontend requests nonce: `POST /api/auth/nonce`
2. User signs SIWE message with wallet
3. Frontend sends signed message: `POST /api/auth/verify`
4. Backend verifies signature and creates session
5. All subsequent requests include session cookie

## Security Features

- Helmet.js for security headers
- CORS protection
- Rate limiting
- Input validation with Joi
- Session-based authentication
- SIWE signature verification

## Database Integration

The current implementation uses mock data. To integrate a database:

1. Choose your database (PostgreSQL recommended)
2. Add database configuration in `src/config/database.ts`
3. Implement models/schemas
4. Replace mock data in controllers with database queries

## WebRTC Integration

The structure for WebRTC is prepared in `src/services/webrtc.service.ts`. To complete the implementation:

1. Add Socket.io for signaling
2. Implement room management
3. Add TURN server configuration for production
4. Create endpoints for room operations

## Testing

Tests can be added in a `tests/` directory using Jest. Run with:

```bash
npm test
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Start the server:
```bash
npm start
```

## Contributing

1. Follow TypeScript best practices
2. Use ESLint and Prettier for code formatting
3. Add proper error handling
4. Include input validation
5. Add tests for new features

## License

MIT