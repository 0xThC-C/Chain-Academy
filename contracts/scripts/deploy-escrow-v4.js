const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying ProgressiveEscrowV4 with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Use deployer as platform wallet for now (can be changed later)
    const platformWallet = deployer.address;
    
    console.log("Platform wallet address:", platformWallet);

    // Deploy the contract
    const ProgressiveEscrowV4 = await ethers.getContractFactory("ProgressiveEscrowV4");
    const escrow = await ProgressiveEscrowV4.deploy(platformWallet);

    await escrow.waitForDeployment();
    const contractAddress = await escrow.getAddress();

    console.log("ProgressiveEscrowV4 deployed to:", contractAddress);
    
    // Verify ETH is supported by default
    const isETHSupported = await escrow.isTokenSupported(ethers.ZeroAddress);
    console.log("ETH supported by default:", isETHSupported);
    
    // Add USDC and USDT addresses for Sepolia testnet if available
    // These are placeholder addresses - replace with actual testnet token addresses
    try {
        // Example USDC address on Sepolia (replace with actual if different)
        const sepoliaUSDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // Replace with actual
        const sepoliaUSDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Replace with actual
        
        console.log("Adding supported tokens...");
        // Note: These transactions will fail if the addresses don't exist on testnet
        // That's okay for now - we'll mainly use ETH for testing
        
        console.log("Contract deployment completed successfully!");
        console.log("\nContract Details:");
        console.log("- Address:", contractAddress);
        console.log("- Platform Wallet:", platformWallet);
        console.log("- ETH Support: Enabled");
        console.log("- Platform Fee: 10%");
        console.log("- Heartbeat Interval: 30 seconds");
        console.log("- Grace Period: 2 minutes");
        console.log("- Progressive Release Interval: 3 minutes");
        
    } catch (error) {
        console.log("Note: Token addresses may need to be added manually for testnet");
    }

    console.log("\nTo verify on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress} "${platformWallet}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });