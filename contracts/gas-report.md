# Gas Usage Report

## Contract Deployment

| Contract | Gas Used | Optimized |
|----------|----------|-----------|
| Mentorship | 1,247,925 | ✅ |

## Function Gas Costs (Estimated)

### Core Functions
| Function | Gas Cost | Description |
|----------|----------|-------------|
| `createSession()` | ~150,000 | Create new mentorship session with escrow |
| `completeSession()` | ~80,000 | Complete session and distribute payments |
| `cancelSession()` | ~40,000 | Cancel session and refund mentee |

### Admin Functions
| Function | Gas Cost | Description |
|----------|----------|-------------|
| `addSupportedToken()` | ~45,000 | Add new payment token |
| `removeSupportedToken()` | ~30,000 | Remove payment token |
| `updatePlatformFeeRecipient()` | ~35,000 | Update fee recipient |

### View Functions
| Function | Gas Cost | Description |
|----------|----------|-------------|
| `getSession()` | ~2,000 | Get session details |
| `getMentorSessions()` | ~3,000 | Get mentor's sessions |
| `getMenteeSessions()` | ~3,000 | Get mentee's sessions |

## Optimization Strategies Implemented

1. **Storage Optimization**
   - Packed structs where possible
   - Efficient mapping patterns
   - Minimal storage reads/writes

2. **External Calls**
   - SafeERC20 for secure transfers
   - Batch operations where applicable
   - Reentrancy protection

3. **Compiler Settings**
   - Optimizer enabled (200 runs)
   - Latest Solidity version (0.8.20)
   - Target: Paris EVM

## Network Deployment Costs

Estimated deployment costs on different networks:

| Network | Gas Price (gwei) | ETH Cost | USD Cost* |
|---------|------------------|----------|-----------|
| Ethereum | 20 | 0.025 ETH | $60 |
| Polygon | 30 | 0.0004 MATIC | $0.30 |
| Arbitrum | 0.1 | 0.00012 ETH | $0.30 |
| Optimism | 0.001 | 0.000001 ETH | $0.002 |
| Base | 0.001 | 0.000001 ETH | $0.002 |

*USD costs are estimates based on average token prices

## Session Operation Costs

For a typical mentorship session ($100 USDT):

| Network | Create Session | Complete Session | Total Cost |
|---------|----------------|------------------|------------|
| Ethereum | $6.00 | $3.20 | $9.20 |
| Polygon | $0.15 | $0.08 | $0.23 |
| Arbitrum | $0.05 | $0.03 | $0.08 |
| Optimism | $0.0005 | $0.0003 | $0.0008 |
| Base | $0.0005 | $0.0003 | $0.0008 |

## Recommendations

1. **For Users**: Consider using Layer 2 networks (Polygon, Arbitrum, Optimism, Base) for lower transaction costs
2. **For Platform**: Deploy on multiple networks to give users choice based on their cost preferences
3. **For Optimization**: Consider batching multiple operations when possible