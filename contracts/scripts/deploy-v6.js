const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Sepolia...");
  
  // Get signers from hardhat (ethers v6)
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("👛 Deploying with account:", deployer.address);
  
  // Check balance (ethers v6 syntax)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient balance for deployment");
  }
  
  console.log("\n📋 Deploying contracts...");
  
  try {
    // 1. Deploy Mock USDT
    console.log("1️⃣ Deploying Mock USDT...");
    const MockUSDT = await hre.ethers.getContractFactory("MockERC20");
    const mockUSDT = await MockUSDT.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.waitForDeployment();
    const usdtAddress = await mockUSDT.getAddress();
    console.log("✅ Mock USDT deployed to:", usdtAddress);
    
    // 2. Deploy Mock USDC
    console.log("2️⃣ Deploying Mock USDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);
    
    // 3. Deploy ProgressiveEscrowV3
    console.log("3️⃣ Deploying ProgressiveEscrowV3...");
    const ProgressiveEscrowV3 = await hre.ethers.getContractFactory("ProgressiveEscrowV3");
    const progressiveEscrow = await ProgressiveEscrowV3.deploy();
    await progressiveEscrow.waitForDeployment();
    const escrowAddress = await progressiveEscrow.getAddress();
    console.log("✅ ProgressiveEscrowV3 deployed to:", escrowAddress);
    
    // 4. Deploy Mentorship
    console.log("4️⃣ Deploying Mentorship...");
    const Mentorship = await hre.ethers.getContractFactory("Mentorship");
    const mentorship = await Mentorship.deploy();
    await mentorship.waitForDeployment();
    const mentorshipAddress = await mentorship.getAddress();
    console.log("✅ Mentorship deployed to:", mentorshipAddress);
    
    console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=" .repeat(50));
    console.log("📋 CONTRACT ADDRESSES:");
    console.log("=" .repeat(50));
    console.log(`Mock USDT: ${usdtAddress}`);
    console.log(`Mock USDC: ${usdcAddress}`);
    console.log(`ProgressiveEscrowV3: ${escrowAddress}`);
    console.log(`Mentorship: ${mentorshipAddress}`);
    console.log("=" .repeat(50));
    
    // Save addresses to file
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        MockUSDT: usdtAddress,
        MockUSDC: usdcAddress,
        ProgressiveEscrowV3: escrowAddress,
        Mentorship: mentorshipAddress
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync('deployment-sepolia.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to deployment-sepolia.json");
    
    console.log("\n🔗 Verify on Etherscan:");
    console.log(`https://sepolia.etherscan.io/address/${mentorshipAddress}`);
    console.log(`https://sepolia.etherscan.io/address/${escrowAddress}`);
    
    return {
      mockUSDT: usdtAddress,
      mockUSDC: usdcAddress,
      progressiveEscrow: escrowAddress,
      mentorship: mentorshipAddress
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