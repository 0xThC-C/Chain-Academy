const { network } = require("hardhat");

// Network-specific token addresses for USDT and USDC
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

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  log(`Deploying to network: ${network.name} (Chain ID: ${chainId})`);

  // 🔒 SECURITY: Use environment variable for platform fee recipient
  const platformFeeRecipient = process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";
  
  log(`Platform Fee Recipient: ${platformFeeRecipient}`);

  // Deploy Mentorship contract
  const mentorshipDeployment = await deploy("Mentorship", {
    from: deployer,
    args: [platformFeeRecipient], // Use environment variable
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 5,
  });

  log(`Mentorship contract deployed at: ${mentorshipDeployment.address}`);

  // Add supported tokens if not on hardhat network
  if (network.name !== "hardhat" && NETWORK_TOKENS[network.name]) {
    const mentorship = await ethers.getContractAt("Mentorship", mentorshipDeployment.address);
    const tokens = NETWORK_TOKENS[network.name];

    log("Adding supported tokens...");

    // Add USDT
    const addUSDTTx = await mentorship.addSupportedToken(tokens.USDT);
    await addUSDTTx.wait();
    log(`USDT added as supported token: ${tokens.USDT}`);

    // Add USDC
    const addUSDCTx = await mentorship.addSupportedToken(tokens.USDC);
    await addUSDCTx.wait();
    log(`USDC added as supported token: ${tokens.USDC}`);
  }

  // Verify contract if not on hardhat network
  if (network.name !== "hardhat" && process.env.ETHERSCAN_API_KEY) {
    log("Verifying contract...");
    try {
      await run("verify:verify", {
        address: mentorshipDeployment.address,
        constructorArguments: [platformFeeRecipient],
      });
      log("Contract verified successfully");
    } catch (e) {
      log("Contract verification failed:", e.message);
    }
  }

  log("Deployment completed!");
};

module.exports.tags = ["Mentorship"];