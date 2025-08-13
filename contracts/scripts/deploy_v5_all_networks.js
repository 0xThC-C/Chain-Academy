const hre = require("hardhat");

// Token addresses for each network
const TOKEN_ADDRESSES = {
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"
  },
  optimism: {
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"
  },
  polygon: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
  }
};

async function deployToNetwork(network) {
  console.log(`\n🚀 Deploying ProgressiveEscrowV5 to ${network.toUpperCase()} mainnet...`);
  
  // Platform wallet address (same for all networks)
  const platformWallet = "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";
  
  // Deploy the contract
  const ProgressiveEscrowV5 = await hre.ethers.getContractFactory("ProgressiveEscrowV5");
  const contract = await ProgressiveEscrowV5.deploy(platformWallet);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ ProgressiveEscrowV5 deployed to ${network}:`, contractAddress);
  console.log("📋 Platform wallet:", platformWallet);
  
  // Add network-specific tokens
  const tokens = TOKEN_ADDRESSES[network];
  
  console.log(`\n🔧 Adding ${network} tokens...`);
  
  // Add USDC
  console.log(`Adding USDC: ${tokens.USDC}`);
  let tx = await contract.addSupportedToken(tokens.USDC);
  await tx.wait();
  console.log("✅ USDC added");
  
  // Add USDT
  console.log(`Adding USDT: ${tokens.USDT}`);
  tx = await contract.addSupportedToken(tokens.USDT);
  await tx.wait();
  console.log("✅ USDT added");
  
  // Verify all tokens are supported
  console.log("\n📊 Verifying token support:");
  const isEthSupported = await contract.supportedTokens("0x0000000000000000000000000000000000000000");
  const isUsdcSupported = await contract.supportedTokens(tokens.USDC);
  const isUsdtSupported = await contract.supportedTokens(tokens.USDT);
  
  console.log("ETH supported:", isEthSupported);
  console.log("USDC supported:", isUsdcSupported);
  console.log("USDT supported:", isUsdtSupported);
  
  return contractAddress;
}

async function main() {
  const deployments = {};
  
  // Get network from command line or deploy to all
  const targetNetwork = process.env.NETWORK;
  
  if (targetNetwork && TOKEN_ADDRESSES[targetNetwork]) {
    // Deploy to specific network
    deployments[targetNetwork] = await deployToNetwork(targetNetwork);
  } else {
    // Deploy to all networks
    for (const network of Object.keys(TOKEN_ADDRESSES)) {
      try {
        deployments[network] = await deployToNetwork(network);
      } catch (error) {
        console.error(`❌ Failed to deploy to ${network}:`, error.message);
      }
    }
  }
  
  console.log("\n🎉 Deployment Summary:");
  console.log("=======================");
  for (const [network, address] of Object.entries(deployments)) {
    console.log(`${network}: ${address}`);
  }
  
  console.log("\n📝 Update your frontend configuration with these addresses!");
  console.log("\nExample for contractConfig.ts:");
  console.log("export const CONTRACT_ADDRESSES = {");
  for (const [network, address] of Object.entries(deployments)) {
    const chainId = network === 'arbitrum' ? 42161 : 
                    network === 'base' ? 8453 :
                    network === 'optimism' ? 10 :
                    network === 'polygon' ? 137 : 0;
    console.log(`  [${chainId}]: "${address}", // ${network}`);
  }
  console.log("};");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });