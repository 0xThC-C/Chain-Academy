import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import UserAvatar from './UserAvatar';
import { getDisplayName } from '../utils/profileUtils';

interface UserProfileGridProps {
  users: Array<{
    address: string;
    role: 'mentor' | 'student' | 'both';
    totalReviews: number;
    lastActivity: number;
  }>;
}

const UserProfileGrid: React.FC<UserProfileGridProps> = ({ users }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleUserClick = (userAddress: string) => {
    // Navigate to the user profile page
    navigate(`/user-profile/${userAddress}`);
  };

  const getRoleBadgeColor = (role: 'mentor' | 'student' | 'both') => {
    switch (role) {
      case 'mentor':
        return 'bg-blue-500 text-white';
      case 'student':
        return 'bg-green-500 text-white';
      case 'both':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRoleText = (role: 'mentor' | 'student' | 'both') => {
    switch (role) {
      case 'mentor':
        return 'Mentor';
      case 'student':
        return 'Student';
      case 'both':
        return 'Mentor & Student';
      default:
        return 'User';
    }
  };

  if (users.length === 0) {
    return (
      <div className={`text-center py-12 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} flex items-center justify-center`}>
          <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          No profiles found
        </h3>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Profiles will appear here after users participate in mentorship sessions
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
      {users.map((user) => (
        <div
          key={user.address}
          className={`flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
            isDarkMode 
              ? 'bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700' 
              : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => handleUserClick(user.address)}
        >
          {/* User Avatar */}
          <div className="mb-3">
            <UserAvatar 
              address={user.address} 
              size="lg" 
              className="ring-2 ring-red-500 ring-opacity-50"
            />
          </div>

          {/* User Name */}
          <div className="text-center mb-2">
            <h3 className={`font-medium text-sm truncate w-full ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {getDisplayName(user.address)}
            </h3>
          </div>

          {/* Role Badge */}
          <div className="mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
              {getRoleText(user.role)}
            </span>
          </div>

          {/* Review Count */}
          <div className="text-center">
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user.totalReviews} {user.totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserProfileGrid;