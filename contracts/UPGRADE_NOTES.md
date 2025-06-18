# ProgressiveEscrowV3 to V4 Upgrade Notes

## Key Changes in V4

### 🆕 Native ETH Support
- **ETH Token Representation**: Uses `address(0)` (ethers.ZeroAddress) to represent native ETH
- **Payable Functions**: `createProgressiveSession` is now payable to accept ETH deposits
- **ETH Transfers**: New internal `_transferPayment()` function handles both ETH and ERC20 transfers
- **Default Support**: ETH is supported by default in the constructor

### 📝 Modified Functions

#### `createProgressiveSession` - Now Payable
```solidity
// V3 - ERC20 only
function createProgressiveSession(...) external nonReentrant whenNotPaused

// V4 - ETH and ERC20 support
function createProgressiveSession(...) external payable nonReentrant whenNotPaused
```

**New Logic:**
- If `paymentToken == address(0)`: Requires `msg.value == amount`
- If `paymentToken != address(0)`: Requires `msg.value == 0` and uses ERC20 transfer

#### Payment Release Functions
All payment release functions now use the internal `_transferPayment()` function:
- `releaseProgressivePayment()`
- `completeSession()` 
- `autoCompleteSession()`
- `cancelSession()`
- `emergencyRelease()`

### 🔧 New Internal Function

```solidity
function _transferPayment(address token, address to, uint256 amount) internal {
    if (token == ETH_TOKEN) {
        // Transfer ETH using call
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH transfer failed");
    } else {
        // Transfer ERC20 token
        IERC20(token).safeTransfer(to, amount);
    }
}
```

### 🆕 New Functions

#### ETH-Specific Functions
```solidity
// Check if a token is supported (works for ETH and ERC20)
function isTokenSupported(address token) external view returns (bool)

// Emergency ETH withdrawal (owner only)
function emergencyWithdrawETH(address payable to, uint256 amount) external onlyOwner

// Emergency ERC20 withdrawal (owner only) 
function emergencyWithdrawToken(address token, address to, uint256 amount) external onlyOwner

// Receive function to accept ETH
receive() external payable

// Fallback function
fallback() external payable
```

### 📊 Constants and State

#### New Constants
```solidity
// ETH token address representation
address public constant ETH_TOKEN = address(0);
```

#### Constructor Changes
```solidity
constructor(address _platformWallet) Ownable(msg.sender) {
    require(_platformWallet != address(0), "Invalid platform wallet");
    platformWallet = _platformWallet;
    
    // 🆕 Add ETH as a supported token by default
    supportedTokens[ETH_TOKEN] = true;
}
```

## 🧪 Testing with ETH

### Sample Usage (JavaScript/Frontend)
```javascript
// For ETH payments
await escrow.createProgressiveSession(
    sessionId,
    mentorAddress,
    ethers.ZeroAddress, // ETH token
    ethers.parseEther("0.1"), // 0.1 ETH
    60, // 60 minutes
    nonce,
    { value: ethers.parseEther("0.1") } // Send ETH with transaction
);

// For ERC20 payments (unchanged)
await token.approve(escrowAddress, amount);
await escrow.createProgressiveSession(
    sessionId,
    mentorAddress,
    tokenAddress,
    amount,
    60,
    nonce
    // No value field for ERC20
);
```

### Testing on Sepolia
```bash
# Deploy V4 contract
npx hardhat run scripts/deploy-and-test.js --network sepolia

# Test ETH functionality
npx hardhat run scripts/test-eth-functionality.js --network sepolia

# Run comprehensive tests
npx hardhat test test/ProgressiveEscrowV4.test.js
```

## 🔄 Migration Strategy

### Option 1: Deploy New Contract
1. Deploy ProgressiveEscrowV4 as a new contract
2. Update frontend to use new contract address
3. Gradually migrate users to the new contract
4. Keep V3 running for existing sessions

### Option 2: Upgrade Pattern (if using proxy)
If using OpenZeppelin's upgrade pattern:
1. Deploy V4 implementation
2. Upgrade proxy to point to V4
3. Initialize ETH support if needed

## ⚠️ Breaking Changes

### Frontend Integration
- **Contract Address**: New deployment means new contract address
- **Interface Changes**: `createProgressiveSession` now payable
- **ETH Handling**: Must send ETH value for ETH sessions
- **Token Address**: Use `ethers.ZeroAddress` for ETH

### Backend Integration
- **Event Monitoring**: Same events, but new contract address
- **Token Filtering**: Handle `address(0)` as ETH in token filtering
- **Balance Checking**: Use `contract.balance` for ETH tracking

## ✅ Backward Compatibility

### What Stays the Same
- All existing function signatures (except payable modifier)
- Event structures and names
- Session structure and flow
- Platform fee calculation (10%)
- Progressive payment logic
- Heartbeat system
- Emergency functions

### What Changes
- Contract deployment address
- ETH payment support
- Payable function for session creation

## 🚀 Benefits of V4

1. **Easier Testing**: ETH is readily available on testnets
2. **Lower Gas Costs**: ETH transfers are cheaper than ERC20
3. **Better UX**: No token approval step needed for ETH
4. **Wider Adoption**: Users familiar with ETH payments
5. **Reduced Complexity**: No need to acquire testnet USDC/USDT

## 📋 Deployment Checklist

- [ ] Deploy ProgressiveEscrowV4 contract
- [ ] Verify contract on Etherscan
- [ ] Test ETH session creation
- [ ] Test progressive ETH payments
- [ ] Test session completion with ETH
- [ ] Test session cancellation with ETH refund
- [ ] Update frontend contract address
- [ ] Update frontend to handle ETH payments
- [ ] Test frontend integration
- [ ] Update documentation
- [ ] Notify users of new ETH support

## 📞 Contract Addresses

### Sepolia Testnet
- **V3 Contract**: `0xa161C5F6B18120269c279D31A7FEcAFb86c737EC`
- **V4 Contract**: `[Deploy and update this address]`

### Production Mainnet
- **V3 Contract**: `[Not deployed yet]`
- **V4 Contract**: `[Not deployed yet]`