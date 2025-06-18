import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useReviews } from '../contexts/ReviewsContext';
import { getDisplayName } from '../utils/profileUtils';
import {
  StarIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import {
  StarIcon as StarOutlineIcon
} from '@heroicons/react/24/outline';
import AlertModal from './AlertModal';

interface SatisfactionSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string, confirmReceived: boolean) => Promise<void>;
  mentorAddress: string;
  mentorName?: string;
  sessionId: string;
  sessionTitle?: string;
  sessionDate?: string;
  sessionTime?: string;
  studentAddress?: string;
  studentName?: string;
  isSubmitting?: boolean;
  isMandatory?: boolean; // New prop to make survey mandatory
}

const SatisfactionSurvey: React.FC<SatisfactionSurveyProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mentorAddress,
  mentorName: _mentorName = 'Mentor',
  sessionId,
  sessionTitle = 'Mentorship Session',
  sessionDate = new Date().toISOString().split('T')[0],
  sessionTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  studentAddress: _studentAddress = '',
  studentName: _studentName = '',
  isSubmitting: propIsSubmitting = false,
  isMandatory: _isMandatory = false
}) => {
  const { isDarkMode } = useTheme();
  const { addReview } = useReviews();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [confirmReceived, setConfirmReceived] = useState<boolean>(false);
  const [localIsSubmitting, setLocalIsSubmitting] = useState<boolean>(false);
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
  
  const isSubmitting = propIsSubmitting || localIsSubmitting;

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

  // Handle close attempt - always allow closing, but show information about optional nature
  const handleCloseAttempt = () => {
    // Survey is now always optional - users can close at any time
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      showAlert('warning', 'Rating Required', 'Please provide a rating before submitting.');
      return;
    }

    if (!confirmReceived) {
      showAlert('warning', 'Confirmation Required', 'Please confirm that you received the mentorship content.');
      return;
    }

    setLocalIsSubmitting(true);
    
    try {
      // Get updated names from profiles
      const updatedStudentName = getDisplayName(_studentAddress);
      const updatedMentorName = getDisplayName(mentorAddress);
      
      // Save review to context first
      addReview({
        sessionId,
        studentAddress: _studentAddress,
        studentName: updatedStudentName,
        mentorAddress,
        mentorName: updatedMentorName,
        sessionTitle,
        rating,
        feedback,
        confirmReceived,
        sessionDate,
        sessionTime
      });
      
      // Call the original onSubmit (for payment processing, etc.)
      await onSubmit(rating, feedback, confirmReceived);
      
      // Reset form
      setRating(0);
      setHoverRating(0);
      setFeedback('');
      setConfirmReceived(false);
      
    } catch (error) {
      console.error('Error submitting survey:', error);
      showAlert('error', 'Submission Failed', 'Failed to submit review. Please try again.');
    } finally {
      setLocalIsSubmitting(false);
    }
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  const handleRatingHover = (value: number) => {
    setHoverRating(value);
  };

  const handleRatingLeave = () => {
    setHoverRating(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg max-w-md w-full p-6 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Help Us Improve (Optional)
          </h3>
          <button
            onClick={handleCloseAttempt}
            className={`hover:opacity-70 transition-opacity ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
            disabled={isSubmitting}
            title="Close survey"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Optional Survey Notice */}
          <div className={`p-4 rounded-lg border-2 ${
            isDarkMode 
              ? 'bg-blue-900/20 border-blue-800 text-blue-300' 
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Your Feedback Matters</span>
            </div>
            <p className="text-sm mt-1">
              Help us improve our platform by sharing your experience. Your feedback helps mentors provide better sessions and improves our community.
            </p>
          </div>

          {/* Session Info */}
          <div className={`p-3 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Session with: <span className="font-mono">{mentorAddress.slice(0, 6)}...{mentorAddress.slice(-4)}</span>
            </p>
          </div>

          {/* Rating */}
          <div>
            <label className={`block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              How would you rate this mentorship session?
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => handleRatingHover(star)}
                  onMouseLeave={handleRatingLeave}
                  className="transition-colors hover:scale-110 transform"
                  disabled={isSubmitting}
                >
                  {star <= (hoverRating || rating) ? (
                    <StarIcon className="h-8 w-8 text-yellow-400" />
                  ) : (
                    <StarOutlineIcon className={`h-8 w-8 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-300'
                    }`} />
                  )}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Feedback */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Additional comments (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg resize-none transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500'
              } focus:outline-none focus:ring-1 focus:ring-red-500`}
              placeholder="Share your thoughts about the session..."
              disabled={isSubmitting}
            />
          </div>

          {/* Content Confirmation */}
          <div className={`p-4 rounded-lg border-2 ${
            confirmReceived
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : isDarkMode
              ? 'border-gray-600 bg-gray-700'
              : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="flex items-start space-x-3">
              <button
                onClick={() => setConfirmReceived(!confirmReceived)}
                className={`mt-0.5 transition-colors ${
                  confirmReceived ? 'text-green-500' : isDarkMode ? 'text-gray-400' : 'text-gray-300'
                }`}
                disabled={isSubmitting}
              >
                <CheckCircleIcon className="h-5 w-5" />
              </button>
              <div>
                <p className={`text-sm font-medium ${
                  confirmReceived
                    ? 'text-green-700 dark:text-green-300'
                    : isDarkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                }`}>
                  I confirm that I received the mentorship content
                </p>
                <p className={`text-xs mt-1 ${
                  confirmReceived
                    ? 'text-green-600 dark:text-green-400'
                    : isDarkMode
                    ? 'text-gray-400'
                    : 'text-gray-600'
                }`}>
                  This helps verify the quality of the mentorship session
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCloseAttempt}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={isSubmitting}
            >
              Maybe Later
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || !confirmReceived || isSubmitting}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                rating > 0 && confirmReceived && !isSubmitting
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
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

export default SatisfactionSurvey;