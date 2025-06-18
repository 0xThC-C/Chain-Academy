/**
 * Storage Cleanup Utility for Chain Academy V2
 * 
 * This utility provides functions to detect and fix common storage issues
 * that can cause IndexedDB and other browser storage errors.
 */

// Clear all Chain Academy related storage
export const clearAllChainAcademyStorage = (): void => {
  try {
    console.log('🧹 StorageCleanup: Starting comprehensive storage cleanup...');
    
    // Clear localStorage keys
    const localStorageKeys = [
      'chain_academy_session_reminders',
      'chain_academy_session_reminders_backup',
      'chain_academy_notification_sync',
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
      'wallet-auth-timestamp'
    ];
    
    let clearedCount = 0;
    localStorageKeys.forEach(key => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          clearedCount++;
          console.log(`🗑️ StorageCleanup: Cleared localStorage key: ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️ StorageCleanup: Failed to clear localStorage key ${key}:`, error);
      }
    });
    
    // Clear all wagmi-related keys with wildcard patterns
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wagmi.') || key.startsWith('@w3m/') || key.startsWith('w3m-')) {
          localStorage.removeItem(key);
          clearedCount++;
          console.log(`🗑️ StorageCleanup: Cleared wagmi/w3m key: ${key}`);
        }
      });
    } catch (error) {
      console.warn('⚠️ StorageCleanup: Error clearing wagmi keys:', error);
    }
    
    // Clear sessionStorage keys
    const sessionStorageKeys = [
      'chain_academy_session_reminders_session',
      'auth_session',
      'auth_nonces'
    ];
    
    sessionStorageKeys.forEach(key => {
      try {
        if (sessionStorage.getItem(key) !== null) {
          sessionStorage.removeItem(key);
          clearedCount++;
          console.log(`🗑️ StorageCleanup: Cleared sessionStorage key: ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️ StorageCleanup: Failed to clear sessionStorage key ${key}:`, error);
      }
    });
    
    console.log(`✅ StorageCleanup: Cleared ${clearedCount} storage items`);
    
  } catch (error) {
    console.error('❌ StorageCleanup: Error during storage cleanup:', error);
  }
};

// Clear corrupted IndexedDB databases
export const clearIndexedDBDatabases = async (): Promise<void> => {
  try {
    if (!window.indexedDB) {
      console.log('ℹ️ StorageCleanup: IndexedDB not available');
      return;
    }
    
    console.log('🧹 StorageCleanup: Starting IndexedDB cleanup...');
    
    const databasesToDelete = [
      'ChainAcademyNotifications',
      'wagmi.cache',
      'w3m-cache',
      'web3modal-cache'
    ];
    
    const deletePromises = databasesToDelete.map(async (dbName) => {
      try {
        await new Promise<void>((resolve, _reject) => {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          
          deleteRequest.onsuccess = () => {
            console.log(`✅ StorageCleanup: Deleted IndexedDB: ${dbName}`);
            resolve();
          };
          
          deleteRequest.onerror = () => {
            console.warn(`⚠️ StorageCleanup: Failed to delete IndexedDB: ${dbName}`);
            resolve(); // Don't reject, continue with other deletions
          };
          
          deleteRequest.onblocked = () => {
            console.warn(`⚠️ StorageCleanup: Delete blocked for IndexedDB: ${dbName}`);
            // Force resolve after timeout
            setTimeout(() => resolve(), 1000);
          };
        });
      } catch (error) {
        console.warn(`⚠️ StorageCleanup: Error deleting IndexedDB ${dbName}:`, error);
      }
    });
    
    await Promise.allSettled(deletePromises);
    console.log('✅ StorageCleanup: IndexedDB cleanup completed');
    
  } catch (error) {
    console.error('❌ StorageCleanup: Error during IndexedDB cleanup:', error);
  }
};

// Detect common storage corruption issues
export const detectStorageIssues = (): { 
  hasIssues: boolean; 
  issues: string[]; 
  recommendations: string[] 
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    // Check localStorage availability and corruption
    try {
      const testKey = '__chain_academy_test__';
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== 'test') {
        issues.push('localStorage read/write test failed');
        recommendations.push('Clear localStorage data');
      }
    } catch (error) {
      issues.push('localStorage is not accessible');
      recommendations.push('Check browser privacy settings and storage quotas');
    }
    
    // Check sessionStorage availability
    try {
      const testKey = '__chain_academy_session_test__';
      sessionStorage.setItem(testKey, 'test');
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      if (retrieved !== 'test') {
        issues.push('sessionStorage read/write test failed');
        recommendations.push('Clear sessionStorage data');
      }
    } catch (error) {
      issues.push('sessionStorage is not accessible');
      recommendations.push('Check browser privacy settings');
    }
    
    // Check IndexedDB availability
    if (!window.indexedDB) {
      issues.push('IndexedDB is not available');
      recommendations.push('Use a modern browser that supports IndexedDB');
    }
    
    // Check for specific corrupted data patterns
    try {
      const reminderData = localStorage.getItem('chain_academy_session_reminders');
      if (reminderData) {
        try {
          const parsed = JSON.parse(reminderData);
          if (!Array.isArray(parsed)) {
            issues.push('Session reminders data is not in expected array format');
            recommendations.push('Clear notification storage data');
          }
        } catch (parseError) {
          issues.push('Session reminders data is corrupted (invalid JSON)');
          recommendations.push('Clear notification storage data');
        }
      }
    } catch (error) {
      issues.push('Error checking localStorage data integrity');
      recommendations.push('Clear all localStorage data');
    }
    
    // Check for wallet storage conflicts
    const walletKeys = Object.keys(localStorage).filter(key => 
      key.includes('wallet') || key.includes('w3m') || key.includes('wagmi')
    );
    
    if (walletKeys.length > 10) {
      issues.push('Excessive wallet storage entries detected');
      recommendations.push('Clear wallet connection cache');
    }
    
  } catch (error) {
    issues.push('Error during storage diagnostics');
    recommendations.push('Perform full storage cleanup');
  }
  
  return {
    hasIssues: issues.length > 0,
    issues,
    recommendations
  };
};

// Emergency storage reset (nuclear option)
export const emergencyStorageReset = async (): Promise<void> => {
  console.log('🚨 StorageCleanup: EMERGENCY STORAGE RESET INITIATED');
  
  try {
    // Clear all browser storage
    clearAllChainAcademyStorage();
    
    // Clear IndexedDB
    await clearIndexedDBDatabases();
    
    // Clear any remaining storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      console.log('🧹 StorageCleanup: Cleared all localStorage and sessionStorage');
    } catch (error) {
      console.error('❌ StorageCleanup: Error clearing storage:', error);
    }
    
    console.log('✅ StorageCleanup: Emergency reset completed');
    
    // Recommend page reload
    if (window.confirm(
      '🔄 Storage Reset Complete\n\n' +
      'All browser storage has been cleared to fix corruption issues.\n\n' +
      'Would you like to reload the page to apply changes?'
    )) {
      window.location.reload();
    }
    
  } catch (error) {
    console.error('❌ StorageCleanup: Emergency reset failed:', error);
  }
};

// Auto-fix common issues
export const autoFixStorageIssues = async (): Promise<boolean> => {
  const diagnostics = detectStorageIssues();
  
  if (!diagnostics.hasIssues) {
    console.log('✅ StorageCleanup: No storage issues detected');
    return true;
  }
  
  console.log('🔧 StorageCleanup: Auto-fixing detected issues:', diagnostics.issues);
  
  try {
    // Clear corrupted notification data
    if (diagnostics.issues.some(issue => issue.includes('Session reminders'))) {
      ['chain_academy_session_reminders', 'chain_academy_session_reminders_backup', 'chain_academy_session_reminders_session'].forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          console.warn(`⚠️ StorageCleanup: Failed to remove ${key}:`, error);
        }
      });
    }
    
    // Clear excessive wallet data
    if (diagnostics.issues.some(issue => issue.includes('wallet storage'))) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('wallet') || key.includes('w3m') || key.includes('wagmi')) {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.warn(`⚠️ StorageCleanup: Failed to remove wallet key ${key}:`, error);
          }
        }
      });
    }
    
    // Clear IndexedDB if issues detected
    await clearIndexedDBDatabases();
    
    console.log('✅ StorageCleanup: Auto-fix completed');
    return true;
    
  } catch (error) {
    console.error('❌ StorageCleanup: Auto-fix failed:', error);
    return false;
  }
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).chainAcademyStorageCleanup = {
    clearAll: clearAllChainAcademyStorage,
    clearIndexedDB: clearIndexedDBDatabases,
    detect: detectStorageIssues,
    autoFix: autoFixStorageIssues,
    emergencyReset: emergencyStorageReset
  };
}