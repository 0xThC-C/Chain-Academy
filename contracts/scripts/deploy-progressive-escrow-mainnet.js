// scripts/deploy-progressive-escrow-mainnet.js

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Configuração das redes L2
const NETWORKS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdt: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    explorerUrl: 'https://basescan.org'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    usdt: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    explorerUrl: 'https://arbiscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL,
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    explorerUrl: 'https://polygonscan.com'
  }
};

async function deployToNetwork(networkKey, networkConfig) {
  console.log(`\n🚀 Deploying to ${networkConfig.name}...`);
  
  try {
    // Configurar provider para esta rede
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Deploying with wallet: ${wallet.address}`);
    console.log(`Platform wallet: ${process.env.PLATFORM_WALLET}`);
    
    // Verificar saldo
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.01')) {
      throw new Error(`Insufficient balance for deployment. Need at least 0.01 ETH`);
    }
    
    // Deploy do contrato
    console.log('📦 Deploying ProgressiveEscrowV4...');
    const ProgressiveEscrowV4 = await ethers.getContractFactory('ProgressiveEscrowV4', wallet);
    const progressiveEscrow = await ProgressiveEscrowV4.deploy(process.env.PLATFORM_WALLET);
    
    console.log('⏳ Waiting for deployment confirmation...');
    await progressiveEscrow.waitForDeployment();
    const contractAddress = await progressiveEscrow.getAddress();
    
    console.log(`✅ ProgressiveEscrowV4 deployed to: ${contractAddress}`);
    
    // Configurar tokens suportados
    console.log('🔧 Configuring supported tokens...');
    
    // Adicionar USDC
    if (networkConfig.usdc) {
      console.log(`Adding USDC: ${networkConfig.usdc}`);
      const usdcTx = await progressiveEscrow.addSupportedToken(networkConfig.usdc);
      await usdcTx.wait();
      console.log(`✅ USDC added successfully`);
    }
    
    // Adicionar USDT
    if (networkConfig.usdt) {
      console.log(`Adding USDT: ${networkConfig.usdt}`);
      const usdtTx = await progressiveEscrow.addSupportedToken(networkConfig.usdt);
      await usdtTx.wait();
      console.log(`✅ USDT added successfully`);
    }
    
    // ETH já está habilitado por padrão
    console.log(`✅ ETH support enabled by default`);
    
    // Verificar configuração
    const ethSupported = await progressiveEscrow.isTokenSupported('0x0000000000000000000000000000000000000000');
    const usdcSupported = await progressiveEscrow.isTokenSupported(networkConfig.usdc);
    const usdtSupported = await progressiveEscrow.isTokenSupported(networkConfig.usdt);
    
    console.log(`Token support verification:`);
    console.log(`- ETH: ${ethSupported ? '✅' : '❌'}`);
    console.log(`- USDC: ${usdcSupported ? '✅' : '❌'}`);
    console.log(`- USDT: ${usdtSupported ? '✅' : '❌'}`);
    
    const deployment = {
      network: networkKey,
      chainId: networkConfig.chainId,
      contractAddress,
      explorerUrl: `${networkConfig.explorerUrl}/address/${contractAddress}`,
      deployedAt: new Date().toISOString(),
      deployerAddress: wallet.address,
      platformWallet: process.env.PLATFORM_WALLET,
      supportedTokens: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDC: networkConfig.usdc,
        USDT: networkConfig.usdt
      },
      tokenSupport: {
        eth: ethSupported,
        usdc: usdcSupported,
        usdt: usdtSupported
      },
      status: 'success'
    };
    
    return deployment;
    
  } catch (error) {
    console.error(`❌ Error deploying to ${networkConfig.name}:`, error.message);
    return {
      network: networkKey,
      chainId: networkConfig.chainId,
      error: error.message,
      failed: true,
      status: 'failed'
    };
  }
}

async function main() {
  console.log('🌟 Chain Academy - Progressive Escrow V4 Mainnet Deployment');
  console.log('============================================================');
  
  // Verificar variáveis de ambiente
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'PLATFORM_WALLET'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log(`Platform wallet: ${process.env.PLATFORM_WALLET}`);
  console.log(`Deployer wallet: ${new ethers.Wallet(process.env.PRIVATE_KEY).address}`);
  
  const deployments = {};
  
  // Perguntar quais redes deployar
  const targetNetworks = process.env.TARGET_NETWORKS ? 
    process.env.TARGET_NETWORKS.split(',') : 
    Object.keys(NETWORKS);
  
  console.log(`Target networks: ${targetNetworks.join(', ')}`);
  
  // Deploy para cada rede
  for (const networkKey of targetNetworks) {
    if (!NETWORKS[networkKey]) {
      console.error(`❌ Unknown network: ${networkKey}`);
      continue;
    }
    
    const networkConfig = NETWORKS[networkKey];
    
    try {
      const deployment = await deployToNetwork(networkKey, networkConfig);
      deployments[networkKey] = deployment;
      
      if (!deployment.failed) {
        console.log(`✅ ${networkConfig.name} deployment successful!`);
        console.log(`   Contract: ${deployment.contractAddress}`);
        console.log(`   Explorer: ${deployment.explorerUrl}`);
      }
      
      // Aguardar um pouco entre deploys
      if (targetNetworks.indexOf(networkKey) < targetNetworks.length - 1) {
        console.log('⏳ Waiting 10 seconds before next deployment...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
    } catch (error) {
      console.error(`Failed to deploy to ${networkKey}:`, error);
      deployments[networkKey] = {
        network: networkKey,
        error: error.message,
        failed: true,
        status: 'failed'
      };
    }
  }
  
  // Salvar resultados
  const deploymentSummary = {
    timestamp: new Date().toISOString(),
    version: 'ProgressiveEscrowV4',
    environment: 'mainnet',
    deployments,
    totalNetworks: targetNetworks.length,
    successfulDeployments: Object.values(deployments).filter(d => !d.failed).length,
    failedDeployments: Object.values(deployments).filter(d => d.failed).length
  };
  
  // Salvar arquivo de deployment
  const outputPath = path.join(__dirname, '..', 'MAINNET_DEPLOYMENT_RESULTS.json');
  fs.writeFileSync(outputPath, JSON.stringify(deploymentSummary, null, 2));
  
  console.log('\n📋 DEPLOYMENT SUMMARY');
  console.log('=====================');
  
  for (const [network, deployment] of Object.entries(deployments)) {
    if (deployment.failed) {
      console.log(`❌ ${network.toUpperCase()}: FAILED - ${deployment.error}`);
    } else {
      console.log(`✅ ${network.toUpperCase()}: ${deployment.contractAddress}`);
      console.log(`   Explorer: ${deployment.explorerUrl}`);
    }
  }
  
  console.log(`\n📊 Results: ${deploymentSummary.successfulDeployments}/${deploymentSummary.totalNetworks} successful`);
  console.log(`📄 Detailed results saved to: ${outputPath}`);
  
  // Gerar arquivo de configuração para o frontend apenas se houver deploys bem-sucedidos
  if (deploymentSummary.successfulDeployments > 0) {
    generateFrontendConfig(deployments);
    console.log('\n✅ Frontend configuration files generated!');
  }
  
  console.log('\n🎉 Deployment process completed!');
  
  // Mostrar próximos passos
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Update bot configuration with new contract addresses');
  console.log('2. Verify contracts on block explorers');
  console.log('3. Test payment functionality on each network');
  console.log('4. Deploy updated frontend');
}

function generateFrontendConfig(deployments) {
  // Gerar arquivo principal de endereços
  const configPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts', 'MAINNET_ADDRESSES.ts');
  
  let configContent = `// MAINNET CONTRACT ADDRESSES - AUTO-GENERATED
// Generated on: ${new Date().toISOString()}
// Chain Academy Progressive Escrow V4

export const MAINNET_PROGRESSIVE_ESCROW_ADDRESSES = {\n`;

  for (const [network, deployment] of Object.entries(deployments)) {
    if (!deployment.failed) {
      configContent += `  ${network}: '${deployment.contractAddress}',\n`;
    } else {
      configContent += `  ${network}: '0x0000000000000000000000000000000000000000', // DEPLOYMENT FAILED: ${deployment.error}\n`;
    }
  }

  configContent += `} as const;\n\n`;
  
  // Gerar informações completas
  configContent += `export const MAINNET_DEPLOYMENT_INFO = {\n`;
  for (const [network, deployment] of Object.entries(deployments)) {
    if (!deployment.failed) {
      configContent += `  ${network}: {\n`;
      configContent += `    contractAddress: '${deployment.contractAddress}',\n`;
      configContent += `    chainId: ${deployment.chainId},\n`;
      configContent += `    explorerUrl: '${deployment.explorerUrl}',\n`;
      configContent += `    deployedAt: '${deployment.deployedAt}',\n`;
      configContent += `    supportedTokens: ${JSON.stringify(deployment.supportedTokens, null, 6)}\n`;
      configContent += `  },\n`;
    }
  }
  configContent += `} as const;\n\n`;
  
  // Adicionar helper functions
  configContent += `// Helper function to get contract address by chain ID
export const getMainnetContractAddress = (chainId: number): string => {
  const networkMap: Record<number, string> = {\n`;
  
  for (const [network, deployment] of Object.entries(deployments)) {
    if (!deployment.failed) {
      configContent += `    ${deployment.chainId}: MAINNET_PROGRESSIVE_ESCROW_ADDRESSES.${network},\n`;
    }
  }
  
  configContent += `  };
  return networkMap[chainId] || '0x0000000000000000000000000000000000000000';
};

// Check if chain is supported in mainnet
export const isMainnetChainSupported = (chainId: number): boolean => {
  return getMainnetContractAddress(chainId) !== '0x0000000000000000000000000000000000000000';
};
`;

  fs.writeFileSync(configPath, configContent);
  console.log(`📝 Frontend config generated: ${configPath}`);
  
  // Atualizar o arquivo principal ProgressiveEscrowV4.ts
  updateMainProgressiveEscrowConfig(deployments);
}

function updateMainProgressiveEscrowConfig(deployments) {
  const mainConfigPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts', 'ProgressiveEscrowV4.ts');
  
  try {
    let configContent = fs.readFileSync(mainConfigPath, 'utf8');
    
    // Atualizar endereços mainnet
    const mainnetAddresses = {};
    for (const [network, deployment] of Object.entries(deployments)) {
      if (!deployment.failed) {
        mainnetAddresses[network] = deployment.contractAddress;
      }
    }
    
    // Substituir seção de endereços mainnet
    const newAddressesSection = `// L2 Mainnets
  base: '${mainnetAddresses.base || '0x0000000000000000000000000000000000000000'}',
  optimism: '${mainnetAddresses.optimism || '0x0000000000000000000000000000000000000000'}', 
  arbitrum: '${mainnetAddresses.arbitrum || '0x0000000000000000000000000000000000000000'}',
  polygon: '${mainnetAddresses.polygon || '0x0000000000000000000000000000000000000000'}',`;
    
    // Regex para encontrar e substituir endereços mainnet
    const mainnetRegex = /\/\/ L2 Mainnets[\s\S]*?polygon: '[^']*',/;
    configContent = configContent.replace(mainnetRegex, newAddressesSection);
    
    // Atualizar função isTestnetMode para false
    configContent = configContent.replace(
      /export const isTestnetMode = \(\) => [^;]+;/,
      'export const isTestnetMode = () => false; // Mainnet deployment ready'
    );
    
    fs.writeFileSync(mainConfigPath, configContent);
    console.log(`📝 Updated main Progressive Escrow config: ${mainConfigPath}`);
    
  } catch (error) {
    console.warn(`⚠️ Could not update main config file: ${error.message}`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { deployToNetwork, NETWORKS };