import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  PlayIcon,
  PauseIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface ProgressivePaymentIndicatorProps {
  sessionData: {
    totalAmount: bigint;
    releasedAmount: bigint;
    sessionDuration: number;
    startTime: number;
    isActive: boolean;
    isPaused: boolean;
    status: number;
  } | null;
  timeElapsed: number;
  progressPercentage: number;
  paymentReleased: number;
  availablePayment: bigint;
  needsHeartbeat: boolean;
  shouldAutoPause: boolean;
  isConnected: boolean;
  onReleasePayment?: () => void;
  onSendHeartbeat?: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  className?: string;
}

const ProgressivePaymentIndicator: React.FC<ProgressivePaymentIndicatorProps> = ({
  sessionData,
  timeElapsed,
  progressPercentage: _progressPercentage,
  paymentReleased,
  availablePayment,
  needsHeartbeat,
  shouldAutoPause,
  isConnected,
  onReleasePayment,
  onSendHeartbeat,
  onPauseSession,
  onResumeSession,
  className = ''
}) => {
  const { isDarkMode } = useTheme();
  const [heartbeatStatus, setHeartbeatStatus] = useState<'good' | 'warning' | 'critical'>('good');
  
  // Calculate progress values
  const totalAmount = sessionData ? Number(sessionData.totalAmount) / 1e18 : 0; // Convert from wei
  const sessionProgress = sessionData ? Math.min((timeElapsed / sessionData.sessionDuration) * 100, 100) : 0;
  const paymentProgress = totalAmount > 0 ? (paymentReleased / totalAmount) * 100 : 0;
  const availablePaymentUSD = Number(availablePayment) / 1e18;

  // Update heartbeat status
  useEffect(() => {
    if (shouldAutoPause) {
      setHeartbeatStatus('critical');
    } else if (needsHeartbeat) {
      setHeartbeatStatus('warning');
    } else {
      setHeartbeatStatus('good');
    }
  }, [needsHeartbeat, shouldAutoPause]);

  // Format time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  // Get status info
  const getStatusInfo = () => {
    if (!sessionData) return { text: 'No session data', color: 'text-gray-500' };
    
    switch (sessionData.status) {
      case 0: return { text: 'Created', color: 'text-blue-500' };
      case 1: 
        if (sessionData.isPaused) {
          return { text: 'Paused', color: 'text-yellow-500' };
        }
        return { text: 'Active', color: 'text-green-500' };
      case 2: return { text: 'Paused', color: 'text-yellow-500' };
      case 3: return { text: 'Completed', color: 'text-green-500' };
      case 4: return { text: 'Cancelled', color: 'text-red-500' };
      default: return { text: 'Unknown', color: 'text-gray-500' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`${className} ${isDarkMode ? 'bg-black border-gray-700' : 'bg-white border-gray-300'} border rounded-lg p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Progressive Payment
        </h3>
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className={`flex items-center space-x-1 ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            <SignalIcon className="w-4 h-4" />
            <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {/* Session Status */}
          <div className={`flex items-center space-x-1 ${statusInfo.color}`}>
            {sessionData?.status === 1 && !sessionData?.isPaused ? (
              <PlayIcon className="w-4 h-4" />
            ) : sessionData?.isPaused ? (
              <PauseIcon className="w-4 h-4" />
            ) : (
              <ClockIcon className="w-4 h-4" />
            )}
            <span className="text-xs">{statusInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Dual Progress Bars */}
      <div className="space-y-3">
        {/* Session Time Progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium flex items-center space-x-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <ClockIcon className="w-3 h-3" />
              <span>Session Progress</span>
            </span>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {Math.round(sessionProgress)}%
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
              style={{ width: `${sessionProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatTime(timeElapsed)}
            </span>
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {sessionData ? formatTime(sessionData.sessionDuration) : '0m'}
            </span>
          </div>
        </div>

        {/* Payment Progress */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-medium flex items-center space-x-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <CurrencyDollarIcon className="w-3 h-3" />
              <span>Payment Released</span>
            </span>
            <span className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {Math.round(paymentProgress)}%
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              ${paymentReleased.toFixed(2)}
            </span>
            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              ${totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-3 space-y-2`}>
        <div className="flex justify-between items-center">
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Available for Release:
          </span>
          <span className={`text-sm font-semibold ${availablePaymentUSD > 0 ? 'text-green-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            ${availablePaymentUSD.toFixed(2)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Next Release:
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {sessionData?.isActive && !sessionData?.isPaused ? 'In ~3 minutes' : 'Session paused'}
          </span>
        </div>
      </div>

      {/* Heartbeat Status */}
      <div className={`flex items-center justify-between p-2 rounded ${
        heartbeatStatus === 'critical' 
          ? 'bg-red-500/10 border border-red-500/20' 
          : heartbeatStatus === 'warning'
          ? 'bg-yellow-500/10 border border-yellow-500/20'
          : 'bg-green-500/10 border border-green-500/20'
      }`}>
        <div className="flex items-center space-x-2">
          {heartbeatStatus === 'critical' ? (
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
          ) : heartbeatStatus === 'warning' ? (
            <ClockIcon className="w-4 h-4 text-yellow-500" />
          ) : (
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
          )}
          <span className={`text-xs font-medium ${
            heartbeatStatus === 'critical' 
              ? 'text-red-500' 
              : heartbeatStatus === 'warning'
              ? 'text-yellow-500'
              : 'text-green-500'
          }`}>
            {heartbeatStatus === 'critical' 
              ? 'Connection Lost' 
              : heartbeatStatus === 'warning'
              ? 'Heartbeat Needed'
              : 'Connection Stable'
            }
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {availablePaymentUSD > 0.01 && onReleasePayment && (
            <button
              onClick={onReleasePayment}
              className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            >
              Release ${availablePaymentUSD.toFixed(2)}
            </button>
          )}
          
          {needsHeartbeat && onSendHeartbeat && (
            <button
              onClick={onSendHeartbeat}
              className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Send Heartbeat
            </button>
          )}
          
          {sessionData?.isActive && !sessionData?.isPaused && onPauseSession && (
            <button
              onClick={onPauseSession}
              className="px-2 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
            >
              Pause
            </button>
          )}
          
          {sessionData?.isPaused && onResumeSession && (
            <button
              onClick={onResumeSession}
              className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
            >
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {sessionData?.isPaused && (
        <div className={`text-xs p-2 rounded ${isDarkMode ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/20' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'}`}>
          ⚠️ Session is paused. Payments are on hold until session resumes.
        </div>
      )}
      
      {!isConnected && (
        <div className={`text-xs p-2 rounded ${isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-500/20' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          🔌 WebRTC disconnected. Session will auto-pause after 2-minute grace period.
        </div>
      )}
      
      {sessionData?.status === 3 && (
        <div className={`text-xs p-2 rounded ${isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-800 border border-green-300'}`}>
          ✅ Session completed! All payments have been processed.
        </div>
      )}
    </div>
  );
};

export default ProgressivePaymentIndicator;