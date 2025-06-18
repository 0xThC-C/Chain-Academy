import React, { useState, useEffect } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

interface UserAvatarProps {
  address?: string;
  profileImage?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  address, 
  profileImage, 
  size = 'md', 
  className = '',
  onClick 
}) => {
  const [imageError, setImageError] = useState(false);
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-10 w-10'
  };

  // Load profile image from localStorage when address changes
  useEffect(() => {
    const loadProfileImage = () => {
      if (address) {
        const savedProfile = localStorage.getItem(`profile_${address.toLowerCase()}`);
        if (savedProfile) {
          try {
            const profile = JSON.parse(savedProfile);
            console.log(`👤 UserAvatar: Loading profile image for ${address}:`, !!profile.profileImage);
            setLocalProfileImage(profile.profileImage || null);
            setImageError(false); // Reset error state when loading new image
          } catch (error) {
            console.error('Error parsing profile:', error);
            setLocalProfileImage(null);
          }
        } else {
          setLocalProfileImage(null);
        }
      } else {
        setLocalProfileImage(null);
      }
    };

    loadProfileImage();

    // Listen for storage changes to update profile image in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (address && e.key === `profile_${address.toLowerCase()}`) {
        console.log(`👤 UserAvatar: Profile updated for ${address}, reloading image`);
        loadProfileImage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [address]);

  // Determine which image to show (priority: prop > localStorage > none)
  const getDisplayImage = () => {
    if (profileImage) return profileImage;
    return localProfileImage;
  };

  const imageUrl = getDisplayImage();
  const showImage = imageUrl && !imageError;

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {showImage ? (
        <img 
          src={imageUrl} 
          alt="Profile" 
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-primary-red rounded-full flex items-center justify-center">
          <UserIcon className={`${iconSizes[size]} text-white`} />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;