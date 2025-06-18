# Chain Academy V2 - Testnet Configuration

This document describes the testnet configuration setup for Chain Academy V2 frontend.

## 🧪 Testnet Environment

The frontend is currently configured for **Sepolia Testnet ONLY**. This is a development/testing deployment and should not be used with real funds.

### Configuration Details

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **Explorer**: https://sepolia.etherscan.io
- **Environment**: testnet

### ⚠️ Important Warnings

1. **DO NOT USE REAL FUNDS** - This is a testnet environment
2. All transactions use test ETH and test tokens
3. Contract addresses will be updated when Agent 2 deploys them

## 📁 Configuration Files

### Core Configuration Files
- `src/config/environment.ts` - Environment-specific settings
- `src/config/testnet.ts` - Testnet-specific constants
- `src/config/appkit.tsx` - Wallet connection (Sepolia only)
- `src/contracts/MentorshipContract.ts` - Contract addresses and ABIs
- `.env` - Environment variables

### Contract Addresses (To Be Updated)

Current placeholder addresses (will be updated by Agent 2):
- **Mentorship Contract**: `0x0000000000000000000000000000000000000000`
- **USDC Testnet**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **USDT Testnet**: `0x7169D38820dfd117C3FA1f22a697dBA58d90BA06`

## 🔧 Updating Contract Addresses

When Agent 2 deploys contracts, use the update script:

```bash
# Update mentorship contract address
node scripts/update-contracts.js --mentorship 0xYourContractAddress

# Update with token addresses (optional)
node scripts/update-contracts.js \
  --mentorship 0xYourMentorshipContract \
  --usdc 0xYourUSDCContract \
  --usdt 0xYourUSDTContract
```

## 🚀 Development Commands

### Prerequisites
1. Node.js 16+ installed
2. MetaMask or compatible wallet
3. Sepolia testnet ETH (from faucets)

### Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Getting Test Tokens

1. **Sepolia ETH**: 
   - https://sepoliafaucet.com/
   - https://faucet.paradigm.xyz/

2. **Test USDC/USDT**:
   - Use deployed test token contracts
   - Mint function available for testing

## 🎯 Features Configured for Testnet

### Wallet Connection
- ✅ Sepolia network only
- ✅ Web3Modal integration
- ✅ Multi-wallet support (MetaMask, WalletConnect, etc.)

### Smart Contract Integration
- ✅ Mentorship contract ABI loaded
- ✅ ERC20 token support (USDC/USDT)
- ✅ Escrow functionality
- ⏳ Contract addresses (pending Agent 2)

### UI/UX Features
- ✅ Testnet warning banner
- ✅ Network validation
- ✅ Contract status indicators
- ✅ Explorer links for transactions

## 🔍 Debugging & Monitoring

### Browser Console
The application logs important information to the browser console:
- Environment configuration
- Contract addresses
- Network status
- Wallet connections

### Key Console Messages
- `🧪 TESTNET CONFIGURATION LOADED` - Configuration loaded
- `📋 Contract Status` - Contract readiness
- `⚠️ TESTNET MODE` - Environment warnings

## 📝 Environment Variables

### Required Variables
```env
REACT_APP_CHAIN_ID=11155111
REACT_APP_NETWORK_NAME=sepolia
REACT_APP_ENVIRONMENT=testnet
```

### Optional Variables
```env
REACT_APP_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-api-key
REACT_APP_SEPOLIA_EXPLORER_URL=https://sepolia.etherscan.io
```

## 🔗 Integration Points

### Agent 2 Coordination
- Contract deployment addresses will be provided by Agent 2
- Use `scripts/update-contracts.js` to update addresses
- Rebuild frontend after address updates

### Backend Integration
- API endpoints configured for localhost:3001
- WebRTC configuration for session rooms
- Socket.io for real-time features

## 🚨 Troubleshooting

### Common Issues

1. **Wallet not connecting to Sepolia**
   - Ensure MetaMask is on Sepolia network
   - Add Sepolia network manually if needed

2. **Contract not found errors**
   - Check if Agent 2 has deployed contracts
   - Verify contract addresses are updated

3. **Transaction failures**
   - Ensure sufficient Sepolia ETH for gas
   - Check contract addresses are correct

### Getting Help

1. Check browser console for error messages
2. Verify network configuration
3. Ensure contract addresses are updated
4. Check wallet connection status

## 📦 Build Output

The production build is configured to:
- ✅ Compile TypeScript without errors
- ✅ Generate optimized bundles
- ✅ Include testnet configurations
- ✅ Exclude development tools

### Build Status
- TypeScript compilation: ✅ Passed
- ESLint warnings: ⚠️ Minor warnings (non-blocking)
- Bundle size: ⚠️ Large (expected for development)

## 🎯 Next Steps

1. **Wait for Agent 2** to deploy contracts
2. **Update contract addresses** using the script
3. **Test wallet connection** on Sepolia
4. **Verify transaction flow** with test tokens
5. **Deploy to staging environment** for testing

---

**Status**: ✅ Frontend configured and ready for testnet deployment
**Waiting for**: Agent 2 contract deployment
**Ready for**: Testing with real testnet transactions