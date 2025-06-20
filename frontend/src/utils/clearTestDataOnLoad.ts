// DEPRECATED: This function has been disabled to prevent data loss
// Use safeStorageCleanup from dataProtection.ts instead
export const clearTestData = () => {
  console.warn('⚠️ clearTestData is DISABLED to prevent user data loss. Use safeStorageCleanup instead.');
  return;
};

// DEPRECATED: This function has been disabled to prevent data loss
export const autoCleanupTestData = () => {
  console.warn('⚠️ autoCleanupTestData is DISABLED to prevent user data loss.');
  return;
};