const { ethers } = require("ethers");
require("dotenv").config();

async function checkWallet() {
    try {
        console.log("🔍 Verificando configuração da wallet de teste...\n");
        
        // Calcular endereço da wallet a partir da private key
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
        const address = wallet.address;
        
        console.log(`📍 Endereço da wallet: ${address}`);
        
        // Conectar na Sepolia testnet
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        console.log(`🌐 Conectando na Sepolia via: ${process.env.SEPOLIA_RPC_URL}`);
        
        // Verificar saldo ETH
        const balance = await provider.getBalance(address);
        const balanceEther = ethers.formatEther(balance);
        
        console.log(`💰 Saldo ETH na Sepolia: ${balanceEther} ETH`);
        
        // Verificar informações da rede
        const network = await provider.getNetwork();
        console.log(`🔗 Chain ID: ${network.chainId}`);
        console.log(`📋 Nome da rede: ${network.name}`);
        
        // Verificar último bloco
        const blockNumber = await provider.getBlockNumber();
        console.log(`🧱 Último bloco: ${blockNumber}`);
        
        // Análise e recomendações
        console.log("\n" + "=".repeat(50));
        console.log("📊 ANÁLISE DE STATUS:");
        console.log("=".repeat(50));
        
        if (parseFloat(balanceEther) === 0) {
            console.log("⚠️  SALDO ZERO - Precisa de ETH para deploy");
            console.log("💡 Para obter ETH de teste na Sepolia:");
            console.log("   • Faucet 1: https://sepoliafaucet.com/");
            console.log("   • Faucet 2: https://www.alchemy.com/faucets/ethereum-sepolia");
            console.log("   • Faucet 3: https://sepolia-faucet.pk910.de/");
            console.log(`   • Endereço para usar: ${address}`);
        } else if (parseFloat(balanceEther) < 0.1) {
            console.log("⚠️  SALDO BAIXO - Pode não ser suficiente para múltiplos deploys");
            console.log(`   • Saldo atual: ${balanceEther} ETH`);
            console.log("   • Recomendado: pelo menos 0.1 ETH para múltiplos deploys");
        } else {
            console.log("✅ SALDO ADEQUADO para deploys");
            console.log(`   • Saldo atual: ${balanceEther} ETH`);
        }
        
        console.log("\n🚀 PRÓXIMOS PASSOS:");
        console.log("1. Se saldo for zero, obter ETH dos faucets acima");
        console.log("2. Aguardar confirmação das transações do faucet (2-5 min)");
        console.log("3. Executar novamente: npm run check:wallet");
        console.log("4. Quando tiver ETH, executar: npm run deploy:sepolia");
        
        return {
            address,
            balance: balanceEther,
            chainId: network.chainId.toString(),
            blockNumber,
            hasBalance: parseFloat(balanceEther) > 0
        };
        
    } catch (error) {
        console.error("❌ Erro ao verificar wallet:", error.message);
        
        if (error.code === 'NETWORK_ERROR') {
            console.log("\n💡 Possíveis soluções:");
            console.log("• Verificar conexão com internet");
            console.log("• Verificar se o RPC URL da Sepolia está funcionando");
            console.log("• Tentar novamente em alguns segundos");
        }
        
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    checkWallet()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { checkWallet };