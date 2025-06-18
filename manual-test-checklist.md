# Chain Academy V2 - Manual Payment Testing Checklist

## Contract Verification ✅

### Sepolia Testnet Contracts:
- **Mentorship Contract**: 0x409C486D1A686e9499E9561bFf82781843598eDF
- **Progressive Escrow V3**: 0xa161C5F6B18120269c279D31A7FEcAFb86c737EC  
- **Mock USDT**: 0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085
- **Mock USDC**: 0x556C875376950B70E0b5A670c9f15885093002B9

**Status**: ✅ All contracts are verified and deployed on Sepolia
**Contract Tests**: ✅ All 65 test cases pass (confirmed by running npm test)

## Frontend Testing Status

### 1. Application Accessibility ✅
- **Homepage**: http://localhost:3000 - ✅ Accessible 
- **Frontend Running**: ✅ React application is served correctly
- **Key Elements**: ✅ Basic app structure detected

### 2. Wallet Connection Testing 🔍

**Test Steps**:
1. Open http://localhost:3000 in browser
2. Look for wallet connection button
3. Test with MetaMask on Sepolia testnet
4. Verify wallet connection status

**Expected Behavior**:
- Wallet connection button should be visible
- Should prompt to switch to Sepolia testnet if on wrong network
- Should show connected address after successful connection
- Should display testnet warning

### 3. Contract Integration Testing 🔍

**Test Steps**:
1. Connect wallet to Sepolia testnet
2. Navigate to mentorship booking/payment page
3. Attempt to interact with smart contracts
4. Monitor browser console for errors

**Expected Behavior**:
- Contract addresses should be correctly configured
- Read functions should work (no transaction required)
- Write functions should show transaction prompts

### 4. Payment Flow Testing 💰

**Prerequisites**:
- Sepolia ETH for gas: Get from https://sepoliafaucet.com/
- Test USDC/USDT tokens: Use contract's mint function or request from admin

**Test Steps**:
1. Navigate to payment/booking page
2. Select mentor and session details
3. Choose payment token (USDC or USDT)
4. Attempt to book a session
5. Verify token approval process
6. Complete payment transaction

**Expected Behavior**:
- Token approval transaction should be prompted first
- Payment transaction should follow approval
- Session should be created in contract
- Payment should be escrowed properly

### 5. Progressive Payment Testing 🕐

**Test Steps** (Requires active session):
1. Start a mentorship session
2. Monitor progressive payment releases
3. Test heartbeat functionality
4. Test session pause/resume
5. Complete session

**Expected Behavior**:
- Progressive payments release over time
- Heartbeat prevents auto-pause
- Session can be manually paused/resumed
- Final payment distributed on completion

## Test Results Summary

### ✅ Working Components:
1. **Smart Contracts**: All deployed and tested (65/65 tests pass)
2. **Frontend Access**: Application loads correctly
3. **Contract Configuration**: Addresses properly configured
4. **Test Infrastructure**: Comprehensive test suite available

### 🔍 Manual Testing Required:
1. **Wallet Connection**: Test Web3 wallet integration
2. **Payment UI**: Test booking and payment interfaces  
3. **Token Interactions**: Test USDC/USDT approvals and transfers
4. **Progressive Payments**: Test time-based payment releases
5. **Session Management**: Test session lifecycle

### ⚠️ Known Issues to Watch:
1. **Mentors Page**: 404 error detected - may need route fix
2. **Missing UI Elements**: Some expected elements not found on homepage
3. **Token Balance**: Users need testnet tokens for testing

## Testing Recommendations

### 🛠️ For Developers:
1. **Fix routing**: Investigate "/mentors" 404 error
2. **UI Elements**: Ensure wallet connection is prominent
3. **Error Handling**: Add user-friendly error messages
4. **Loading States**: Show transaction progress clearly

### 🧪 For Testers:
1. **Get Testnet Funds**: Use Sepolia faucet for ETH
2. **Test Small Amounts**: Start with minimal transactions
3. **Monitor Console**: Watch for JavaScript errors
4. **Test Different Wallets**: Try MetaMask, Coinbase Wallet, etc.
5. **Test Mobile**: Verify responsive design

### 🔒 Security Considerations:
1. **Testnet Only**: ⚠️ Never use real funds
2. **Contract Verification**: ✅ All contracts are verified
3. **Progressive Security**: ✅ Time-based releases implemented
4. **Emergency Functions**: ✅ Pause/emergency features available

## Quick Start Testing Guide

### Step 1: Setup Wallet
```
1. Install MetaMask
2. Add Sepolia testnet (Chain ID: 11155111)
3. Get test ETH from https://sepoliafaucet.com/
```

### Step 2: Access Application
```
1. Open http://localhost:3000
2. Connect wallet to Sepolia
3. Verify network connection
```

### Step 3: Test Basic Flow
```
1. Navigate to mentorship booking
2. Select a mentor/session
3. Choose payment method (USDC/USDT)
4. Complete booking transaction
```

## Contract Addresses for Testing

Copy these addresses for manual testing:

```javascript
// Mentorship Contract
0x409C486D1A686e9499E9561bFf82781843598eDF

// Progressive Escrow
0xa161C5F6B18120269c279D31A7FEcAFb86c737EC

// Test USDT  
0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085

// Test USDC
0x556C875376950B70E0b5A670c9f15885093002B9
```

## Etherscan Links

- [Mentorship Contract](https://sepolia.etherscan.io/address/0x409C486D1A686e9499E9561bFf82781843598eDF)
- [Progressive Escrow](https://sepolia.etherscan.io/address/0xa161C5F6B18120269c279D31A7FEcAFb86c737EC)
- [Mock USDT](https://sepolia.etherscan.io/address/0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085)
- [Mock USDC](https://sepolia.etherscan.io/address/0x556C875376950B70E0b5A670c9f15885093002B9)

---

**Last Updated**: 2025-06-16 00:56 UTC
**Test Status**: Contracts verified ✅, Frontend accessible ✅, Manual testing required 🔍