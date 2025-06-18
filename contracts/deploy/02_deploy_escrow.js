const { network } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  log(`\n🔒 Deploying MentorshipEscrowV2 to network: ${network.name} (Chain ID: ${chainId})`);

  // 🔒 SECURITY: Use environment variable for platform fee recipient
  const platformFeeRecipient = process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";
  
  log(`Platform Wallet: ${platformFeeRecipient}`);

  // Deploy MentorshipEscrowV2 contract
  const escrowDeployment = await deploy("MentorshipEscrowV2", {
    from: deployer,
    args: [platformFeeRecipient],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 5,
  });

  log(`✅ MentorshipEscrowV2 contract deployed at: ${escrowDeployment.address}`);

  // Add supported tokens if not on hardhat network
  if (network.name !== "hardhat") {
    const escrow = await ethers.getContractAt("MentorshipEscrowV2", escrowDeployment.address);

    log("🪙 Adding supported tokens to escrow...");

    // For testnets, we'll add example token addresses
    // In production, use real USDT/USDC addresses
    const testTokens = {
      sepolia: {
        USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
        USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"
      },
      mumbai: {
        USDT: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58",
        USDC: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e"
      }
    };

    const tokens = testTokens[network.name];
    if (tokens) {
      try {
        // Add USDT
        const addUSDTTx = await escrow.addSupportedToken(tokens.USDT);
        await addUSDTTx.wait();
        log(`✅ USDT added to escrow: ${tokens.USDT}`);

        // Add USDC
        const addUSDCTx = await escrow.addSupportedToken(tokens.USDC);
        await addUSDCTx.wait();
        log(`✅ USDC added to escrow: ${tokens.USDC}`);

      } catch (tokenError) {
        log(`⚠️ Warning: Could not add tokens automatically - ${tokenError.message}`);
        log(`ℹ️ You can add tokens manually later using the addSupportedToken function`);
      }
    }
  }

  // Verify contract if not on hardhat network
  if (network.name !== "hardhat" && process.env.ETHERSCAN_API_KEY) {
    log("🔍 Verifying escrow contract...");
    try {
      await run("verify:verify", {
        address: escrowDeployment.address,
        constructorArguments: [platformFeeRecipient],
      });
      log("✅ Escrow contract verified successfully");
    } catch (e) {
      log(`⚠️ Escrow contract verification failed: ${e.message}`);
    }
  }

  log(`🎉 MentorshipEscrowV2 deployment completed!`);
};

module.exports.tags = ["MentorshipEscrowV2", "Testnet"];
module.exports.dependencies = ["Mentorship"];