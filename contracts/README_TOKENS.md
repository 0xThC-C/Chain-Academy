# Mock Tokens for Testing - Chain Academy V2

## Overview

This guide provides everything you need to mint and use mock USDT and USDC tokens for testing Chain Academy V2 on Sepolia testnet.

## Quick Start

### 1. Demo Minting (Easiest)
Mint 500 tokens to your wallet address:
```bash
npx hardhat run scripts/demo-mint.js --network sepolia
```

### 2. Custom Minting
Mint specific amounts to any address:
```bash
# Mint 1000 tokens to a specific address
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xYourAddress 1000
```

### 3. Check Balances
```bash
# Check token balances for any address
node scripts/check-token-balances.js 0xYourAddress
```

## Contract Information

**Sepolia Testnet Addresses:**
- Mock USDT: `0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085`
- Mock USDC: `0x556C875376950B70E0b5A670c9f15885093002B9`
- Mentorship: `0x409C486D1A686e9499E9561bFf82781843598eDF`
- Progressive Escrow: `0xa161C5F6B18120269c279D31A7FEcAFb86c737EC`

**Token Specifications:**
- Both tokens use 6 decimals (like real USDT/USDC)
- Public mint function available for testing
- Standard ERC20 implementation with OpenZeppelin

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Demo Mint | `npx hardhat run scripts/demo-mint.js --network sepolia` | Mint 500 tokens to your wallet |
| Custom Mint | `npx hardhat run scripts/mint-tokens.js --network sepolia -- <address> <amount>` | Mint custom amount to any address |
| Check Balances | `node scripts/check-token-balances.js <address>` | Check token balances for any address |

## Usage Examples

### Example 1: Basic Testing Setup
```bash
# 1. Mint tokens for testing
npx hardhat run scripts/demo-mint.js --network sepolia

# 2. Check your balances
node scripts/check-token-balances.js 0x527162328cb3072c31Ad853dE00C799A64658951

# 3. Ready to test!
```

### Example 2: Multiple Test Accounts
```bash
# Mint tokens for different test scenarios
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xMentorAddress 2000
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xStudentAddress 1000
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xTestAddress 500
```

### Example 3: Integration Testing
```bash
# Setup tokens for contract testing
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xTestAccount1 5000
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xTestAccount2 3000

# Verify balances
node scripts/check-token-balances.js 0xTestAccount1
node scripts/check-token-balances.js 0xTestAccount2
```

## Prerequisites

1. **Sepolia ETH**: Get from [Sepolia Faucet](https://sepoliafaucet.com/)
2. **Environment Setup**: Your `.env` file should have:
   ```env
   PRIVATE_KEY=your_private_key_here
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   ```

## Smart Contract Functions

The MockERC20 contracts provide these functions:

```solidity
// 🪙 Mint tokens (public function)
function mint(address to, uint256 amount) external

// 🔥 Burn tokens (public function) 
function burn(address from, uint256 amount) external

// 📊 Standard ERC20 functions
function balanceOf(address account) external view returns (uint256)
function transfer(address to, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
function allowance(address owner, address spender) external view returns (uint256)
```

## Testing Workflows

### 1. Mentorship Testing
```bash
# Setup mentor and student accounts
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xMentorAddress 1000
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xStudentAddress 1000

# Test escrow functionality
# ... your mentorship contract interactions
```

### 2. Payment Flow Testing
```bash
# Setup large amounts for payment testing
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xTestAddress 10000

# Test various payment scenarios
# ... contract interactions
```

### 3. Edge Case Testing
```bash
# Test with different token amounts
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xEdgeTest1 1
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xEdgeTest2 999999999
```

## Direct Contract Interaction

You can also interact with contracts directly on Etherscan:

1. **USDT Contract**: https://sepolia.etherscan.io/address/0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085
2. **USDC Contract**: https://sepolia.etherscan.io/address/0x556C875376950B70E0b5A670c9f15885093002B9

**To mint via Etherscan:**
1. Go to Contract → Write Contract
2. Connect your wallet
3. Use `mint` function with:
   - `to`: Recipient address
   - `amount`: Amount in wei (multiply by 1,000,000 for 6 decimals)

## Common Use Cases

### Frontend Testing
```javascript
// In your React app
const mockUSDT = new ethers.Contract(
  "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085",
  MockERC20_ABI,
  signer
);

// Check balance
const balance = await mockUSDT.balanceOf(userAddress);
console.log("USDT Balance:", ethers.formatUnits(balance, 6));

// Approve spending
await mockUSDT.approve(mentorshipAddress, ethers.parseUnits("100", 6));
```

### Backend Testing
```javascript
// In your Node.js backend
const mockUSDC = await ethers.getContractAt(
  "MockERC20", 
  "0x556C875376950B70E0b5A670c9f15885093002B9"
);

// Mint tokens for user testing
await mockUSDC.mint(userAddress, ethers.parseUnits("1000", 6));
```

## Troubleshooting

### Common Issues

1. **"No signers available"**
   - Make sure `PRIVATE_KEY` is set in your `.env` file
   - Don't include the '0x' prefix in the private key

2. **"Insufficient funds for gas"**
   - Get Sepolia ETH from faucets
   - Check your ETH balance: `node scripts/check-token-balances.js YOUR_ADDRESS`

3. **"Transaction failed"**
   - Verify the recipient address is valid
   - Check if you have enough ETH for gas fees
   - Make sure you're on Sepolia network

4. **"Contract not found"**
   - Verify you're using the correct network (sepolia)
   - Double-check the contract addresses above

### Getting Help

1. **Check Transaction on Etherscan**: Copy the transaction hash from script output
2. **Verify Contract State**: Use the balance checker script
3. **Network Issues**: Try a different RPC endpoint in your `.env`

## Security Notes

⚠️ **Important Reminders:**

- **Testnet Only**: These are test tokens with no real value
- **Public Mint**: Anyone can mint these tokens (by design)
- **Test Private Keys**: Only use test private keys, never mainnet keys
- **No KYC/Limits**: No restrictions on minting amounts

## Advanced Usage

### Programmatic Token Management

```javascript
// Create a utility function for token setup
async function setupTestEnvironment(addresses, amount = "1000") {
  const mockUSDT = await ethers.getContractAt("MockERC20", USDT_ADDRESS);
  const mockUSDC = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
  
  for (const address of addresses) {
    await mockUSDT.mint(address, ethers.parseUnits(amount, 6));
    await mockUSDC.mint(address, ethers.parseUnits(amount, 6));
    console.log(`✅ Minted ${amount} tokens to ${address}`);
  }
}

// Usage
await setupTestEnvironment([
  "0xMentor1...",
  "0xStudent1...",
  "0xStudent2..."
], "2000");
```

### Integration with Test Suites

```javascript
// In your test files
beforeEach(async function() {
  // Setup fresh tokens for each test
  await mockUSDT.mint(mentor.address, ethers.parseUnits("1000", 6));
  await mockUSDC.mint(student.address, ethers.parseUnits("1000", 6));
});
```

## Next Steps

1. **Mint Your Test Tokens**: Run the demo script to get started
2. **Test Your DApp**: Use the tokens with your frontend/backend
3. **Explore Contract Interactions**: Try different scenarios with the mentorship contract
4. **Scale Your Testing**: Create multiple test accounts with different token amounts

For more detailed information, see the complete [TESTING_GUIDE.md](./TESTING_GUIDE.md).