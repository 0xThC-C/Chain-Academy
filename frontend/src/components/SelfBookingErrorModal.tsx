import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SelfBookingErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorName: string;
}

const SelfBookingErrorModal: React.FC<SelfBookingErrorModalProps> = ({
  isOpen,
  onClose,
  mentorName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cannot Book Own Session
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              You cannot book a session with yourself as the mentor.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <span className="font-medium">{mentorName}</span> is your own mentorship offering. 
                    Students can book sessions with you, but you cannot book sessions with yourself.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              What you can do instead:
            </h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                <span>Browse other mentors to book sessions with them</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                <span>Wait for students to book sessions with you</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-primary-600 rounded-full"></div>
                <span>Edit your mentorship details in your dashboard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 space-x-3">
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelfBookingErrorModal;