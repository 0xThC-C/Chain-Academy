const { ethers } = require("hardhat");

// Deployed contract addresses on Sepolia
const MOCK_USDT_ADDRESS = "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085";
const MOCK_USDC_ADDRESS = "0x556C875376950B70E0b5A670c9f15885093002B9";

// MockERC20 ABI (just mint function)
const MOCK_ERC20_ABI = [
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)"
];

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log("❌ Usage: npx hardhat run scripts/mint-tokens.js --network sepolia -- <recipient-address> <amount>");
    console.log("📝 Example: npx hardhat run scripts/mint-tokens.js --network sepolia -- 0x123...abc 1000");
    console.log("💡 This will mint 1000 USDT and 1000 USDC to the specified address");
    process.exit(1);
  }

  const recipientAddress = args[0];
  const amount = args[1];

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    console.log("❌ Invalid recipient address:", recipientAddress);
    process.exit(1);
  }

  // Validate amount
  if (isNaN(amount) || parseFloat(amount) <= 0) {
    console.log("❌ Invalid amount:", amount);
    process.exit(1);
  }

  console.log("🪙 Minting test tokens on Sepolia...");
  console.log("📍 Recipient:", recipientAddress);
  console.log("💰 Amount:", amount, "tokens each");
  console.log("");

  // Get signer
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.log("❌ No signers available. Make sure PRIVATE_KEY is set in your .env file");
    process.exit(1);
  }
  const signer = signers[0];
  console.log("👛 Minting with account:", signer.address);

  // Connect to contracts
  const mockUSDT = new ethers.Contract(MOCK_USDT_ADDRESS, MOCK_ERC20_ABI, signer);
  const mockUSDC = new ethers.Contract(MOCK_USDC_ADDRESS, MOCK_ERC20_ABI, signer);

  try {
    // Get token info
    const [usdtName, usdtSymbol, usdtDecimals] = await Promise.all([
      mockUSDT.name(),
      mockUSDT.symbol(),
      mockUSDT.decimals()
    ]);

    const [usdcName, usdcSymbol, usdcDecimals] = await Promise.all([
      mockUSDC.name(),
      mockUSDC.symbol(),
      mockUSDC.decimals()
    ]);

    console.log("📋 Token Information:");
    console.log(`   ${usdtName} (${usdtSymbol}): ${usdtDecimals} decimals`);
    console.log(`   ${usdcName} (${usdcSymbol}): ${usdcDecimals} decimals`);
    console.log("");

    // Calculate amounts with decimals
    const usdtAmount = ethers.parseUnits(amount, usdtDecimals);
    const usdcAmount = ethers.parseUnits(amount, usdcDecimals);

    // Get balances before
    const usdtBalanceBefore = await mockUSDT.balanceOf(recipientAddress);
    const usdcBalanceBefore = await mockUSDC.balanceOf(recipientAddress);

    console.log("⚡ Balances before minting:");
    console.log(`   ${usdtSymbol}: ${ethers.formatUnits(usdtBalanceBefore, usdtDecimals)}`);
    console.log(`   ${usdcSymbol}: ${ethers.formatUnits(usdcBalanceBefore, usdcDecimals)}`);
    console.log("");

    // Mint USDT
    console.log("1️⃣ Minting", amount, "USDT...");
    const usdtTx = await mockUSDT.mint(recipientAddress, usdtAmount);
    console.log("   Transaction hash:", usdtTx.hash);
    await usdtTx.wait();
    console.log("   ✅ USDT minted successfully!");

    // Mint USDC
    console.log("2️⃣ Minting", amount, "USDC...");
    const usdcTx = await mockUSDC.mint(recipientAddress, usdcAmount);
    console.log("   Transaction hash:", usdcTx.hash);
    await usdcTx.wait();
    console.log("   ✅ USDC minted successfully!");

    // Get balances after
    const usdtBalanceAfter = await mockUSDT.balanceOf(recipientAddress);
    const usdcBalanceAfter = await mockUSDC.balanceOf(recipientAddress);

    console.log("");
    console.log("🎉 Minting completed!");
    console.log("⚡ Balances after minting:");
    console.log(`   ${usdtSymbol}: ${ethers.formatUnits(usdtBalanceAfter, usdtDecimals)}`);
    console.log(`   ${usdcSymbol}: ${ethers.formatUnits(usdcBalanceAfter, usdcDecimals)}`);
    console.log("");
    console.log("🔗 View on Etherscan:");
    console.log(`   USDT: https://sepolia.etherscan.io/tx/${usdtTx.hash}`);
    console.log(`   USDC: https://sepolia.etherscan.io/tx/${usdcTx.hash}`);

  } catch (error) {
    console.error("❌ Error minting tokens:", error.message);
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