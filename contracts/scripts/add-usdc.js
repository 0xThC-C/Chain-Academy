const hre = require("hardhat");

async function main() {
  const escrowAddress = "0xa161C5F6B18120269c279D31A7FEcAFb86c737EC";
  const usdcAddress = "0x556C875376950B70E0b5A670c9f15885093002B9";
  
  console.log("🔧 Adding USDC support to Progressive Escrow...");
  
  const escrow = await hre.ethers.getContractAt("ProgressiveEscrowV3", escrowAddress);
  
  try {
    const tx = await escrow.addSupportedToken(usdcAddress, { gasLimit: 100000 });
    await tx.wait();
    console.log("✅ Added USDC as supported token");
  } catch (error) {
    console.log("ℹ️ USDC might already be supported:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});