// Script to clear test data from localStorage
// Run this in the browser console to clean up test reviews and sessions

function clearTestData() {
  console.log('🧹 Starting cleanup of test data...');
  
  // Clear reviews
  try {
    localStorage.removeItem('reviews');
    console.log('✅ Cleared reviews');
  } catch (error) {
    console.error('❌ Failed to clear reviews:', error);
  }
  
  // Clear booked sessions
  try {
    localStorage.removeItem('booked_sessions');
    console.log('✅ Cleared booked sessions');
  } catch (error) {
    console.error('❌ Failed to clear booked sessions:', error);
  }
  
  // Clear any withdrawal records
  try {
    const keys = Object.keys(localStorage);
    const withdrawalKeys = keys.filter(key => key.startsWith('withdrawals_'));
    withdrawalKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    });
  } catch (error) {
    console.error('❌ Failed to clear withdrawal records:', error);
  }
  
  // Clear any payout wallet configs (if any remain)
  try {
    const keys = Object.keys(localStorage);
    const payoutKeys = keys.filter(key => key.startsWith('payout_wallet_'));
    payoutKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    });
  } catch (error) {
    console.error('❌ Failed to clear payout wallets:', error);
  }
  
  console.log('✨ Test data cleanup complete! Please refresh the page.');
  console.log('📍 To run this cleanup, copy and paste this entire function into your browser console, then call clearTestData()');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = clearTestData;
} else if (typeof window !== 'undefined') {
  window.clearTestData = clearTestData;
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  console.log('🔧 Test data cleanup utility loaded. Run clearTestData() to clean up test data.');
}