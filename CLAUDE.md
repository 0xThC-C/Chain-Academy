# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chain Academy is a decentralized cryptocurrency and blockchain mentorship platform with the following core principles:
- 100% decentralized with no KYC requirements
- Privacy-focused with on-chain identity and reputation
- Mentor freedom with self-set pricing
- Professional modern design with Discord-style communication features

## Technology Stack

### Frontend
- **Framework**: React with Tailwind CSS
- **Wallet Connection**: wagmi or web3-react for multi-chain support
- **Icons**: Heroicons or Font Awesome (no emojis in UI)
- **Design**: Black/White/Red color scheme with dark/light mode toggle

### Backend
- **Framework**: Node.js with Express.js
- **Authentication**: Sign-In with Ethereum (SIWE) - no password authentication
- **Real-time Communication**: WebRTC for video/audio calls, chat, and screen sharing

### Blockchain
- **Smart Contracts**: Solidity
- **Networks**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **Payment Tokens**: USDT and USDC only
- **Platform Fee**: 10% (90% to mentor, 10% to platform)

## CRITICAL: Use PM2 to Prevent Crashes

**IMPORTANT**: Always use PM2 to run the frontend to prevent crashes when tasks complete or when refreshing the page.

### Quick Start (REQUIRED)
```bash
# From the project root directory, run:
./start.sh

# Or manually:
pm2 start ecosystem.config.js
```

### PM2 Commands
```bash
# Start the application (ALWAYS USE THIS)
npm start  # This now uses PM2 automatically

# View logs
pm2 logs

# Stop services
pm2 stop all

# Restart services
pm2 restart all

# Check status
pm2 status
```

## Development Commands

For development work, always start with PM2:

### Frontend (React)
```bash
# Initialize React project
npx create-react-app frontend --template typescript
cd frontend
npm install tailwindcss wagmi ethers @heroicons/react

# Development
npm start

# Build
npm run build

# Test
npm test

# Lint (after setting up ESLint)
npm run lint
```

### Backend (Node.js)
```bash
# Initialize Node.js project
mkdir backend && cd backend
npm init -y
npm install express typescript @types/node @types/express

# Development
npm run dev

# Build
npm run build

# Test
npm test
```

### Smart Contracts (Hardhat)
```bash
# Initialize Hardhat project
mkdir contracts && cd contracts
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers

# Compile
npx hardhat compile

# Test
npx hardhat test

# Deploy
npx hardhat run scripts/deploy.js --network <network>
```

## Architecture Overview

### Smart Contract Structure
The main contract `Mentorship.sol` should handle:
1. **Escrow System**: Lock funds when mentorship is scheduled
2. **Payment Distribution**: 90% to mentor, 10% to platform after completion
3. **Multi-token Support**: Accept USDT and USDC
4. **Multi-chain Deployment**: Same contract on all supported networks

### API Endpoints Structure
- `/profile` - User profile management
- `/mentorships` - Create and list mentorship offerings
- `/my-mentorships` - User's mentorship history
- `/financials` - Earnings and wallet management

### Frontend Component Structure
1. **Connection Layer**: Multi-wallet and multi-chain support
2. **User Dashboard**: Profile, Create Mentorship, My Mentorships, Financial menus
3. **Mentorship Gallery**: Browse and filter available mentors
4. **Session Room**: WebRTC-powered communication interface

## Key Implementation Notes

1. **Authentication**: Use wallet signatures only - no traditional auth
2. **Payment Flow**: All payments through smart contract escrow
3. **Communication**: Private WebRTC rooms for each mentorship session
4. **Design Constraints**: 
   - Strictly use Black (#000000), White (#FFFFFF), and Red (#FF0000)
   - Use icon libraries only, no emojis
   - Implement persistent dark/light mode toggle

## Project Status

Currently, only the specification document (ChainAcademyV2.md) exists. The implementation should follow the detailed requirements outlined in that document, focusing on creating a professional, decentralized mentorship platform that prioritizes user privacy and mentor autonomy.