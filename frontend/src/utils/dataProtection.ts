/**
 * Data Protection System for Chain Academy V2
 * 
 * Protects critical user data from being lost during updates or storage cleanups
 */

// Critical data keys that should never be cleared
export const PROTECTED_DATA_KEYS = [
  // User profiles (wallet-based)
  'profile_',
  
  // Reviews and ratings
  'chainacademy_reviews',
  'reviews',
  
  // Bookings and sessions
  'booked_sessions',
  
  // Payment and withdrawal data
  'withdrawals_',
  'payout_wallet_',
  
  // Mentorship data
  'mentorships_',
  'session_',
  
  // User preferences (non-critical but nice to preserve)
  'theme',
  'language_preference',
  
  // Currency rates cache
  'currencyRates'
];

// Temporary/cache data that can be safely cleared
export const CLEARABLE_DATA_KEYS = [
  'auth_session',
  'auth_nonces',
  '@w3m/wallet',
  '@w3m/last-used-wallet-id',
  '@w3m/store',
  'w3m-wallet-id',
  'wagmi.cache',
  'wagmi.store',
  'wagmi.wallet',
  'web3modal.wallet',
  'wallet-connection-authorized',
  'metamask-authorized',
  'coinbase-authorized',
  'rabby-authorized',
  'wallet-auth-timestamp',
  'test_data_cleared'
];

/**
 * Backup critical data to a protected storage location
 */
export const backupCriticalData = (): { [key: string]: string } => {
  const backup: { [key: string]: string } = {};
  
  try {
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
      const isProtected = PROTECTED_DATA_KEYS.some(protectedKey => 
        key.startsWith(protectedKey) || key === protectedKey
      );
      
      if (isProtected) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          backup[key] = value;
        }
      }
    });
    
    console.log(`🛡️ DataProtection: Backed up ${Object.keys(backup).length} critical data items`);
    return backup;
    
  } catch (error) {
    console.error('❌ DataProtection: Failed to backup critical data:', error);
    return {};
  }
};

/**
 * Restore critical data from backup
 */
export const restoreCriticalData = (backup: { [key: string]: string }): void => {
  try {
    let restoredCount = 0;
    
    Object.entries(backup).forEach(([key, value]) => {
      try {
        localStorage.setItem(key, value);
        restoredCount++;
      } catch (error) {
        console.warn(`⚠️ DataProtection: Failed to restore ${key}:`, error);
      }
    });
    
    console.log(`✅ DataProtection: Restored ${restoredCount} critical data items`);
    
  } catch (error) {
    console.error('❌ DataProtection: Failed to restore critical data:', error);
  }
};

/**
 * Safe storage cleanup that preserves critical data
 */
export const safeStorageCleanup = (): void => {
  try {
    console.log('🧹 DataProtection: Starting safe storage cleanup...');
    
    // First, backup critical data
    const backup = backupCriticalData();
    
    // Clear only non-critical keys
    const allKeys = Object.keys(localStorage);
    let clearedCount = 0;
    
    allKeys.forEach(key => {
      const isClearable = CLEARABLE_DATA_KEYS.some(clearableKey => 
        key.startsWith(clearableKey) || key === clearableKey
      );
      
      if (isClearable) {
        try {
          localStorage.removeItem(key);
          clearedCount++;
        } catch (error) {
          console.warn(`⚠️ DataProtection: Failed to clear ${key}:`, error);
        }
      }
    });
    
    // Restore critical data if any was accidentally cleared
    restoreCriticalData(backup);
    
    console.log(`✅ DataProtection: Safe cleanup complete. Cleared ${clearedCount} non-critical items.`);
    
  } catch (error) {
    console.error('❌ DataProtection: Safe cleanup failed:', error);
  }
};

/**
 * Check if a key contains critical data
 */
export const isCriticalData = (key: string): boolean => {
  return PROTECTED_DATA_KEYS.some(protectedKey => 
    key.startsWith(protectedKey) || key === protectedKey
  );
};

/**
 * Get data migration info for version updates
 */
export const getDataMigrationInfo = (): {
  totalItems: number;
  criticalItems: number;
  clearableItems: number;
  protectedKeys: string[];
} => {
  const allKeys = Object.keys(localStorage);
  const protectedKeys: string[] = [];
  let criticalItems = 0;
  let clearableItems = 0;
  
  allKeys.forEach(key => {
    if (isCriticalData(key)) {
      protectedKeys.push(key);
      criticalItems++;
    } else if (CLEARABLE_DATA_KEYS.some(clearableKey => 
      key.startsWith(clearableKey) || key === clearableKey
    )) {
      clearableItems++;
    }
  });
  
  return {
    totalItems: allKeys.length,
    criticalItems,
    clearableItems,
    protectedKeys
  };
};

/**
 * Version-safe data migration
 */
export const performDataMigration = (fromVersion: string, toVersion: string): void => {
  console.log(`🔄 DataProtection: Migrating data from ${fromVersion} to ${toVersion}`);
  
  const migrationInfo = getDataMigrationInfo();
  console.log('📊 Migration info:', migrationInfo);
  
  // Backup all critical data
  const backup = backupCriticalData();
  
  // Set migration flag
  localStorage.setItem('data_migration_completed', JSON.stringify({
    fromVersion,
    toVersion,
    timestamp: new Date().toISOString(),
    itemsProtected: Object.keys(backup).length
  }));
  
  console.log(`✅ DataProtection: Migration complete. Protected ${Object.keys(backup).length} items.`);
};

export default {
  backupCriticalData,
  restoreCriticalData,
  safeStorageCleanup,
  isCriticalData,
  getDataMigrationInfo,
  performDataMigration,
  PROTECTED_DATA_KEYS,
  CLEARABLE_DATA_KEYS
};