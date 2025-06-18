// 🔍 Check Sepolia Balance - Chain Academy V2
const { ethers } = require("hardhat");

async function main() {
    console.log("\n🔍 ===== VERIFICAÇÃO DE SALDO SEPOLIA =====");
    
    try {
        // Get deployer account
        const [deployer] = await ethers.getSigners();
        
        console.log(`👛 Endereço do Deployer: ${deployer.address}`);
        
        // Check balance
        const balance = await ethers.provider.getBalance(deployer.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log(`💎 Saldo Atual: ${balanceInEth} ETH`);
        
        if (parseFloat(balanceInEth) < 0.01) {
            console.log(`🚨 SALDO INSUFICIENTE!`);
            console.log(`💰 Necessário: 0.01 ETH mínimo`);
            console.log(`📥 Faucets para obter ETH de teste:`);
            console.log(`   - https://sepoliafaucet.com/`);
            console.log(`   - https://sepoliafaucet.net/`);
            console.log(`   - https://faucet.quicknode.com/ethereum/sepolia`);
            console.log(`\n🔑 Endereço para solicitar: ${deployer.address}`);
            
            return false;
        } else {
            console.log(`✅ SALDO SUFICIENTE PARA DEPLOY!`);
            console.log(`🚀 Você pode executar: npm run deploy:sepolia`);
            
            return true;
        }
        
    } catch (error) {
        console.error(`❌ Erro ao verificar saldo: ${error.message}`);
        
        if (error.message.includes('network')) {
            console.log(`\n🌐 Problema de conexão com Sepolia RPC`);
            console.log(`💡 Tentando RPC alternativa...`);
        }
        
        return false;
    }
}

main()
    .then((hasBalance) => {
        if (hasBalance) {
            console.log("\n✅ Pronto para deploy!");
        } else {
            console.log("\n⏳ Aguardando fundos...");
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("\n❌ Erro na verificação:");
        console.error(error);
        process.exit(1);
    });