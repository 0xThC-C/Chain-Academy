async function main() {
  console.log("🚀 Starting deployment to Sepolia...");
  
  // Get signers from hardhat
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  console.log("👛 Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    throw new Error("❌ Insufficient balance for deployment");
  }
  
  console.log("\n📋 Deploying contracts...");
  
  try {
    // 1. Deploy Mock USDT
    console.log("1️⃣ Deploying Mock USDT...");
    const MockUSDT = await ethers.getContractFactory("MockERC20");
    const mockUSDT = await MockUSDT.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.deployed();
    console.log("✅ Mock USDT deployed to:", mockUSDT.address);
    
    // 2. Deploy Mock USDC
    console.log("2️⃣ Deploying Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.deployed();
    console.log("✅ Mock USDC deployed to:", mockUSDC.address);
    
    // 3. Deploy ProgressiveEscrowV3
    console.log("3️⃣ Deploying ProgressiveEscrowV3...");
    const ProgressiveEscrowV3 = await ethers.getContractFactory("ProgressiveEscrowV3");
    const progressiveEscrow = await ProgressiveEscrowV3.deploy();
    await progressiveEscrow.deployed();
    console.log("✅ ProgressiveEscrowV3 deployed to:", progressiveEscrow.address);
    
    // 4. Deploy Mentorship
    console.log("4️⃣ Deploying Mentorship...");
    const Mentorship = await ethers.getContractFactory("Mentorship");
    const mentorship = await Mentorship.deploy();
    await mentorship.deployed();
    console.log("✅ Mentorship deployed to:", mentorship.address);
    
    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=" .repeat(50));
    console.log("📋 CONTRACT ADDRESSES:");
    console.log("=" .repeat(50));
    console.log(`Mock USDT: ${mockUSDT.address}`);
    console.log(`Mock USDC: ${mockUSDC.address}`);
    console.log(`ProgressiveEscrowV3: ${progressiveEscrow.address}`);
    console.log(`Mentorship: ${mentorship.address}`);
    console.log("=" .repeat(50));
    
    // Save addresses to file
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        MockUSDT: mockUSDT.address,
        MockUSDC: mockUSDC.address,
        ProgressiveEscrowV3: progressiveEscrow.address,
        Mentorship: mentorship.address
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-sepolia.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to deployment-sepolia.json");
    
    console.log("\n🔗 Verify on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${mentorship.address}`);
    console.log(`https://sepolia.etherscan.io/address/${progressiveEscrow.address}`);
    
    return {
      mockUSDT: mockUSDT.address,
      mockUSDC: mockUSDC.address,
      progressiveEscrow: progressiveEscrow.address,
      mentorship: mentorship.address
    };
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;