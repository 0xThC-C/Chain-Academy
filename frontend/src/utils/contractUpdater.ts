// Contract Address Updater Utility
// This utility helps update contract addresses when they are deployed by Agent 2

import { TESTNET_CONTRACTS } from '../config/testnet';

export interface ContractAddresses {
  mentorshipContract: string;
  usdcContract?: string;
  usdtContract?: string;
}

// Function to validate Ethereum address format
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address) && address !== '0x0000000000000000000000000000000000000000';
};

// Function to update contract addresses (to be called when Agent 2 provides addresses)
export const updateContractAddresses = (addresses: ContractAddresses): boolean => {
  try {
    // Validate mentorship contract address
    if (!isValidEthereumAddress(addresses.mentorshipContract)) {
      console.error('❌ Invalid mentorship contract address:', addresses.mentorshipContract);
      return false;
    }

    // Update the contract address in memory
    TESTNET_CONTRACTS.mentorship = addresses.mentorshipContract;

    // Log successful update
    console.log('✅ Contract addresses updated successfully:');
    console.log(`  Mentorship Contract: ${addresses.mentorshipContract}`);
    
    if (addresses.usdcContract && isValidEthereumAddress(addresses.usdcContract)) {
      console.log(`  USDC Contract: ${addresses.usdcContract}`);
    }
    
    if (addresses.usdtContract && isValidEthereumAddress(addresses.usdtContract)) {
      console.log(`  USDT Contract: ${addresses.usdtContract}`);
    }

    // Store in localStorage for persistence across page reloads
    localStorage.setItem('chainacademy_testnet_contracts', JSON.stringify({
      mentorshipContract: addresses.mentorshipContract,
      updatedAt: new Date().toISOString(),
      network: 'sepolia'
    }));

    return true;
  } catch (error) {
    console.error('❌ Error updating contract addresses:', error);
    return false;
  }
};

// Function to get current contract addresses (with fallback to localStorage)
export const getCurrentContractAddresses = (): ContractAddresses => {
  try {
    // First check localStorage for persisted addresses
    const stored = localStorage.getItem('chainacademy_testnet_contracts');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidEthereumAddress(parsed.mentorshipContract)) {
        console.log('📦 Using contract addresses from localStorage');
        return {
          mentorshipContract: parsed.mentorshipContract
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Error reading contract addresses from localStorage:', error);
  }

  // Fallback to config values
  return {
    mentorshipContract: TESTNET_CONTRACTS.mentorship
  };
};

// Function to check if contracts are ready for use
export const areContractsReady = (): boolean => {
  const addresses = getCurrentContractAddresses();
  return isValidEthereumAddress(addresses.mentorshipContract);
};

// Function to display contract readiness status
export const displayContractStatus = (): void => {
  const addresses = getCurrentContractAddresses();
  
  console.log('📋 Contract Status:');
  console.log(`  Mentorship Contract: ${addresses.mentorshipContract}`);
  console.log(`  Status: ${areContractsReady() ? '✅ Ready' : '⏳ Waiting for deployment'}`);
  
  if (!areContractsReady()) {
    console.log('💡 Contracts will be updated automatically when Agent 2 deploys them');
  }
};

// Export for use in components
export default {
  updateContractAddresses,
  getCurrentContractAddresses,
  areContractsReady,
  displayContractStatus,
  isValidEthereumAddress
};

// Display status on module load
displayContractStatus();