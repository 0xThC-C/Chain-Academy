# Deploy Guide - Chain Academy Progressive Escrow V4 para Mainnet

## 🚀 Guia Completo de Deploy para L2 Networks

### 1. Preparação do Ambiente

#### A. Instalar Dependências
```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
npm install
```

#### B. Configurar Variáveis de Ambiente
Crie o arquivo `.env` no diretório `/contracts/`:

```bash
# .env
# CRITICAL: Mantenha essas chaves seguras e nunca commite no Git!

# Chave privada da sua wallet (que será owner dos contratos)
PRIVATE_KEY=sua_chave_privada_aqui

# RPC URLs para cada L2 - Use Alchemy, Infura ou outro provider
BASE_RPC_URL=https://mainnet.base.org
OPTIMISM_RPC_URL=https://mainnet.optimism.io
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
POLYGON_RPC_URL=https://polygon-rpc.com

# Block Explorer API Keys (opcional, para verificação)
BASE_EXPLORER_API_KEY=sua_key_basescan
OPTIMISM_EXPLORER_API_KEY=sua_key_optimism_etherscan
ARBITRUM_EXPLORER_API_KEY=sua_key_arbiscan
POLYGON_EXPLORER_API_KEY=sua_key_polygonscan

# Platform wallet (onde irão as taxas de 10%)
PLATFORM_WALLET=0xSuaCarteiraPlataforma

# Endereços dos tokens USDC/USDT em cada rede
BASE_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BASE_USDT=0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
OPTIMISM_USDC=0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
OPTIMISM_USDT=0x94b008aA00579c1307B0EF2c499aD98a8ce58e58
ARBITRUM_USDC=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
ARBITRUM_USDT=0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
POLYGON_USDC=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
POLYGON_USDT=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

### 2. Scripts de Deploy

#### A. Criar Script de Deploy Multi-L2
```javascript
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
    usdc: process.env.BASE_USDC,
    usdt: process.env.BASE_USDT,
    explorerUrl: 'https://basescan.org'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    usdc: process.env.OPTIMISM_USDC,
    usdt: process.env.OPTIMISM_USDT,
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    usdc: process.env.ARBITRUM_USDC,
    usdt: process.env.ARBITRUM_USDT,
    explorerUrl: 'https://arbiscan.io'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL,
    usdc: process.env.POLYGON_USDC,
    usdt: process.env.POLYGON_USDT,
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
    const ProgressiveEscrowV4 = await ethers.getContractFactory('ProgressiveEscrowV4', wallet);
    const progressiveEscrow = await ProgressiveEscrowV4.deploy(process.env.PLATFORM_WALLET);
    
    await progressiveEscrow.waitForDeployment();
    const contractAddress = await progressiveEscrow.getAddress();
    
    console.log(`✅ ProgressiveEscrowV4 deployed to: ${contractAddress}`);
    
    // Configurar tokens suportados
    console.log('🔧 Configuring supported tokens...');
    
    // Adicionar USDC
    if (networkConfig.usdc) {
      const usdcTx = await progressiveEscrow.addSupportedToken(networkConfig.usdc);
      await usdcTx.wait();
      console.log(`✅ USDC added: ${networkConfig.usdc}`);
    }
    
    // Adicionar USDT
    if (networkConfig.usdt) {
      const usdtTx = await progressiveEscrow.addSupportedToken(networkConfig.usdt);
      await usdtTx.wait();
      console.log(`✅ USDT added: ${networkConfig.usdt}`);
    }
    
    // ETH já está habilitado por padrão
    console.log(`✅ ETH support enabled by default`);
    
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
      gasUsed: 'pending', // Será preenchido depois
      deploymentCost: 'pending'
    };
    
    return deployment;
    
  } catch (error) {
    console.error(`❌ Error deploying to ${networkConfig.name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🌟 Chain Academy - Progressive Escrow V4 Mainnet Deployment');
  console.log('============================================================');
  
  // Verificar variáveis de ambiente
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'PLATFORM_WALLET',
    'BASE_RPC_URL',
    'OPTIMISM_RPC_URL',
    'ARBITRUM_RPC_URL',
    'POLYGON_RPC_URL'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  const deployments = {};
  
  // Deploy para cada rede
  for (const [networkKey, networkConfig] of Object.entries(NETWORKS)) {
    try {
      const deployment = await deployToNetwork(networkKey, networkConfig);
      deployments[networkKey] = deployment;
      
      // Aguardar um pouco entre deploys
      console.log('⏳ Waiting 10 seconds before next deployment...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      console.error(`Failed to deploy to ${networkKey}:`, error);
      deployments[networkKey] = {
        error: error.message,
        failed: true
      };
    }
  }
  
  // Salvar resultados
  const deploymentSummary = {
    timestamp: new Date().toISOString(),
    version: 'ProgressiveEscrowV4',
    environment: 'mainnet',
    deployments,
    totalNetworks: Object.keys(NETWORKS).length,
    successfulDeployments: Object.values(deployments).filter(d => !d.failed).length
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
  
  console.log(`\n📄 Detailed results saved to: ${outputPath}`);
  console.log('\n🎉 Deployment process completed!');
  
  // Gerar arquivo de configuração para o frontend
  generateFrontendConfig(deployments);
}

function generateFrontendConfig(deployments) {
  const configPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'contracts', 'MAINNET_ADDRESSES.ts');
  
  let configContent = `// MAINNET CONTRACT ADDRESSES - AUTO-GENERATED
// Generated on: ${new Date().toISOString()}

export const MAINNET_PROGRESSIVE_ESCROW_ADDRESSES = {\n`;

  for (const [network, deployment] of Object.entries(deployments)) {
    if (!deployment.failed) {
      configContent += `  ${network}: '${deployment.contractAddress}',\n`;
    } else {
      configContent += `  ${network}: '0x0000000000000000000000000000000000000000', // DEPLOYMENT FAILED\n`;
    }
  }

  configContent += `} as const;\n\n`;
  
  configContent += `export const MAINNET_DEPLOYMENT_INFO = ${JSON.stringify(deployments, null, 2)};`;
  
  fs.writeFileSync(configPath, configContent);
  console.log(`📝 Frontend config generated: ${configPath}`);
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
```

### 3. Configurar Hardhat para Mainnet

#### A. Atualizar hardhat.config.js
```javascript
// hardhat.config.js
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 8453,
      gas: 2000000,
      gasPrice: 1000000000 // 1 gwei
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 10,
      gas: 2000000,
      gasPrice: 1000000000
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42161,
      gas: 2000000,
      gasPrice: 100000000 // 0.1 gwei (Arbitrum tem gas mais barato)
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137,
      gas: 2000000,
      gasPrice: 30000000000 // 30 gwei (Polygon)
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.BASE_EXPLORER_API_KEY,
      optimisticEthereum: process.env.OPTIMISM_EXPLORER_API_KEY,
      arbitrumOne: process.env.ARBITRUM_EXPLORER_API_KEY,
      polygon: process.env.POLYGON_EXPLORER_API_KEY
    }
  }
};
```

### 4. Comandos de Deploy

#### A. Deploy em todas as redes
```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
```

#### B. Deploy em rede específica
```bash
# Para Base
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js --network base

# Para Optimism
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js --network optimism

# Para Arbitrum
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js --network arbitrum

# Para Polygon
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js --network polygon
```

### 5. Verificação dos Contratos

#### A. Script de verificação
```bash
# Verificar contrato no block explorer
npx hardhat verify --network base ENDERECO_DO_CONTRATO "ENDERECO_PLATFORM_WALLET"
```

### 6. Configuração do Bot

#### A. Instalar Dependências do Bot
```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
npm install ethers dotenv node-cron
```

#### B. Configurar Variáveis de Ambiente do Bot
Adicione ao `.env` do backend:

```bash
# Bot Configuration
BOT_PRIVATE_KEY=chave_privada_para_o_bot
BOT_ENABLED=true
BOT_CHECK_INTERVAL="0 */6 * * *"  # A cada 6 horas
BOT_GAS_LIMIT=200000
BOT_MAX_GAS_PRICE=50000000000  # 50 gwei

# Contract Addresses (será preenchido após deploy)
BASE_PROGRESSIVE_ESCROW=0x...
OPTIMISM_PROGRESSIVE_ESCROW=0x...
ARBITRUM_PROGRESSIVE_ESCROW=0x...
POLYGON_PROGRESSIVE_ESCROW=0x...
```

### 7. Passos de Deploy

#### Passo 1: Preparar o ambiente
```bash
cd /home/mathewsl/Chain\ Academy\ V2/contracts
npm install
cp .env.example .env
# Editar .env com suas chaves
```

#### Passo 2: Validar configuração
```bash
npx hardhat compile
```

#### Passo 3: Deploy
```bash
npx hardhat run scripts/deploy-progressive-escrow-mainnet.js
```

#### Passo 4: Atualizar frontend
Os endereços serão automaticamente atualizados em:
- `/frontend/src/contracts/MAINNET_ADDRESSES.ts`
- `/frontend/src/contracts/ProgressiveEscrowV4.ts`

#### Passo 5: Iniciar bot
```bash
cd /home/mathewsl/Chain\ Academy\ V2/backend
npm run start:bot
```

### 8. Segurança

#### ⚠️ IMPORTANTE:
1. **Nunca commite chaves privadas**
2. **Use carteiras separadas para deploy vs operação**
3. **Teste primeiro em testnets**
4. **Tenha ETH suficiente em todas as redes**
5. **Verifique endereços dos tokens**

### 9. Custos Estimados

| Rede | Gas Estimado | Custo (USD) |
|------|-------------|-------------|
| Base | ~2M gas | $5-15 |
| Optimism | ~2M gas | $3-10 |
| Arbitrum | ~2M gas | $2-8 |
| Polygon | ~2M gas | $0.50-2 |

**Total: ~$10-35 USD**

### 10. Próximos Passos

1. ✅ Deploy dos contratos
2. ✅ Configurar bot de pagamento
3. ✅ Atualizar frontend com endereços
4. ✅ Testar funcionalidade completa
5. ✅ Monitor operacional

---

## 🎯 Quick Start

1. Configure `.env` com suas chaves
2. Execute: `npx hardhat run scripts/deploy-progressive-escrow-mainnet.js`
3. Configure bot com endereços gerados
4. Deploy frontend atualizado

## 🔗 Links Úteis

- [Base Network](https://base.org)
- [Optimism](https://optimism.io)
- [Arbitrum](https://arbitrum.io)
- [Polygon](https://polygon.technology)