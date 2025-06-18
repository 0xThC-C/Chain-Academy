// 🧪 SEPOLIA TESTNET DEPLOYMENT SCRIPT - Chain Academy V2
// Deploy dos contratos: ProgressiveEscrowV3, Mentorship, MentorshipFactory, MockERC20

const { ethers } = require("hardhat");

async function main() {
    console.log("\n🧪 ===== DEPLOY EM SEPOLIA TESTNET =====");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    
    console.log(`👛 Deployer: ${deployer.address}`);
    
    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`💎 Saldo do deployer: ${balanceInEth} ETH`);
    
    if (parseFloat(balanceInEth) < 0.01) {
        throw new Error(`🚨 ERRO: Saldo insuficiente! Você precisa de pelo menos 0.01 ETH para o deploy.`);
    }
    
    const deployments = {};
    const platformFeeRecipient = process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c";
    
    // 1. Deploy MockERC20 tokens (USDT e USDC de teste)
    console.log("\n📋 1. Deployando Mock USDT...");
    const MockUSDT = await ethers.getContractFactory("MockERC20");
    const mockUSDT = await MockUSDT.deploy("Test Tether USD", "USDT", 6); // USDT has 6 decimals
    await mockUSDT.waitForDeployment();
    deployments.mockUSDT = await mockUSDT.getAddress();
    console.log(`✅ Mock USDT deployado em: ${deployments.mockUSDT}`);
    
    console.log("\n📋 2. Deployando Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockUSDC.deploy("Test USD Coin", "USDC", 6); // USDC has 6 decimals
    await mockUSDC.waitForDeployment();
    deployments.mockUSDC = await mockUSDC.getAddress();
    console.log(`✅ Mock USDC deployado em: ${deployments.mockUSDC}`);
    
    // 2. Deploy ProgressiveEscrowV3
    console.log("\n📋 3. Deployando ProgressiveEscrowV3...");
    const ProgressiveEscrowV3 = await ethers.getContractFactory("ProgressiveEscrowV3");
    const progressiveEscrow = await ProgressiveEscrowV3.deploy(platformFeeRecipient);
    await progressiveEscrow.waitForDeployment();
    deployments.progressiveEscrow = await progressiveEscrow.getAddress();
    console.log(`✅ ProgressiveEscrowV3 deployado em: ${deployments.progressiveEscrow}`);
    
    // 3. Deploy Mentorship
    console.log("\n📋 4. Deployando Mentorship...");
    const Mentorship = await ethers.getContractFactory("Mentorship");
    const mentorship = await Mentorship.deploy(platformFeeRecipient);
    await mentorship.waitForDeployment();
    deployments.mentorship = await mentorship.getAddress();
    console.log(`✅ Mentorship deployado em: ${deployments.mentorship}`);
    
    // 4. Deploy MentorshipFactory
    console.log("\n📋 5. Deployando MentorshipFactory...");
    const MentorshipFactory = await ethers.getContractFactory("MentorshipFactory");
    const mentorshipFactory = await MentorshipFactory.deploy();
    await mentorshipFactory.waitForDeployment();
    deployments.mentorshipFactory = await mentorshipFactory.getAddress();
    console.log(`✅ MentorshipFactory deployado em: ${deployments.mentorshipFactory}`);
    
    // Configure supported tokens
    console.log("\n⚙️ Configurando tokens suportados...");
    
    try {
        // Add tokens to Mentorship contract
        console.log("📋 Adicionando tokens ao contrato Mentorship...");
        let tx = await mentorship.addSupportedToken(deployments.mockUSDT);
        await tx.wait();
        console.log(`✅ USDT adicionado ao Mentorship`);
        
        tx = await mentorship.addSupportedToken(deployments.mockUSDC);
        await tx.wait();
        console.log(`✅ USDC adicionado ao Mentorship`);
        
        // Add tokens to ProgressiveEscrow contract
        console.log("📋 Adicionando tokens ao contrato ProgressiveEscrow...");
        tx = await progressiveEscrow.addSupportedToken(deployments.mockUSDT);
        await tx.wait();
        console.log(`✅ USDT adicionado ao ProgressiveEscrow`);
        
        tx = await progressiveEscrow.addSupportedToken(deployments.mockUSDC);
        await tx.wait();
        console.log(`✅ USDC adicionado ao ProgressiveEscrow`);
        
    } catch (error) {
        console.log(`⚠️ Aviso: Erro ao configurar tokens - ${error.message}`);
        console.log(`ℹ️ Você pode configurar manualmente depois do deploy`);
    }
    
    // Verification
    console.log("\n📊 ===== VERIFICAÇÃO DO DEPLOY =====");
    
    try {
        // Check Mentorship contract
        const platformFeeRecipientMentorship = await mentorship.platformFeeRecipient();
        const platformFeePercentage = await mentorship.PLATFORM_FEE_PERCENTAGE();
        
        console.log(`🏢 Mentorship Platform Fee Recipient: ${platformFeeRecipientMentorship}`);
        console.log(`💰 Mentorship Platform Fee Percentage: ${platformFeePercentage}%`);
        
        // Check ProgressiveEscrow contract
        const platformWallet = await progressiveEscrow.platformWallet();
        const platformFeePercent = await progressiveEscrow.PLATFORM_FEE_PERCENT();
        
        console.log(`🏢 ProgressiveEscrow Platform Wallet: ${platformWallet}`);
        console.log(`💰 ProgressiveEscrow Platform Fee: ${platformFeePercent}%`);
        
    } catch (error) {
        console.log(`⚠️ Erro na verificação: ${error.message}`);
    }
    
    // Get transaction hashes
    console.log("\n📋 ===== TRANSACTION HASHES =====");
    console.log(`Mock USDT: ${mockUSDT.deploymentTransaction()?.hash || 'N/A'}`);
    console.log(`Mock USDC: ${mockUSDC.deploymentTransaction()?.hash || 'N/A'}`);
    console.log(`ProgressiveEscrowV3: ${progressiveEscrow.deploymentTransaction()?.hash || 'N/A'}`);
    console.log(`Mentorship: ${mentorship.deploymentTransaction()?.hash || 'N/A'}`);
    console.log(`MentorshipFactory: ${mentorshipFactory.deploymentTransaction()?.hash || 'N/A'}`);
    
    // Final summary
    console.log("\n🎉 ===== DEPLOY CONCLUÍDO COM SUCESSO =====");
    console.log(`🌐 Rede: Sepolia Testnet`);
    console.log(`📄 Mock USDT: ${deployments.mockUSDT}`);
    console.log(`📄 Mock USDC: ${deployments.mockUSDC}`);  
    console.log(`📄 ProgressiveEscrowV3: ${deployments.progressiveEscrow}`);
    console.log(`📄 Mentorship: ${deployments.mentorship}`);
    console.log(`📄 MentorshipFactory: ${deployments.mentorshipFactory}`);
    console.log(`🔗 Sepolia Explorer: https://sepolia.etherscan.io/`);
    
    // Save deployment info
    const deploymentInfo = {
        network: "sepolia",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployments,
        transactionHashes: {
            mockUSDT: mockUSDT.deploymentTransaction()?.hash,
            mockUSDC: mockUSDC.deploymentTransaction()?.hash,
            progressiveEscrow: progressiveEscrow.deploymentTransaction()?.hash,
            mentorship: mentorship.deploymentTransaction()?.hash,
            mentorshipFactory: mentorshipFactory.deploymentTransaction()?.hash
        }
    };
    
    console.log("\n📋 Deployment Info (JSON):");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    return deploymentInfo;
}

main()
    .then((result) => {
        console.log("\n✅ Deploy script executado com sucesso!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Erro no deploy:");
        console.error(error);
        process.exit(1);
    });