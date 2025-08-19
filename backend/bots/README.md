# Chain Academy V7 Payment Bot

Automated payment processing bot for Chain Academy's ProgressiveEscrowV7 smart contracts across multiple L2 networks.

## 🆕 What's New in V7

### Major Changes from V4
- **New Session Management**: Uses `getSession()` instead of `getSessionDetails()`
- **Session Tracking**: External session tracking system (V7 doesn't have `getAllActiveSessions()`)
- **Session IDs**: Now uses `bytes32` instead of `uint256`
- **Enhanced Features**: Heartbeat monitoring, auto-pause detection, survey completion tracking
- **Progressive Payments**: More sophisticated payment calculation with `getAvailablePayment()`

### V7 Smart Contract Features
- Heartbeat system for session monitoring
- Automatic session pausing
- Progressive payment calculation
- Survey completion tracking
- Enhanced session status management

## 🚀 Quick Start

### 1. Migration from V4
If you're upgrading from V4, use the migration tool:

```bash
# Set V7 contract addresses
export BASE_PROGRESSIVE_ESCROW_V7=0xYourV7ContractAddress
export OPTIMISM_PROGRESSIVE_ESCROW_V7=0xYourV7ContractAddress
export ARBITRUM_PROGRESSIVE_ESCROW_V7=0xYourV7ContractAddress
export POLYGON_PROGRESSIVE_ESCROW_V7=0xYourV7ContractAddress

# Run migration
npm run migrate:v7
```

### 2. Fresh Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Test the bot
npm run test:v7

# Start the bot
npm run start
```

## 📋 Environment Configuration

### Required Variables
```bash
# Bot wallet private key (64 chars, no 0x prefix)
BOT_PRIVATE_KEY=your_private_key_here

# V7 Contract addresses
BASE_PROGRESSIVE_ESCROW_V7=0x...
OPTIMISM_PROGRESSIVE_ESCROW_V7=0x...
ARBITRUM_PROGRESSIVE_ESCROW_V7=0x...
POLYGON_PROGRESSIVE_ESCROW_V7=0x...
```

### V7 Specific Settings
```bash
# Session tracking (recommended: enabled)
BOT_V7_SESSION_TRACKING_ENABLED=true

# Heartbeat monitoring (optional)
BOT_V7_HEARTBEAT_CHECK_ENABLED=false

# Auto-pause detection (optional)
BOT_V7_AUTOPAUSE_CHECK_ENABLED=false

# Minimum delay before auto-release (hours)
BOT_V7_MIN_AUTO_RELEASE_DELAY=24

# Session storage path
BOT_V7_SESSION_STORAGE_PATH=./data/session-tracker.json
```

## 🔧 Available Commands

```bash
# Test the V7 bot implementation
npm run test:v7

# Run migration from V4 to V7
npm run migrate:v7

# Start the production bot
npm run start

# Run in development mode
npm run dev

# Check TypeScript compilation
npm run build

# Check bot health
npm run health-check
```

## 🏗️ Architecture

### Core Components

1. **DailyPaymentBot**: Main bot implementation with V7 compatibility
2. **PaymentScheduler**: Cron-based scheduling system
3. **SessionTracker**: External session tracking (replaces `getAllActiveSessions()`)
4. **MainnetBotConfig**: Configuration management for all L2 networks

### V7 Session Management

Since V7 contracts don't provide `getAllActiveSessions()`, the bot uses:

1. **Session Tracker**: Persistent storage of session IDs
2. **Event Monitoring**: (Future) Listen for `SessionCreated` events
3. **Manual Registration**: Sessions can be manually added to tracking

### Payment Flow

1. **Session Discovery**: Check tracked sessions for completion
2. **Eligibility Check**: Verify delay period and payment availability
3. **Payment Processing**: Call `autoCompleteSession()` with proper gas settings
4. **Confirmation**: Wait for transaction confirmation and update tracking

## 🔍 Monitoring

### Session Tracker Status
```typescript
const status = bot.getSessionTrackerStatus();
console.log(status);
// {
//   totalSessions: 45,
//   activeSessions: 12,
//   pendingSessions: 3,
//   lastFullScan: "2024-01-15T10:30:00.000Z",
//   nextFullScan: "2024-01-15T16:30:00.000Z"
// }
```

### Bot Metrics
```typescript
const metrics = bot.getMetrics();
console.log(metrics);
// {
//   totalProcessed: 156,
//   successfulPayments: 149,
//   failedPayments: 7,
//   totalGasUsed: "5234567890123456",
//   chainMetrics: { ... }
// }
```

## 📊 Session Tracking

### Adding Sessions to Tracker
```typescript
// When a session is created, add it to tracking
bot.addSessionToTracker(sessionId, chainId);
```

### Session Tracker Data Structure
```typescript
interface TrackedSession {
  sessionId: string;
  chainId: number;
  createdAt: number;
  lastChecked: number;
  status: SessionStatus;
  isTracked: boolean;
  completedButNotReleased?: boolean;
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **No Sessions Found**
   - Check if session tracker has sessions: `bot.getSessionTrackerStatus()`
   - Manually add test sessions with `bot.addSessionToTracker()`
   - Verify contract addresses are V7 contracts

2. **TypeScript Errors**
   - Run `npm run build` to check compilation
   - Ensure all types are properly imported
   - Check that contract addresses are valid

3. **Gas Estimation Failures**
   - Verify RPC endpoints are working
   - Check that bot wallet has sufficient ETH for gas
   - Ensure contract is deployed at specified address

### Debug Mode
```bash
# Run with debug logging
BOT_LOG_LEVEL=debug npm run start

# Test individual functions
npm run test:v7
```

## 🔒 Security

### Private Key Management
- Store private keys in environment variables only
- Use dedicated bot wallet with minimal funds
- Enable multi-sig for high-value operations

### Emergency Controls
```bash
# Stop bot immediately
BOT_EMERGENCY_STOP=true

# Enable maintenance mode
BOT_MAINTENANCE_MODE=true
```

## 🌐 Supported Networks

| Network | Chain ID | Status |
|---------|----------|---------|
| Base | 8453 | ✅ Active |
| Optimism | 10 | ✅ Active |
| Arbitrum | 42161 | ✅ Active |
| Polygon | 137 | ✅ Active |

## 📝 Migration Checklist

- [ ] V7 contracts deployed on all networks
- [ ] Contract addresses set in environment
- [ ] Bot wallet funded with gas tokens
- [ ] Migration script executed successfully
- [ ] Session tracker initialized
- [ ] Test run completed successfully
- [ ] Production deployment configured
- [ ] Monitoring and alerts set up

## 🤝 Contributing

1. Test all changes with `npm run test:v7`
2. Ensure TypeScript compilation passes: `npm run build`
3. Update documentation for new features
4. Test on testnets before mainnet deployment

## 📞 Support

For issues related to:
- **Bot Operation**: Check logs and bot metrics
- **Smart Contracts**: Verify contract deployment and functions
- **Session Tracking**: Check session tracker status and data
- **Gas Issues**: Monitor network conditions and wallet balance

## 🔄 Upgrade Path

### From V4 to V7
1. Use `npm run migrate:v7` for automated migration
2. Update environment variables with V7 addresses
3. Test with `npm run test:v7`
4. Deploy to production

### Future Versions
The bot is designed for easy upgrades:
- Session tracking system persists across versions
- Configuration is externalized
- Modular architecture supports additions