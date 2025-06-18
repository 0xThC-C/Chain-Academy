// 🔍 PRE-DEPLOY CHECKLIST - Chain Academy V2
// Verificações de ambiente antes do deploy

const { ethers } = require("ethers");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

async function checkEnvironment() {
    console.log("🔍 ===== PRE-DEPLOY CHECKLIST =====\n");
    
    let allChecksPass = true;
    const issues = [];
    
    // 1. Verificar se .env existe e tem private key
    console.log("1️⃣ Verificando arquivo .env...");
    if (!process.env.PRIVATE_KEY) {
        console.log("❌ PRIVATE_KEY não encontrada no .env");
        issues.push("PRIVATE_KEY não configurada");
        allChecksPass = false;
    } else {
        console.log("✅ PRIVATE_KEY configurada");
        
        // Calcular endereço da wallet
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
            console.log(`   📍 Endereço da wallet: ${wallet.address}`);
        } catch (error) {
            console.log("❌ PRIVATE_KEY inválida");
            issues.push("PRIVATE_KEY inválida");
            allChecksPass = false;
        }
    }
    
    // 2. Verificar RPC URL
    console.log("\n2️⃣ Verificando RPC URL da Sepolia...");
    if (!process.env.SEPOLIA_RPC_URL) {
        console.log("❌ SEPOLIA_RPC_URL não configurada");
        issues.push("SEPOLIA_RPC_URL não configurada");
        allChecksPass = false;
    } else {
        console.log(`✅ SEPOLIA_RPC_URL configurada: ${process.env.SEPOLIA_RPC_URL}`);
        
        // Testar conexão
        try {
            const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
            const network = await provider.getNetwork();
            console.log(`   🌐 Conectado na rede: Chain ID ${network.chainId}`);
            
            if (network.chainId !== 11155111n) {
                console.log("⚠️ Aviso: Chain ID não é da Sepolia (11155111)");
                issues.push("Chain ID não é da Sepolia");
            }
        } catch (error) {
            console.log(`❌ Erro ao conectar no RPC: ${error.message}`);
            issues.push("Não foi possível conectar no RPC da Sepolia");
            allChecksPass = false;
        }
    }
    
    // 3. Verificar saldo da wallet
    console.log("\n3️⃣ Verificando saldo da wallet...");
    if (process.env.PRIVATE_KEY && process.env.SEPOLIA_RPC_URL) {
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
            const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
            const balance = await provider.getBalance(wallet.address);
            const balanceEther = ethers.formatEther(balance);
            
            console.log(`   💰 Saldo ETH: ${balanceEther} ETH`);
            
            if (parseFloat(balanceEther) === 0) {
                console.log("❌ Saldo zero - precisa de ETH para deploy");
                issues.push("Saldo zero na wallet");
                allChecksPass = false;
            } else if (parseFloat(balanceEther) < 0.01) {
                console.log("⚠️ Saldo baixo - pode não ser suficiente para deploy");
                issues.push("Saldo muito baixo");
            } else {
                console.log("✅ Saldo adequado para deploy");
            }
        } catch (error) {
            console.log(`❌ Erro ao verificar saldo: ${error.message}`);
            issues.push("Erro ao verificar saldo");
            allChecksPass = false;
        }
    }
    
    // 4. Verificar se contratos existem
    console.log("\n4️⃣ Verificando contratos...");
    const requiredContracts = [
        './contracts/Mentorship.sol',
        './contracts/ProgressiveEscrowV3.sol'
    ];
    
    for (const contract of requiredContracts) {
        if (fs.existsSync(contract)) {
            console.log(`✅ ${contract} encontrado`);
        } else {
            console.log(`❌ ${contract} não encontrado`);
            issues.push(`Contrato ${contract} não encontrado`);
            allChecksPass = false;
        }
    }
    
    // 5. Verificar dependências
    console.log("\n5️⃣ Verificando dependências...");
    if (fs.existsSync('./node_modules')) {
        console.log("✅ node_modules existe");
    } else {
        console.log("❌ node_modules não existe - execute npm install");
        issues.push("node_modules não existe");
        allChecksPass = false;
    }
    
    // 6. Verificar Platform Fee Recipient
    console.log("\n6️⃣ Verificando Platform Fee Recipient...");
    const platformRecipient = process.env.PLATFORM_FEE_RECIPIENT;
    if (platformRecipient) {
        if (ethers.isAddress(platformRecipient)) {
            console.log(`✅ Platform Fee Recipient válido: ${platformRecipient}`);
        } else {
            console.log("❌ Platform Fee Recipient inválido");
            issues.push("Platform Fee Recipient inválido");
            allChecksPass = false;
        }
    } else {
        console.log("⚠️ Platform Fee Recipient não configurado - usará endereço do deployer");
    }
    
    // 7. Verificar se hardhat.config.js está configurado
    console.log("\n7️⃣ Verificando configuração do Hardhat...");
    if (fs.existsSync('./hardhat.config.js')) {
        console.log("✅ hardhat.config.js encontrado");
    } else {
        console.log("❌ hardhat.config.js não encontrado");
        issues.push("hardhat.config.js não encontrado");
        allChecksPass = false;
    }
    
    // RESUMO FINAL
    console.log("\n" + "=".repeat(50));
    if (allChecksPass) {
        console.log("🎉 TODAS AS VERIFICAÇÕES PASSARAM!");
        console.log("✅ Ambiente pronto para deploy");
        console.log("\n🚀 PRÓXIMO PASSO:");
        console.log("Execute: npm run deploy:sepolia-simple");
        
        if (issues.length > 0) {
            console.log("\n⚠️ AVISOS:");
            issues.forEach(issue => console.log(`   - ${issue}`));
        }
    } else {
        console.log("❌ ALGUMAS VERIFICAÇÕES FALHARAM!");
        console.log("🔧 PROBLEMAS ENCONTRADOS:");
        issues.forEach(issue => console.log(`   - ${issue}`));
        console.log("\n💡 SOLUÇÕES:");
        
        if (issues.includes("Saldo zero na wallet")) {
            console.log("   - Obtenha ETH nos faucets da Sepolia:");
            console.log("     • https://sepoliafaucet.com/");
            console.log("     • https://www.alchemy.com/faucets/ethereum-sepolia");
            console.log("     • https://sepolia-faucet.pk910.de/");
        }
        
        if (issues.includes("node_modules não existe")) {
            console.log("   - Execute: npm install");
        }
        
        if (issues.includes("PRIVATE_KEY não configurada")) {
            console.log("   - Configure PRIVATE_KEY no arquivo .env");
        }
    }
    console.log("=".repeat(50));
    
    return allChecksPass;
}

// Executar se chamado diretamente
if (require.main === module) {
    checkEnvironment()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Erro durante verificação:", error);
            process.exit(1);
        });
}

module.exports = { checkEnvironment };