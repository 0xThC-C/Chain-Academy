// Utility functions for wallet detection and troubleshooting

export interface WalletInfo {
  name: string;
  detected: boolean;
  provider?: any;
  isConnected?: boolean;
  accounts?: string[];
}

/**
 * Detect available wallets in the browser
 */
export const detectWallets = (): Record<string, WalletInfo> => {
  const wallets: Record<string, WalletInfo> = {
    metamask: {
      name: 'MetaMask',
      detected: !!(window as any).ethereum?.isMetaMask,
      provider: (window as any).ethereum?.isMetaMask ? (window as any).ethereum : null
    },
    coinbase: {
      name: 'Coinbase Wallet',
      detected: !!(window as any).ethereum?.isCoinbaseWallet,
      provider: (window as any).ethereum?.isCoinbaseWallet ? (window as any).ethereum : null
    },
    rabby: {
      name: 'Rabby',
      detected: !!(window as any).ethereum?.isRabby,
      provider: (window as any).ethereum?.isRabby ? (window as any).ethereum : null
    }
  };

  // Additional check for Rabby - sometimes it doesn't set isRabby flag
  if (!wallets.rabby.detected && (window as any).ethereum) {
    // Check if provider has Rabby-specific properties
    const provider = (window as any).ethereum;
    if (provider._events && typeof provider._events === 'object') {
      // Rabby often has unique event structure
      wallets.rabby.detected = true;
      wallets.rabby.provider = provider;
    }
  }

  return wallets;
};

/**
 * Attempt to wake up Rabby wallet connection
 */
export const wakeUpRabby = async (): Promise<boolean> => {
  try {
    if (!(window as any).ethereum?.isRabby) {
      console.log('🦊 Rabby not detected, trying alternative detection...');
      
      // Try to trigger Rabby provider initialization
      const providers = (window as any).ethereum?.providers || [(window as any).ethereum];
      
      for (const provider of providers) {
        if (provider && (provider.isRabby || provider._metamask?.isRabby)) {
          console.log('🦊 Found Rabby provider, attempting connection...');
          try {
            // Try to request accounts to wake up the provider
            const accounts = await provider.request({ method: 'eth_accounts' });
            console.log('🦊 Rabby accounts:', accounts);
            return true;
          } catch (error) {
            console.log('🦊 Rabby provider error:', error);
          }
        }
      }
    }
    
    // Standard Rabby wake-up
    if ((window as any).ethereum?.isRabby) {
      await (window as any).ethereum.request({ method: 'eth_accounts' });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('🦊 Error waking up Rabby:', error);
    return false;
  }
};

// Phantom support removed due to auto-connection issues affecting user experience

/**
 * Security Note: Wallet authorization is now handled through SIWE authentication
 * instead of localStorage flags to prevent unauthorized access vulnerabilities.
 * 
 * The markWalletAuthorized and clearWalletAuthorization functions have been
 * removed as they were security vulnerabilities that could be manipulated
 * by malicious scripts or browser extensions.
 * 
 * Use the AuthContext and useAuth hook for secure authentication instead.
 */

/**
 * Get wallet-specific troubleshooting suggestions
 */
export const getWalletTroubleshooting = (walletName: string): string[] => {
  const suggestions: Record<string, string[]> = {
    rabby: [
      'Make sure Rabby wallet extension is installed and enabled',
      'Try refreshing the page if Rabby is not detected',
      'Check if Rabby is set as the default wallet',
      'Disable other wallet extensions temporarily'
    ],
    metamask: [
      'Make sure MetaMask is unlocked',
      'Check if MetaMask is connected to the correct network',
      'Try switching networks in MetaMask',
      'Refresh the page and try again'
    ],
    coinbase: [
      'Ensure Coinbase Wallet extension is installed',
      'Check if mobile app is interfering with browser extension',
      'Try disconnecting and reconnecting',
      'Make sure wallet is on the correct network'
    ]
  };

  return suggestions[walletName.toLowerCase()] || ['Try refreshing the page and reconnecting'];
};

/**
 * Log detailed wallet debugging information
 */
export const debugWalletState = (): void => {
  console.group('🔍 Wallet Debug Information');
  
  const wallets = detectWallets();
  console.table(wallets);
  
  // Check localStorage for wallet-related data (excluding deprecated auth flags)
  const storageKeys = Object.keys(localStorage).filter(key => 
    (key.includes('wallet') || 
     key.includes('wagmi') || 
     key.includes('@reown') ||
     key.includes('w3m')) &&
    !key.includes('authorized') && // Exclude deprecated auth flags
    !key.includes('auth-timestamp')
  );
  
  if (storageKeys.length > 0) {
    console.log('📦 Wallet-related localStorage entries:');
    storageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        console.log(`  ${key}:`, value);
      } catch (error) {
        console.log(`  ${key}: Error reading value`);
      }
    });
  }
  
  // Check sessionStorage for auth session
  try {
    const authSession = sessionStorage.getItem('auth_session');
    if (authSession) {
      const sessionData = JSON.parse(authSession);
      console.log('🔐 SIWE Authentication Status:');
      console.log(`  Address: ${sessionData.address}`);
      console.log(`  Token Present: ${!!sessionData.token}`);
      console.log(`  Expires: ${sessionData.expiry}`);
      console.log(`  Valid: ${new Date(sessionData.expiry) > new Date()}`);
    } else {
      console.log('🔐 No SIWE authentication session found');
    }
  } catch (error) {
    console.log('🔐 Error reading auth session:', error);
  }
  
  // Check for window.ethereum providers
  if ((window as any).ethereum) {
    console.log('⚡ Ethereum provider details:');
    const ethereum = (window as any).ethereum;
    console.log('  isMetaMask:', ethereum.isMetaMask);
    console.log('  isRabby:', ethereum.isRabby);
    console.log('  isCoinbaseWallet:', ethereum.isCoinbaseWallet);
    console.log('  providers:', ethereum.providers?.length || 'N/A');
  }
  
  console.groupEnd();
};