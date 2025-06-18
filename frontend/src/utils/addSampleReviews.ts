// This utility script is disabled - no sample reviews will be auto-added
// All reviews should be created organically by users

export const addSampleReviews = () => {
  console.log('📝 Sample reviews utility disabled - create reviews through the platform instead');
  return [];
};

// Auto-run if in browser environment and in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add to global scope for easy access from console
  (window as any).addSampleReviews = addSampleReviews;
  console.log('💡 Run addSampleReviews() in console to add sample review data');
}