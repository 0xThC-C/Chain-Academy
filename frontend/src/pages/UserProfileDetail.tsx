import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon, UserIcon, AcademicCapIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useReviews, Review } from '../contexts/ReviewsContext';
import { getDisplayName } from '../utils/profileUtils';

interface UserProfile {
  address: string;
  name: string;
  avatar: string;
  role: 'mentor' | 'student' | 'both';
  rating: number;
  totalReviews: number;
  completedSessions: number;
  joinedDate: string;
  badges: string[];
  bio?: string;
  expertise?: string[];
}

const UserProfileDetail: React.FC = () => {
  const { userAddress } = useParams<{ userAddress: string }>();
  const navigate = useNavigate();
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

      const profile: UserProfile = {
        address: userAddress,
        name: getDisplayName(userAddress),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userAddress}`,
        role: role,
        rating: userRating?.averageRating || 0,
        totalReviews: userRating?.totalReviews || 0,
        completedSessions: totalSessions,
        joinedDate: '2024-01-01', // Default join date
        badges: badges,
        bio: `Blockchain enthusiast and ${role === 'both' ? 'mentor & student' : role} on Chain Academy.`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'User not found'}</p>
          <button
            onClick={() => navigate('/reviews')}
            className="text-blue-500 hover:text-blue-600 flex items-center mx-auto"
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
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/reviews')}
          className="mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Reviews
        </button>

        {/* User Profile Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Avatar */}
            <img
              src={userProfile.avatar}
              alt={userProfile.name}
              className="w-32 h-32 rounded-full border-4 border-gray-200 dark:border-gray-700"
            />

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {userProfile.name}
                </h1>
                {userProfile.badges.includes('Verified') && (
                  <ShieldCheckIcon className="h-6 w-6 text-blue-500" title="Verified User" />
                )}
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {truncateAddress(userProfile.address)}
              </p>

              {/* Role Badge */}
              <div className="flex items-center gap-2 mb-4">
                {userProfile.role === 'mentor' || userProfile.role === 'both' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <AcademicCapIcon className="h-4 w-4 mr-1" />
                    Mentor
                  </span>
                ) : null}
                {userProfile.role === 'student' || userProfile.role === 'both' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <UserIcon className="h-4 w-4 mr-1" />
                    Student
                  </span>
                ) : null}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
                  <div className="flex items-center gap-2">
                    {renderStars(userProfile.rating)}
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {userProfile.rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userProfile.totalReviews}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed Sessions</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userProfile.completedSessions}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {userProfile.bio && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">About</h3>
                  <p className="text-gray-600 dark:text-gray-400">{userProfile.bio}</p>
                </div>
              )}

              {/* Expertise */}
              {userProfile.expertise && userProfile.expertise.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Achievements</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.badges.map((badge, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reviews</h2>

          {/* Tab Navigation */}
          {userProfile.role === 'both' && (
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('received')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'received'
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Reviews as Mentor ({mentorReviews.length})
                </button>
                <button
                  onClick={() => setActiveTab('given')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'given'
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No reviews yet
              </p>
            ) : (
              reviewsToShow.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {review.sessionTitle}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeTab === 'received' 
                          ? `Reviewed by ${review.studentName || getDisplayName(review.studentAddress)}`
                          : `Mentor: ${review.mentorName || getDisplayName(review.mentorAddress)}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      {renderStars(review.rating)}
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatReviewDate(review)}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{review.feedback}</p>
                  {review.confirmReceived && (
                    <div className="mt-2 flex items-center text-sm text-green-600 dark:text-green-400">
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

export default UserProfileDetail;