// Script para verificar ProgressiveEscrowV7 em todas as redes
const hre = require("hardhat");

async function main() {
  const contractAddresses = {
    arbitrum: "0x2a9d167e30195ba5fd29cfc09622be0d02da91be",
    base: "0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3",
    optimism: "0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3",
    polygon: "0xc7c306300dfe17b927fab5a5a600a7f3ba6691d3"
  };

  const platformWallet = "0x85fa7c0482f3e965099b8b564511c1d0f5e2b20c";
  
  const network = hre.network.name;
  const contractAddress = contractAddresses[network];
  
  if (!contractAddress) {
    throw new Error(`Contrato não encontrado para a rede ${network}`);
  }

  console.log(`🔍 Verificando contrato ProgressiveEscrowV7 na rede ${network}...`);
  console.log(`📍 Endereço: ${contractAddress}`);
  console.log(`💼 Platform Wallet: ${platformWallet}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [platformWallet],
      contract: "contracts/ProgressiveEscrowV7_RemixOptimized.sol:ProgressiveEscrowV7"
    });
    
    console.log(`✅ Contrato verificado com sucesso na rede ${network}!`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`ℹ️ Contrato já está verificado na rede ${network}`);
    } else {
      console.error(`❌ Erro na verificação para ${network}:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });