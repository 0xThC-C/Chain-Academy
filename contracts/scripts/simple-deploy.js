// 🧪 SIMPLE TESTNET DEPLOYMENT SCRIPT - Chain Academy V2
// Script standalone para deploy em testnets

const { ethers, network } = require("hardhat");
require("dotenv").config();

// Endereços de tokens TESTNET para cada rede
const TESTNET_TOKENS = {
  sepolia: {
    // Sepolia testnet tokens (testnet addresses)
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", 
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"  
  }
};

async function main() {
  console.log("\n🧪 ===== DEPLOY EM TESTNET =====");
  console.log(`🌐 Rede: ${network.name}`);
  
  // Verificar se estamos em uma testnet
  const testnetNames = ['sepolia', 'mumbai', 'arbitrumGoerli', 'optimismGoerli', 'baseGoerli'];
  if (!testnetNames.includes(network.name)) {
    throw new Error(`🚨 ERRO: Este script é apenas para testnets! Rede atual: ${network.name}`);
  }

  // Configurar signers
  const [deployer] = await ethers.getSigners();
  console.log(`👛 Deployer: ${deployer.address}`);
  
  const platformFeeRecipient = process.env.PLATFORM_FEE_RECIPIENT || deployer.address;
  console.log(`💰 Platform Fee Recipient: ${platformFeeRecipient}`);

  // Verificar saldo do deployer
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  console.log(`💎 Saldo do deployer: ${balanceInEth} ETH`);

  if (parseFloat(balanceInEth) < 0.01) {
    throw new Error(`🚨 ERRO: Saldo insuficiente! Você precisa de pelo menos 0.01 ETH para o deploy.`);
  }

  console.log("\n📋 Compilando contratos...");
  
  // 🚀 DEPLOY MENTORSHIP CONTRACT
  console.log(`\n📋 Deployando Mentorship Contract...`);
  
  const MentorshipFactory = await ethers.getContractFactory("Mentorship");
  const mentorship = await MentorshipFactory.deploy(platformFeeRecipient, {
    gasLimit: 3000000
  });
  
  await mentorship.waitForDeployment();
  const mentorshipAddress = await mentorship.getAddress();
  
  console.log(`✅ Mentorship deployado em: ${mentorshipAddress}`);

  // 🚀 DEPLOY PROGRESSIVE ESCROW V3
  console.log(`\n📋 Deployando ProgressiveEscrowV3 Contract...`);
  
  const EscrowFactory = await ethers.getContractFactory("ProgressiveEscrowV3");
  const escrow = await EscrowFactory.deploy(platformFeeRecipient, {
    gasLimit: 3000000
  });
  
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  
  console.log(`✅ ProgressiveEscrowV3 deployado em: ${escrowAddress}`);

  // ⚙️ CONFIGURAR TOKENS SUPORTADOS
  console.log(`\n⚙️ Configurando tokens suportados...`);
  
  const tokens = TESTNET_TOKENS[network.name];
  if (tokens) {
    try {
      // Adicionar USDT ao Mentorship
      console.log("Adicionando USDT ao Mentorship...");
      const addUSDTTx = await mentorship.addSupportedToken(tokens.USDT);
      await addUSDTTx.wait();
      console.log(`✅ USDT adicionado ao Mentorship: ${tokens.USDT}`);

      // Adicionar USDC ao Mentorship
      console.log("Adicionando USDC ao Mentorship...");
      const addUSDCTx = await mentorship.addSupportedToken(tokens.USDC);
      await addUSDCTx.wait();
      console.log(`✅ USDC adicionado ao Mentorship: ${tokens.USDC}`);

      // Adicionar tokens ao Escrow
      console.log("Adicionando USDT ao Escrow...");
      const addUSDTEscrowTx = await escrow.addSupportedToken(tokens.USDT);
      await addUSDTEscrowTx.wait();
      console.log(`✅ USDT adicionado ao Escrow: ${tokens.USDT}`);

      console.log("Adicionando USDC ao Escrow...");
      const addUSDCEscrowTx = await escrow.addSupportedToken(tokens.USDC);
      await addUSDCEscrowTx.wait();
      console.log(`✅ USDC adicionado ao Escrow: ${tokens.USDC}`);

    } catch (error) {
      console.log(`⚠️ Aviso: Erro ao configurar tokens - ${error.message}`);
      console.log(`ℹ️ Você pode configurar manualmente depois do deploy`);
    }
  } else {
    console.log(`⚠️ Tokens de testnet não configurados para ${network.name}`);
    console.log(`ℹ️ Você precisa deployar tokens de teste ou usar endereços existentes`);
  }

  // 📊 VERIFICAÇÃO DO DEPLOY
  console.log(`\n📊 ===== VERIFICAÇÃO DO DEPLOY =====`);
  
  try {
    // Verificar configurações do Mentorship
    const platformFeeRecipientCheck = await mentorship.platformFeeRecipient();
    const platformFeePercentage = await mentorship.PLATFORM_FEE_PERCENTAGE();
    
    console.log(`🏢 Platform Fee Recipient: ${platformFeeRecipientCheck}`);
    console.log(`💰 Platform Fee Percentage: ${platformFeePercentage}%`);
    
    // Verificar configurações do Escrow
    const escrowPlatformWallet = await escrow.platformWallet();
    const escrowPlatformFee = await escrow.PLATFORM_FEE_PERCENT();
    
    console.log(`🏢 Escrow Platform Wallet: ${escrowPlatformWallet}`);
    console.log(`💰 Escrow Platform Fee: ${escrowPlatformFee}%`);
    
    // Verificar se os contratos não estão pausados
    const mentorshipPaused = await mentorship.paused();
    const escrowPaused = await escrow.paused();
    
    console.log(`⏸️ Mentorship Pausado: ${mentorshipPaused ? '❌ SIM' : '✅ NÃO'}`);
    console.log(`⏸️ Escrow Pausado: ${escrowPaused ? '❌ SIM' : '✅ NÃO'}`);
    
  } catch (error) {
    console.log(`⚠️ Erro na verificação: ${error.message}`);
  }

  // 📋 RESUMO FINAL
  console.log(`\n🎉 ===== DEPLOY CONCLUÍDO COM SUCESSO =====`);
  console.log(`🌐 Rede: ${network.name}`);
  console.log(`📄 Mentorship: ${mentorshipAddress}`);
  console.log(`📄 ProgressiveEscrowV3: ${escrowAddress}`);
  console.log(`🔗 Explorer: ${getExplorerUrl(network.name, mentorshipAddress)}`);
  
  // 📝 PRÓXIMOS PASSOS
  console.log(`\n📝 ===== PRÓXIMOS PASSOS =====`);
  console.log(`1. ✅ Anote os endereços dos contratos`);
  console.log(`2. 🧪 Teste as funções básicas`);
  console.log(`3. 🔗 Atualize o frontend com os novos endereços`);
  console.log(`4. 💰 Configure tokens de teste se necessário`);
  console.log(`5. 🚀 Execute testes de integração`);
  
  console.log(`\n🔧 Comandos úteis:`);
  console.log(`- Verificar manualmente: npx hardhat verify --network ${network.name} ${mentorshipAddress} "${platformFeeRecipient}"`);
  console.log(`- Interagir: npx hardhat console --network ${network.name}`);

  // Salvar endereços em um arquivo
  const deploymentInfo = {
    network: network.name,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    platformFeeRecipient: platformFeeRecipient,
    contracts: {
      Mentorship: mentorshipAddress,
      ProgressiveEscrowV3: escrowAddress
    },
    tokens: tokens || {}
  };

  const fs = require('fs');
  const fileName = `deployment-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Informações de deploy salvas em: ${fileName}`);
}

// Helper function para URLs dos explorers
function getExplorerUrl(networkName, address) {
  const explorers = {
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    mumbai: `https://mumbai.polygonscan.com/address/${address}`,
    arbitrumGoerli: `https://goerli.arbiscan.io/address/${address}`,
    optimismGoerli: `https://goerli-optimism.etherscan.io/address/${address}`,
    baseGoerli: `https://goerli.basescan.org/address/${address}`
  };
  
  return explorers[networkName] || `Explorer não configurado para ${networkName}`;
}

// Executar se chamado diretamente
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };