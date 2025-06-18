#!/usr/bin/env node

/**
 * Contract Address Updater Script
 * This script updates contract addresses when provided by Agent 2
 * 
 * Usage:
 * node scripts/update-contracts.js --mentorship 0x1234567890123456789012345678901234567890
 */

const fs = require('fs');
const path = require('path');

// Validate Ethereum address
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address) && address !== '0x0000000000000000000000000000000000000000';
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    if (key === '--mentorship' && isValidEthereumAddress(value)) {
      config.mentorship = value;
    } else if (key === '--usdc' && isValidEthereumAddress(value)) {
      config.usdc = value;
    } else if (key === '--usdt' && isValidEthereumAddress(value)) {
      config.usdt = value;
    } else if (key === '--help' || key === '-h') {
      console.log(`
Usage: node scripts/update-contracts.js [options]

Options:
  --mentorship ADDRESS  Update mentorship contract address
  --usdc ADDRESS        Update USDC token address (optional)
  --usdt ADDRESS        Update USDT token address (optional)
  --help, -h           Show this help message

Example:
  node scripts/update-contracts.js --mentorship 0x1234567890123456789012345678901234567890
      `);
      process.exit(0);
    }
  }
  
  return config;
}

// Update contract addresses in files
function updateContractFiles(config) {
  const contractFile = path.join(__dirname, '../src/contracts/MentorshipContract.ts');
  const testnetFile = path.join(__dirname, '../src/config/testnet.ts');
  const envFile = path.join(__dirname, '../.env');
  
  try {
    // Update MentorshipContract.ts
    if (config.mentorship) {
      let content = fs.readFileSync(contractFile, 'utf8');
      content = content.replace(
        /sepolia: '0x0000000000000000000000000000000000000000', \/\/ TO BE UPDATED BY AGENT 2/,
        `sepolia: '${config.mentorship}', // UPDATED BY AGENT 2`
      );
      fs.writeFileSync(contractFile, content);
      console.log(`✅ Updated mentorship contract address in ${contractFile}`);
    }
    
    // Update testnet.ts
    if (config.mentorship) {
      let content = fs.readFileSync(testnetFile, 'utf8');
      content = content.replace(
        /mentorship: '0x0000000000000000000000000000000000000000', \/\/ TO BE UPDATED/,
        `mentorship: '${config.mentorship}', // UPDATED BY AGENT 2`
      );
      fs.writeFileSync(testnetFile, content);
      console.log(`✅ Updated mentorship contract address in ${testnetFile}`);
    }
    
    // Update .env file
    if (config.mentorship) {
      let content = fs.readFileSync(envFile, 'utf8');
      content = content.replace(
        /REACT_APP_MENTORSHIP_CONTRACT_SEPOLIA=0x0000000000000000000000000000000000000000/,
        `REACT_APP_MENTORSHIP_CONTRACT_SEPOLIA=${config.mentorship}`
      );
      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated mentorship contract address in ${envFile}`);
    }
    
    // Update token addresses if provided
    if (config.usdc) {
      let content = fs.readFileSync(envFile, 'utf8');
      content = content.replace(
        /REACT_APP_SEPOLIA_USDC_ADDRESS=.*/,
        `REACT_APP_SEPOLIA_USDC_ADDRESS=${config.usdc}`
      );
      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated USDC address in ${envFile}`);
    }
    
    if (config.usdt) {
      let content = fs.readFileSync(envFile, 'utf8');
      content = content.replace(
        /REACT_APP_SEPOLIA_USDT_ADDRESS=.*/,
        `REACT_APP_SEPOLIA_USDT_ADDRESS=${config.usdt}`
      );
      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated USDT address in ${envFile}`);
    }
    
    console.log('\n🎉 Contract addresses updated successfully!');
    console.log('📋 Summary:');
    if (config.mentorship) console.log(`  Mentorship: ${config.mentorship}`);
    if (config.usdc) console.log(`  USDC: ${config.usdc}`);
    if (config.usdt) console.log(`  USDT: ${config.usdt}`);
    console.log('\n💡 Remember to rebuild the frontend: npm run build');
    
  } catch (error) {
    console.error('❌ Error updating contract files:', error.message);
    process.exit(1);
  }
}

// Main execution
function main() {
  console.log('🔧 Chain Academy Contract Address Updater');
  console.log('==========================================');
  
  const config = parseArgs();
  
  if (Object.keys(config).length === 0) {
    console.log('❌ No valid contract addresses provided.');
    console.log('Use --help for usage information.');
    process.exit(1);
  }
  
  updateContractFiles(config);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { updateContractFiles, isValidEthereumAddress };