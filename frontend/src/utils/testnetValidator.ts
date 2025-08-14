// Testnet Configuration Validator
// Ensures the frontend is properly configured for testnet deployment

import { CURRENT_CONFIG, validateEnvironment } from '../config/environment';
import { getMainnetInfo, isTestnetMode } from '../contracts/ProgressiveEscrowV7';
import { TESTNET_CONTRACTS } from '../config/testnet';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  status: 'ready' | 'pending' | 'error';
}

// Comprehensive testnet validation
export const validateTestnetConfiguration = (): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Environment validation
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    errors.push(...envValidation.errors);
  }

  // 2. Testnet mode validation
  if (!isTestnetMode()) {
    errors.push('Application must be in testnet mode');
  }

  // 3. Chain ID validation
  if (CURRENT_CONFIG.chainId !== 11155111) {
    errors.push(`Chain ID must be 11155111 (Sepolia), got ${CURRENT_CONFIG.chainId}`);
  }

  // 4. Network name validation
  if (CURRENT_CONFIG.networkName !== 'sepolia') {
    errors.push(`Network name must be 'sepolia', got '${CURRENT_CONFIG.networkName}'`);
  }

  // 5. Contract address validation
  const mainnetInfo = getMainnetInfo();
  if (mainnetInfo.contractAddress === '0x0000000000000000000000000000000000000000') {
    warnings.push('Mentorship contract address not yet deployed - waiting for Agent 2');
  }

  // 6. Environment variable validation
  const requiredEnvVars = [
    'REACT_APP_CHAIN_ID',
    'REACT_APP_NETWORK_NAME',
    'REACT_APP_ENVIRONMENT'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  });

  // 7. Token address validation
  if (!mainnetInfo.usdcAddress || mainnetInfo.usdcAddress === '0x0000000000000000000000000000000000000000') {
    warnings.push('USDC mainnet address may need verification');
  }

  if (!mainnetInfo.usdtAddress || mainnetInfo.usdtAddress === '0x0000000000000000000000000000000000000000') {
    warnings.push('USDT mainnet address may need verification');
  }

  // 8. Backend URL validation
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('testnet')) {
    warnings.push('Backend URL may not be configured for testnet environment');
  }

  // Determine overall status
  let status: 'ready' | 'pending' | 'error' = 'ready';
  if (errors.length > 0) {
    status = 'error';
  } else if (warnings.some(w => w.includes('contract address not yet deployed'))) {
    status = 'pending';
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    status
  };
};

// Quick validation for runtime checks
export const isTestnetReady = (): boolean => {
  const validation = validateTestnetConfiguration();
  return validation.isValid && validation.status !== 'error';
};

// Display validation results
export const displayValidationResults = (): void => {
  const validation = validateTestnetConfiguration();
  
  console.log('🔍 TESTNET CONFIGURATION VALIDATION');
  console.log('=====================================');
  
  if (validation.isValid) {
    console.log('✅ Configuration validation passed');
  } else {
    console.log('❌ Configuration validation failed');
  }
  
  console.log(`📊 Status: ${validation.status.toUpperCase()}`);
  
  if (validation.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  // Configuration summary
  console.log('\n📋 CONFIGURATION SUMMARY:');
  console.log(`  Environment: ${CURRENT_CONFIG.environment}`);
  console.log(`  Network: ${CURRENT_CONFIG.networkName}`);
  console.log(`  Chain ID: ${CURRENT_CONFIG.chainId}`);
  console.log(`  Explorer: ${CURRENT_CONFIG.explorerUrl}`);
  console.log(`  Contract: ${TESTNET_CONTRACTS.mentorship}`);
  console.log(`  Testnet Mode: ${isTestnetMode() ? 'Enabled' : 'Disabled'}`);
  
  // Next steps
  if (validation.status === 'pending') {
    console.log('\n🔄 NEXT STEPS:');
    console.log('  1. Wait for Agent 2 to deploy contracts');
    console.log('  2. Update contract addresses using: npm run update-contracts');
    console.log('  3. Rebuild frontend: npm run build');
  } else if (validation.status === 'ready') {
    console.log('\n🎉 READY FOR TESTNET DEPLOYMENT!');
  }
};

// Wallet network validation
export const validateWalletNetwork = (chainId: number): boolean => {
  if (chainId !== 11155111) {
    console.warn(`⚠️ Wallet is on chain ${chainId}, but testnet requires Sepolia (11155111)`);
    return false;
  }
  return true;
};

// Contract deployment status check
export const checkContractDeploymentStatus = (): {
  deployed: boolean;
  contractAddress: string;
  message: string;
} => {
  const contractAddress = TESTNET_CONTRACTS.mentorship;
  const deployed = contractAddress !== '0x0000000000000000000000000000000000000000';
  
  return {
    deployed,
    contractAddress,
    message: deployed 
      ? 'Contracts are deployed and ready' 
      : 'Waiting for Agent 2 to deploy contracts'
  };
};

// Export validation functions
export default {
  validateTestnetConfiguration,
  isTestnetReady,
  displayValidationResults,
  validateWalletNetwork,
  checkContractDeploymentStatus
};

// Run validation on module load
if (process.env.NODE_ENV === 'development') {
  displayValidationResults();
}