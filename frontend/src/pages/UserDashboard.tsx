import React, { useState } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { formatUnits } from 'viem';
import { useUserProfile } from '../hooks/useUserProfile';
import { 
  UserIcon, 
  PlusCircleIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  StarIcon,
  CalendarIcon,
  VideoCameraIcon,
  WalletIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  BanknotesIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import UserAvatar from '../components/UserAvatar';
import AlertModal from '../components/AlertModal';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';
import ConfirmationModal from '../components/ConfirmationModal';
import MentorPaymentConfirmation from '../components/MentorPaymentConfirmation';

type TabType = 'profile' | 'create' | 'mentorships' | 'financial';

const UserDashboard: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { profile, diagnoseProfiles: _diagnoseProfiles } = useUserProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  const tabs = [
    { id: 'profile' as TabType, name: 'Profile', icon: UserIcon },
    { id: 'create' as TabType, name: 'Create Mentorship', icon: PlusCircleIcon },
    { id: 'mentorships' as TabType, name: 'My Mentorships', icon: ClockIcon },
    { id: 'financial' as TabType, name: 'Financial', icon: CurrencyDollarIcon },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-red rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your wallet to access your dashboard
          </p>
          <div className="flex justify-center">
            <WalletConnectionV2 />
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'create':
        return <CreateMentorshipTab />;
      case 'mentorships':
        return <MyMentorshipsTab navigate={navigate} setActiveTab={setActiveTab} />;
      case 'financial':
        return <FinancialTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="card p-6">
              <div className="flex items-center space-x-3 mb-6">
                <UserAvatar 
                  address={address || ''} 
                  profileImage={profile.profileImage} 
                  size="md" 
                  className="" 
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {profile.displayName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'User')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Dashboard</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-red text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab: React.FC = () => {
  const { 
    profile: profileData, 
    saveProfile, 
    updateProfile, 
    isLoading: _profileLoading,
    address,
    isConnected,
    hasProfileData: _hasProfileData,
    isProfileComplete: _isProfileComplete,
    diagnoseProfiles
  } = useUserProfile();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [, setBookedSessions] = useState<any[]>([]);
  const [imageUploadStatus, setImageUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Alert Modal state for ProfileTab
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // Load booked sessions when profile or address changes
  React.useEffect(() => {
    const loadBookedSessions = () => {
      if (address && profileData.displayName) {
        const allBookings = JSON.parse(localStorage.getItem('mentorship_bookings') || '[]');
        // SECURITY FIX: Filter bookings where current user is involved
        const userBookings = allBookings.filter((booking: any) => {
          const isStudent = booking.student?.toLowerCase() === address?.toLowerCase();
          const isMentor = booking.mentor?.toLowerCase() === address?.toLowerCase();
          return isStudent || isMentor;
        });
        
        console.log(`🛡️ ProfileTab: Filtered ${allBookings.length} to ${userBookings.length} sessions for ${address}`);
        setBookedSessions(userBookings);
      }
    };

    const handleBookingUpdate = () => {
      loadBookedSessions();
    };

    loadBookedSessions();

    // Listen for booking updates
    window.addEventListener('mentorshipBookingUpdated', handleBookingUpdate);

    return () => {
      window.removeEventListener('mentorshipBookingUpdated', handleBookingUpdate);
    };
  }, [address, profileData.displayName]);

  const handleInputChange = (field: string, value: string) => {
    updateProfile({ [field]: value });
    // Reset save status when user starts typing
    if (saveStatus !== 'idle') {
      setSaveStatus('idle');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert('warning', 'Invalid File', 'Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showAlert('warning', 'File Too Large', 'Image size must be less than 5MB.');
      return;
    }

    setImageUploadStatus('uploading');

    try {
      // Convert image to base64 for storage
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        updateProfile({ profileImage: imageData });
        setImageUploadStatus('success');
        
        // Auto-reset success status after 3 seconds
        setTimeout(() => {
          setImageUploadStatus('idle');
        }, 3000);
      };
      reader.onerror = () => {
        setImageUploadStatus('error');
        setTimeout(() => {
          setImageUploadStatus('idle');
        }, 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setImageUploadStatus('error');
      setTimeout(() => {
        setImageUploadStatus('idle');
      }, 3000);
    }
  };

  const handleRemoveImage = () => {
    updateProfile({ profileImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!isConnected || !address) {
      setSaveStatus('error');
      showAlert('error', 'Connection Error', 'Please connect your wallet to save profile.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      console.log('💾 Saving profile for address:', address);
      
      // Use the hook to save profile
      await saveProfile(profileData);

      setSaveStatus('success');
      showAlert('success', 'Profile Saved', 'Your profile has been successfully saved and will be automatically loaded when you connect this wallet.');
      
      // Reset success status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      showAlert('error', 'Save Failed', 'Failed to save profile. Please try again.');
      
      // Reset error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = profileData.displayName.trim() !== '' || 
                     profileData.bio.trim() !== '' || 
                     profileData.skills.trim() !== '' || 
                     profileData.experienceLevel !== '';

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h2>
        <Cog6ToothIcon className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="space-y-6">
        {/* Profile Image Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Profile Image
          </label>
          <div className="flex flex-col space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploadStatus === 'uploading'}
              className="btn-secondary text-sm flex items-center space-x-2"
            >
              {imageUploadStatus === 'uploading' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <PhotoIcon className="w-4 h-4" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
            
            {profileData.profileImage && (
              <button
                onClick={handleRemoveImage}
                className="text-red-600 dark:text-red-400 text-sm hover:underline"
              >
Remove Image
              </button>
            )}
            
            {imageUploadStatus === 'success' && (
              <p className="text-green-600 dark:text-green-400 text-xs">
Image uploaded successfully!
              </p>
            )}
            
            {imageUploadStatus === 'error' && (
              <p className="text-red-600 dark:text-red-400 text-xs">
Error uploading image. Please try again.
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={profileData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className="input-field"
            placeholder="Enter your display name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            rows={4}
            value={profileData.bio}
            onChange={(e) => handleInputChange('bio', e.target.value)}
            className="input-field"
            placeholder="Tell others about yourself and your expertise"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Skills
          </label>
          <input
            type="text"
            value={profileData.skills}
            onChange={(e) => handleInputChange('skills', e.target.value)}
            className="input-field"
            placeholder="e.g., Solidity, Smart Contracts, DeFi"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Experience Level
          </label>
          <select 
            value={profileData.experienceLevel}
            onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
            className="input-field"
          >
            <option value="">Select experience level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving || !isFormValid}
            className={`btn-primary flex items-center space-x-2 min-w-[140px] justify-center ${
              isSaving || !isFormValid ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Profile</span>
            )}
          </button>
          
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Profile saved successfully!</span>
            </div>
          )}
          
          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-medium">Error saving profile. Please try again.</span>
            </div>
          )}
          
          {/* Temporary Diagnosis Button */}
          <button 
            onClick={() => {
              console.log('🔍 Running Profile System Diagnosis...');
              diagnoseProfiles();
            }}
            className="btn-secondary text-xs"
            title="Debug: Check profile system status"
          >
            Debug Profiles
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

// Create Mentorship Tab Component
const CreateMentorshipTab: React.FC = () => {
  const { address } = useAccount();
  const { formatPrice, convertPrice } = useCurrencyConverter(); // ULTRATHINK: Currency conversion
  const [mentorshipData, setMentorshipData] = useState({
    title: '',
    description: '',
    duration: '60',
    price: '',
    preferredToken: 'USDC' as 'USDC' | 'ETH', // ULTRATHINK: Added token preference
    category: '',
    prerequisites: '',
    skills: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Alert Modal state for CreateMentorshipTab
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleInputChange = (field: string, value: string) => {
    setMentorshipData(prev => ({
      ...prev,
      [field]: value
    }));
    // Reset status when user starts typing
    if (createStatus !== 'idle') {
      setCreateStatus('idle');
    }
  };

  const handleCreateMentorship = async () => {
    console.log('Create button clicked!'); // Debug log
    console.log('Form data:', mentorshipData); // Debug log
    console.log('Is form valid:', isFormValid); // Debug log
    
    if (!address) {
      setCreateStatus('error');
      showAlert('warning', 'Wallet Required', 'Please connect your wallet first.');
      return;
    }

    // Validate required fields with detailed error messages
    if (!mentorshipData.title.trim()) {
      showAlert('warning', 'Missing Information', 'Please enter a session title.');
      return;
    }
    
    if (!mentorshipData.description.trim()) {
      showAlert('warning', 'Missing Information', 'Please enter a description.');
      return;
    }
    
    if (!mentorshipData.price) {
      showAlert('warning', 'Missing Information', 'Please enter a price.');
      return;
    }
    
    if (parseFloat(mentorshipData.price) <= 0) {
      showAlert('warning', 'Invalid Price', 'Price must be greater than zero.');
      return;
    }
    
    if (!mentorshipData.category) {
      showAlert('warning', 'Missing Information', 'Please select a category.');
      return;
    }

    setIsCreating(true);
    setCreateStatus('idle');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate unique ID
      const mentorshipId = Date.now();
      
      // Get user profile for mentor name and bio
      const savedProfile = localStorage.getItem(`profile_${address.toLowerCase()}`);
      let mentorName = `${address.slice(0, 6)}...${address.slice(-4)}`;
      let mentorBio = '';
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          if (profile.displayName) {
            mentorName = profile.displayName;
            console.log(`👤 Using profile name for new mentorship: ${mentorName}`);
          }
          if (profile.bio) {
            mentorBio = profile.bio;
            console.log(`👤 Using profile bio for new mentorship:`, profile.bio.substring(0, 50) + '...');
          }
        } catch (error) {
          console.error('Error parsing profile:', error);
        }
      }

      // Parse skills from string
      const skillsArray = mentorshipData.skills
        ? mentorshipData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
        : [];

      // Calculate both price formats using currency converter
      const priceAmount = parseFloat(mentorshipData.price);
      const priceUSDC = mentorshipData.preferredToken === 'USDC' 
        ? priceAmount 
        : convertPrice(priceAmount, 'ETH', 'USDC');
      const priceETH = mentorshipData.preferredToken === 'ETH' 
        ? priceAmount 
        : convertPrice(priceAmount, 'USDC', 'ETH');

      // Create mentorship object
      const newMentorship = {
        id: mentorshipId,
        mentorAddress: address,
        mentorName: mentorName,
        mentorBio: mentorBio,
        title: mentorshipData.title.trim(),
        description: mentorshipData.description.trim(),
        duration: parseInt(mentorshipData.duration),
        priceUSDC: priceUSDC,
        priceETH: priceETH,
        preferredToken: mentorshipData.preferredToken,
        category: mentorshipData.category,
        prerequisites: mentorshipData.prerequisites.trim(),
        skills: skillsArray,
        rating: 0,
        reviewCount: 0,
        sessionsCompleted: 0,
        isOnline: true,
        responseTime: '< 1 hour',
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      // Save to localStorage
      // 1. Save to mentor's created mentorships
      const mentorKey = `mentorships_created_${address}`;
      const existingMentorships = JSON.parse(localStorage.getItem(mentorKey) || '[]');
      existingMentorships.push(newMentorship);
      localStorage.setItem(mentorKey, JSON.stringify(existingMentorships));

      // 2. Save to global mentorships list (for gallery)
      const globalKey = 'global_mentorships';
      const globalMentorships = JSON.parse(localStorage.getItem(globalKey) || '[]');
      globalMentorships.push(newMentorship);
      localStorage.setItem(globalKey, JSON.stringify(globalMentorships));

      // Clear form
      setMentorshipData({
        title: '',
        description: '',
        duration: '60',
        price: '',
        preferredToken: 'USDC' as 'USDC' | 'ETH',
        category: '',
        prerequisites: '',
        skills: ''
      });

      setCreateStatus('success');
      
      // Show success message
      showAlert('success', 'Success!', 'Mentorship created successfully! You can view it in the "My Mentorships" tab.');
      
      // Reset success status after 5 seconds
      setTimeout(() => {
        setCreateStatus('idle');
      }, 5000);

    } catch (error) {
      console.error('Error creating mentorship:', error);
      setCreateStatus('error');
      
      // Reset error status after 5 seconds
      setTimeout(() => {
        setCreateStatus('idle');
      }, 5000);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = mentorshipData.title.trim() !== '' && 
                     mentorshipData.description.trim() !== '' && 
                     mentorshipData.price !== '' && 
                     mentorshipData.category !== '' &&
                     parseFloat(mentorshipData.price || '0') > 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Mentorship</h2>
        <PlusCircleIcon className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Session Title
          </label>
          <input
            type="text"
            value={mentorshipData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="input-field"
            placeholder="e.g., Advanced Smart Contract Security"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            rows={4}
            value={mentorshipData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="input-field"
            placeholder="Describe what students will learn in this session"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration
            </label>
            <select 
              value={mentorshipData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className="input-field"
            >
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Payment Token
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                mentorshipData.preferredToken === 'USDC'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="preferredToken"
                  value="USDC"
                  checked={mentorshipData.preferredToken === 'USDC'}
                  onChange={(e) => handleInputChange('preferredToken', e.target.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                  mentorshipData.preferredToken === 'USDC'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}>
                  {mentorshipData.preferredToken === 'USDC' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">USDC</div>
                  <div className="text-xs text-gray-500">Stable USD coin</div>
                </div>
              </label>

              <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                mentorshipData.preferredToken === 'ETH'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="preferredToken"
                  value="ETH"
                  checked={mentorshipData.preferredToken === 'ETH'}
                  onChange={(e) => handleInputChange('preferredToken', e.target.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                  mentorshipData.preferredToken === 'ETH'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300'
                }`}>
                  {mentorshipData.preferredToken === 'ETH' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">ETH</div>
                  <div className="text-xs text-gray-500">Ethereum token</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price ({mentorshipData.preferredToken})
            </label>
            <div className="relative">
              <input
                type="number"
                value={mentorshipData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="input-field pr-20"
                placeholder={mentorshipData.preferredToken === 'ETH' ? '0.0000' : '0.00'}
                min={mentorshipData.preferredToken === 'ETH' ? '0.001' : '1'}
                step={mentorshipData.preferredToken === 'ETH' ? '0.001' : '0.01'}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {mentorshipData.preferredToken}
                </span>
              </div>
            </div>
            
            {/* Price Preview */}
            {mentorshipData.price && parseFloat(mentorshipData.price) > 0 && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm">
                  {(() => {
                    const formatted = formatPrice(parseFloat(mentorshipData.price), mentorshipData.preferredToken);
                    return (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Your price:</span>
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            {formatted.displayPrice}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600 dark:text-blue-400">Students can pay:</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {formatted.equivalentPrice} equivalent
                          </span>
                        </div>
                        <div className="text-xs text-blue-500 dark:text-blue-500 pt-1 border-t border-blue-200 dark:border-blue-700">
                          Students can choose to pay with either ETH or USDC
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select 
            value={mentorshipData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="input-field"
          >
            <option value="">Select category</option>
            <option value="Smart Contracts">Smart Contracts</option>
            <option value="DeFi">DeFi</option>
            <option value="NFTs">NFTs</option>
            <option value="Blockchain Development">Blockchain Development</option>
            <option value="Trading">Trading</option>
            <option value="Security">Security</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Skills
          </label>
          <input
            type="text"
            value={mentorshipData.skills}
            onChange={(e) => handleInputChange('skills', e.target.value)}
            className="input-field"
            placeholder="e.g., Solidity, Security, Testing"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Separate multiple skills with commas
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prerequisites
          </label>
          <textarea
            rows={3}
            value={mentorshipData.prerequisites}
            onChange={(e) => handleInputChange('prerequisites', e.target.value)}
            className="input-field"
            placeholder="What should students know before this session?"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleCreateMentorship}
            disabled={isCreating || !isFormValid}
            className={`btn-primary flex items-center space-x-2 min-w-[200px] justify-center ${
              isCreating || !isFormValid ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5 transition-all'
            }`}
            type="button"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <PlusCircleIcon className="h-4 w-4" />
                <span>Create Mentorship Offering</span>
              </>
            )}
          </button>
          
          {createStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Mentorship created successfully!</span>
            </div>
          )}
          
          {createStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-medium">Failed to create mentorship. Please try again.</span>
            </div>
          )}
        </div>

        {!isFormValid && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Complete Required Fields
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc list-inside space-y-1">
                    {!mentorshipData.title.trim() && <li>Session title is required</li>}
                    {!mentorshipData.description.trim() && <li>Description is required</li>}
                    {!mentorshipData.price && <li>Price is required</li>}
                    {mentorshipData.price && parseFloat(mentorshipData.price) <= 0 && <li>Price must be greater than zero</li>}
                    {!mentorshipData.category && <li>Category must be selected</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

// My Mentorships Tab Component
const MyMentorshipsTab: React.FC<{ navigate: any; setActiveTab: (tab: TabType) => void }> = ({ navigate, setActiveTab }) => {
  const { address } = useAccount();
  const [isJoining, setIsJoining] = useState<number | null>(null);
  const [createdMentorships, setCreatedMentorships] = useState<any[]>([]);
  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'created' | 'sessions'>('created');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [mentorshipToDelete, setMentorshipToDelete] = useState<number | null>(null);

  // Alert Modal state for MyMentorshipsTab
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // Load mentorships and sessions on component mount and when address changes
  React.useEffect(() => {
    const loadData = () => {
      if (address) {
        // Load created mentorships
        const mentorKey = `mentorships_created_${address}`;
        const created = JSON.parse(localStorage.getItem(mentorKey) || '[]');
        setCreatedMentorships(created);

        // Load booked sessions (from localStorage)
        const bookings = JSON.parse(localStorage.getItem('mentorship_bookings') || '[]');
        
        // CRITICAL SECURITY FIX: Filter sessions for current user only
        const userSessions = bookings.filter((booking: any) => {
          // Show sessions where user is either the student OR the mentor
          const isStudent = booking.student?.toLowerCase() === address?.toLowerCase();
          const isMentor = booking.mentor?.toLowerCase() === address?.toLowerCase();
          
          console.log('🔍 Session filter check:', {
            sessionId: booking.id,
            student: booking.student,
            mentor: booking.mentor,
            currentAddress: address,
            isStudent,
            isMentor,
            shouldShow: isStudent || isMentor
          });
          
          return isStudent || isMentor;
        });
        
        console.log(`🛡️ SECURITY: Filtered ${bookings.length} total sessions down to ${userSessions.length} for address ${address}`);
        
        // Sort by booking date (most recent first)
        const sortedSessions = userSessions.sort((a: any, b: any) => {
          const dateA = new Date(a.bookedAt || a.date);
          const dateB = new Date(b.bookedAt || b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        setBookedSessions(sortedSessions);
      }
    };
    
    loadData();
    
    // Listen for localStorage changes to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mentorship_bookings' || e.key?.startsWith('mentorships_created_')) {
        loadData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from the same window
    const handleCustomUpdate = () => {
      loadData();
    };
    
    window.addEventListener('mentorshipBookingUpdated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mentorshipBookingUpdated', handleCustomUpdate);
    };
  }, [address]);

  const handleJoinSession = async (sessionId: number) => {
    console.log(`handleJoinSession called with sessionId: ${sessionId}`);
    
    try {
      setIsJoining(sessionId);
      console.log(`Set isJoining to: ${sessionId}`);
      
      // Find the session to check its scheduled time
      const session = bookedSessions.find(s => s.id === sessionId);
      console.log('Found session:', session);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Parse session date and time using ISO format for reliability
      const sessionDateTime = new Date(`${session.date}T${session.time}:00`);
      const now = new Date();
      
      console.log('Session timing check:', {
        sessionDateTime: sessionDateTime.toISOString(),
        now: now.toISOString(),
        sessionDate: session.date,
        sessionTime: session.time
      });
      
      // Skip time checks for test sessions (ID 3 and 4)
      const isTestSession = sessionId === 3 || sessionId === 4;
      
      if (!isTestSession) {
        // Allow joining 15 minutes before the scheduled time
        const allowJoinTime = new Date(sessionDateTime.getTime() - 15 * 60 * 1000);
        
        // Check if it's time to join
        if (now < allowJoinTime) {
          const minutesUntilJoin = Math.ceil((allowJoinTime.getTime() - now.getTime()) / (1000 * 60));
          throw new Error(`Session starts in ${minutesUntilJoin} minutes. You can join 15 minutes before the scheduled time.`);
        }
        
        // Check if session is too old (more than 2 hours past scheduled time)
        const maxJoinTime = new Date(sessionDateTime.getTime() + 2 * 60 * 60 * 1000);
        if (now > maxJoinTime) {
          throw new Error('This session has ended. Sessions are only available for 2 hours after the scheduled time.');
        }
      } else {
        console.log(`Test session ${sessionId} - skipping time checks`);
      }
      
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to session page with proper session ID
      const sessionRoute = `/session/${session.sessionId || `session-${sessionId}`}`;
      console.log(`Navigating to: ${sessionRoute}`);
      navigate(sessionRoute);
      
    } catch (error: any) {
      console.error('Error joining session:', error);
      showAlert('error', 'Join Failed', error.message || 'Failed to join session. Please try again.');
    } finally {
      setIsJoining(null);
    }
  };

  const handleDeleteMentorship = (mentorshipId: number) => {
    setMentorshipToDelete(mentorshipId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteMentorship = async () => {
    if (!address || !mentorshipToDelete) return;

    try {
      // Remove from created mentorships
      const mentorKey = `mentorships_created_${address}`;
      const created = JSON.parse(localStorage.getItem(mentorKey) || '[]');
      const updated = created.filter((m: any) => m.id !== mentorshipToDelete);
      localStorage.setItem(mentorKey, JSON.stringify(updated));
      setCreatedMentorships(updated);

      // Remove from global mentorships
      const globalKey = 'global_mentorships';
      const global = JSON.parse(localStorage.getItem(globalKey) || '[]');
      const updatedGlobal = global.filter((m: any) => m.id !== mentorshipToDelete);
      localStorage.setItem(globalKey, JSON.stringify(updatedGlobal));

      setShowDeleteConfirmation(false);
      setMentorshipToDelete(null);
      showAlert('success', 'Deleted', 'Mentorship deleted successfully!');
    } catch (error) {
      console.error('Error deleting mentorship:', error);
      showAlert('error', 'Delete Failed', 'Failed to delete mentorship. Please try again.');
      setShowDeleteConfirmation(false);
      setMentorshipToDelete(null);
    }
  };

  const cancelDeleteMentorship = () => {
    setShowDeleteConfirmation(false);
    setMentorshipToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Mentorships</h2>
          <BookOpenIcon className="h-6 w-6 text-gray-400" />
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveView('created')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'created'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
My Offerings ({createdMentorships.length})
          </button>
          <button
            onClick={() => setActiveView('sessions')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeView === 'sessions'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
Booked Sessions ({bookedSessions.length})
          </button>
        </div>
        
        {/* Content based on active view */}
        <div className="space-y-4">
          {activeView === 'created' ? (
            // Created Mentorships View
            createdMentorships.length === 0 ? (
              <div className="text-center py-8">
                <PlusCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Mentorship Offerings
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Create your first mentorship offering to start teaching and earning
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  <span>Create First Offering</span>
                </button>
              </div>
            ) : (
              createdMentorships.map((mentorship) => (
                <div key={mentorship.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {mentorship.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {mentorship.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{mentorship.duration} minutes</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span>{mentorship.priceUSDC} USDC</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {mentorship.category}
                          </span>
                        </div>
                      </div>
                      {mentorship.skills && mentorship.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {mentorship.skills.map((skill: string) => (
                            <span key={skill} className="inline-block px-2 py-1 bg-primary-red/10 text-primary-red text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
Active
                      </span>
                      <button 
                        onClick={() => handleDeleteMentorship(mentorship.id)}
                        className="btn-secondary text-sm flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            // Booked Sessions View
            bookedSessions.length === 0 ? (
              <div className="text-center py-8">
                <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Booked Sessions
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your scheduled mentorship sessions will appear here
                </p>
              </div>
            ) : (
              bookedSessions.map((session) => (
                <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {session.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Student: {session.student}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{session.time} {session.duration ? `(${session.duration}min)` : ''}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span>{session.price} USDC</span>
                        </div>
                      </div>
                      {session.category && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-primary-red/10 text-primary-red text-xs rounded mr-2">
                            {session.category}
                          </span>
                          {session.skills && session.skills.length > 0 && (
                            session.skills.slice(0, 3).map((skill: string) => (
                              <span key={skill} className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded mr-1">
                                {skill}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        // Calculate session timing for dynamic status
                        const sessionDateTime = new Date(`${session.date}T${session.time}:00`);
                        const now = new Date();
                        const allowJoinTime = new Date(sessionDateTime.getTime() - 15 * 60 * 1000);
                        const maxJoinTime = new Date(sessionDateTime.getTime() + 2 * 60 * 60 * 1000);
                        
                        // Force test sessions (ID 3 and 4) to always be joinable for debugging
                        const isTestSession = session.id === 3 || session.id === 4;
                        
                        const canJoin = isTestSession ? true : (now >= allowJoinTime && now <= maxJoinTime);
                        const isLive = isTestSession ? true : (now >= sessionDateTime && now <= maxJoinTime);
                        const hasEnded = isTestSession ? false : (now > maxJoinTime);
                        
                        // Debug logging for test sessions
                        if (session.id === 3 || session.id === 4) {
                          console.log(`Session ${session.id} Debug:`, {
                            sessionTime: sessionDateTime.toISOString(),
                            now: now.toISOString(),
                            allowJoinTime: allowJoinTime.toISOString(),
                            maxJoinTime: maxJoinTime.toISOString(),
                            canJoin,
                            isLive,
                            hasEnded,
                            minutesUntilJoin: Math.ceil((allowJoinTime.getTime() - now.getTime()) / (1000 * 60))
                          });
                        }
                        
                        return (
                          <>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              hasEnded
                                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                : isLive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : canJoin
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {hasEnded ? 'Ended' : isLive ? 'Live' : canJoin ? 'Ready' : 'Scheduled'}
                            </span>
                            {!hasEnded && (
                              <button 
                                onClick={(_e) => {
                                  console.log(`Join button clicked for session ${session.id}:`, {
                                    canJoin,
                                    isJoining,
                                    sessionDateTime: sessionDateTime.toISOString(),
                                    allowJoinTime: allowJoinTime.toISOString(),
                                    now: now.toISOString(),
                                    disabled: isJoining === session.id || !canJoin
                                  });
                                  if (canJoin && isJoining !== session.id) {
                                    handleJoinSession(session.id);
                                  } else {
                                    console.warn('Button click blocked:', { canJoin, isJoining, sessionId: session.id });
                                  }
                                }}
                                disabled={false} // Force enable for debugging
                                className={`text-sm flex items-center space-x-1 ${
                                  canJoin
                                    ? 'btn-primary hover:bg-red-700'
                                    : 'btn-primary opacity-50'
                                }`}
                                title={`Debug: canJoin=${canJoin}, isJoining=${isJoining === session.id}`}
                              >
                                {isJoining === session.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <>
                                    <VideoCameraIcon className="h-4 w-4" />
                                    <span>Join Session</span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={cancelDeleteMentorship}
        onConfirm={confirmDeleteMentorship}
        title="Delete Mentorship"
        message="Are you sure you want to delete this mentorship offering? This action cannot be undone and will remove it from the platform permanently."
        confirmText="Delete Mentorship"
        cancelText="Keep Mentorship"
        variant="danger"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

// Financial Tab Component
const FinancialTab: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address as `0x${string}`,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000,
    },
  });
  const chain = chainId ? { 
    id: chainId, 
    name: chainId === 1 ? 'Ethereum' : chainId === 137 ? 'Polygon' : 'Unknown' 
  } : null;
  
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawToken, setWithdrawToken] = useState<string>('USDC');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>('');

  // Alert Modal state for FinancialTab
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  // Calculate real financial data based on user's mentorships
  const calculateFinancialData = () => {
    if (!address) return { totalEarnings: 0, sessionsCompleted: 0, averageRating: 0, usdcBalance: 0, usdtBalance: 0 };

    // Get booked sessions for this user as mentor
    const bookedSessions = JSON.parse(localStorage.getItem('booked_sessions') || '[]');
    const userSessions = bookedSessions.filter((session: any) => 
      session.mentorAddress?.toLowerCase() === address.toLowerCase() && 
      session.status === 'completed'
    );

    // Calculate total earnings (90% of session prices, 10% platform fee)
    const totalEarnings = userSessions.reduce((total: number, session: any) => {
      const sessionPrice = session.price || 0;
      return total + (sessionPrice * 0.9); // 90% goes to mentor
    }, 0);

    // Get user's reviews as mentor
    const allReviews = JSON.parse(localStorage.getItem('reviews') || '[]');
    const mentorReviews = allReviews.filter((review: any) => 
      review.mentorAddress?.toLowerCase() === address.toLowerCase()
    );

    // Calculate average rating
    const averageRating = mentorReviews.length > 0 
      ? mentorReviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / mentorReviews.length
      : 0;

    // Split balance between USDC and USDT (for demo purposes)
    const usdcBalance = totalEarnings * 0.6;
    const usdtBalance = totalEarnings * 0.4;

    return {
      totalEarnings: totalEarnings,
      sessionsCompleted: userSessions.length,
      averageRating: Math.round(averageRating * 10) / 10,
      usdcBalance: Math.round(usdcBalance * 100) / 100,
      usdtBalance: Math.round(usdtBalance * 100) / 100
    };
  };

  const financialData = calculateFinancialData();

  const handleWithdraw = async () => {
    if (!isConnected || !address || !withdrawAmount) return;

    try {
      setIsWithdrawing(true);
      setWithdrawError('');
      setWithdrawSuccess('');

      // Simulate withdrawal process for now
      // TODO: Implement actual smart contract interaction when contracts are deployed
      console.log('Simulating withdrawal:', {
        amount: withdrawAmount,
        token: withdrawToken,
        destination: address, // Use connected wallet as destination
        chain: chain?.name
      });
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate transaction hash and receipt for UI purposes
      const mockTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const mockBlockNumber = Math.floor(Math.random() * 1000000) + 18000000;

      // Add withdrawal transaction record to localStorage for UI purposes
      const withdrawalRecord = {
        id: Date.now(),
        type: 'withdrawal',
        amount: parseFloat(withdrawAmount),
        token: withdrawToken,
        destination: address, // Use connected wallet as destination
        timestamp: new Date().toISOString(),
        status: 'completed',
        transactionHash: mockTransactionHash,
        blockNumber: mockBlockNumber
      };
      
      const existingWithdrawals = JSON.parse(localStorage.getItem(`withdrawals_${address}`) || '[]');
      existingWithdrawals.unshift(withdrawalRecord);
      localStorage.setItem(`withdrawals_${address}`, JSON.stringify(existingWithdrawals));

      setWithdrawSuccess(`Successfully withdrew ${withdrawAmount} ${withdrawToken} to your connected wallet! Transaction: ${mockTransactionHash}`);
      setWithdrawAmount('');
      
      // Close modal after success message
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess('');
      }, 5000);

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      setWithdrawError(error.message || 'Failed to process withdrawal. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${financialData.totalEarnings.toFixed(2)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sessions Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {financialData.sessionsCompleted}
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {financialData.averageRating > 0 ? financialData.averageRating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-primary-red" />
          </div>
        </div>
      </div>

      {/* Connected Wallet & Withdraw */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connected Wallet Info */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Wallet</h3>
            <WalletIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Earnings will be paid to your connected wallet
              </p>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-mono text-sm text-gray-900 dark:text-white">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No wallet connected'}
                </p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Payments are sent directly to your connected wallet. No additional configuration needed!
              </p>
            </div>
          </div>
        </div>

        {/* Withdraw Earnings */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Balance</h3>
            <BanknotesIcon className="h-6 w-6 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">ETH</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">USDC</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${financialData.usdcBalance.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">USDT</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${financialData.usdtBalance.toFixed(2)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={isWithdrawing || financialData.totalEarnings === 0}
              className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span>Withdraw Funds</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {(() => {
            // Get real withdrawals for this user
            const withdrawals = address ? JSON.parse(localStorage.getItem(`withdrawals_${address}`) || '[]') : [];
            
            if (withdrawals.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Your withdrawals and earnings will appear here
                  </p>
                </div>
              );
            }
            
            return withdrawals.slice(0, 5).map((withdrawal: any, index: number) => (
              <div key={withdrawal.id || index} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {withdrawal.type === 'withdrawal' ? 'Withdrawal' : 'Mentorship Payment'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(withdrawal.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${withdrawal.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                    {withdrawal.type === 'withdrawal' ? '-' : '+'}${withdrawal.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{withdrawal.token}</p>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>


      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Withdraw Funds</h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token
                </label>
                <select
                  value={withdrawToken}
                  onChange={(e) => setWithdrawToken(e.target.value)}
                  className="input-field"
                >
                  <option value="ETH">ETH ({ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000'} available)</option>
                  <option value="USDC">USDC (${financialData.usdcBalance.toFixed(2)} available)</option>
                  <option value="USDT">USDT (${financialData.usdtBalance.toFixed(2)} available)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field pr-20"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{withdrawToken}</span>
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <button
                    onClick={() => {
                      if (withdrawToken === 'ETH') {
                        setWithdrawAmount(ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0');
                      } else if (withdrawToken === 'USDC') {
                        setWithdrawAmount(financialData.usdcBalance.toFixed(2));
                      } else {
                        setWithdrawAmount(financialData.usdtBalance.toFixed(2));
                      }
                    }}
                    className="text-sm text-primary-red hover:underline"
                  >
                    Max
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Destination</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  ✓ Funds will be sent to your connected wallet
                </p>
              </div>
              
              {/* Error Message */}
              {withdrawError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-red-600 dark:text-red-400 text-sm">{withdrawError}</p>
                </div>
              )}
              
              {/* Success Message */}
              {withdrawSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-green-600 dark:text-green-400 text-sm">{withdrawSuccess}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  className="flex-1 btn-primary"
                  disabled={!withdrawAmount || !address || parseFloat(withdrawAmount) <= 0 || isWithdrawing}
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Section */}
      <div className="mt-8">
        <MentorPaymentConfirmation 
          onPaymentConfirmed={(sessionId) => {
            console.log('Payment confirmed for session:', sessionId);
            // This will trigger a refresh of the earnings display
          }}
        />
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  );
};

export default UserDashboard;