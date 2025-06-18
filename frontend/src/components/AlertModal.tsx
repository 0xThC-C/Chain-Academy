import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  const { isDarkMode } = useTheme();

  // Auto close functionality
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isOpen && autoClose) {
      timeoutId = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

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

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-green-500',
          iconBg: 'bg-green-100 dark:bg-green-900/20',
          titleColor: 'text-green-800 dark:text-green-200',
          messageColor: 'text-green-700 dark:text-green-300',
          borderColor: 'border-green-200 dark:border-green-800'
        };
      case 'error':
        return {
          icon: XCircleIcon,
          iconColor: 'text-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          titleColor: 'text-red-800 dark:text-red-200',
          messageColor: 'text-red-700 dark:text-red-300',
          borderColor: 'border-red-200 dark:border-red-800'
        };
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          titleColor: 'text-yellow-800 dark:text-yellow-200',
          messageColor: 'text-yellow-700 dark:text-yellow-300',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        };
      default: // info
        return {
          icon: InformationCircleIcon,
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          titleColor: 'text-blue-800 dark:text-blue-200',
          messageColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-200 dark:border-blue-800'
        };
    }
  };

  const typeStyles = getTypeStyles();
  const IconComponent = typeStyles.icon;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6 md:p-8 transition-opacity duration-150 ease-out"
      onClick={handleBackdropClick}
    >
      <div 
        className={`rounded-lg max-w-md w-full p-4 sm:p-6 transform transition-all duration-200 ease-out scale-100 ${
          isDarkMode ? 'bg-gray-800 shadow-2xl' : 'bg-white shadow-2xl'
        } border ${typeStyles.borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${typeStyles.iconBg}`}>
              <IconComponent className={`w-6 h-6 ${typeStyles.iconColor}`} />
            </div>
            <div>
              {title && (
                <h3 className={`text-lg font-semibold ${typeStyles.titleColor}`}>
                  {title}
                </h3>
              )}
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

        {/* Message */}
        <div className="mb-6">
          <p className={`text-sm leading-relaxed ${typeStyles.messageColor}`}>
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
          >
            OK
          </button>
        </div>

        {/* Auto-close progress bar */}
        {autoClose && (
          <div className={`mt-4 h-1 ${typeStyles.iconBg} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${typeStyles.iconColor.replace('text-', 'bg-')} transition-all ease-linear`}
              style={{
                width: '0%',
                transitionDuration: `${autoCloseDelay}ms`
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default AlertModal;