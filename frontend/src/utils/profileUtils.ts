/**
 * Utility functions for handling user profiles and names
 */

/**
 * Get display name for a user address from their saved profile
 * @param address - User's wallet address
 * @returns Display name if found, otherwise formatted address
 */
export const getDisplayName = (address: string): string => {
  if (!address) return 'Unknown User';
  
  try {
    const profileKey = `profile_${address.toLowerCase()}`;
    const savedProfile = localStorage.getItem(profileKey);
    
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      if (profile.displayName && profile.displayName.trim()) {
        return profile.displayName.trim();
      }
    }
  } catch (error) {
    console.warn('Error fetching profile for address:', address, error);
  }
  
  // Fallback to formatted address
  return formatAddress(address);
};

/**
 * Get bio for a user address from their saved profile
 * @param address - User's wallet address  
 * @returns Bio if found, otherwise empty string
 */
export const getUserBio = (address: string): string => {
  if (!address) return '';
  
  try {
    const profileKey = `profile_${address.toLowerCase()}`;
    const savedProfile = localStorage.getItem(profileKey);
    
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      return profile.bio || '';
    }
  } catch (error) {
    console.warn('Error fetching bio for address:', address, error);
  }
  
  return '';
};

/**
 * Format wallet address for display (truncated)
 * @param address - Full wallet address
 * @returns Formatted address like "0x1234...5678"
 */
export const formatAddress = (address: string): string => {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Check if user has a complete profile
 * @param address - User's wallet address
 * @returns True if profile exists and has display name
 */
export const hasCompleteProfile = (address: string): boolean => {
  if (!address) return false;
  
  try {
    const profileKey = `profile_${address.toLowerCase()}`;
    const savedProfile = localStorage.getItem(profileKey);
    
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      return !!(profile.displayName && profile.displayName.trim());
    }
  } catch (error) {
    console.warn('Error checking profile completeness for address:', address, error);
  }
  
  return false;
};

/**
 * Get review relationship description for UI display
 * @param reviewerAddress - Address of person who made the review
 * @param revieweeAddress - Address of person being reviewed
 * @param currentUserAddress - Current logged in user's address
 * @returns Descriptive text like "You reviewed John" or "Alice reviewed Bob"
 */
export const getReviewRelationshipText = (
  reviewerAddress: string,
  revieweeAddress: string, 
  currentUserAddress: string
): {
  text: string;
  reviewerName: string;
  revieweeName: string;
} => {
  const reviewerName = getDisplayName(reviewerAddress);
  const revieweeName = getDisplayName(revieweeAddress);
  
  let text: string;
  
  if (currentUserAddress && reviewerAddress.toLowerCase() === currentUserAddress.toLowerCase()) {
    // Current user made this review
    text = `You reviewed ${revieweeName}`;
  } else if (currentUserAddress && revieweeAddress.toLowerCase() === currentUserAddress.toLowerCase()) {
    // Current user was reviewed
    text = `${reviewerName} reviewed you`;
  } else {
    // Third party view
    text = `${reviewerName} reviewed ${revieweeName}`;
  }
  
  return {
    text,
    reviewerName,
    revieweeName
  };
};