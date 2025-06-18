# Chain Academy Daily Payment Bot

Automated payment bot for Chain Academy's Progressive Escrow V4 system. Ensures mentors receive their payments automatically after 24 hours if they haven't manually claimed them.

## Features

- **Automated Daily Execution**: Runs daily at 2 AM UTC (configurable)
- **Multi-Chain Support**: Base, Optimism, Arbitrum, and Polygon
- **Smart Contract Integration**: Direct integration with Progressive Escrow V4
- **Comprehensive Monitoring**: Health checks, metrics, and alerting
- **Security Features**: Emergency pause, retry mechanisms, gas optimization
- **Web Dashboard**: REST API with real-time status monitoring

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Required: Bot wallet private key
BOT_PRIVATE_KEY=your_private_key_here

# Contract addresses for each network
BASE_CONTRACT_ADDRESS=0x...
OPTIMISM_CONTRACT_ADDRESS=0x...
ARBITRUM_CONTRACT_ADDRESS=0x...
POLYGON_CONTRACT_ADDRESS=0x...

# RPC endpoints (optional, defaults provided)
BASE_RPC_URL=https://mainnet.base.org
OPTIMISM_RPC_URL=https://mainnet.optimism.io
# ... etc
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Bot

**Option A: Using the startup script (recommended)**
```bash
./start-bot.sh
```

**Option B: Direct execution**
```bash
npm start
```

**Option C: Docker**
```bash
docker-compose up -d
```

### 4. Verify Operation

Check bot health:
```bash
curl http://localhost:3001/health
```

View detailed status:
```bash
curl http://localhost:3001/status
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_PRIVATE_KEY` | ✅ | - | Bot wallet private key |
| `BOT_EXECUTION_TIME` | ❌ | `02:00` | Daily execution time (HH:MM UTC) |
| `PAYMENT_DELAY_HOURS` | ❌ | `24` | Hours to wait before auto-payment |
| `MAX_RETRY_ATTEMPTS` | ❌ | `3` | Max retry attempts for failed txs |
| `NOTIFICATION_ENABLED` | ❌ | `true` | Enable mentor notifications |
| `EMERGENCY_PAUSE_ADDRESS` | ❌ | - | Admin address for emergency stop |
| `PORT` | ❌ | `3001` | API server port |
| `LOG_LEVEL` | ❌ | `info` | Logging level |

### Network Configuration

The bot supports these networks by default:

| Network | Chain ID | Default RPC |
|---------|----------|--------------|
| Base | 8453 | https://mainnet.base.org |
| Optimism | 10 | https://mainnet.optimism.io |
| Arbitrum | 42161 | https://arb1.arbitrum.io/rpc |
| Polygon | 137 | https://polygon-rpc.com |

## API Endpoints

### Health & Status

- `GET /health` - Basic health check
- `GET /status` - Detailed bot status and metrics
- `GET /metrics` - Prometheus metrics

### Control

- `POST /execute` - Trigger manual execution
- `POST /pause` - Pause the bot
- `POST /resume` - Resume the bot

### History

- `GET /history/:limit?` - Execution history (default limit: 50)

## Bot Operation

### Daily Execution Flow

1. **Scan Phase**: Check all supported chains for completed sessions
2. **Filter Phase**: Identify sessions >24h old without manual confirmation
3. **Process Phase**: Execute `autoCompleteSession` for eligible payments
4. **Notify Phase**: Send notifications to mentors (if enabled)
5. **Log Phase**: Record all activity and update metrics

### Smart Contract Integration

The bot interacts with Progressive Escrow V4 contracts using these functions:

```solidity
// Main payment function
function autoCompleteSession(uint256 sessionId) external;

// Session details
function getSessionDetails(uint256 sessionId) external view 
    returns (tuple(address mentor, address student, uint256 amount, 
            address token, uint8 status, uint256 completedAt, 
            bool manuallyConfirmed));

// Active sessions
function getAllActiveSessions() external view returns (uint256[]);
```

### Security Features

- **Eligibility Validation**: Only processes sessions >24h completed
- **Platform Fee Collection**: Ensures 10% fee is collected
- **Double-processing Prevention**: Tracks processed sessions
- **Emergency Pause**: Admin can pause bot operations
- **Gas Optimization**: Dynamic gas pricing for L2 networks
- **Retry Mechanisms**: Automatic retry for failed transactions

## Monitoring

### Prometheus Metrics

- `bot_payments_total` - Total payments processed (by chain/status)
- `bot_gas_used_total` - Total gas used (by chain)
- `bot_execution_duration_seconds` - Execution duration histogram

### Health Checks

- **Uptime Monitoring**: Tracks bot availability
- **Execution Frequency**: Ensures daily executions occur
- **Success Rate**: Monitors payment success rates
- **Gas Usage**: Tracks gas consumption patterns

### Logging

Logs are written to:
- Console (structured JSON)
- `logs/bot-combined.log` (all logs)
- `logs/bot-error.log` (errors only)

## Development

### Local Testing

For development/testing, you can override execution timing:

```bash
# Execute every 5 minutes
BOT_EXECUTION_TIME="*/5 * * * *"
PAYMENT_DELAY_HOURS=0.1
NODE_ENV=development
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Deployment

### Docker Deployment

1. Build the image:
```bash
docker build -t chain-academy-bot .
```

2. Run with environment file:
```bash
docker run -d --env-file .env -p 3001:3001 chain-academy-bot
```

### Production Considerations

- **Wallet Security**: Use a dedicated wallet with minimal funds
- **Network Monitoring**: Monitor RPC endpoint health
- **Backup Strategy**: Multiple RPC providers per network
- **Alert Integration**: Configure webhook alerts for failures
- **Resource Limits**: Set appropriate memory/CPU limits

## Troubleshooting

### Common Issues

**Bot not executing:**
- Check cron expression format
- Verify bot is not paused
- Check system clock synchronization

**Transaction failures:**
- Verify wallet has sufficient gas
- Check RPC endpoint connectivity
- Validate contract addresses

**High gas costs:**
- Adjust gas price settings per network
- Consider batching transactions
- Monitor network congestion

### Debug Commands

```bash
# View bot logs
tail -f logs/bot-combined.log

# Check bot health
curl http://localhost:3001/health

# Manual execution (testing)
curl -X POST http://localhost:3001/execute

# View execution history
curl http://localhost:3001/history/10
```

## Support

For issues or questions:

1. Check the logs for error details
2. Verify environment configuration
3. Test network connectivity
4. Review the troubleshooting section

## License

MIT License - see LICENSE file for details.