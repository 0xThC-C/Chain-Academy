/**
 * Version Manager for Chain Academy V2
 * 
 * Detects app updates and performs data migration when necessary
 */

import { performDataMigration, getDataMigrationInfo } from './dataProtection';

// Current app version - update this with each release
export const CURRENT_VERSION = '2.1.0';

// Storage key for version tracking
const VERSION_KEY = 'chain_academy_version';

interface VersionInfo {
  version: string;
  timestamp: string;
  dataItemsCount: number;
  migrationPerformed: boolean;
}

/**
 * Get the currently stored version
 */
export const getStoredVersion = (): string | null => {
  try {
    const versionData = localStorage.getItem(VERSION_KEY);
    if (versionData) {
      const parsed = JSON.parse(versionData);
      return parsed.version;
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VersionManager: Failed to parse stored version:', error);
    return null;
  }
};

/**
 * Set the current version in storage
 */
export const setCurrentVersion = (): void => {
  try {
    const migrationInfo = getDataMigrationInfo();
    const versionInfo: VersionInfo = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      dataItemsCount: migrationInfo.totalItems,
      migrationPerformed: false
    };
    
    localStorage.setItem(VERSION_KEY, JSON.stringify(versionInfo));
    console.log(`✅ VersionManager: Set current version to ${CURRENT_VERSION}`);
    
  } catch (error) {
    console.error('❌ VersionManager: Failed to set current version:', error);
  }
};

/**
 * Check if the app has been updated
 */
export const isAppUpdated = (): boolean => {
  const storedVersion = getStoredVersion();
  
  if (!storedVersion) {
    // First time user or version not tracked
    console.log('📱 VersionManager: First time user or version not tracked');
    return false;
  }
  
  if (storedVersion !== CURRENT_VERSION) {
    console.log(`🔄 VersionManager: App updated from ${storedVersion} to ${CURRENT_VERSION}`);
    return true;
  }
  
  return false;
};

/**
 * Handle app update detection
 */
export const handleAppUpdate = (): void => {
  const storedVersion = getStoredVersion();
  
  if (isAppUpdated()) {
    console.log('🚀 VersionManager: Handling app update...');
    
    // Perform data migration if needed
    if (storedVersion) {
      performDataMigration(storedVersion, CURRENT_VERSION);
    }
    
    // Update version info
    const migrationInfo = getDataMigrationInfo();
    const versionInfo: VersionInfo = {
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      dataItemsCount: migrationInfo.totalItems,
      migrationPerformed: true
    };
    
    localStorage.setItem(VERSION_KEY, JSON.stringify(versionInfo));
    
    // Show user notification about update
    showUpdateNotification(storedVersion || 'unknown', CURRENT_VERSION);
  } else {
    // First time or same version
    setCurrentVersion();
  }
};

/**
 * Show update notification to user
 */
const showUpdateNotification = (fromVersion: string, toVersion: string): void => {
  // Only show in production to avoid noise during development
  if (process.env.NODE_ENV === 'production') {
    console.log(`
    🎉 Chain Academy Updated!
    
    Version ${fromVersion} → ${toVersion}
    
    Your data has been preserved:
    ✅ Profiles
    ✅ Reviews  
    ✅ Bookings
    ✅ Payment History
    
    Enjoy the new features!
    `);
  }
};

/**
 * Get version history
 */
export const getVersionInfo = (): VersionInfo | null => {
  try {
    const versionData = localStorage.getItem(VERSION_KEY);
    if (versionData) {
      return JSON.parse(versionData);
    }
    return null;
  } catch (error) {
    console.warn('⚠️ VersionManager: Failed to get version info:', error);
    return null;
  }
};

/**
 * Initialize version management
 */
export const initializeVersionManager = (): void => {
  console.log('🔧 VersionManager: Initializing...');
  
  try {
    handleAppUpdate();
    console.log('✅ VersionManager: Initialization complete');
  } catch (error) {
    console.error('❌ VersionManager: Initialization failed:', error);
  }
};

export default {
  CURRENT_VERSION,
  getStoredVersion,
  setCurrentVersion,
  isAppUpdated,
  handleAppUpdate,
  getVersionInfo,
  initializeVersionManager
};