# Chain Academy V2 - Deployed Contracts

## ProgressiveEscrowV7 Contract Addresses

### Multi-Chain Deployment Status: ✅ DEPLOYED

| Network | Chain ID | Contract Address | Explorer |
|---------|----------|------------------|----------|
| **Polygon** | 137 | `0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3` | [PolygonScan](https://polygonscan.com/address/0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3) |
| **Base** | 8453 | `0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3` | [BaseScan](https://basescan.org/address/0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3) |
| **Optimism** | 10 | `0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3` | [OptimismScan](https://optimistic.etherscan.io/address/0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3) |
| **Arbitrum** | 42161 | `0x2a9d167e30195ba5fd29cfc09622be0d02da91be` | [ArbiScan](https://arbiscan.io/address/0x2a9d167e30195ba5fd29cfc09622be0d02da91be) |

## Contract Features

### ✅ Core Functionality
- **Progressive Payment System**: 90% mentor / 10% platform fee
- **Multi-Token Support**: ETH, USDC, USDT (auto-enabled per network)
- **Session Management**: Create → Active → Paused → Completed/Cancelled
- **Heartbeat System**: 30s intervals with 60s grace period
- **Timeout Protection**: 15min start timeout, 7-day auto-complete

### ✅ Security Features
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Access control for admin functions
- **Nonce Protection**: Replay attack prevention
- **Session ID Uniqueness**: Prevents session ID reuse

### ✅ Supported Tokens by Network

#### Polygon (MATIC)
- **ETH**: Native support (address(0))
- **USDC**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **USDT**: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

#### Base (ETH)
- **ETH**: Native support (address(0))
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **USDT**: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

#### Optimism (ETH)
- **ETH**: Native support (address(0))
- **USDC**: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- **USDT**: `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58`

#### Arbitrum (ETH)
- **ETH**: Native support (address(0))
- **USDC**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **USDT**: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

## Deployment Information

- **Compiler Version**: Solidity 0.8.20
- **Optimization**: Enabled with via-IR for stack optimization
- **Contract Standard**: EIP-712 compliant
- **Gas Optimization**: Remix-optimized for reduced deployment costs

## Usage Notes

1. **Frontend Integration**: Use the correct contract address for each network
2. **Token Approval**: Users need to approve ERC20 tokens before creating sessions
3. **Session Management**: Both student and mentor can start/pause sessions
4. **Payment Release**: Anyone can call `releaseProgressivePayment()` (payments go to correct recipient)
5. **Emergency Functions**: Only contract owner can execute emergency operations

## Verification Status

All contracts should be verified on their respective block explorers with:
- Source code
- Constructor arguments
- Compiler settings (via-IR enabled)

---

**Last Updated**: August 13, 2025
**Contract Version**: ProgressiveEscrowV7_RemixOptimized
**Deployment Status**: ✅ LIVE on all 4 networks