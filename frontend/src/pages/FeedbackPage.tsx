import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { safeNavigate } from '../utils/navigation';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const FeedbackPage: React.FC = () => {
  const { sessionId: _sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  // Redirect immediately to home with deprecation notice
  useEffect(() => {
    console.log('FeedbackPage is deprecated, redirecting to home');
    safeNavigate(navigate, '/', { replace: true });
  }, [navigate]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className={`max-w-md w-full p-6 rounded-lg border ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="text-center">
          <ExclamationTriangleIcon className={`w-12 h-12 mx-auto mb-4 ${
            isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
          }`} />
          <h1 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Page Deprecated
          </h1>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            This feedback page has been deprecated. Satisfaction surveys are now optional and integrated into the session flow.
          </p>
          <button
            onClick={() => safeNavigate(navigate, '/', { replace: true })}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            <ArrowLeftIcon className="w-4 h-4 inline mr-2" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;