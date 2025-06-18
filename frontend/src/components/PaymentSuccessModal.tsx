import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  CheckCircleIcon,
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDetails: {
    sessionId?: number;
    mentorName: string;
    title: string;
    date: string;
    time: string;
    duration: number;
    amount: number;
    token: string;
    transactionHash?: string;
  };
  onViewDashboard?: () => void;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  sessionDetails,
  onViewDashboard
}) => {
  const { isDarkMode } = useTheme();

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Copy transaction hash to clipboard
  const copyTransactionHash = () => {
    if (sessionDetails.transactionHash) {
      navigator.clipboard.writeText(sessionDetails.transactionHash);
      // You could add a toast notification here
    }
  };

  // Format transaction hash for display
  const formatTxHash = (hash?: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-150 ease-out"
      onClick={handleBackdropClick}
    >
      <div 
        className={`rounded-lg max-w-md w-full p-6 transform transition-all duration-200 ease-out scale-100 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700 shadow-2xl' : 'bg-white border border-gray-200 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: isOpen ? 'modalSlideIn 0.2s ease-out' : undefined
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircleIcon className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Payment Successful!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your session has been booked
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className={`p-1 rounded-full transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Session Details */}
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <h4 className={`font-semibold mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Session Details
          </h4>
          
          <div className="space-y-3">
            {/* Session ID */}
            {sessionDetails.sessionId && (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary-red rounded-full"></div>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Session ID: </span>
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    #{sessionDetails.sessionId}
                  </span>
                </div>
              </div>
            )}

            {/* Mentor */}
            <div className="flex items-center space-x-3">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Mentor: </span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sessionDetails.mentorName}
                </span>
              </div>
            </div>

            {/* Session Title */}
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Topic: </span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sessionDetails.title}
                </span>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Scheduled: </span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sessionDetails.date} at {sessionDetails.time}
                </span>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Duration: </span>
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sessionDetails.duration} minutes
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Paid: </span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {sessionDetails.amount} {sessionDetails.token}
                </span>
              </div>
            </div>

            {/* Transaction Hash */}
            {sessionDetails.transactionHash && (
              <div className="flex items-center space-x-3">
                <DocumentDuplicateIcon className="w-5 h-5 text-gray-400" />
                <div className="flex items-center space-x-2 flex-1">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Tx: </span>
                    <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatTxHash(sessionDetails.transactionHash)}
                    </span>
                  </div>
                  <button
                    onClick={copyTransactionHash}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Copy transaction hash"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success Message */}
        <div className="mb-6">
          <p className={`text-sm leading-relaxed ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Your payment has been processed successfully and your mentorship session is confirmed. 
            You will receive a confirmation email shortly with session details and a calendar invite.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>View My Sessions</span>
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`w-full px-4 py-2.5 rounded-lg border transition-colors font-medium ${
              isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;