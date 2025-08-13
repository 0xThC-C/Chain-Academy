const hre = require("hardhat");

const PLATFORM_WALLET = "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";

async function main() {
  const networkName = hre.network.name;
  console.log(`🚀 Deploying ProgressiveEscrowV5 to ${networkName}...`);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);
  
  const ProgressiveEscrowV5 = await hre.ethers.getContractFactory("ProgressiveEscrowV5");
  const contract = await ProgressiveEscrowV5.deploy(PLATFORM_WALLET);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Contract deployed to: ${contractAddress}`);
  console.log(`📋 Platform wallet: ${PLATFORM_WALLET}`);
  
  // Verify token support
  const ethSupported = await contract.supportedTokens("0x0000000000000000000000000000000000000000");
  console.log(`ETH supported: ${ethSupported ? '✅' : '❌'}`);
  
  console.log(`\n🎯 Add this to your frontend config:`);
  console.log(`[${hre.network.config.chainId}]: "${contractAddress}",`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });