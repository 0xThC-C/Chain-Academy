const hre = require("hardhat");
const fs = require("fs");

// Platform wallet address
const PLATFORM_WALLET = "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";

// Network configurations
const NETWORKS = {
  polygon: {
    name: "Polygon",
    chainId: 137,
    tokens: {
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    }
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
    }
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    tokens: {
      USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"
    }
  },
  base: {
    name: "Base",
    chainId: 8453,
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
    }
  }
};

async function deployToNetwork(networkName) {
  console.log(`\n🚀 Deploying ProgressiveEscrowV5 to ${NETWORKS[networkName].name}...`);
  
  try {
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📋 Deployer: ${deployer.address}`);
    
    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    if (balance < hre.ethers.parseEther("0.01")) {
      throw new Error("Insufficient balance for deployment");
    }
    
    // Deploy contract
    console.log(`📦 Deploying with platform wallet: ${PLATFORM_WALLET}`);
    
    const ProgressiveEscrowV5 = await hre.ethers.getContractFactory("ProgressiveEscrowV5");
    
    // Estimate gas
    const deployTransaction = await ProgressiveEscrowV5.getDeployTransaction(PLATFORM_WALLET);
    const gasEstimate = await deployer.estimateGas(deployTransaction);
    console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
    
    // Deploy with gas optimization
    const contract = await ProgressiveEscrowV5.deploy(PLATFORM_WALLET, {
      gasLimit: Math.floor(Number(gasEstimate) * 1.2) // 20% buffer
    });
    
    console.log(`⏳ Waiting for deployment transaction: ${contract.deploymentTransaction().hash}`);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log(`✅ Contract deployed to: ${contractAddress}`);
    
    // Verify token support
    console.log(`\n🔍 Verifying token support...`);
    const ethSupported = await contract.supportedTokens("0x0000000000000000000000000000000000000000");
    const usdcSupported = await contract.supportedTokens(NETWORKS[networkName].tokens.USDC);
    const usdtSupported = await contract.supportedTokens(NETWORKS[networkName].tokens.USDT);
    
    console.log(`ETH: ${ethSupported ? '✅' : '❌'}`);
    console.log(`USDC: ${usdcSupported ? '✅' : '❌'}`);
    console.log(`USDT: ${usdtSupported ? '✅' : '❌'}`);
    
    // Verify platform wallet
    const platformWallet = await contract.platformWallet();
    console.log(`Platform wallet: ${platformWallet === PLATFORM_WALLET ? '✅' : '❌'} ${platformWallet}`);
    
    return {
      network: networkName,
      address: contractAddress,
      hash: contract.deploymentTransaction().hash,
      gasUsed: gasEstimate.toString(),
      ethSupported,
      usdcSupported,
      usdtSupported,
      platformWallet
    };
    
  } catch (error) {
    console.error(`❌ Deployment failed on ${NETWORKS[networkName].name}:`, error.message);
    return {
      network: networkName,
      error: error.message
    };
  }
}

async function main() {
  console.log("🎯 ProgressiveEscrowV5 Multi-Network Deployment");
  console.log("================================================");
  
  const results = {};
  const targetNetwork = process.env.NETWORK;
  
  if (targetNetwork && NETWORKS[targetNetwork]) {
    // Deploy to specific network
    console.log(`📍 Deploying only to ${NETWORKS[targetNetwork].name}`);
    results[targetNetwork] = await deployToNetwork(targetNetwork);
  } else {
    // Deploy to all networks
    console.log("📍 Deploying to all L2 networks");
    
    for (const networkName of Object.keys(NETWORKS)) {
      results[networkName] = await deployToNetwork(networkName);
      
      // Wait between deployments
      if (Object.keys(NETWORKS).indexOf(networkName) < Object.keys(NETWORKS).length - 1) {
        console.log("⏱️  Waiting 10 seconds before next deployment...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
  
  // Generate deployment summary
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("======================");
  
  const summary = {
    timestamp: new Date().toISOString(),
    platformWallet: PLATFORM_WALLET,
    deployments: {}
  };
  
  for (const [networkName, result] of Object.entries(results)) {
    const network = NETWORKS[networkName];
    console.log(`\n${network.name} (Chain ID: ${network.chainId})`);
    
    if (result.error) {
      console.log(`❌ FAILED: ${result.error}`);
      summary.deployments[networkName] = { success: false, error: result.error };
    } else {
      console.log(`✅ SUCCESS: ${result.address}`);
      console.log(`   Transaction: ${result.hash}`);
      console.log(`   Gas used: ${result.gasUsed}`);
      console.log(`   ETH: ${result.ethSupported ? '✅' : '❌'} | USDC: ${result.usdcSupported ? '✅' : '❌'} | USDT: ${result.usdtSupported ? '✅' : '❌'}`);
      
      summary.deployments[networkName] = {
        success: true,
        address: result.address,
        hash: result.hash,
        gasUsed: result.gasUsed,
        tokens: {
          eth: result.ethSupported,
          usdc: result.usdcSupported,
          usdt: result.usdtSupported
        }
      };
    }
  }
  
  // Save deployment summary
  const summaryPath = "./deployment-v5-mainnet.json";
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`\n💾 Deployment summary saved to: ${summaryPath}`);
  
  // Generate frontend config
  console.log("\n📋 FRONTEND CONFIGURATION:");
  console.log("export const CONTRACT_ADDRESSES = {");
  for (const [networkName, result] of Object.entries(results)) {
    if (result.address) {
      const chainId = NETWORKS[networkName].chainId;
      console.log(`  [${chainId}]: "${result.address}", // ${NETWORKS[networkName].name}`);
    }
  }
  console.log("};");
  
  // Check if all deployments succeeded
  const successCount = Object.values(results).filter(r => !r.error).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎉 Deployment completed: ${successCount}/${totalCount} networks successful`);
  
  if (successCount === totalCount) {
    console.log("🚀 All deployments successful! Ready to update frontend.");
  } else {
    console.log("⚠️  Some deployments failed. Check errors above.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment script failed:", error);
    process.exit(1);
  });