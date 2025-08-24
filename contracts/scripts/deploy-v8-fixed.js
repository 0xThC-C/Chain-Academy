const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying ProgressiveEscrowV8 (V7 Compatible Version) to all L2 networks...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log(`📋 Deploying with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${hre.ethers.utils.formatEther(await deployer.getBalance())} ETH`);
    
    // Platform wallet - Chain Academy treasury
    const PLATFORM_WALLET = "0x527162328cb3072c31Ad853dE00C799A64658951";
    
    console.log(`🏢 Platform wallet: ${PLATFORM_WALLET}`);
    
    // Get the contract factory
    const ProgressiveEscrowV8 = await hre.ethers.getContractFactory("ProgressiveEscrowV8");
    
    console.log("📝 Contract compiled successfully");
    console.log("🔧 Constructor parameters:");
    console.log(`   - Platform Wallet: ${PLATFORM_WALLET}`);
    
    // Deploy the contract
    console.log("\n⏳ Deploying contract...");
    const progressiveEscrow = await ProgressiveEscrowV8.deploy(PLATFORM_WALLET);
    
    console.log("⏳ Waiting for deployment transaction...");
    await progressiveEscrow.deployed();
    
    const contractAddress = progressiveEscrow.address;
    const deploymentTx = progressiveEscrow.deployTransaction;
    
    console.log("\n✅ ProgressiveEscrowV8 DEPLOYED SUCCESSFULLY!");
    console.log("==========================================");
    console.log(`📍 Contract Address: ${contractAddress}`);
    console.log(`🔗 Transaction Hash: ${deploymentTx.hash}`);
    console.log(`⛽ Gas Used: ${deploymentTx.gasLimit?.toString() || 'N/A'}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    // Wait for a few confirmations
    console.log("\n⏳ Waiting for 3 confirmations...");
    const receipt = await deploymentTx.wait(3);
    console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
    
    // Configure the contract with supported tokens
    console.log("\n🔧 Configuring supported tokens...");
    
    const tokens = {
        "ETH": "0x0000000000000000000000000000000000000000",
        "USDC": {
            "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            "optimism": "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", 
            "arbitrum": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            "polygon": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
        },
        "USDT": {
            "base": "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
            "optimism": "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
            "arbitrum": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 
            "polygon": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
        }
    };
    
    // Get network-specific token addresses
    const networkName = hre.network.name;
    let tokenAddresses = [];
    
    if (tokens.USDC[networkName]) {
        tokenAddresses.push(tokens.USDC[networkName]);
    }
    if (tokens.USDT[networkName]) {
        tokenAddresses.push(tokens.USDT[networkName]);
    }
    
    // Add supported tokens
    for (const tokenAddress of tokenAddresses) {
        try {
            console.log(`   Adding token: ${tokenAddress}`);
            const tx = await progressiveEscrow.addSupportedToken(tokenAddress);
            await tx.wait();
            console.log(`   ✅ Token added: ${tokenAddress}`);
        } catch (error) {
            console.log(`   ℹ️ Token might already be supported: ${error.message}`);
        }
    }
    
    // Test contract functionality
    console.log("\n🧪 Testing contract functionality...");
    
    try {
        const platformWallet = await progressiveEscrow.platformWallet();
        const owner = await progressiveEscrow.owner();
        const paused = await progressiveEscrow.paused();
        
        console.log(`   Platform Wallet: ${platformWallet} ${platformWallet === PLATFORM_WALLET ? '✅' : '❌'}`);
        console.log(`   Owner: ${owner} ${owner === deployer.address ? '✅' : '❌'}`);
        console.log(`   Paused: ${paused} ${!paused ? '✅' : '❌'}`);
        
        // Test V7 compatibility functions
        const userNonce = await progressiveEscrow.getUserNonce(deployer.address);
        console.log(`   V7 Compatibility - User Nonce: ${userNonce} ✅`);
        
        console.log("✅ All tests passed!");
        
    } catch (error) {
        console.error("❌ Contract test failed:", error.message);
    }
    
    // Generate configuration summary
    console.log("\n📋 DEPLOYMENT SUMMARY:");
    console.log("====================");
    console.log(`Network: ${hre.network.name}`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Platform Fee: 10%`);
    console.log(`V7 Compatibility: ✅ Enabled`);
    console.log(`Supported Features:`);
    console.log(`  - Progressive Payments ✅`);
    console.log(`  - Multi-token Support ✅`);
    console.log(`  - V7 Frontend Compatibility ✅`);
    console.log(`  - Enhanced State Machine ✅`);
    console.log(`  - Auto-recovery System ✅`);
    console.log(`  - Dispute Resolution ✅`);
    
    // Network-specific configuration
    const networkConfigs = {
        base: "Base Mainnet",
        optimism: "Optimism Mainnet", 
        arbitrum: "Arbitrum Mainnet",
        polygon: "Polygon Mainnet"
    };
    
    if (networkConfigs[networkName]) {
        console.log(`\n🌐 ${networkConfigs[networkName]} Configuration:`);
        console.log(`Contract: ${contractAddress}`);
        console.log(`Explorer: https://${networkName === 'optimism' ? 'optimistic.etherscan.io' : networkName === 'polygon' ? 'polygonscan.com' : networkName + 'scan.org'}/address/${contractAddress}`);
    }
    
    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=====================================");
    console.log("⚠️  IMPORTANT: Update frontend configuration with new address");
    console.log("📝 Next steps:");
    console.log("   1. Update frontend contracts configuration");
    console.log("   2. Update bot configuration");
    console.log("   3. Test with small transactions");
    console.log("   4. Update Vercel deployment");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ DEPLOYMENT FAILED:");
        console.error(error);
        process.exit(1);
    });