const { ethers } = require("hardhat");

async function main() {
  // Address do usuário que está fazendo a transação
  const userAddress = "0x527162328cb3072c31Ad853dE00C799A64658951";
  
  // Address do contrato ProgressiveEscrowV4
  const contractAddress = "0x4f9D0F7285858C439BEFfb4F4b481CC4DE57a67f";
  
  // ABI apenas para a função getUserNonce
  const contractABI = [
    {
      inputs: [
        { name: "user", type: "address" }
      ],
      name: "getUserNonce",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function"
    }
  ];

  console.log("🔍 Checking user nonce...");
  console.log("User address:", userAddress);
  console.log("Contract address:", contractAddress);

  try {
    // Connect to the contract
    const contract = await ethers.getContractAt(contractABI, contractAddress);
    
    // Get user nonce
    const userNonce = await contract.getUserNonce(userAddress);
    
    console.log("✅ Current user nonce:", userNonce.toString());
    console.log("📊 Summary:");
    console.log("- User:", userAddress);
    console.log("- Contract:", contractAddress);
    console.log("- Current Nonce:", userNonce.toString());
    console.log("- Next Expected Nonce:", userNonce.toString());
    
  } catch (error) {
    console.error("❌ Error checking nonce:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });