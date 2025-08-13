const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying FIXED ProgressiveEscrowV4 to Arbitrum mainnet...");
  
  // Platform wallet address (same as before)
  const platformWallet = "0xA0E74B53ece3207488c1c2A4178412846209b454";
  
  // Deploy the contract
  const ProgressiveEscrowV4 = await hre.ethers.getContractFactory("ProgressiveEscrowV4");
  const contract = await ProgressiveEscrowV4.deploy(platformWallet);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log("✅ ProgressiveEscrowV4 deployed to:", contractAddress);
  console.log("📋 Platform wallet:", platformWallet);
  
  // Verify ETH is enabled by default
  const isEthSupported = await contract.supportedTokens("0x0000000000000000000000000000000000000000");
  console.log("💰 ETH enabled by default:", isEthSupported);
  
  // Test adding USDC
  console.log("\n🔧 Testing USDC enablement...");
  try {
    const usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    const tx = await contract.addSupportedToken(usdcAddress);
    await tx.wait();
    
    const isUsdcSupported = await contract.supportedTokens(usdcAddress);
    console.log("✅ USDC enabled successfully:", isUsdcSupported);
  } catch (error) {
    console.log("❌ USDC enablement failed:", error.message);
  }
  
  console.log("\n📝 Update your frontend with this new address:");
  console.log(`CONTRACT_ADDRESS = "${contractAddress}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });