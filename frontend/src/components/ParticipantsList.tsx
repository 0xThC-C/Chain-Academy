import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  UserIcon
} from '@heroicons/react/24/outline';

interface MediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

interface Participant {
  address: string;
  mediaState: MediaState;
}

interface ParticipantsListProps {
  participants: Participant[];
  currentUser: string;
  sessionStartTime?: Date | null;
  messageCount?: number;
  screenShareCount?: number;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
  participants, 
  currentUser: _currentUser, 
  sessionStartTime,
  messageCount = 0,
  screenShareCount = 0
}) => {
  const { isDarkMode } = useTheme();
  const [callDuration, setCallDuration] = useState<number>(0);

  // Use the provided session start time, fallback to current time if not available
  const actualStartTime = sessionStartTime || new Date();

  // Update call duration every second
  useEffect(() => {
    // Only start timer if we have a valid session start time
    if (!sessionStartTime) {
      return;
    }

    const updateDuration = () => {
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - actualStartTime.getTime()) / 1000);
      setCallDuration(diffInSeconds);
    };

    // Update immediately
    updateDuration();

    // Set up interval to update every second
    const interval = setInterval(updateDuration, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [sessionStartTime, actualStartTime]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };


  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Participants ({participants.length})
        </h3>
        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {participants.filter(p => p.mediaState.video).length} with video,{' '}
          {participants.filter(p => p.mediaState.audio).length} with audio
        </div>
      </div>

      {/* Empty State */}
      {participants.length === 0 && (
        <div className="text-center py-8">
          <UserIcon className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No participants yet
          </p>
        </div>
      )}

      {/* Session Stats */}
      <div className={`mt-6 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Session Statistics
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Duration: {formatDuration(callDuration)}
          </div>
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Quality: High
          </div>
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Messages: {messageCount}
          </div>
          <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Screen shares: {screenShareCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;