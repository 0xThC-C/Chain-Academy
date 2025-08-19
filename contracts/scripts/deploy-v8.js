/**
 * ProgressiveEscrowV8 Deployment Script
 * Deploys V8 contract with all bug fixes to all networks
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ProgressiveEscrowV8 with comprehensive fixes...");
  
  // Get network info
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log(`📡 Network: ${network} (Chain ID: ${chainId})`);
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log(`💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH`);
  
  if (balance.lt(hre.ethers.utils.parseEther("0.001"))) {
    throw new Error("❌ Insufficient balance for deployment");
  }
  
  try {
    // Deploy ProgressiveEscrowV8
    console.log("\n🔨 Deploying ProgressiveEscrowV8...");
    
    const ProgressiveEscrowV8 = await hre.ethers.getContractFactory("ProgressiveEscrowV8");
    
    // Deploy with constructor parameters (platform fee 10%)
    const platformFeePercentage = 10; // 10% platform fee
    const escrow = await ProgressiveEscrowV8.deploy(platformFeePercentage);
    
    console.log("⏳ Waiting for deployment transaction...");
    await escrow.deployed();
    
    console.log("✅ ProgressiveEscrowV8 deployed successfully!");
    console.log(`📍 Contract Address: ${escrow.address}`);
    console.log(`📄 Transaction Hash: ${escrow.deployTransaction.hash}`);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    const version = await escrow.version();
    const features = await escrow.getContractFeatures();
    const owner = await escrow.owner();
    
    console.log(`📦 Contract Version: ${version}`);
    console.log(`👑 Contract Owner: ${owner}`);
    console.log(`🎯 Platform Fee: ${platformFeePercentage}%`);
    console.log(`🔧 Features: ${features.join(', ')}`);
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    // Test supported tokens (should include USDT and USDC)
    const ethAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"; // ETH
    const isEthSupported = await escrow.isSupportedToken(ethAddress);
    console.log(`💎 ETH supported: ${isEthSupported}`);
    
    // Test emergency functions access
    const hasEmergencyRole = await escrow.hasRole(await escrow.EMERGENCY_ROLE(), deployer.address);
    console.log(`🚨 Deployer has emergency role: ${hasEmergencyRole}`);
    
    console.log("\n📋 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`Network: ${network}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Contract: ${escrow.address}`);
    console.log(`Version: ${version}`);
    console.log(`Owner: ${owner}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Gas Used: ${escrow.deployTransaction.gasLimit?.toString() || 'N/A'}`);
    console.log("=".repeat(50));
    
    // Network-specific post-deployment actions
    if (network === 'mainnet' || network === 'base' || network === 'optimism' || network === 'arbitrum' || network === 'polygon') {
      console.log("\n📝 For mainnet deployment, remember to:");
      console.log("1. Verify contract on block explorer");
      console.log("2. Add USDT and USDC as supported tokens");
      console.log("3. Update bot configuration with new address");
      console.log("4. Grant necessary roles to bot wallet");
      console.log("5. Test with small transaction first");
    }
    
    // Generate bot configuration
    console.log("\n🤖 Bot Configuration Update:");
    console.log(`Add to your V8 config:`);
    console.log(`"${network}": {`);
    console.log(`  "contractAddressV8": "${escrow.address}",`);
    console.log(`  "v8Enabled": true,`);
    console.log(`  "migrationMode": "v8-only"`);
    console.log(`}`);
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment
main()
  .then(() => {
    console.log("\n🎉 V8 deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });