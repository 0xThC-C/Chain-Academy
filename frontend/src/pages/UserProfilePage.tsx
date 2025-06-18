import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon, UserIcon, AcademicCapIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useTheme } from '../contexts/ThemeContext';
import { useReviews, Review } from '../contexts/ReviewsContext';
import UserAvatar from '../components/UserAvatar';
import { getDisplayName } from '../utils/profileUtils';

interface UserProfile {
  address: string;
  name: string;
  role: 'mentor' | 'student' | 'both';
  rating: number;
  totalReviews: number;
  completedSessions: number;
  joinedDate: string;
  badges: string[];
  bio?: string;
  expertise?: string[];
}

const UserProfilePage: React.FC = () => {
  const { userAddress } = useParams<{ userAddress: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { 
    getReviewsByMentor, 
    getReviewsByStudent, 
    getUserRating,
    reviews
  } = useReviews();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [mentorReviews, setMentorReviews] = useState<Review[]>([]);
  const [studentReviews, setStudentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  useEffect(() => {
    if (userAddress) {
      fetchUserProfile();
      fetchUserReviews();
    }
  }, [userAddress, reviews]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    try {
      if (!userAddress) {
        setError('Invalid user address');
        return;
      }

      // Get user rating data from context
      const userRating = getUserRating(userAddress);
      const mentorReviewsData = getReviewsByMentor(userAddress);
      const studentReviewsData = getReviewsByStudent(userAddress);
      
      // Determine user role based on reviews
      const hasMentorReviews = mentorReviewsData.length > 0;
      const hasStudentReviews = studentReviewsData.length > 0;
      let role: 'mentor' | 'student' | 'both' = 'student';
      
      if (hasMentorReviews && hasStudentReviews) {
        role = 'both';
      } else if (hasMentorReviews) {
        role = 'mentor';
      }

      // Calculate total sessions (assuming each review represents a completed session)
      const totalSessions = mentorReviewsData.length + studentReviewsData.length;
      
      // Generate badges based on activity
      const badges: string[] = [];
      if (totalSessions >= 50) badges.push('50+ Sessions');
      else if (totalSessions >= 25) badges.push('25+ Sessions');
      else if (totalSessions >= 10) badges.push('10+ Sessions');
      
      if (userRating && userRating.averageRating >= 4.5) badges.push('Top Mentor');
      if (userRating && userRating.totalReviews >= 20) badges.push('Experienced');
      badges.push('Verified'); // All users are considered verified for now

      // Get user's bio from their saved profile
      const getUserBio = (address: string): string | undefined => {
        const savedProfile = localStorage.getItem(`profile_${address.toLowerCase()}`);
        if (savedProfile) {
          try {
            const profile = JSON.parse(savedProfile);
            return profile.bio;
          } catch (error) {
            console.error('Error parsing user profile:', error);
          }
        }
        return undefined;
      };

      const userBio = getUserBio(userAddress);

      const profile: UserProfile = {
        address: userAddress,
        name: getDisplayName(userAddress),
        role: role,
        rating: userRating?.averageRating || 0,
        totalReviews: userRating?.totalReviews || 0,
        completedSessions: totalSessions,
        joinedDate: '2024-01-01', // Default join date
        badges: badges,
        bio: userBio || `Blockchain enthusiast and ${role === 'both' ? 'mentor & student' : role} on Chain Academy.`,
        expertise: role === 'mentor' || role === 'both' ? ['Blockchain', 'Web3', 'Smart Contracts'] : undefined
      };
      
      setUserProfile(profile);
    } catch (err) {
      setError('Failed to load user profile');
    }
  };

  const fetchUserReviews = async () => {
    try {
      if (!userAddress) {
        setError('Invalid user address');
        return;
      }

      // Get reviews from context
      const mentorReviewsData = getReviewsByMentor(userAddress);
      const studentReviewsData = getReviewsByStudent(userAddress);

      setMentorReviews(mentorReviewsData);
      setStudentReviews(studentReviewsData);
    } catch (err) {
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="relative">
            {rating >= star ? (
              <StarIconSolid className="h-5 w-5 text-yellow-400" />
            ) : rating >= star - 0.5 ? (
              <div className="relative">
                <StarIcon className="h-5 w-5 text-gray-300" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <StarIconSolid className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
            ) : (
              <StarIcon className="h-5 w-5 text-gray-300" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatReviewDate = (review: Review) => {
    // Use sessionDate if available, otherwise use timestamp
    const dateString = review.sessionDate || review.timestamp;
    return formatDate(dateString);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRoleBadgeClasses = (role: 'mentor' | 'student' | 'both') => {
    switch (role) {
      case 'mentor':
        return isDarkMode 
          ? 'bg-blue-900 text-blue-200 border-blue-700' 
          : 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student':
        return isDarkMode 
          ? 'bg-green-900 text-green-200 border-green-700' 
          : 'bg-green-100 text-green-800 border-green-200';
      case 'both':
        return isDarkMode 
          ? 'bg-purple-900 text-purple-200 border-purple-700' 
          : 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return isDarkMode 
          ? 'bg-gray-800 text-gray-200 border-gray-600' 
          : 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-primary-600 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/reviews')}
            className={`flex items-center mx-auto transition-colors duration-200 ${
              isDarkMode 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-blue-500 hover:text-blue-600'
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Reviews
          </button>
        </div>
      </div>
    );
  }

  const reviewsToShow = activeTab === 'received' ? mentorReviews : studentReviews;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/reviews')}
          className={`mb-6 flex items-center transition-colors duration-200 ${
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-100' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Reviews
        </button>

        {/* User Profile Header */}
        <div className={`rounded-lg shadow-lg p-8 mb-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <UserAvatar 
                address={userProfile.address} 
                size="xl" 
                className="ring-4 ring-primary-600 ring-opacity-50"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {userProfile.name}
                </h1>
                {userProfile.badges.includes('Verified') && (
                  <ShieldCheckIcon className="h-6 w-6 text-blue-500" title="Verified User" />
                )}
              </div>
              
              <p className={`mb-4 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {truncateAddress(userProfile.address)}
              </p>

              {/* Role Badge */}
              <div className="flex items-center gap-2 mb-4">
                {userProfile.role === 'mentor' || userProfile.role === 'both' ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeClasses('mentor')}`}>
                    <AcademicCapIcon className="h-4 w-4 mr-1" />
                    Mentor
                  </span>
                ) : null}
                {userProfile.role === 'student' || userProfile.role === 'both' ? (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeClasses('student')}`}>
                    <UserIcon className="h-4 w-4 mr-1" />
                    Student
                  </span>
                ) : null}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Rating</p>
                  <div className="flex items-center gap-2">
                    {renderStars(userProfile.rating)}
                    <span className={`text-lg font-semibold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {userProfile.rating > 0 ? userProfile.rating.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Total Reviews</p>
                  <p className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {userProfile.totalReviews}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>Completed Sessions</p>
                  <p className={`text-lg font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {userProfile.completedSessions}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {userProfile.bio && (
                <div className="mb-6">
                  <h3 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>About</h3>
                  <p className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{userProfile.bio}</p>
                </div>
              )}

              {/* Expertise */}
              {userProfile.expertise && userProfile.expertise.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className={`rounded-lg shadow-lg p-8 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Reviews</h2>

          {/* Tab Navigation */}
          {userProfile.role === 'both' && (
            <div className={`border-b mb-6 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('received')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'received'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : `border-transparent ${
                          isDarkMode 
                            ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`
                  }`}
                >
                  Reviews as Mentor ({mentorReviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('given')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'given'
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : `border-transparent ${
                          isDarkMode 
                            ? 'text-gray-400 hover:text-gray-300 hover:border-gray-600' 
                            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`
                  }`}
                >
                  Reviews as Student ({studentReviews.length})
                </button>
              </nav>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-6">
            {reviewsToShow.length === 0 ? (
              <div className={`text-center py-12 ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
              } rounded-lg`}>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                } flex items-center justify-center`}>
                  <StarIcon className={`w-8 h-8 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                </div>
                <h3 className={`text-lg font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  No reviews yet
                </h3>
                <p className={`${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Reviews will appear here after completed mentorship sessions
                </p>
              </div>
            ) : (
              reviewsToShow.map((review) => (
                <div
                  key={review.id}
                  className={`border-b pb-6 last:border-0 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className={`font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {review.sessionTitle}
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {activeTab === 'received' 
                          ? `Reviewed by ${review.studentName || getDisplayName(review.studentAddress)}`
                          : `Mentor: ${review.mentorName || getDisplayName(review.mentorAddress)}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      {renderStars(review.rating)}
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatReviewDate(review)}
                      </p>
                    </div>
                  </div>
                  <p className={`${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>{review.feedback}</p>
                  {review.confirmReceived && (
                    <div className={`mt-2 flex items-center text-sm ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      <ShieldCheckIcon className="h-4 w-4 mr-1" />
                      Confirmed Review
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;