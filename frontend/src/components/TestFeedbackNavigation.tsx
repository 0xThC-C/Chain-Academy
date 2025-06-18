import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AlertModal from './AlertModal';

const TestFeedbackNavigation: React.FC = () => {
  const { isDarkMode } = useTheme();

  // Alert Modal state
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

  return (
    <div className={`p-6 rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="text-center">
        <ExclamationTriangleIcon className={`w-8 h-8 mx-auto mb-3 ${
          isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
        }`} />
        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Component Deprecated
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          TestFeedbackNavigation has been deprecated. The feedback system now uses optional satisfaction surveys integrated into the session flow.
        </p>
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

export default TestFeedbackNavigation;