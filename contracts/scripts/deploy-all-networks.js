const hre = require("hardhat");

// Network configurations
const NETWORKS = [
  "ethereum",
  "polygon", 
  "arbitrum",
  "optimism",
  "base"
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  for (const networkName of NETWORKS) {
    try {
      console.log(`\n=== Deploying to ${networkName.toUpperCase()} ===`);
      
      // Change network programmatically
      hre.changeNetwork(networkName);
      
      // Run deployment
      await hre.run("deploy", {
        tags: "Mentorship"
      });
      
      console.log(`✅ Successfully deployed to ${networkName}`);
      
    } catch (error) {
      console.error(`❌ Failed to deploy to ${networkName}:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });