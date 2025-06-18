const hre = require("hardhat");

// Contract addresses on different networks (to be filled after deployment)
const CONTRACT_ADDRESSES = {
  ethereum: "",
  polygon: "",
  arbitrum: "",
  optimism: "",
  base: ""
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  for (const [networkName, address] of Object.entries(CONTRACT_ADDRESSES)) {
    if (!address) {
      console.log(`⚠️  No address provided for ${networkName}, skipping...`);
      continue;
    }

    try {
      console.log(`\n=== Verifying contract on ${networkName.toUpperCase()} ===`);
      console.log(`Address: ${address}`);
      
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [deployer.address],
        network: networkName
      });
      
      console.log(`✅ Successfully verified on ${networkName}`);
      
    } catch (error) {
      console.error(`❌ Failed to verify on ${networkName}:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });