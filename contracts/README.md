# Chain Academy V2 - Smart Contracts

This directory contains the smart contracts for the Chain Academy V2 decentralized mentorship platform.

## Overview

The `Mentorship.sol` contract provides:
- **Escrow System**: Secure fund locking when mentorship sessions are scheduled
- **Payment Distribution**: Automatic 90%/10% split between mentor and platform
- **Multi-token Support**: USDT and USDC payments across multiple chains
- **Multi-chain Deployment**: Ethereum, Polygon, Arbitrum, Optimism, and Base

## Contract Architecture

### Core Features
- **Session Management**: Create, complete, and cancel mentorship sessions
- **Escrow Protection**: Funds are locked in contract until session completion
- **Automatic Payouts**: Smart distribution of payments upon session completion
- **Security**: ReentrancyGuard, Pausable, and Ownable from OpenZeppelin

### Contract Functions

#### Public Functions
- `createSession()` - Create a new mentorship session with escrow
- `completeSession()` - Complete session and distribute payments
- `cancelSession()` - Cancel session before start time (refunds mentee)

#### View Functions
- `getSession()` - Get session details
- `getMentorSessions()` - Get all sessions for a mentor
- `getMenteeSessions()` - Get all sessions for a mentee

#### Owner Functions
- `addSupportedToken()` - Add new payment token
- `removeSupportedToken()` - Remove payment token
- `updatePlatformFeeRecipient()` - Update fee recipient
- `pause()/unpause()` - Emergency controls

## Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Fill in your private key and RPC URLs
```

3. **Compile Contracts**
```bash
npm run compile
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

The tests cover:
- Contract deployment and initialization
- Token management (add/remove supported tokens)
- Session creation with escrow
- Session completion with payment distribution
- Session cancellation with refunds
- Access control and security features
- Edge cases and error conditions

## Deployment

### Local Development
```bash
npm run deploy:local
```

### Single Network Deployment
```bash
# Ethereum
npm run deploy:ethereum

# Polygon
npm run deploy:polygon

# Arbitrum
npm run deploy:arbitrum

# Optimism
npm run deploy:optimism

# Base
npm run deploy:base
```

### Multi-chain Deployment
```bash
npm run deploy:all
```

### Post-Deployment Setup

After deployment, supported tokens (USDT/USDC) are automatically added to each network. To manually manage tokens:

```bash
npm run manage:tokens
```

## Network Configuration

The contract supports deployment on:

| Network  | Chain ID | USDT Address | USDC Address |
|----------|----------|--------------|--------------|
| Ethereum | 1        | 0xdAC17F958D2ee523a2206206994597C13D831ec7 | 0xA0b86a33E6441e76C6c56e39Ff34d18cfde6c9f1 |
| Polygon  | 137      | 0xc2132D05D31c914a87C6611C10748AEb04B58e8F | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 |
| Arbitrum | 42161    | 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 | 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 |
| Optimism | 10       | 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58 | 0x7F5c764cBc14f9669B88837ca1490cCa17c31607 |
| Base     | 8453     | 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2 | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |

## Contract Verification

After deployment, verify contracts on block explorers:

```bash
npm run verify:contracts
```

Make sure to update the contract addresses in `scripts/verify-contracts.js`.

## Security Features

### OpenZeppelin Integration
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Access control for admin functions
- **SafeERC20**: Safe token transfers

### Security Considerations
- All external calls use safe transfer patterns
- Proper access control on sensitive functions
- Input validation on all public functions  
- Emergency pause capability
- Time-based restrictions on session operations

## Gas Optimization

The contract is optimized for gas efficiency:
- Efficient storage patterns
- Minimal external calls
- Optimized loops and calculations
- Compiler optimization enabled

## Integration

### Frontend Integration
```javascript
// Example usage in frontend
const mentorship = new ethers.Contract(
  MENTORSHIP_ADDRESS,
  MENTORSHIP_ABI,
  signer
);

// Create session
const tx = await mentorship.createSession(
  mentorAddress,
  usdtAddress,
  ethers.parseUnits("100", 6), // 100 USDT
  startTime,
  duration
);

// Complete session
await mentorship.completeSession(sessionId);
```

### Backend Integration
The contract events can be monitored for:
- `SessionCreated` - New sessions scheduled
- `SessionCompleted` - Sessions finished with payments
- `SessionCancelled` - Sessions cancelled

## Support

For issues or questions regarding the smart contracts, please check:
1. Test coverage for expected behavior
2. Contract comments for function details
3. OpenZeppelin documentation for security patterns