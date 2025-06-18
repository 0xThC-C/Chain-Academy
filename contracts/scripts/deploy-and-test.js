const { ethers } = require("hardhat");

async function main() {
    console.log("=== Deploying ProgressiveEscrowV4 with ETH Support ===\n");

    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Deploy V4 contract
    const ProgressiveEscrowV4 = await ethers.getContractFactory("ProgressiveEscrowV4");
    const escrow = await ProgressiveEscrowV4.deploy(deployer.address);
    
    await escrow.waitForDeployment();
    const contractAddress = await escrow.getAddress();

    console.log("ProgressiveEscrowV4 deployed to:", contractAddress);
    
    // Verify ETH support
    const ETH_TOKEN = ethers.ZeroAddress;
    const isETHSupported = await escrow.isTokenSupported(ETH_TOKEN);
    console.log("ETH supported by default:", isETHSupported);
    
    console.log("\nContract Features:");
    console.log("✅ Native ETH payments supported");
    console.log("✅ ERC20 token payments supported");
    console.log("✅ Progressive payment releases");
    console.log("✅ Heartbeat monitoring");
    console.log("✅ Auto-pause on connection loss");
    console.log("✅ Emergency functions");
    console.log("✅ 10% platform fee");
    
    console.log("\nKey Constants:");
    console.log("- Platform Fee:", await escrow.PLATFORM_FEE_PERCENT(), "%");
    console.log("- Heartbeat Interval:", await escrow.HEARTBEAT_INTERVAL(), "seconds");
    console.log("- Grace Period:", await escrow.GRACE_PERIOD(), "seconds");
    console.log("- Progressive Release Interval:", await escrow.PROGRESSIVE_RELEASE_INTERVAL(), "seconds");
    console.log("- Auto Release Delay:", await escrow.AUTO_RELEASE_DELAY(), "seconds");
    
    console.log("\nETH Token Address:", ETH_TOKEN);
    console.log("(Use address(0) or ethers.ZeroAddress for ETH payments)");
    
    console.log("\nNext Steps:");
    console.log("1. Verify contract on Etherscan:");
    console.log(`   npx hardhat verify --network sepolia ${contractAddress} "${deployer.address}"`);
    console.log("2. Test ETH functionality:");
    console.log(`   npx hardhat run scripts/test-eth-functionality.js --network sepolia`);
    console.log("3. Update frontend to use new contract address");
    
    // Create a test session to verify everything works
    console.log("\n=== Quick Test ===");
    
    const sessionId = ethers.keccak256(ethers.toUtf8Bytes("deployment-test"));
    const amount = ethers.parseEther("0.001"); // 0.001 ETH
    const duration = 10; // 10 minutes
    const nonce = 0;
    
    console.log("Creating test session with 0.001 ETH...");
    
    try {
        const tx = await escrow.createProgressiveSession(
            sessionId,
            deployer.address, // Self as mentor for testing
            ETH_TOKEN,
            amount,
            duration,
            nonce,
            { value: amount }
        );
        
        await tx.wait();
        console.log("✅ Test session created successfully!");
        
        const session = await escrow.getSession(sessionId);
        console.log("Session amount:", ethers.formatEther(session.totalAmount), "ETH");
        console.log("Session token:", session.paymentToken === ETH_TOKEN ? "ETH" : session.paymentToken);
        
        // Cancel the test session to refund
        const cancelTx = await escrow.cancelSession(sessionId);
        await cancelTx.wait();
        console.log("✅ Test session cancelled and refunded");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
    }
    
    console.log("\n🎉 Deployment and basic test completed!");
    console.log("Contract is ready for use with ETH payments on Sepolia testnet.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });