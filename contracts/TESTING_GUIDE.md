# Testing Guide - Mock Tokens on Sepolia

This guide explains how to mint and use mock USDT and USDC tokens for testing Chain Academy V2 on Sepolia testnet.

## Contract Addresses

**Sepolia Testnet**
- Mock USDT: `0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085`
- Mock USDC: `0x556C875376950B70E0b5A670c9f15885093002B9`
- Mentorship Contract: `0x409C486D1A686e9499E9561bFf82781843598eDF`
- Progressive Escrow: `0xa161C5F6B18120269c279D31A7FEcAFb86c737EC`

## Prerequisites

1. **Sepolia ETH**: You need some Sepolia ETH for gas fees
   - Get free Sepolia ETH from faucets:
     - [Sepolia Faucet](https://sepoliafaucet.com/)
     - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
     - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

2. **Environment Setup**: Make sure you have the project configured
   ```bash
   cd contracts
   npm install
   ```

3. **Wallet Configuration**: Ensure your `.env` file has:
   ```env
   PRIVATE_KEY=your_private_key_here
   SEPOLIA_RPC_URL=your_sepolia_rpc_url
   ```

## Quick Start - Mint Test Tokens

### Method 1: Using the Mint Script (Recommended)

```bash
# Mint 1000 USDT and 1000 USDC to your address
npx hardhat run scripts/mint-tokens.js --network sepolia -- YOUR_ADDRESS 1000

# Example:
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0x123...abc 1000
```

### Method 2: Using Hardhat Console

```bash
# Start Hardhat console
npx hardhat console --network sepolia

# In the console:
const mockUSDT = await ethers.getContractAt("MockERC20", "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085");
const mockUSDC = await ethers.getContractAt("MockERC20", "0x556C875376950B70E0b5A670c9f15885093002B9");

// Mint 1000 tokens (with 6 decimals)
await mockUSDT.mint("YOUR_ADDRESS", ethers.parseUnits("1000", 6));
await mockUSDC.mint("YOUR_ADDRESS", ethers.parseUnits("1000", 6));
```

### Method 3: Direct Contract Interaction

You can also interact directly with the contracts on Etherscan:

1. Go to the contract on Sepolia Etherscan:
   - [Mock USDT](https://sepolia.etherscan.io/address/0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085)
   - [Mock USDC](https://sepolia.etherscan.io/address/0x556C875376950B70E0b5A670c9f15885093002B9)

2. Go to "Contract" -> "Write Contract"
3. Connect your wallet
4. Use the `mint` function:
   - `to`: Your wallet address
   - `amount`: Amount in wei (e.g., 1000000000 for 1000 tokens with 6 decimals)

## Check Token Balances

```bash
# Check your token balances
npx hardhat run scripts/check-token-balances.js --network sepolia -- YOUR_ADDRESS

# Example output:
# Mock USDT (USDT): 1000.0 USDT
# Mock USDC (USDC): 1000.0 USDC
```

## Token Details

Both mock tokens follow the ERC20 standard with these specifications:

| Token | Name | Symbol | Decimals | Contract Address |
|-------|------|--------|----------|------------------|
| Mock USDT | Mock USDT | USDT | 6 | `0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085` |
| Mock USDC | Mock USDC | USDC | 6 | `0x556C875376950B70E0b5A670c9f15885093002B9` |

## Available Functions

The MockERC20 contracts have these public functions:

```solidity
// Mint tokens to any address (public function)
function mint(address to, uint256 amount) external

// Burn tokens from any address (public function)  
function burn(address from, uint256 amount) external

// Standard ERC20 functions
function balanceOf(address account) external view returns (uint256)
function transfer(address to, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
// ... other standard ERC20 functions
```

## Testing Scenarios

### 1. Basic Token Operations

```bash
# Mint initial tokens
npx hardhat run scripts/mint-tokens.js --network sepolia -- YOUR_ADDRESS 1000

# Check balances
npx hardhat run scripts/check-token-balances.js --network sepolia -- YOUR_ADDRESS
```

### 2. Mentorship Contract Testing

```javascript
// In Hardhat console
const mentorship = await ethers.getContractAt("Mentorship", "0x409C486D1A686e9499E9561bFf82781843598eDF");
const mockUSDT = await ethers.getContractAt("MockERC20", "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085");

// Approve mentorship contract to spend tokens
await mockUSDT.approve(mentorship.address, ethers.parseUnits("100", 6));

// Create a mentorship session (example)
// ... mentorship contract interactions
```

### 3. Multiple Test Accounts

```bash
# Create test tokens for multiple accounts
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xAccount1... 1000
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xAccount2... 500
npx hardhat run scripts/mint-tokens.js --network sepolia -- 0xAccount3... 2000
```

## Common Issues and Solutions

### 1. "Insufficient funds for gas"
- Make sure you have Sepolia ETH in your wallet
- Get free Sepolia ETH from faucets listed above

### 2. "Contract not found" or "Invalid address"
- Verify you're using the correct network (sepolia)
- Double-check the contract addresses

### 3. "Transaction failed"
- Check if you have enough ETH for gas
- Verify the recipient address is valid
- Make sure the amount is reasonable (not too large)

### 4. "Private key not configured"
- Make sure your `.env` file has `PRIVATE_KEY` set
- Don't include the '0x' prefix in the private key

## Security Notes

⚠️ **Important Security Reminders:**

1. **Testnet Only**: These are mock tokens for testing only on Sepolia testnet
2. **No Real Value**: These tokens have no real-world value
3. **Public Mint**: Anyone can mint these tokens - they're for testing purposes
4. **Private Keys**: Never share your private keys or use mainnet private keys for testing

## Advanced Usage

### Custom Mint Amounts

```bash
# Mint different amounts
npx hardhat run scripts/mint-tokens.js --network sepolia -- YOUR_ADDRESS 500
npx hardhat run scripts/mint-tokens.js --network sepolia -- YOUR_ADDRESS 10000
```

### Programmatic Integration

```javascript
// In your tests or scripts
const { ethers } = require("hardhat");

async function setupTestTokens(address, amount = "1000") {
  const mockUSDT = await ethers.getContractAt("MockERC20", "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085");
  const mockUSDC = await ethers.getContractAt("MockERC20", "0x556C875376950B70E0b5A670c9f15885093002B9");
  
  await mockUSDT.mint(address, ethers.parseUnits(amount, 6));
  await mockUSDC.mint(address, ethers.parseUnits(amount, 6));
  
  console.log(`Minted ${amount} USDT and USDC to ${address}`);
}
```

## Support

If you encounter issues:

1. Check the [Sepolia Etherscan](https://sepolia.etherscan.io/) for transaction status
2. Verify your network configuration
3. Ensure you have sufficient Sepolia ETH for gas
4. Review the contract addresses and ABI

For additional support, check the project documentation or contact the development team.