import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface PaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    title: string;
    message: string;
    code?: string;
    transactionHash?: string;
    details?: string;
  };
  onRetry?: () => void;
  onGoHome?: () => void;
  isRetrying?: boolean;
}

const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  isOpen,
  onClose,
  error,
  onRetry,
  onGoHome,
  isRetrying = false
}) => {
  const { isDarkMode } = useTheme();

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isRetrying) {
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
  }, [isOpen, isRetrying, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isRetrying) {
      onClose();
    }
  };

  // Copy error details to clipboard
  const copyErrorDetails = () => {
    const errorText = [
      `Error: ${error.title}`,
      `Message: ${error.message}`,
      error.code ? `Code: ${error.code}` : '',
      error.transactionHash ? `Transaction: ${error.transactionHash}` : '',
      error.details ? `Details: ${error.details}` : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(errorText);
    // You could add a toast notification here
  };

  // Format transaction hash for display
  const formatTxHash = (hash?: string) => {
    if (!hash) return '';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  // Get error type and styling based on error content
  const getErrorType = () => {
    const message = error.message.toLowerCase();
    
    if (message.includes('insufficient') || message.includes('balance')) {
      return {
        type: 'insufficient_funds',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100 dark:bg-orange-900/20',
        suggestions: [
          'Check your wallet balance',
          'Make sure you have enough tokens for the payment and gas fees',
          'Try switching to a different payment token'
        ]
      };
    }
    
    if (message.includes('rejected') || message.includes('denied') || message.includes('user rejected')) {
      return {
        type: 'user_rejected',
        icon: InformationCircleIcon,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100 dark:bg-blue-900/20',
        suggestions: [
          'Accept the transaction in your wallet to proceed',
          'Check if your wallet is unlocked',
          'Make sure you are connected to the correct network'
        ]
      };
    }
    
    if (message.includes('gas') || message.includes('fee')) {
      return {
        type: 'gas_error',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-yellow-500',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
        suggestions: [
          'Increase gas limit or gas price',
          'Wait for network congestion to decrease',
          'Try again when gas fees are lower'
        ]
      };
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return {
        type: 'network_error',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-100 dark:bg-red-900/20',
        suggestions: [
          'Check your internet connection',
          'Switch to a different RPC provider',
          'Try again in a few moments'
        ]
      };
    }

    // Default error type
    return {
      type: 'general_error',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      suggestions: [
        'Try the payment again',
        'Check your wallet connection',
        'Contact support if the problem persists'
      ]
    };
  };

  if (!isOpen) return null;

  const errorType = getErrorType();
  const Icon = errorType.icon;

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
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${errorType.iconBg}`}>
              <Icon className={`w-7 h-7 ${errorType.iconColor}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {error.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Payment could not be completed
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isRetrying}
            className={`p-1 rounded-full transition-colors ${
              isRetrying 
                ? 'cursor-not-allowed opacity-50' 
                : isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        <div className={`p-4 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <h4 className={`font-semibold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Error Details
          </h4>
          
          <p className={`text-sm mb-3 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {error.message}
          </p>

          {/* Additional Details */}
          {(error.code || error.transactionHash || error.details) && (
            <div className="space-y-2 text-xs">
              {error.code && (
                <div className={`font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Code: {error.code}
                </div>
              )}
              {error.transactionHash && (
                <div className={`font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tx: {formatTxHash(error.transactionHash)}
                </div>
              )}
              {error.details && (
                <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {error.details}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="mb-6">
          <h4 className={`font-semibold mb-3 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            What you can try:
          </h4>
          <ul className="space-y-2">
            {errorType.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary-red rounded-full mt-2 flex-shrink-0"></div>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {suggestion}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isRetrying
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-primary-red hover:bg-red-600 text-white'
              } flex items-center justify-center space-x-2`}
            >
              {isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Try Again</span>
                </>
              )}
            </button>
          )}

          <div className="flex space-x-3">
            <button
              onClick={copyErrorDetails}
              disabled={isRetrying}
              className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors font-medium ${
                isRetrying
                  ? 'cursor-not-allowed opacity-50'
                  : isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              } flex items-center justify-center space-x-2`}
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>Copy Details</span>
            </button>

            {onGoHome && (
              <button
                onClick={onGoHome}
                disabled={isRetrying}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors font-medium ${
                  isRetrying
                    ? 'cursor-not-allowed opacity-50'
                    : isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                } flex items-center justify-center space-x-2`}
              >
                <HomeIcon className="w-4 h-4" />
                <span>Go Home</span>
              </button>
            )}
          </div>

          {!onRetry && (
            <button
              onClick={onClose}
              disabled={isRetrying}
              className={`w-full px-4 py-2.5 rounded-lg border transition-colors font-medium ${
                isRetrying
                  ? 'cursor-not-allowed opacity-50'
                  : isDarkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentErrorModal;