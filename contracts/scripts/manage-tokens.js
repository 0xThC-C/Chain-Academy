const hre = require("hardhat");

// Token addresses for each network
const NETWORK_TOKENS = {
  ethereum: {
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86a33E6441e76C6c56e39Ff34d18cfde6c9f1"
  },
  polygon: {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
  },
  arbitrum: {
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"
  },
  optimism: {
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
  },
  base: {
    USDT: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
};

// Contract addresses (to be updated after deployment)
const MENTORSHIP_ADDRESSES = {
  ethereum: "",
  polygon: "",
  arbitrum: "",
  optimism: "",
  base: ""
};

async function addTokensToNetwork(networkName, contractAddress) {
  console.log(`\n=== Adding tokens to ${networkName.toUpperCase()} ===`);
  
  const mentorship = await hre.ethers.getContractAt("Mentorship", contractAddress);
  const tokens = NETWORK_TOKENS[networkName];
  
  if (!tokens) {
    console.log(`⚠️  No token configuration found for ${networkName}`);
    return;
  }

  try {
    // Add USDT
    console.log(`Adding USDT: ${tokens.USDT}`);
    const addUSDTTx = await mentorship.addSupportedToken(tokens.USDT);
    await addUSDTTx.wait();
    console.log("✅ USDT added successfully");

    // Add USDC
    console.log(`Adding USDC: ${tokens.USDC}`);
    const addUSDCTx = await mentorship.addSupportedToken(tokens.USDC);
    await addUSDCTx.wait();
    console.log("✅ USDC added successfully");

  } catch (error) {
    console.error(`❌ Failed to add tokens: ${error.message}`);
  }
}

async function main() {
  const networkName = hre.network.name;
  const contractAddress = MENTORSHIP_ADDRESSES[networkName];

  if (!contractAddress) {
    console.error(`❌ No contract address specified for ${networkName}`);
    console.log("Please update MENTORSHIP_ADDRESSES in the script");
    return;
  }

  await addTokensToNetwork(networkName, contractAddress);
}

// If called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { addTokensToNetwork, NETWORK_TOKENS };