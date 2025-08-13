const hre = require("hardhat");
const fs = require("fs");
const deployScript = require("./deploy-v4-ultra.js");

const networks = ["polygon", "arbitrum", "optimism", "base"];

async function deployToAllNetworks() {
  console.log("🚀 Deploying ProgressiveEscrowV4_UltraOptimized to all L2 networks");
  console.log("=".repeat(70));
  
  const results = {};
  
  for (let i = 0; i < networks.length; i++) {
    const network = networks[i];
    console.log(`\n📍 [${i + 1}/${networks.length}] Deploying to ${network.toUpperCase()}...`);
    
    try {
      // Change network
      hre.changeNetwork(network);
      
      // Deploy
      const result = await deployScript();
      results[network] = {
        success: true,
        ...result
      };
      
      console.log(`✅ ${network.toUpperCase()} deployment successful!`);
      
      // Wait between deployments
      if (i < networks.length - 1) {
        console.log("⏱️ Waiting 10 seconds before next deployment...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
      
    } catch (error) {
      console.log(`❌ ${network.toUpperCase()} deployment failed: ${error.message}`);
      results[network] = {
        success: false,
        error: error.message
      };
    }
  }
  
  // Generate summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  
  const summary = {
    timestamp: new Date().toISOString(),
    platformWallet: "0x85Fa7c0482F3e965099B8B564511c1D0f5e2b20c",
    deployments: results
  };
  
  // Save summary
  fs.writeFileSync("./deployment-v4-ultra.json", JSON.stringify(summary, null, 2));
  console.log("💾 Deployment summary saved to: deployment-v4-ultra.json");
  
  // Frontend config
  console.log("\n🎯 FRONTEND CONFIGURATION:");
  console.log("export const CONTRACT_ADDRESSES = {");
  
  const chainIds = {
    polygon: 137,
    arbitrum: 42161,
    optimism: 10,
    base: 8453
  };
  
  for (const [network, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`  [${chainIds[network]}]: "${result.address}", // ${network}`);
    }
  }
  console.log("};");
  
  // Success summary
  const successCount = Object.values(results).filter(r => r.success).length;
  console.log(`\n🎉 Deployment completed: ${successCount}/${networks.length} networks successful`);
  
  if (successCount === networks.length) {
    console.log("🚀 All deployments successful! Ready to update frontend.");
  } else {
    console.log("⚠️ Some deployments failed. Check errors above.");
    process.exit(1);
  }
}

deployToAllNetworks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Multi-network deployment failed:", error);
    process.exit(1);
  });