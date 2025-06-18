// Setup Protection - This file ensures development protection is always loaded
// This file is automatically loaded by Create React App before the app starts

import './utils/developmentModeProtection';

console.log('[Chain Academy] Development protection system loaded successfully');

// Verify protection is active
if (process.env.NODE_ENV === 'development') {
  // Check if protection is working
  setTimeout(() => {
    if (window.developmentModeProtector) {
      console.log('[Chain Academy] Protection system verified and active');
    } else {
      console.warn('[Chain Academy] Protection system may not be properly initialized');
    }
  }, 1000);
}

// Export a flag to indicate protection is loaded
window.__PROTECTION_LOADED__ = true;