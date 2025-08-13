const hre = require("hardhat");

const PLATFORM_WALLET = "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";

async function main() {
  console.log("🚀 Deploying ProgressiveEscrowV4_UltraOptimized...");
  console.log(`📋 Network: ${hre.network.name}`);
  console.log(`📋 Chain ID: ${hre.network.config.chainId}`);
  
  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  if (balance < hre.ethers.parseEther("0.01")) {
    throw new Error("❌ Insufficient balance for deployment (need at least 0.01 ETH)");
  }
  
  // Deploy contract
  console.log(`📦 Deploying with platform wallet: ${PLATFORM_WALLET}`);
  
  const Contract = await hre.ethers.getContractFactory("ProgressiveEscrowV4_UltraOptimized");
  
  // Estimate gas
  const deployTransaction = await Contract.getDeployTransaction(PLATFORM_WALLET);
  const gasEstimate = await deployer.estimateGas(deployTransaction);
  console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
  
  // Deploy with gas buffer
  const contract = await Contract.deploy(PLATFORM_WALLET, {
    gasLimit: Math.floor(Number(gasEstimate) * 1.2) // 20% buffer
  });
  
  console.log(`⏳ Transaction hash: ${contract.deploymentTransaction().hash}`);
  
  // Wait for deployment
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed to: ${contractAddress}`);
  
  // Verify token support
  console.log(`\n🔍 Verifying token support...`);
  try {
    const ethSupported = await contract.supportedTokens("0x0000000000000000000000000000000000000000");
    console.log(`ETH: ${ethSupported ? '✅' : '❌'}`);
    
    // Check chain-specific tokens
    const chainId = hre.network.config.chainId;
    let usdcAddress, usdtAddress;
    
    if (chainId === 42161) { // Arbitrum
      usdcAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
      usdtAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
    } else if (chainId === 8453) { // Base
      usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
      usdtAddress = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
    } else if (chainId === 10) { // Optimism
      usdcAddress = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
      usdtAddress = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58";
    } else if (chainId === 137) { // Polygon
      usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
      usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
    }
    
    if (usdcAddress && usdtAddress) {
      const usdcSupported = await contract.supportedTokens(usdcAddress);
      const usdtSupported = await contract.supportedTokens(usdtAddress);
      console.log(`USDC: ${usdcSupported ? '✅' : '❌'}`);
      console.log(`USDT: ${usdtSupported ? '✅' : '❌'}`);
    }
    
    // Verify platform wallet
    const platformWallet = await contract.platformWallet();
    console.log(`Platform wallet: ${platformWallet === PLATFORM_WALLET ? '✅' : '❌'} ${platformWallet}`);
    
  } catch (error) {
    console.log(`⚠️ Verification error: ${error.message}`);
  }
  
  // Return deployment info
  console.log(`\n📋 DEPLOYMENT SUMMARY:`);
  console.log(`Network: ${hre.network.name} (Chain ID: ${chainId})`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Transaction: ${contract.deploymentTransaction().hash}`);
  console.log(`Gas used: ${gasEstimate.toString()}`);
  
  console.log(`\n🎯 Frontend Config:`);
  console.log(`[${chainId}]: "${contractAddress}", // ${hre.network.name}`);
  
  return {
    network: hre.network.name,
    chainId,
    address: contractAddress,
    hash: contract.deploymentTransaction().hash,
    gasUsed: gasEstimate.toString()
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;