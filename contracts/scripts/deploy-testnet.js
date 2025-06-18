// 🧪 TESTNET DEPLOYMENT SCRIPT - Chain Academy V2
// Script otimizado para deploy seguro em redes de teste

const { network, ethers, run } = require("hardhat");

// Endereços de tokens TESTNET para cada rede
const TESTNET_TOKENS = {
  sepolia: {
    // Sepolia testnet tokens (você precisa deployar ou usar existentes)
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", // Example testnet USDT
    USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"  // Example testnet USDC
  },
  mumbai: {
    // Mumbai testnet tokens
    USDT: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58", // Mumbai testnet USDT
    USDC: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e"  // Mumbai testnet USDC
  },
  arbitrumGoerli: {
    // Arbitrum Goerli testnet tokens
    USDT: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // Example
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"  // Example
  },
  optimismGoerli: {
    // Optimism Goerli testnet tokens
    USDT: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // Example
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"  // Example
  },
  baseGoerli: {
    // Base Goerli testnet tokens
    USDT: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // Example
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"  // Example
  }
};

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = await getChainId();

  // Verificar se estamos em uma testnet
  const testnetNames = ['sepolia', 'mumbai', 'arbitrumGoerli', 'optimismGoerli', 'baseGoerli'];
  if (!testnetNames.includes(network.name)) {
    throw new Error(`🚨 ERRO: Este script é apenas para testnets! Rede atual: ${network.name}`);
  }

  log(`\n🧪 ===== DEPLOY EM TESTNET =====`);
  log(`🌐 Rede: ${network.name} (Chain ID: ${chainId})`);
  log(`👛 Deployer: ${deployer}`);
  log(`💰 Platform Fee Recipient: ${process.env.PLATFORM_FEE_RECIPIENT || '0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c'}`);

  // Verificar saldo do deployer
  const balance = await ethers.provider.getBalance(deployer);
  const balanceInEth = ethers.formatEther(balance);
  log(`💎 Saldo do deployer: ${balanceInEth} ETH`);

  if (parseFloat(balanceInEth) < 0.01) {
    throw new Error(`🚨 ERRO: Saldo insuficiente! Você precisa de pelo menos 0.01 ETH para o deploy.`);
  }

  // 🚀 DEPLOY MENTORSHIP CONTRACT
  log(`\n📋 Deployando Mentorship Contract...`);
  
  const mentorshipDeployment = await deploy("Mentorship", {
    from: deployer,
    args: [process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 2, // Menos confirmações para testnet
    gasLimit: 3000000, // Limite de gas para evitar erros
  });

  log(`✅ Mentorship deployado em: ${mentorshipDeployment.address}`);

  // 🚀 DEPLOY PROGRESSIVE ESCROW V3
  log(`\n📋 Deployando ProgressiveEscrowV3 Contract...`);
  
  const escrowDeployment = await deploy("ProgressiveEscrowV3", {
    from: deployer,
    args: [process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 1 : 2,
    gasLimit: 3000000,
  });

  log(`✅ ProgressiveEscrowV3 deployado em: ${escrowDeployment.address}`);

  // ⚙️ CONFIGURAR TOKENS SUPORTADOS
  log(`\n⚙️ Configurando tokens suportados...`);
  
  const mentorship = await ethers.getContractAt("Mentorship", mentorshipDeployment.address);
  const escrow = await ethers.getContractAt("ProgressiveEscrowV3", escrowDeployment.address);

  const tokens = TESTNET_TOKENS[network.name];
  if (tokens) {
    try {
      // Adicionar USDT ao Mentorship
      const addUSDTTx = await mentorship.addSupportedToken(tokens.USDT, { gasLimit: 100000 });
      await addUSDTTx.wait();
      log(`✅ USDT adicionado ao Mentorship: ${tokens.USDT}`);

      // Adicionar USDC ao Mentorship
      const addUSDCTx = await mentorship.addSupportedToken(tokens.USDC, { gasLimit: 100000 });
      await addUSDCTx.wait();
      log(`✅ USDC adicionado ao Mentorship: ${tokens.USDC}`);

      // Adicionar tokens ao Escrow
      const addUSDTEscrowTx = await escrow.addSupportedToken(tokens.USDT, { gasLimit: 100000 });
      await addUSDTEscrowTx.wait();
      log(`✅ USDT adicionado ao Escrow: ${tokens.USDT}`);

      const addUSDCEscrowTx = await escrow.addSupportedToken(tokens.USDC, { gasLimit: 100000 });
      await addUSDCEscrowTx.wait();
      log(`✅ USDC adicionado ao Escrow: ${tokens.USDC}`);

    } catch (error) {
      log(`⚠️ Aviso: Erro ao configurar tokens - ${error.message}`);
      log(`ℹ️ Você pode configurar manualmente depois do deploy`);
    }
  } else {
    log(`⚠️ Tokens de testnet não configurados para ${network.name}`);
    log(`ℹ️ Você precisa deployar tokens de teste ou usar endereços existentes`);
  }

  // 📊 VERIFICAÇÃO DO DEPLOY
  log(`\n📊 ===== VERIFICAÇÃO DO DEPLOY =====`);
  
  try {
    // Verificar configurações do Mentorship
    const platformFeeRecipient = await mentorship.platformFeeRecipient();
    const platformFeePercentage = await mentorship.PLATFORM_FEE_PERCENTAGE();
    
    log(`🏢 Platform Fee Recipient: ${platformFeeRecipient}`);
    log(`💰 Platform Fee Percentage: ${platformFeePercentage}%`);
    
    // Verificar configurações do Escrow
    const escrowPlatformWallet = await escrow.platformWallet();
    const escrowPlatformFee = await escrow.PLATFORM_FEE_PERCENT();
    
    log(`🏢 Escrow Platform Wallet: ${escrowPlatformWallet}`);
    log(`💰 Escrow Platform Fee: ${escrowPlatformFee}%`);
    
    // Verificar se os contratos não estão pausados
    const mentorshipPaused = await mentorship.paused();
    const escrowPaused = await escrow.paused();
    
    log(`⏸️ Mentorship Pausado: ${mentorshipPaused ? '❌ SIM' : '✅ NÃO'}`);
    log(`⏸️ Escrow Pausado: ${escrowPaused ? '❌ SIM' : '✅ NÃO'}`);
    
  } catch (error) {
    log(`⚠️ Erro na verificação: ${error.message}`);
  }

  // 🔍 VERIFICAÇÃO NOS BLOCK EXPLORERS
  if (process.env.DEPLOY_VERIFY === 'true' && network.name !== "hardhat") {
    log(`\n🔍 Verificando contratos nos block explorers...`);
    
    try {
      // Aguardar um pouco antes da verificação
      log(`⏳ Aguardando 30 segundos antes da verificação...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      await run("verify:verify", {
        address: mentorshipDeployment.address,
        constructorArguments: [process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"],
      });
      log(`✅ Mentorship verificado com sucesso`);
      
      await run("verify:verify", {
        address: escrowDeployment.address,
        constructorArguments: [process.env.PLATFORM_FEE_RECIPIENT || "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c"],
      });
      log(`✅ ProgressiveEscrowV3 verificado com sucesso`);
      
    } catch (e) {
      log(`⚠️ Verificação falhou (normal em testnets): ${e.message}`);
    }
  }

  // 📋 RESUMO FINAL
  log(`\n🎉 ===== DEPLOY CONCLUÍDO COM SUCESSO =====`);
  log(`🌐 Rede: ${network.name}`);
  log(`📄 Mentorship: ${mentorshipDeployment.address}`);
  log(`📄 ProgressiveEscrowV3: ${escrowDeployment.address}`);
  log(`🔗 Explorer: ${getExplorerUrl(network.name, mentorshipDeployment.address)}`);
  
  // 📝 PRÓXIMOS PASSOS
  log(`\n📝 ===== PRÓXIMOS PASSOS =====`);
  log(`1. ✅ Anote os endereços dos contratos`);
  log(`2. 🧪 Teste as funções básicas`);
  log(`3. 🔗 Atualize o frontend com os novos endereços`);
  log(`4. 💰 Configure tokens de teste se necessário`);
  log(`5. 🚀 Execute testes de integração`);
  
  log(`\n🔧 Comandos úteis:`);
  log(`- Verificar manualmente: npx hardhat verify --network ${network.name} ${mentorshipDeployment.address} "${process.env.PLATFORM_FEE_RECIPIENT || '0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c'}"`);
  log(`- Interagir: npx hardhat console --network ${network.name}`);
};

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

module.exports.tags = ["Testnet", "Deploy", "Mentorship", "Escrow"];