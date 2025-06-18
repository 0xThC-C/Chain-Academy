import React, { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useReviews, Review } from '../contexts/ReviewsContext';
import { useTheme } from '../contexts/ThemeContext';
import { getReviewRelationshipText, formatAddress, getDisplayName } from '../utils/profileUtils';
import WalletConnectionV2 from '../components/WalletConnectionV2';
import UserAvatar from '../components/UserAvatar';
import UserProfileGrid from '../components/UserProfileGrid';
import {
  StarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

type SortOption = 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating';
type FilterOption = 'all' | '5-star' | '4-star' | '3-star' | '2-star' | '1-star';
type TabOption = 'reviews' | 'profiles';

const ReviewsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { isConnected, address } = useAccount();
  const {
    reviews,
    userRatings,
    getTotalReviewsCount,
    searchReviews,
    getUniqueUsers,
    getReviewsByMentor,
    getReviewsByStudent
  } = useReviews();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>('reviews');

  // Get unique users with their roles
  const uniqueUsersWithRoles = useMemo(() => {
    const uniqueUsers = getUniqueUsers();
    return uniqueUsers.map(userAddress => {
      const mentorReviews = getReviewsByMentor(userAddress);
      const studentReviews = getReviewsByStudent(userAddress);
      
      let role: 'mentor' | 'student' | 'both' = 'student';
      if (mentorReviews.length > 0 && studentReviews.length > 0) {
        role = 'both';
      } else if (mentorReviews.length > 0) {
        role = 'mentor';
      }
      
      return {
        address: userAddress,
        role,
        totalReviews: mentorReviews.length + studentReviews.length,
        lastActivity: Math.max(
          ...mentorReviews.map(r => new Date(r.timestamp).getTime()),
          ...studentReviews.map(r => new Date(r.timestamp).getTime()),
          0
        )
      };
    }).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [getUniqueUsers, getReviewsByMentor, getReviewsByStudent]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReviews = getTotalReviewsCount();
    const confirmedReviews = reviews.filter(r => r.confirmReceived).length;
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    return {
      totalReviews,
      confirmedReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution
    };
  }, [reviews, getTotalReviewsCount]);

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let filteredReviews = reviews;

    // Apply search filter
    if (searchQuery.trim()) {
      filteredReviews = searchReviews(searchQuery);
    }

    // Apply filter
    switch (filterBy) {
      case '5-star':
        filteredReviews = filteredReviews.filter(r => r.rating === 5);
        break;
      case '4-star':
        filteredReviews = filteredReviews.filter(r => r.rating === 4);
        break;
      case '3-star':
        filteredReviews = filteredReviews.filter(r => r.rating === 3);
        break;
      case '2-star':
        filteredReviews = filteredReviews.filter(r => r.rating === 2);
        break;
      case '1-star':
        filteredReviews = filteredReviews.filter(r => r.rating === 1);
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filteredReviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'oldest':
        filteredReviews.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'highest-rating':
        filteredReviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest-rating':
        filteredReviews.sort((a, b) => a.rating - b.rating);
        break;
    }

    return filteredReviews;
  }, [reviews, searchQuery, sortBy, filterBy, searchReviews]);

  const renderStars = (rating: number, size: string = 'w-4 h-4') => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star}>
            {star <= rating ? (
              <StarSolidIcon className={`${size} text-yellow-400`} />
            ) : (
              <StarIcon className={`${size} ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };


  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-red rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your wallet to access reviews
          </p>
          <div className="flex justify-center">
            <WalletConnectionV2 />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} bg-gradient-to-r ${isDarkMode ? 'from-gray-900 to-black' : 'from-gray-50 to-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {activeTab === 'reviews' ? 'Reviews & Ratings' : 'User Profiles'}
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {activeTab === 'reviews' 
                  ? 'View all mentorship session evaluations and ratings'
                  : 'Browse user profiles and their review history'
                }
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <ChartBarIcon className="w-6 h-6 text-red-500" />
                <span className="text-2xl font-bold">{stats.averageRating}</span>
                {renderStars(Math.round(stats.averageRating), 'w-5 h-5')}
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Based on {stats.totalReviews} reviews
              </p>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 -mb-px">
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'reviews'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : isDarkMode
                  ? 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span>Reviews ({stats.totalReviews})</span>
            </button>
            
            <button
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profiles'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : isDarkMode
                  ? 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-5 h-5" />
              <span>Profiles ({uniqueUsersWithRoles.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'reviews' ? (
        /* Reviews Tab Content */
        <>
          {/* Statistics Cards */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Reviews
                </p>
                <p className="text-2xl font-semibold">{stats.totalReviews}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Confirmed Reviews
                </p>
                <p className="text-2xl font-semibold">{stats.confirmedReviews}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <StarSolidIcon className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Average Rating
                </p>
                <p className="text-2xl font-semibold">{stats.averageRating}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-lg p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AcademicCapIcon className="w-8 h-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Mentors Rated
                </p>
                <p className="text-2xl font-semibold">{userRatings.size}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className={`rounded-lg p-6 mb-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 w-20">
                    <span className="text-sm font-medium">{rating}</span>
                    <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className={`h-3 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                      <div
                        className="h-3 bg-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg w-64 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-black placeholder-gray-500'
                }`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                isDarkMode
                  ? 'border-gray-600 hover:bg-gray-800'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`px-4 py-2 border rounded-lg ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest-rating">Highest Rating</option>
              <option value="lowest-rating">Lowest Rating</option>
            </select>
            
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className={`rounded-lg p-4 mb-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <h4 className="font-semibold mb-3">Filter by:</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Reviews' },
                { value: '5-star', label: '5 Stars' },
                { value: '4-star', label: '4 Stars' },
                { value: '3-star', label: '3 Stars' },
                { value: '2-star', label: '2 Stars' },
                { value: '1-star', label: '1 Star' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterBy(filter.value as FilterOption)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filterBy === filter.value
                      ? 'bg-red-500 text-white'
                      : isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {filteredAndSortedReviews.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
              <ChatBubbleLeftRightIcon className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                No reviews found
              </h3>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {searchQuery.trim() || filterBy !== 'all' 
                  ? "Try adjusting your search or filters"
                  : "Reviews will appear here after mentorship sessions are completed"
                }
              </p>
            </div>
          ) : (
            filteredAndSortedReviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-lg p-6 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  isDarkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <UserAvatar 
                      address={review.studentAddress} 
                      size="md" 
                      className="flex-shrink-0" 
                    />
                    <div>
                      {(() => {
                        const relationship = getReviewRelationshipText(
                          review.studentAddress, 
                          review.mentorAddress, 
                          address || ''
                        );
                        return (
                          <>
                            <h3 className="font-semibold text-lg">{relationship.text}</h3>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                              <p>Student: {getDisplayName(review.studentAddress) || relationship.reviewerName} ({formatAddress(review.studentAddress)})</p>
                              <p>Mentor: {getDisplayName(review.mentorAddress) || relationship.revieweeName} ({formatAddress(review.mentorAddress)})</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStars(review.rating, 'w-5 h-5')}
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {formatDate(review.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">{review.sessionTitle}</h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-3`}>
                    {review.feedback}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {review.sessionDate} at {review.sessionTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {review.confirmReceived ? (
                      <div className="flex items-center space-x-1 text-green-500">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="text-sm">Confirmed</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-yellow-500">
                        <ClockIcon className="w-4 h-4" />
                        <span className="text-sm">Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More Button */}
        {filteredAndSortedReviews.length > 0 && filteredAndSortedReviews.length >= 10 && (
          <div className="text-center mt-8">
            <button className={`px-6 py-3 border rounded-lg transition-colors ${
              isDarkMode
                ? 'border-gray-600 hover:bg-gray-800'
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
              Load More Reviews
            </button>
          </div>
        )}
      </div>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-full overflow-auto ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Review Details</h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                  }`}
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Review Information</h3>
                  {(() => {
                    const relationship = getReviewRelationshipText(
                      selectedReview.studentAddress, 
                      selectedReview.mentorAddress, 
                      address || ''
                    );
                    return (
                      <div className="space-y-4">
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Review Summary</p>
                          <p className="font-medium text-lg">{relationship.text}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Student (Reviewer)</p>
                            <p className="font-medium">{relationship.reviewerName}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatAddress(selectedReview.studentAddress)}
                            </p>
                          </div>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mentor (Reviewed)</p>
                            <p className="font-medium">{relationship.revieweeName}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatAddress(selectedReview.mentorAddress)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Session</p>
                          <p className="font-medium">{selectedReview.sessionTitle}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {selectedReview.sessionDate} at {selectedReview.sessionTime}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Rating</h3>
                  <div className="flex items-center space-x-3">
                    {renderStars(selectedReview.rating, 'w-6 h-6')}
                    <span className="text-xl font-bold">{selectedReview.rating}/5</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Feedback</h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {selectedReview.feedback}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <div className="flex items-center space-x-2">
                    {selectedReview.confirmReceived ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5 text-green-500" />
                        <span className="text-green-500">Payment Confirmed</span>
                      </>
                    ) : (
                      <>
                        <ClockIcon className="w-5 h-5 text-yellow-500" />
                        <span className="text-yellow-500">Payment Pending</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Review submitted on {formatDate(selectedReview.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        /* Profiles Tab Content */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profiles Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">Active User Profiles</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Users who have participated in mentorship sessions
                </p>
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {uniqueUsersWithRoles.length} {uniqueUsersWithRoles.length === 1 ? 'profile' : 'profiles'} found
              </div>
            </div>
          </div>

          {/* User Profiles Grid */}
          <UserProfileGrid users={uniqueUsersWithRoles} />
        </div>
      )}
    </div>
  );
};

export default ReviewsPage;