const hre = require("hardhat");

const networks = ["polygon", "arbitrum", "optimism", "base"];

async function checkBalance(networkName) {
  try {
    // Temporarily switch network
    hre.changeNetwork(networkName);
    
    const [deployer] = await hre.ethers.getSigners();
    const balance = await deployer.provider.getBalance(deployer.address);
    const balanceETH = hre.ethers.formatEther(balance);
    
    console.log(`${networkName.toUpperCase()}: ${balanceETH} ETH ${parseFloat(balanceETH) >= 0.01 ? '✅' : '❌'}`);
    
    return parseFloat(balanceETH) >= 0.01;
  } catch (error) {
    console.log(`${networkName.toUpperCase()}: Error - ${error.message} ❌`);
    return false;
  }
}

async function main() {
  console.log("🔍 Checking balances on all L2 networks...\n");
  
  const results = [];
  for (const network of networks) {
    const hasBalance = await checkBalance(network);
    results.push({ network, hasBalance });
  }
  
  console.log("\n📊 Summary:");
  const readyNetworks = results.filter(r => r.hasBalance);
  console.log(`Ready for deploy: ${readyNetworks.length}/${networks.length} networks`);
  
  if (readyNetworks.length === networks.length) {
    console.log("🎉 All networks ready for deployment!");
  } else {
    console.log("⚠️ You need at least 0.01 ETH on each network for deployment.");
    console.log("❌ Missing balance on:", results.filter(r => !r.hasBalance).map(r => r.network).join(", "));
  }
}

main().catch(console.error);