/**
 * Wallet conflict resolver - helps fix wallet injection conflicts
 */

export const fixWalletConflicts = () => {
  console.log('🔧 Starting wallet conflict resolution...');
  
  try {
    // 1. Clear problematic wallet storage
    const problematicKeys = [
      'phantom-wallet',
      'coinbase-wallet',
      'brave-wallet',
      'phantom',
      'solana',
      '__phantom'
    ];
    
    problematicKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
    
    // 2. Fix ethereum property if it's read-only
    if ((window as any).ethereum) {
      const currentEthereum = (window as any).ethereum;
      
      // Check if property is configurable
      const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
      
      if (descriptor && !descriptor.configurable) {
        console.log('⚠️ Ethereum property is not configurable, attempting workaround...');
        
        // Create a proxy that handles the ethereum object
        const ethereumProxy = new Proxy(currentEthereum, {
          get(target, prop) {
            return target[prop];
          },
          set(target, prop, value) {
            target[prop] = value;
            return true;
          }
        });
        
        // Try to replace with proxy
        try {
          (window as any).ethereum = ethereumProxy;
          console.log('✅ Created ethereum proxy to handle conflicts');
        } catch (error) {
          console.log('⚠️ Could not create ethereum proxy:', error);
        }
      }
    }
    
    // 3. Remove problematic wallet detectors
    ['phantom', 'solana', 'xfi'].forEach(prop => {
      if ((window as any)[prop]) {
        try {
          delete (window as any)[prop];
          console.log(`🚫 Removed ${prop} from window`);
        } catch (e) {
          console.log(`⚠️ Could not remove ${prop}:`, e);
        }
      }
    });
    
    // 4. Prevent future wallet conflicts
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function<T>(obj: T, prop: PropertyKey, descriptor: PropertyDescriptor & ThisType<any>): T {
      // Allow ethereum property to be reconfigured
      if (obj === window && prop === 'ethereum' && descriptor) {
        descriptor.configurable = true;
        descriptor.writable = true;
      }
      return originalDefineProperty.call(this, obj, prop, descriptor) as T;
    };
    
    console.log('✅ Wallet conflict resolution completed');
    
  } catch (error) {
    console.error('❌ Wallet conflict resolution failed:', error);
  }
};

export const detectWalletConflicts = () => {
  const conflicts = [];
  
  // Check for multiple ethereum providers
  if ((window as any).ethereum?.providers && Array.isArray((window as any).ethereum.providers)) {
    const providers = (window as any).ethereum.providers;
    conflicts.push(`Multiple ethereum providers detected: ${providers.length}`);
  }
  
  // Check for non-configurable ethereum property
  const ethereumDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
  if (ethereumDescriptor && !ethereumDescriptor.configurable) {
    conflicts.push('Ethereum property is not configurable');
  }
  
  // Check for problematic wallets
  ['phantom', 'solana', 'xfi'].forEach(prop => {
    if ((window as any)[prop]) {
      conflicts.push(`${prop} wallet detected`);
    }
  });
  
  return conflicts;
};

// Auto-fix on import
if (typeof window !== 'undefined') {
  // Run fix after a short delay to let other scripts load
  setTimeout(() => {
    const conflicts = detectWalletConflicts();
    if (conflicts.length > 0) {
      console.log('🔍 Wallet conflicts detected:', conflicts);
      fixWalletConflicts();
    }
  }, 500);
}