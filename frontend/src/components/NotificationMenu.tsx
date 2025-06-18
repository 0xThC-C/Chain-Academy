import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, SessionReminder } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import AlertModal from './AlertModal';
import {
  BellIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

const NotificationMenu: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { 
    getActiveReminders, 
    getTotalActiveCount, 
    getHighPriorityCount,
    dismissReminder
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
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

  const activeReminders = getActiveReminders();
  const totalCount = getTotalActiveCount();
  const highPriorityCount = getHighPriorityCount();

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

  // Session reminder functions
  const handleReminderClick = (reminder: SessionReminder) => {
    try {
      const sessionUrl = getSessionUrl(reminder);
      navigate(sessionUrl);
      setIsOpen(false);
    } catch (error) {
      console.error('Error navigating to session:', error);
      showAlert('error', 'Navigation Error', 'Unable to open session. Please try again.');
    }
  };

  const handleDismissReminder = (reminderId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      dismissReminder(reminderId);
      showAlert('info', 'Reminder Dismissed', 'You can still join the session from your dashboard.');
    } catch (error) {
      console.error('Error dismissing reminder:', error);
      showAlert('error', 'Error', 'Unable to dismiss reminder. Please try again.');
    }
  };

  const formatTimeUntilSession = (sessionTime: string): string => {
    const now = new Date();
    const sessionDate = new Date(sessionTime);
    const diffInMinutes = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes <= 0) {
      return 'Starting now';
    } else if (diffInMinutes < 60) {
      return `in ${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const remainingMinutes = diffInMinutes % 60;
      if (remainingMinutes === 0) {
        return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
      } else {
        return `in ${hours}h ${remainingMinutes}m`;
      }
    }
  };

  const getSessionUrl = (reminder: SessionReminder): string => {
    return `/session/${reminder.sessionId}`;
  };

  const formatAddress = (address: string): string => {
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getReminderPriority = (minutesUntilSession: number) => {
    if (minutesUntilSession <= 5) {
      return 'high'; // 5 minutes or less - urgent
    } else if (minutesUntilSession <= 30) {
      return 'medium'; // 30 minutes or less - important
    } else {
      return 'low'; // More than 30 minutes - normal
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return ExclamationTriangleIcon;
      case 'medium':
        return ClockIcon;
      default:
        return CalendarIcon;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-primary-red text-white'
            : isDarkMode
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        title="Session Reminders"
      >
        {totalCount > 0 ? (
          <BellSolidIcon className="w-5 h-5" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        
        {/* Notification Badge */}
        {totalCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {totalCount > 99 ? '99+' : totalCount}
          </div>
        )}
        
        {/* High Priority Indicator */}
        {highPriorityCount > 0 && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className={`absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-96 rounded-lg shadow-lg border z-50 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Session Reminders
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 rounded-md transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {activeReminders.length === 0 ? (
                /* Empty State */
                <div className="p-6 text-center">
                  <CalendarIcon className={`w-12 h-12 mx-auto mb-3 ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No upcoming sessions
                  </p>
                </div>
              ) : (
                /* Session Reminder List */
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeReminders.map((reminder) => {
                    const now = new Date();
                    const sessionDate = reminder.sessionDateTime;
                    const minutesUntilSession = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60));
                    const priority = getReminderPriority(minutesUntilSession);
                    const PriorityIcon = getPriorityIcon(priority);
                    const isHighPriority = priority === 'high';
                    
                    return (
                      <div
                        key={reminder.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          isHighPriority 
                            ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500' 
                            : ''
                        } ${
                          isDarkMode 
                            ? 'hover:bg-gray-700' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleReminderClick(reminder)}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Priority Icon */}
                          <div className={`flex-shrink-0 ${getPriorityColor(priority)}`}>
                            <PriorityIcon className="w-5 h-5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium truncate ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {reminder.sessionTitle}
                              </p>
                              {/* Dismiss button */}
                              <button
                                onClick={(e) => handleDismissReminder(reminder.id, e)}
                                className={`flex-shrink-0 p-1 rounded-md transition-colors ${
                                  isDarkMode 
                                    ? 'hover:bg-gray-600 text-gray-400' 
                                    : 'hover:bg-gray-200 text-gray-500'
                                }`}
                                title="Dismiss reminder"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Mentor/Student Info */}
                            <div className="flex items-center space-x-2 mb-2">
                              <UserIcon className={`w-3 h-3 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <p className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                {reminder.userRole === 'mentor' ? 'Student' : 'Mentor'}: {formatAddress(reminder.userRole === 'mentor' ? reminder.studentAddress : reminder.mentorAddress)}
                              </p>
                            </div>
                            
                            {/* Role Badge */}
                            <div className="mb-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                reminder.userRole === 'mentor'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                You are the {reminder.userRole}
                              </span>
                            </div>
                            
                            {/* Time Until Session */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-1">
                                <ClockIcon className={`w-3 h-3 ${
                                  isHighPriority ? 'text-red-500' : 'text-gray-400'
                                }`} />
                                <span className={`text-xs font-medium ${
                                  isHighPriority 
                                    ? 'text-red-600 dark:text-red-400' 
                                    : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  {formatTimeUntilSession(reminder.sessionDateTime.toISOString())}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-2">
                              {isHighPriority && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReminderClick(reminder);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-md transition-colors"
                                >
                                  <PlayIcon className="w-3 h-3" />
                                  <span>Join Session</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReminderClick(reminder);
                                }}
                                className={`flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                  isHighPriority
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                <CalendarIcon className="w-3 h-3" />
                                <span>View Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeReminders.length > 0 && (
              <div className={`p-3 border-t text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <p className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {highPriorityCount > 0 && (
                    <span className="text-red-500 font-medium">
                      {highPriorityCount} Starting Soon • 
                    </span>
                  )}{' '}
                  {totalCount} {totalCount !== 1 ? 'upcoming sessions' : 'upcoming session'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

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

export default NotificationMenu;