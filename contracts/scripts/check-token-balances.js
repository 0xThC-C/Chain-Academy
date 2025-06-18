const { ethers } = require("hardhat");

// Deployed contract addresses on Sepolia
const MOCK_USDT_ADDRESS = "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085";
const MOCK_USDC_ADDRESS = "0x556C875376950B70E0b5A670c9f15885093002B9";

// MockERC20 ABI
const MOCK_ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function totalSupply() external view returns (uint256)"
];

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log("❌ Usage: npx hardhat run scripts/check-token-balances.js --network sepolia -- <address>");
    console.log("📝 Example: npx hardhat run scripts/check-token-balances.js --network sepolia -- 0x123...abc");
    process.exit(1);
  }

  const address = args[0];

  // Validate address
  if (!ethers.isAddress(address)) {
    console.log("❌ Invalid address:", address);
    process.exit(1);
  }

  console.log("💰 Checking token balances on Sepolia...");
  console.log("📍 Address:", address);
  console.log("");

  // Get provider (read-only, no signer needed)
  const provider = ethers.provider;

  // Connect to contracts
  const mockUSDT = new ethers.Contract(MOCK_USDT_ADDRESS, MOCK_ERC20_ABI, provider);
  const mockUSDC = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_ERC20_ABI, provider);

  try {
    // Get token info and balances
    const [
      usdtName, usdtSymbol, usdtDecimals, usdtBalance, usdtTotalSupply,
      usdcName, usdcSymbol, usdcDecimals, usdcBalance, usdcTotalSupply
    ] = await Promise.all([
      mockUSDT.name(),
      mockUSDT.symbol(),
      mockUSDT.decimals(),
      mockUSDT.balanceOf(address),
      mockUSDT.totalSupply(),
      mockUSDC.name(),
      mockUSDC.symbol(),
      mockUSDC.decimals(),
      mockUSDC.balanceOf(address),
      mockUSDC.totalSupply()
    ]);

    console.log("📋 Token Balances:");
    console.log("=" .repeat(50));
    console.log(`${usdtName} (${usdtSymbol})`);
    console.log(`   Contract: ${MOCK_USDT_ADDRESS}`);
    console.log(`   Balance: ${ethers.formatUnits(usdtBalance, usdtDecimals)} ${usdtSymbol}`);
    console.log(`   Total Supply: ${ethers.formatUnits(usdtTotalSupply, usdtDecimals)} ${usdtSymbol}`);
    console.log("");
    console.log(`${usdcName} (${usdcSymbol})`);
    console.log(`   Contract: ${MOCK_USDC_ADDRESS}`);
    console.log(`   Balance: ${ethers.formatUnits(usdcBalance, usdcDecimals)} ${usdcSymbol}`);
    console.log(`   Total Supply: ${ethers.formatUnits(usdcTotalSupply, usdcDecimals)} ${usdcSymbol}`);
    console.log("=" .repeat(50));

    // Check ETH balance too
    const ethBalance = await provider.getBalance(address);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    console.log("");

    console.log("🔗 View on Etherscan:");
    console.log(`   Address: https://sepolia.etherscan.io/address/${address}`);
    console.log(`   USDT Contract: https://sepolia.etherscan.io/address/${MOCK_USDT_ADDRESS}`);
    console.log(`   USDC Contract: https://sepolia.etherscan.io/address/${MOCK_USDC_ADDRESS}`);

  } catch (error) {
    console.error("❌ Error checking balances:", error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { main };