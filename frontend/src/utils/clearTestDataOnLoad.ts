// Auto-clear test data when app loads
export const clearTestData = () => {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Auto-clearing test data...');
  
  try {
    // Clear reviews
    localStorage.removeItem('reviews');
    console.log('✅ Cleared reviews');
    
    // Clear booked sessions
    localStorage.removeItem('booked_sessions');
    console.log('✅ Cleared booked sessions');
    
    // Clear withdrawal records
    const keys = Object.keys(localStorage);
    const withdrawalKeys = keys.filter(key => key.startsWith('withdrawals_'));
    withdrawalKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    });
    
    // Clear payout wallet configs
    const payoutKeys = keys.filter(key => key.startsWith('payout_wallet_'));
    payoutKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    });
    
    console.log('✨ Test data cleanup complete!');
    
    // Set a flag to prevent repeated clearing
    localStorage.setItem('test_data_cleared', 'true');
    
  } catch (error) {
    console.error('❌ Failed to clear test data:', error);
  }
};

// Auto-clear on first load only
export const autoCleanupTestData = () => {
  if (typeof window === 'undefined') return;
  
  const alreadyCleared = localStorage.getItem('test_data_cleared');
  if (!alreadyCleared) {
    clearTestData();
  }
};