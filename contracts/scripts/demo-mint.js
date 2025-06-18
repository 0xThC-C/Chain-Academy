const { ethers } = require("hardhat");

// Demo script to show how to mint tokens
async function main() {
  console.log("🎬 Demo: Minting Test Tokens");
  console.log("=" .repeat(50));
  
  // Get the signer (deployer address)
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.log("❌ No signers available. Make sure PRIVATE_KEY is set in your .env file");
    process.exit(1);
  }
  const signer = signers[0];
  const recipientAddress = signer.address;
  console.log("📍 Minting tokens to:", recipientAddress);
  
  // Import and run the mint function
  const { main: mintTokens } = require("./mint-tokens.js");
  
  // Override process.argv to simulate command line arguments
  const originalArgv = process.argv;
  process.argv = ["node", "mint-tokens.js", recipientAddress, "500"];
  
  try {
    await mintTokens();
    console.log("");
    console.log("✅ Demo completed successfully!");
    console.log("🎉 You now have 500 USDT and 500 USDC test tokens!");
  } catch (error) {
    console.error("❌ Demo failed:", error.message);
  } finally {
    // Restore original argv
    process.argv = originalArgv;
  }
}

// Run the demo
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Demo script failed:", error);
      process.exit(1);
    });
}

module.exports = { main };