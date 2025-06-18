import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'warning' | 'danger' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'warning'
}) => {
  const { isDarkMode } = useTheme();

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
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
  }, [isOpen, isLoading, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          confirmButton: 'bg-red-500 hover:bg-red-600 text-white',
          confirmButtonDisabled: 'bg-red-300 text-red-100 cursor-not-allowed'
        };
      case 'info':
        return {
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          confirmButton: 'bg-blue-500 hover:bg-blue-600 text-white',
          confirmButtonDisabled: 'bg-blue-300 text-blue-100 cursor-not-allowed'
        };
      default: // warning
        return {
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white',
          confirmButtonDisabled: 'bg-yellow-300 text-yellow-100 cursor-not-allowed'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6 md:p-8 transition-opacity duration-150 ease-out"
      onClick={handleBackdropClick}
    >
      <div 
        className={`rounded-lg max-w-md w-full p-4 sm:p-6 transform transition-all duration-200 ease-out scale-100 ${
          isDarkMode ? 'bg-gray-800 border border-gray-700 shadow-2xl' : 'bg-white border border-gray-200 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: isOpen ? 'modalSlideIn 0.2s ease-out' : undefined
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variantStyles.iconBg}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${variantStyles.iconColor}`} />
            </div>
            <div>
              {title && (
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h3>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`p-1 rounded-full transition-colors ${
              isLoading 
                ? 'cursor-not-allowed opacity-50' 
                : isDarkMode 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mb-6">
          <p className={`text-sm leading-relaxed ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`w-full sm:flex-1 px-4 py-2.5 rounded-lg border transition-colors font-medium ${
              isLoading
                ? 'cursor-not-allowed opacity-50'
                : isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${
              isLoading 
                ? variantStyles.confirmButtonDisabled
                : variantStyles.confirmButton
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;