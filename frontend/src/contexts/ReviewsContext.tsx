import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Review {
  id: string;
  sessionId: string;
  studentAddress: string;
  studentName?: string;
  mentorAddress: string;
  mentorName: string;
  sessionTitle: string;
  rating: number; // 1-5 stars
  feedback: string;
  confirmReceived: boolean;
  timestamp: string;
  sessionDate: string;
  sessionTime: string;
}

export interface UserRating {
  userAddress: string;
  userName?: string;
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  lastUpdated: string;
}

interface ReviewsContextType {
  reviews: Review[];
  userRatings: Map<string, UserRating>;
  addReview: (review: Omit<Review, 'id' | 'timestamp'>) => void;
  getReviewsByStudent: (studentAddress: string) => Review[];
  getReviewsByMentor: (mentorAddress: string) => Review[];
  getUserRating: (userAddress: string) => UserRating | null;
  getRecentReviews: (limit?: number) => Review[];
  getTotalReviewsCount: () => number;
  getAverageRatingForMentor: (mentorAddress: string) => number;
  searchReviews: (query: string) => Review[];
  clearAllReviews: () => void;
  getUniqueUsers: () => string[];
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const useReviews = () => {
  const context = useContext(ReviewsContext);
  if (context === undefined) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
};

export const ReviewsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userRatings, setUserRatings] = useState<Map<string, UserRating>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load reviews from localStorage on mount
  useEffect(() => {
    console.log('🔄 Loading reviews from localStorage...');
    const savedReviews = localStorage.getItem('chainacademy_reviews');
    if (savedReviews) {
      try {
        const parsedReviews = JSON.parse(savedReviews);
        console.log('📥 Loaded', parsedReviews.length, 'reviews from localStorage');
        setReviews(parsedReviews);
      } catch (error) {
        console.warn('Failed to load reviews from localStorage:', error);
      }
    } else {
      console.log('📭 No saved reviews found in localStorage');
    }
    // Mark as initialized after loading attempt
    setIsInitialized(true);
  }, []);

  // Save reviews to localStorage whenever reviews change (but not on initial empty state)
  useEffect(() => {
    // Only save if initialized (to prevent saving empty array on initial mount)
    if (isInitialized) {
      console.log('💾 Saving reviews to localStorage:', reviews.length, 'reviews');
      localStorage.setItem('chainacademy_reviews', JSON.stringify(reviews));
      
      // Debug: verify save
      const saved = localStorage.getItem('chainacademy_reviews');
      const parsed = saved ? JSON.parse(saved) : [];
      console.log('✅ Verified save - stored:', parsed.length, 'reviews');
    }
  }, [reviews, isInitialized]);

  // Calculate user ratings whenever reviews change
  useEffect(() => {
    const calculateUserRatings = () => {
      const ratingsMap = new Map<string, UserRating>();

      // Group reviews by mentor address
      const mentorReviews = new Map<string, Review[]>();
      reviews.forEach(review => {
        if (!mentorReviews.has(review.mentorAddress)) {
          mentorReviews.set(review.mentorAddress, []);
        }
        mentorReviews.get(review.mentorAddress)!.push(review);
      });

      // Calculate ratings for each mentor
      mentorReviews.forEach((mentorReviewsList, mentorAddress) => {
        const totalReviews = mentorReviewsList.length;
        const ratingsSum = mentorReviewsList.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalReviews > 0 ? ratingsSum / totalReviews : 0;

        // Calculate rating breakdown
        const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        mentorReviewsList.forEach(review => {
          ratingBreakdown[review.rating as keyof typeof ratingBreakdown]++;
        });

        // Get mentor name from most recent review
        const mostRecentReview = mentorReviewsList.reduce((latest, current) => 
          new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
        );

        ratingsMap.set(mentorAddress, {
          userAddress: mentorAddress,
          userName: mostRecentReview.mentorName,
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          ratingBreakdown,
          lastUpdated: new Date().toISOString()
        });
      });

      setUserRatings(ratingsMap);
    };

    calculateUserRatings();
  }, [reviews]);

  const addReview = useCallback((reviewData: Omit<Review, 'id' | 'timestamp'>) => {
    const newReview: Review = {
      ...reviewData,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    console.log('➕ Adding new review:', newReview);
    setReviews(prev => {
      const updated = [newReview, ...prev];
      console.log('📊 Updated reviews array length:', updated.length);
      return updated;
    });
  }, []);

  const getReviewsByStudent = useCallback((studentAddress: string) => {
    return reviews.filter(review => review.studentAddress.toLowerCase() === studentAddress.toLowerCase());
  }, [reviews]);

  const getReviewsByMentor = useCallback((mentorAddress: string) => {
    return reviews.filter(review => review.mentorAddress.toLowerCase() === mentorAddress.toLowerCase());
  }, [reviews]);

  const getUserRating = useCallback((userAddress: string) => {
    return userRatings.get(userAddress.toLowerCase()) || null;
  }, [userRatings]);

  const getRecentReviews = useCallback((limit: number = 10) => {
    return reviews
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [reviews]);

  const getTotalReviewsCount = useCallback(() => {
    return reviews.length;
  }, [reviews]);

  const getAverageRatingForMentor = useCallback((mentorAddress: string) => {
    const rating = getUserRating(mentorAddress);
    return rating ? rating.averageRating : 0;
  }, [getUserRating]);

  const searchReviews = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return reviews.filter(review => 
      review.mentorName.toLowerCase().includes(lowerQuery) ||
      review.sessionTitle.toLowerCase().includes(lowerQuery) ||
      review.feedback.toLowerCase().includes(lowerQuery) ||
      (review.studentName && review.studentName.toLowerCase().includes(lowerQuery))
    );
  }, [reviews]);

  const getUniqueUsers = useCallback(() => {
    const uniqueAddresses = new Set<string>();
    
    reviews.forEach(review => {
      uniqueAddresses.add(review.studentAddress.toLowerCase());
      uniqueAddresses.add(review.mentorAddress.toLowerCase());
    });
    
    return Array.from(uniqueAddresses);
  }, [reviews]);

  const clearAllReviews = useCallback(() => {
    setReviews([]);
    setUserRatings(new Map());
    localStorage.removeItem('chainacademy_reviews');
    console.log('All reviews cleared');
  }, []);

  const value = {
    reviews,
    userRatings,
    addReview,
    getReviewsByStudent,
    getReviewsByMentor,
    getUserRating,
    getRecentReviews,
    getTotalReviewsCount,
    getAverageRatingForMentor,
    searchReviews,
    clearAllReviews,
    getUniqueUsers
  };

  return (
    <ReviewsContext.Provider value={value}>
      {children}
    </ReviewsContext.Provider>
  );
};

export default ReviewsContext;