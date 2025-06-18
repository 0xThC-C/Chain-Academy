import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  VideoCameraIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon,
  NoSymbolIcon as MicrophoneSlashIcon,
  ComputerDesktopIcon,
  StopIcon,
  CogIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

interface MediaState {
  userId: string;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
}

interface MediaControlsProps {
  mediaState: MediaState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onScreenShare: () => void;
  isScreenSharing: boolean;
  onToggleView?: () => void;
  isLocalMain?: boolean;
  hasRemoteParticipants?: boolean;
}

const MediaControls: React.FC<MediaControlsProps> = ({
  mediaState,
  onToggleVideo,
  onToggleAudio,
  onScreenShare,
  isScreenSharing,
  onToggleView,
  isLocalMain = false,
  hasRemoteParticipants = false
}) => {
  const { isDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const handleVideoToggle = () => {
    onToggleVideo();
  };

  const handleAudioToggle = () => {
    onToggleAudio();
  };

  const handleScreenShare = () => {
    onScreenShare();
  };

  return (
    <div className="flex items-center justify-between lg:justify-center">
      {/* Left side - Primary controls */}
      <div className="flex items-center space-x-3 lg:space-x-4">
        {/* Audio Control */}
        <button
          onClick={handleAudioToggle}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.audio
              ? isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={mediaState.audio ? 'Mute microphone' : 'Unmute microphone'}
        >
          {mediaState.audio ? (
            <MicrophoneIcon className="w-6 h-6" />
          ) : (
            <MicrophoneSlashIcon className="w-6 h-6" />
          )}
        </button>

        {/* Video Control - Always available */}
        <button
          onClick={handleVideoToggle}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.video
              ? isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={mediaState.video ? 'Turn off camera' : 'Turn on camera'}
        >
          {mediaState.video ? (
            <VideoCameraIcon className="w-6 h-6" />
          ) : (
            <VideoCameraSlashIcon className="w-6 h-6" />
          )}
        </button>

        {/* Screen Share Control */}
        <button
          onClick={handleScreenShare}
          className={`p-3 rounded-full transition-all duration-200 ${
            isScreenSharing
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isDarkMode
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-gray-200 hover:bg-gray-300 text-black'
          }`}
          title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <StopIcon className="w-6 h-6" />
          ) : (
            <ComputerDesktopIcon className="w-6 h-6" />
          )}
        </button>

        {/* Toggle View Control - Only show when there are remote participants */}
        {hasRemoteParticipants && onToggleView && (
          <button
            onClick={onToggleView}
            className={`p-3 rounded-full transition-all duration-200 ${
              isLocalMain
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
            title={isLocalMain ? 'Show remote participant main' : 'Show your camera main'}
          >
            <ArrowsPointingInIcon className="w-6 h-6" />
          </button>
        )}

        {/* Divider */}
        <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>

        {/* Settings */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full transition-all duration-200 ${
              showSettings
                ? 'bg-red-500 text-white'
                : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
            title="Settings"
          >
            <CogIcon className="w-6 h-6" />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 rounded-lg shadow-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="p-4 space-y-4">
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  Media Settings
                </h3>

                {/* Video Settings */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Camera
                  </label>
                  <select className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}>
                    <option>Default Camera</option>
                  </select>
                </div>

                {/* Audio Settings */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Microphone
                  </label>
                  <select className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}>
                    <option>Default Microphone</option>
                  </select>
                </div>

                {/* Speaker Settings */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Speaker
                  </label>
                  <select className={`w-full px-3 py-2 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}>
                    <option>Default Speaker</option>
                  </select>
                </div>

                {/* Volume Control */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Volume
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="80"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                </div>

                {/* Test Buttons */}
                <div className="flex space-x-2">
                  <button className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    Test Camera
                  </button>
                  <button className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                    Test Mic
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Status indicators (hidden on mobile) */}
      <div className="hidden sm:flex items-center space-x-4">
        {/* Media State Indicators */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              mediaState.audio ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              MIC
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              mediaState.video ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              CAM
            </span>
          </div>
          
          {isScreenSharing && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                SCREEN
              </span>
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connected
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaControls;