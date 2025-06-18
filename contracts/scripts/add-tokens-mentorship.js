const hre = require("hardhat");

async function main() {
  const mentorshipAddress = "0x409C486D1A686e9499E9561bFf82781843598eDF";
  const usdtAddress = "0x6D64e4bE5e47d3445F8B6ef5Ed93a2852c19d085";
  const usdcAddress = "0x556C875376950B70E0b5A670c9f15885093002B9";
  
  console.log("🔧 Adding supported tokens to Mentorship contract...");
  
  const mentorship = await hre.ethers.getContractAt("Mentorship", mentorshipAddress);
  
  // Add USDT
  try {
    console.log("Adding USDT...");
    const tx1 = await mentorship.addSupportedToken(usdtAddress);
    await tx1.wait();
    console.log("✅ Added USDT as supported token");
  } catch (error) {
    console.log("ℹ️ USDT might already be supported:", error.message);
  }
  
  // Add USDC
  try {
    console.log("Adding USDC...");
    const tx2 = await mentorship.addSupportedToken(usdcAddress);
    await tx2.wait();
    console.log("✅ Added USDC as supported token");
  } catch (error) {
    console.log("ℹ️ USDC might already be supported:", error.message);
  }
  
  // Verify tokens are supported
  const isUSDTSupported = await mentorship.supportedTokens(usdtAddress);
  const isUSDCSupported = await mentorship.supportedTokens(usdcAddress);
  
  console.log("\n📋 Token Support Status:");
  console.log(`USDT: ${isUSDTSupported ? '✅ Supported' : '❌ Not Supported'}`);
  console.log(`USDC: ${isUSDCSupported ? '✅ Supported' : '❌ Not Supported'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});