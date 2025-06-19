import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReviews } from '../contexts/ReviewsContext';
import { useAccount } from 'wagmi';
import { 
  StarIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import UserAvatar from '../components/UserAvatar';
import SelfBookingErrorModal from '../components/SelfBookingErrorModal';
import { useCurrencyConverter } from '../hooks/useCurrencyConverter';

interface Mentor {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  sessionsCompleted: number;
  priceUSDC: number;
  priceETH?: number; // ULTRATHINK: Added ETH pricing
  preferredToken: 'USDC' | 'ETH'; // ULTRATHINK: Mentor's preferred payment token
  duration: number;
  category: string;
  skills: string[];
  isOnline: boolean;
  responseTime: string;
  mentorAddress?: string;
  prerequisites?: string;
}

const MentorshipGallery: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, address } = useAccount();
  const { getUserRating, getAverageRatingForMentor, getReviewsByMentor } = useReviews();
  const { formatPrice, areRatesStale, refreshRates } = useCurrencyConverter(); // ULTRATHINK: Currency conversion
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  
  // Self-booking error modal state
  const [showSelfBookingError, setShowSelfBookingError] = useState(false);
  const [selfBookingMentorName, setSelfBookingMentorName] = useState('');

  // Helper function to format duration
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  };
  
  // Force update existing mentorships on component mount
  React.useEffect(() => {
    const forceUpdateMentorships = () => {
      const globalMentorships = JSON.parse(localStorage.getItem('global_mentorships') || '[]');
      let hasUpdates = false;

      const updatedMentorships = globalMentorships.map((mentorship: any) => {
        let updated = { ...mentorship };
        
        // Force update name if it contains 0x (wallet address)
        if (mentorship.mentorAddress && (!mentorship.mentorName || mentorship.mentorName.includes('0x'))) {
          const savedProfile = localStorage.getItem(`profile_${mentorship.mentorAddress.toLowerCase()}`);
          if (savedProfile) {
            try {
              const profile = JSON.parse(savedProfile);
              if (profile.displayName) {
                updated.mentorName = profile.displayName;
                hasUpdates = true;
                console.log(`🔄 FORCE UPDATE: ${mentorship.mentorAddress} → ${profile.displayName}`);
              }
            } catch (error) {
              console.error('Error parsing profile:', error);
            }
          }
        }

        // Force update bio if missing
        if (mentorship.mentorAddress && !mentorship.mentorBio) {
          const savedProfile = localStorage.getItem(`profile_${mentorship.mentorAddress.toLowerCase()}`);
          if (savedProfile) {
            try {
              const profile = JSON.parse(savedProfile);
              if (profile.bio) {
                updated.mentorBio = profile.bio;
                hasUpdates = true;
                console.log(`🔄 FORCE UPDATE BIO: ${mentorship.mentorAddress}`);
              }
            } catch (error) {
              console.error('Error parsing profile:', error);
            }
          }
        }

        return updated;
      });

      if (hasUpdates) {
        console.log('💾 FORCE SAVING updated mentorships');
        localStorage.setItem('global_mentorships', JSON.stringify(updatedMentorships));
      }
    };

    // Run force update on mount
    forceUpdateMentorships();
  }, []);
  
  // Booking modal states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const categories = [
    'all',
    'Smart Contracts',
    'DeFi',
    'NFTs',
    'Blockchain Development',
    'Trading',
    'Security',
    'Other'
  ];

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'all': return 'All Categories';
      case 'Smart Contracts': return 'Smart Contracts';
      case 'DeFi': return 'DeFi';
      case 'NFTs': return 'NFTs';
      case 'Blockchain Development': return 'Blockchain Development';
      case 'Trading': return 'Trading';
      case 'Security': return 'Security';
      case 'Other': return 'Other';
      default: return category;
    }
  };

  // Load mentorships from localStorage and combine with mock data
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);

  React.useEffect(() => {
    const loadMentorships = () => {
      // Get created mentorships from localStorage
      const globalMentorships = JSON.parse(localStorage.getItem('global_mentorships') || '[]');
      
      // No mock mentors - only show real user-created mentorships

      // Helper function to get mentor display name from profile
      const getMentorDisplayName = (mentorship: any): string => {
        // First try: use saved mentorName
        if (mentorship.mentorName) return mentorship.mentorName;
        
        // Second try: load from profile using mentorAddress
        if (mentorship.mentorAddress) {
          try {
            const savedProfile = localStorage.getItem(`profile_${mentorship.mentorAddress.toLowerCase()}`);
            if (savedProfile) {
              const profile = JSON.parse(savedProfile);
              if (profile.displayName) {
                console.log(`👤 Found profile name for ${mentorship.mentorAddress}: ${profile.displayName}`);
                return profile.displayName;
              }
            }
          } catch (error) {
            console.error('Error loading mentor profile:', error);
          }
        }
        
        // Fallback: truncated wallet address
        return mentorship.mentorAddress ? 
          `${mentorship.mentorAddress.slice(0, 6)}...${mentorship.mentorAddress.slice(-4)}` : 
          'Unknown Mentor';
      };

      // Helper function to get mentor bio from profile
      const getMentorBio = (mentorship: any): string => {
        // First try: use saved mentorBio if exists
        if (mentorship.mentorBio) return mentorship.mentorBio;
        
        // Second try: load from profile using mentorAddress
        if (mentorship.mentorAddress) {
          try {
            const savedProfile = localStorage.getItem(`profile_${mentorship.mentorAddress.toLowerCase()}`);
            if (savedProfile) {
              const profile = JSON.parse(savedProfile);
              if (profile.bio) {
                console.log(`👤 Found profile bio for ${mentorship.mentorAddress}:`, profile.bio.substring(0, 50) + '...');
                return profile.bio;
              }
            }
          } catch (error) {
            console.error('Error loading mentor profile:', error);
          }
        }
        
        // Fallback: use mentorship description
        return mentorship.description || 'No bio available';
      };

      // Update existing mentorships with profile data if missing
      const updatedGlobalMentorships = globalMentorships.map((mentorship: any) => {
        let updatedMentorship = { ...mentorship };

        // Update mentorName if missing or outdated
        if ((!mentorship.mentorName || mentorship.mentorName.includes('0x')) && mentorship.mentorAddress) {
          const newName = getMentorDisplayName(mentorship);
          if (newName !== mentorship.mentorName) {
            updatedMentorship.mentorName = newName;
            console.log(`🔄 Updating mentor name for ${mentorship.mentorAddress}: ${newName}`);
          }
        }

        // Update mentorBio if missing
        if (!mentorship.mentorBio && mentorship.mentorAddress) {
          const newBio = getMentorBio(mentorship);
          if (newBio && newBio !== mentorship.description) {
            updatedMentorship.mentorBio = newBio;
            console.log(`🔄 Updating mentor bio for ${mentorship.mentorAddress}`);
          }
        }

        return updatedMentorship;
      });

      // Save updated mentorships if any changes were made
      const hasChanges = updatedGlobalMentorships.some((mentorship: any, index: number) => 
        JSON.stringify(mentorship) !== JSON.stringify(globalMentorships[index])
      );

      if (hasChanges) {
        console.log('💾 Saving updated mentorships with profile data');
        localStorage.setItem('global_mentorships', JSON.stringify(updatedGlobalMentorships));
      }

      // Convert created mentorships to Mentor format
      const userCreatedMentors: Mentor[] = updatedGlobalMentorships.map((mentorship: any) => {
        const mentorAddress = mentorship.mentorAddress;
        const realRating = mentorAddress ? getAverageRatingForMentor(mentorAddress) : 0;
        const reviewsForMentor = mentorAddress ? getReviewsByMentor(mentorAddress) : [];
        
        return {
          id: mentorship.id,
          name: getMentorDisplayName(mentorship),
          bio: getMentorBio(mentorship),
          title: mentorship.title,
          description: mentorship.description,
          rating: realRating, // Use real rating from reviews
          reviewCount: reviewsForMentor.length, // Use real review count
          sessionsCompleted: mentorship.sessionsCompleted || 0,
          priceUSDC: mentorship.priceUSDC,
          priceETH: mentorship.priceETH, // ULTRATHINK: Add ETH pricing
          preferredToken: mentorship.preferredToken || 'USDC', // ULTRATHINK: Default to USDC
          duration: mentorship.duration,
          category: mentorship.category,
          skills: mentorship.skills || [],
          isOnline: mentorship.isOnline !== undefined ? mentorship.isOnline : true,
          responseTime: mentorship.responseTime || '< 1 hour',
          mentorAddress: mentorship.mentorAddress, // Add mentor address for profile image lookup
          prerequisites: mentorship.prerequisites // Add prerequisites from mentorship data
        };
      });

      // Only show real user-created mentors
      setAllMentors(userCreatedMentors);
    };

    loadMentorships();

    // Listen for localStorage changes to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'global_mentorships') {
        loadMentorships();
      }
      // Also reload when any profile changes to update mentor names
      if (e.key?.startsWith('profile_')) {
        console.log('👤 Profile updated, reloading mentorships to update names');
        loadMentorships();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filteredMentors = allMentors.filter(mentor => {
    const matchesSearch = mentor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mentor.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || mentor.category === selectedCategory;
    
    const matchesPrice = priceRange === 'all' ||
                        (priceRange === 'low' && mentor.priceUSDC <= 50) ||
                        (priceRange === 'medium' && mentor.priceUSDC > 50 && mentor.priceUSDC <= 80) ||
                        (priceRange === 'high' && mentor.priceUSDC > 80);
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const sortedMentors = [...filteredMentors].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'price_low':
        return a.priceUSDC - b.priceUSDC;
      case 'price_high':
        return b.priceUSDC - a.priceUSDC;
      case 'sessions':
        return b.sessionsCompleted - a.sessionsCompleted;
      default:
        return 0;
    }
  });

  // Booking modal functions
  const handleBookSession = (mentor: Mentor) => {
    // Prevent mentors from booking their own sessions
    if (address && mentor.mentorAddress && 
        address.toLowerCase() === mentor.mentorAddress.toLowerCase()) {
      setSelfBookingMentorName(mentor.name);
      setShowSelfBookingError(true);
      return;
    }
    
    setSelectedMentor(mentor);
    setShowBookingModal(true);
    setSelectedDate(new Date());
    setSelectedTime('');
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setSelectedMentor(null);
    setSelectedTime('');
  };

  // Available time slots (24-hour format)
  const timeSlots = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  // Calculate platform fee (10%)
  const calculateTotal = (price: number) => {
    const platformFee = price * 0.1;
    const total = price + platformFee;
    return { price, platformFee, total };
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isDateAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // Check if a specific time slot is available for the selected mentor
  const isTimeSlotAvailable = React.useCallback((date: Date, time: string) => {
    if (!selectedMentor) return true;

    try {
      // Check if the time slot has already passed for today
      const now = new Date();
      const selectedDateString = date.toISOString().split('T')[0];
      const todayString = now.toISOString().split('T')[0];
      
      if (selectedDateString === todayString) {
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;
        
        // Create a fresh date object for the time comparison to avoid modifying the original date
        const timeSlotDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
        
        // If the time slot is in the past, it's not available
        // Add 1 minute buffer to account for clock differences
        const nowWithBuffer = new Date(now.getTime() + 60000);
        if (timeSlotDate <= nowWithBuffer) {
          return false;
        }
      }

      // Get all booked sessions safely
      let allBookings = [];
      try {
        const bookingsData = localStorage.getItem('mentorship_bookings');
        allBookings = bookingsData ? JSON.parse(bookingsData) : [];
      } catch (error) {
        console.warn('Error parsing bookings from localStorage:', error);
        return true; // If there's an error, assume slot is available
      }
      
      // Check for time conflicts considering session duration
      const sessionDurationMinutes = selectedMentor.duration || 60;
      const [startHours, startMinutes] = time.split(':').map(Number);
      if (isNaN(startHours) || isNaN(startMinutes)) return false;
      
      // Create start and end times for the new session
      const newSessionStart = startHours * 60 + startMinutes; // Convert to minutes from midnight
      const newSessionEnd = newSessionStart + sessionDurationMinutes;
      
      // Check if there's a booking conflict for this mentor at this date/time
      const conflictingBooking = allBookings.find((booking: any) => {
        if (!booking || typeof booking !== 'object') return false;
        
        const isSameMentor = (
          booking.mentorAddress === (selectedMentor as any).mentorAddress || // If mentor has an address field
          booking.mentorName === selectedMentor.name || // Fallback to name comparison
          booking.mentorId === selectedMentor.id
        );
        
        const isSameDate = booking.date === selectedDateString;
        const isUpcoming = booking.status === 'upcoming';
        
        if (!isSameMentor || !isSameDate || !isUpcoming) {
          return false;
        }
        
        // Calculate existing booking time range
        if (!booking.time || typeof booking.time !== 'string') return false;
        
        const timeMatch = booking.time.match(/^(\d{1,2}):(\d{2})$/);
        if (!timeMatch) return false;
        
        const existingHours = parseInt(timeMatch[1], 10);
        const existingMinutes = parseInt(timeMatch[2], 10);
        
        if (isNaN(existingHours) || isNaN(existingMinutes)) return false;
        
        const existingSessionStart = existingHours * 60 + existingMinutes;
        const existingSessionDuration = booking.duration || 60; // Default to 60 minutes if not specified
        const existingSessionEnd = existingSessionStart + existingSessionDuration;
        
        // Check for overlap: sessions overlap if one starts before the other ends
        const hasOverlap = (
          (newSessionStart < existingSessionEnd && newSessionEnd > existingSessionStart)
        );
        
        return hasOverlap;
      });

      return !conflictingBooking;
    } catch (error) {
      console.warn('Error in isTimeSlotAvailable:', error);
      return true; // If there's an error, assume slot is available
    }
  }, [selectedMentor]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (isDateAvailable(newDate)) {
      setSelectedDate(newDate);
    }
  };

  const handlePayment = () => {
    if (!selectedMentor || !selectedTime) return;
    
    // Create booking data to pass to payment page
    const bookingData = {
      mentor: {
        id: selectedMentor.id,
        name: selectedMentor.name,
        title: selectedMentor.title,
        description: selectedMentor.description,
        priceUSDC: selectedMentor.priceUSDC,
        duration: selectedMentor.duration,
        category: selectedMentor.category,
        skills: selectedMentor.skills,
        mentorAddress: selectedMentor.mentorAddress,
        prerequisites: selectedMentor.prerequisites, // Get prerequisites from mentorship data
      },
      date: selectedDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
      time: selectedTime,
      student: address || '',
    };

    // Close modal and navigate to payment page
    closeBookingModal();
    
    // Navigate to payment page with booking data
    navigate('/payment', { state: { bookingData } });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star}>
            {star <= Math.floor(rating) ? (
              <StarSolidIcon className="h-4 w-4 text-yellow-400" />
            ) : star === Math.ceil(rating) && rating % 1 !== 0 ? (
              <StarSolidIcon className="h-4 w-4 text-yellow-400" />
            ) : (
              <StarIcon className="h-4 w-4 text-gray-300" />
            )}
          </div>
        ))}
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
          {rating}
        </span>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to access mentors
          </p>
          <div className="flex justify-center">
            <WalletConnectionV2 />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Find Mentors
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Connect with community mentors to accelerate your blockchain learning journey
          </p>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search mentors by expertise, technology, or keywords..."
                className="pl-10 input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="input-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>

            {/* Price Range */}
            <select
              className="input-field"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
            >
              <option value="all">All Prices</option>
              <option value="low">$1 - $50</option>
              <option value="medium">$51 - $80</option>
              <option value="high">$81+</option>
            </select>

            {/* Sort By */}
            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="sessions">Most Sessions</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            Showing {sortedMentors.length} {sortedMentors.length !== 1 ? 'mentorships' : 'mentorship'}
          </p>
        </div>

        {/* Mentor Cards Grid */}
        {sortedMentors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Mentorships Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {allMentors.length === 0 
                ? "Be the first to create a mentorship! Go to Dashboard → Create Mentorship to get started."
                : "No mentorships match your current filters. Try adjusting your search criteria."
              }
            </p>
            {allMentors.length === 0 && isConnected && (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary"
              >
                Create First Mentorship
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sortedMentors.map((mentor) => (
            <div key={mentor.id} className="card p-6 hover:shadow-xl transition-shadow duration-300">
              {/* Mentor Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {mentor.mentorAddress ? (
                    <UserAvatar address={mentor.mentorAddress} size="md" className="" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {mentor.name}
                    </h3>
                    {/* Bio from profile */}
                    {mentor.bio && mentor.bio !== mentor.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">
                        {mentor.bio}
                      </p>
                    )}
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        mentor.isOnline ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {mentor.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-gray-100 dark:bg-neutral-700 text-xs font-medium text-gray-600 dark:text-gray-300 rounded">
                  {mentor.category}
                </span>
              </div>

              {/* Session Title */}
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {mentor.title}
              </h4>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                {mentor.description}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {mentor.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-red-600/10 text-red-600 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Rating and Stats */}
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  {(() => {
                    // Get dynamic rating if mentor has address, otherwise use static rating
                    const dynamicRating = mentor.mentorAddress ? getUserRating(mentor.mentorAddress) : null;
                    const displayRating = dynamicRating ? dynamicRating.averageRating : mentor.rating;
                    const reviewCount = dynamicRating ? dynamicRating.totalReviews : mentor.reviewCount;
                    
                    return (
                      <div>
                        {renderStars(displayRating)}
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{displayRating.toFixed(1)}</span>
                          <span>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                          {dynamicRating && (
                            <span className="text-green-600 dark:text-green-400 font-medium">• Live</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                    <span>{mentor.sessionsCompleted} sessions</span>
                    <span>Responds in {mentor.responseTime}</span>
                  </div>
                </div>
              </div>

              {/* Session Details with Currency Conversion */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{formatDuration(mentor.duration)}</span>
                </div>
                <div className="flex flex-col items-end">
                  {(() => {
                    // ULTRATHINK: Dynamic pricing with conversion
                    const price = mentor.preferredToken === 'ETH' ? mentor.priceETH || 0.05 : mentor.priceUSDC;
                    const formatted = formatPrice(price, mentor.preferredToken);
                    
                    return (
                      <>
                        <div className="flex items-center space-x-1">
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span className="font-semibold">{formatted.displayPrice}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatted.equivalentPrice}
                        </span>
                        {areRatesStale() && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              refreshRates();
                            }}
                            className="text-xs text-yellow-600 hover:text-yellow-700 underline"
                          >
                            Update rates
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Book Session Button */}
              <button 
                onClick={() => handleBookSession(mentor)}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Book Session</span>
              </button>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto my-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Book Session
              </h2>
              <button
                onClick={closeBookingModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Date & Time Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Select Date and Time
                  </h3>

                  {/* Calendar */}
                  <div className="card p-4 mb-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handlePreviousMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, index) => (
                        <div key={`empty-${index}`} className="h-10"></div>
                      ))}

                      {/* Days of the month */}
                      {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, index) => {
                        const day = index + 1;
                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const isAvailable = isDateAvailable(date);
                        const isSelected = selectedDate.getDate() === day && 
                                         selectedDate.getMonth() === currentMonth.getMonth() &&
                                         selectedDate.getFullYear() === currentMonth.getFullYear();

                        return (
                          <button
                            key={day}
                            onClick={() => handleDateSelect(day)}
                            disabled={!isAvailable}
                            className={`h-10 w-10 text-sm rounded-lg border transition-colors ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-600'
                                : isAvailable
                                ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed border-gray-100 dark:border-gray-700'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Selection */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                      Available Times
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {timeSlots.map((time) => {
                        const isSlotAvailable = isTimeSlotAvailable(selectedDate, time);
                        
                        // Generate tooltip message for unavailable slots
                        const getTooltipMessage = () => {
                          if (isSlotAvailable) return '';
                          
                          try {
                            const now = new Date();
                            const selectedDateString = selectedDate.toISOString().split('T')[0];
                            const todayString = now.toISOString().split('T')[0];
                            
                            if (selectedDateString === todayString) {
                              const [hours, minutes] = time.split(':').map(Number);
                              if (!isNaN(hours) && !isNaN(minutes)) {
                                const timeSlotDate = new Date();
                                timeSlotDate.setHours(hours, minutes, 0, 0);
                                
                                if (timeSlotDate <= now) {
                                  return 'This time has already passed';
                                }
                              }
                            }
                            
                            return `This time slot conflicts with an existing ${selectedMentor?.duration || 60}-minute session`;
                          } catch (error) {
                            console.warn('Error generating tooltip message:', error);
                            return 'This time slot is unavailable';
                          }
                        };
                        
                        return (
                          <button
                            key={time}
                            onClick={() => isSlotAvailable && setSelectedTime(time)}
                            disabled={!isSlotAvailable}
                            className={`p-3 text-sm rounded-lg border transition-colors relative ${
                              selectedTime === time
                                ? 'bg-red-600 text-white border-red-600'
                                : !isSlotAvailable
                                ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 cursor-not-allowed'
                                : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}
                            title={getTooltipMessage()}
                          >
                            {time}
                            {!isSlotAvailable && (
                              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Times shown in your local timezone. Unavailable slots are either booked or have passed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Session Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Session Summary
                  </h3>

                  <div className="card p-6 mb-6">
                    {/* Mentor Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      {selectedMentor.mentorAddress ? (
                        <UserAvatar address={selectedMentor.mentorAddress} size="md" className="" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {selectedMentor.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedMentor.category}
                        </p>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                          Session Topic
                        </h5>
                        <p className="text-gray-600 dark:text-gray-300">
                          {selectedMentor.title}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Duration
                          </h5>
                          <p className="text-gray-600 dark:text-gray-300">
                            {formatDuration(selectedMentor.duration)}
                          </p>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Rating
                          </h5>
                          <div className="flex items-center space-x-1">
                            <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {selectedMentor.rating} ({selectedMentor.reviewCount})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                          Skills Covered
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedMentor.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-1 bg-red-600/10 text-red-600 text-xs rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {selectedDate && selectedTime && (
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                            Scheduled For
                          </h5>
                          <p className="text-gray-600 dark:text-gray-300">
                            {formatDate(selectedDate)} at {selectedTime}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                        Payment Details
                      </h5>
                      
                      {(() => {
                        const { price, platformFee, total } = calculateTotal(selectedMentor.priceUSDC);
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300">Session Price</span>
                              <span className="text-gray-900 dark:text-white">{price} USDC</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-300">Platform Fee</span>
                              <span className="text-gray-900 dark:text-white">{platformFee.toFixed(2)} USDC</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                              <span className="text-gray-900 dark:text-white">Total</span>
                              <span className="text-gray-900 dark:text-white">{total.toFixed(2)} USDC</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handlePayment}
                    disabled={!selectedTime}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      !selectedTime
                        ? 'bg-gray-300 dark:bg-neutral-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    Continue to Payment
                  </button>

                  {!selectedTime && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
                      Please select a date and time to continue
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Self Booking Error Modal */}
      <SelfBookingErrorModal
        isOpen={showSelfBookingError}
        onClose={() => setShowSelfBookingError(false)}
        mentorName={selfBookingMentorName}
      />
    </div>
  );
};

export default MentorshipGallery;