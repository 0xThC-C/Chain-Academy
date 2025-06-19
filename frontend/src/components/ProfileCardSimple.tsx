import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useReviews } from '../contexts/ReviewsContext';
import { getDisplayName, getUserBio, formatAddress } from '../utils/profileUtils';
import UserAvatar from './UserAvatar';
import {
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface ProfileCardSimpleProps {
  userAddress: string;
  userRole: 'mentor' | 'student' | 'both';
  showRecentOnly?: boolean;
  maxRecentReviews?: number;
}

const ProfileCardSimple: React.FC<ProfileCardSimpleProps> = ({
  userAddress,
  userRole,
  showRecentOnly = true,
  maxRecentReviews = 3
}) => {
  const { isDarkMode } = useTheme();
  const { getReviewsByMentor, getReviewsByStudent, getAverageRatingForMentor } = useReviews();
  
  // Self-controlled expansion state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get user profile data
  const displayName = getDisplayName(userAddress);
  const bio = getUserBio(userAddress);
  
  // Determine user badge based on role and stats
  const getUserBadge = (mentorRating: number, totalMentorReviews: number, totalStudentReviews: number) => {
    if (userRole === 'mentor' && totalMentorReviews >= 10 && mentorRating >= 4.5) {
      return { text: 'Top Mentor', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
    }
    if (userRole === 'mentor' && totalMentorReviews >= 5) {
      return { text: 'Verified Mentor', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    }
    if (totalStudentReviews >= 5) {
      return { text: 'Active Student', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    }
    return null;
  };
  
  // Calculate user statistics
  const userStats = useMemo(() => {
    const mentorReviews = getReviewsByMentor(userAddress);
    const studentReviews = getReviewsByStudent(userAddress);
    
    const mentorRating = getAverageRatingForMentor(userAddress);
    const totalMentorReviews = mentorReviews.length;
    const totalStudentReviews = studentReviews.length;
    
    return {
      mentorRating,
      totalMentorReviews,
      totalStudentReviews,
      allReviews: [...mentorReviews, ...studentReviews].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    };
  }, [userAddress, getReviewsByMentor, getReviewsByStudent, getAverageRatingForMentor]);

  // Get reviews to display
  const displayReviews = useMemo(() => {
    if (!isExpanded) return [];
    return showRecentOnly 
      ? userStats.allReviews.slice(0, maxRecentReviews)
      : userStats.allReviews;
  }, [userStats.allReviews, showRecentOnly, isExpanded, maxRecentReviews]);

  // Get badge for this user
  const badge = getUserBadge(userStats.mentorRating, userStats.totalMentorReviews, userStats.totalStudentReviews);

  // Render star rating
  const renderStars = (rating: number, size: string = 'w-4 h-4') => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star}>
            {star <= Math.floor(rating) ? (
              <StarSolidIcon className={`${size} text-yellow-400`} />
            ) : star - 0.5 <= rating ? (
              <div className="relative">
                <StarIcon className={`${size} text-gray-300`} />
                <div className="absolute inset-0 overflow-hidden w-1/2">
                  <StarSolidIcon className={`${size} text-yellow-400`} />
                </div>
              </div>
            ) : (
              <StarIcon className={`${size} text-gray-300`} />
            )}
          </div>
        ))}
        <span className={`ml-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  // Format date
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`rounded-lg border ${
      isDarkMode 
        ? 'bg-black border-gray-700 hover:border-gray-600' 
        : 'bg-white border-gray-200 hover:border-gray-300'
    } ${isExpanded ? 'shadow-lg' : 'shadow hover:shadow-md'}`}>
      
      {/* Compact Profile Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <UserAvatar 
              address={userAddress} 
              size="md" 
              className="flex-shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`text-base font-semibold truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {displayName || 'Unknown User'}
                </h3>
                {badge && (
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
                    {badge.text}
                  </span>
                )}
              </div>
              
              <p className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {formatAddress(userAddress)}
              </p>
              
              {/* Show bio only when expanded */}
              {isExpanded && bio && (
                <p className={`text-xs mt-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {bio}
                </p>
              )}
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {userStats.allReviews.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                isDarkMode 
                  ? 'hover:bg-gray-800 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Compact Stats Line */}
        {(userStats.totalMentorReviews > 0 || userStats.totalStudentReviews > 0) && (
          <div className="mt-3 flex items-center space-x-2">
            {userStats.totalMentorReviews > 0 ? (
              <>
                <AcademicCapIcon className={`w-3 h-3 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <div className="flex items-center space-x-1">
                  {renderStars(userStats.mentorRating, 'w-3 h-3')}
                  <span className={`text-xs font-medium ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {userStats.mentorRating.toFixed(1)}
                  </span>
                </div>
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {userStats.totalMentorReviews} mentor review{userStats.totalMentorReviews !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                <UserIcon className={`w-3 h-3 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} />
                <span className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {userStats.totalStudentReviews} review{userStats.totalStudentReviews !== 1 ? 's' : ''} given
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Divider Line */}
      <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />

      {/* Expanded Content */}
      {isExpanded && userStats.allReviews.length > 0 && (
        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-4">
            <h4 className={`text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Recent Reviews ({displayReviews.length})
            </h4>
            
            <div className="space-y-3">
              {displayReviews.map((review) => {
                const isUserMentor = review.mentorAddress.toLowerCase() === userAddress.toLowerCase();
                const otherPartyAddress = isUserMentor ? review.studentAddress : review.mentorAddress;
                const otherPartyName = getDisplayName(otherPartyAddress);
                
                return (
                  <div
                    key={review.id}
                    className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <UserAvatar 
                          address={otherPartyAddress} 
                          size="sm" 
                          className="flex-shrink-0" 
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {isUserMentor 
                              ? `Review from ${otherPartyName || 'Student'}`
                              : `Review for ${otherPartyName || 'Mentor'}`
                            }
                          </p>
                          <p className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {review.sessionTitle}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {renderStars(review.rating, 'w-3 h-3')}
                        {review.confirmReceived ? (
                          <CheckCircleIcon className="w-3 h-3 text-green-500 ml-1" />
                        ) : (
                          <ClockIcon className="w-3 h-3 text-yellow-500 ml-1" />
                        )}
                      </div>
                    </div>
                    
                    {review.feedback && (
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        "{review.feedback}"
                      </p>
                    )}
                    
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {formatDate(review.timestamp)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCardSimple;