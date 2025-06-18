const hre = require("hardhat");

async function main() {
  console.log("🔍 Testing Hardhat configuration...");
  
  try {
    // Test network connection
    const network = await hre.ethers.provider.getNetwork();
    console.log("✅ Connected to network:", network.name, "Chain ID:", network.chainId);
    
    // Test signer
    const signers = await hre.ethers.getSigners();
    console.log("✅ Found", signers.length, "signers");
    
    if (signers.length > 0) {
      const deployer = signers[0];
      console.log("✅ Deployer address:", deployer.address);
      
      const balance = await hre.ethers.provider.getBalance(deployer.address);
      console.log("✅ Balance:", hre.ethers.formatEther(balance), "ETH");
    }
    
    // Test contract factory
    try {
      const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
      console.log("✅ MockERC20 contract factory loaded");
    } catch (error) {
      console.log("❌ Error loading MockERC20:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
  }
}

main().catch(console.error);