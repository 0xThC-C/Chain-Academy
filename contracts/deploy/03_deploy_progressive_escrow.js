const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying ProgressiveEscrowV3 with deployer:", deployer);

  // Platform wallet address - should be set to the actual platform wallet
  const platformWallet = process.env.PLATFORM_WALLET || deployer;
  
  console.log("Platform wallet:", platformWallet);

  const progressiveEscrow = await deploy("ProgressiveEscrowV3", {
    from: deployer,
    args: [platformWallet],
    log: true,
    deterministicDeployment: false,
  });

  console.log("ProgressiveEscrowV3 deployed to:", progressiveEscrow.address);

  // Verify deployment
  if (progressiveEscrow.newlyDeployed) {
    console.log("Setting up initial configuration...");
    
    const contract = await ethers.getContractAt("ProgressiveEscrowV3", progressiveEscrow.address);
    
    // Add supported tokens (USDC and USDT)
    const networkName = hre.network.name;
    let usdcAddress, usdtAddress;
    
    switch (networkName) {
      case "mainnet":
        usdcAddress = "0xA0b86a33E6741a4c8e78B4c5a69b7e4AE1BB3fBC";
        usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        break;
      case "polygon":
        usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
        break;
      case "arbitrum":
        usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
        usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
        break;
      case "optimism":
        usdcAddress = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
        usdtAddress = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58";
        break;
      case "base":
        usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
        usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
        break;
      case "sepolia":
        usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
        usdtAddress = "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06";
        break;
      case "mumbai":
        usdcAddress = "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e";
        usdtAddress = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832";
        break;
      case "arbitrumSepolia":
        usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
        usdtAddress = "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E";
        break;
      case "optimismSepolia":
        usdcAddress = "0x5fd84259d66Cd46123540766Be93DFE6D43130D7";
        usdtAddress = "0x5589BB8228C07c4e15558875fAf2B859f678d129";
        break;
      case "baseSepolia":
        usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
        usdtAddress = "0x4A3A6Dd60A34bB2Aba60D73B4C88315E9CeB6A3D";
        break;
      default:
        console.log("Unknown network, skipping token setup");
        return;
    }

    try {
      if (usdcAddress) {
        console.log("Adding USDC as supported token:", usdcAddress);
        await contract.addSupportedToken(usdcAddress);
      }
      
      if (usdtAddress) {
        console.log("Adding USDT as supported token:", usdtAddress);
        await contract.addSupportedToken(usdtAddress);
      }
      
      console.log("ProgressiveEscrowV3 setup completed successfully!");
      
      // Log deployment summary
      console.log("\n=== Progressive Escrow V3 Deployment Summary ===");
      console.log("Contract Address:", progressiveEscrow.address);
      console.log("Platform Wallet:", platformWallet);
      console.log("Network:", networkName);
      console.log("USDC Address:", usdcAddress);
      console.log("USDT Address:", usdtAddress);
      console.log("Platform Fee:", "10%");
      console.log("Heartbeat Interval:", "30 seconds");
      console.log("Grace Period:", "2 minutes");
      console.log("Progressive Release Interval:", "3 minutes");
      console.log("===============================================\n");
      
    } catch (error) {
      console.error("Error during setup:", error);
    }
  }
};

module.exports.tags = ["ProgressiveEscrowV3"];
module.exports.dependencies = [];