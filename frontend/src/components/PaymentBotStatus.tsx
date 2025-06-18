import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface BotStatus {
  isRunning: boolean;
  isPaused: boolean;
  lastExecution: {
    id: string;
    startTime: number;
    endTime: number;
    success: boolean;
    totalProcessed: number;
    successfulPayments: number;
    failedPayments: number;
  } | null;
  nextExecution: string;
  uptime: number;
}

interface BotMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  recentExecutions: any[];
}

export const PaymentBotStatus: React.FC = () => {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [metrics, setMetrics] = useState<BotMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBotStatus = async () => {
    try {
      const [statusResponse, metricsResponse] = await Promise.all([
        fetch('/api/bot/health'),
        fetch('/api/bot/status')
      ]);
      
      if (!statusResponse.ok || !metricsResponse.ok) {
        throw new Error('Failed to fetch bot status');
      }
      
      const statusData = await statusResponse.json();
      const metricsData = await metricsResponse.json();
      
      setStatus(statusData);
      setMetrics(metricsData.execution);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualExecution = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bot/execute', { method: 'POST' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute bot');
      }
      
      // Refresh status after execution
      await fetchBotStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    }
  };

  const handlePauseResume = async () => {
    try {
      const action = status?.isPaused ? 'resume' : 'pause';
      const response = await fetch(`/api/bot/${action}`, { method: 'POST' });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} bot`);
      }
      
      await fetchBotStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot status');
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = () => {
    if (status?.isPaused) {
      return <PauseIcon className="w-5 h-5 text-yellow-500" />;
    } else if (status?.isRunning) {
      return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
    } else {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = () => {
    if (status?.isPaused) return 'Paused';
    if (status?.isRunning) return 'Running';
    return 'Active';
  };

  const getStatusColor = () => {
    if (status?.isPaused) return 'border-yellow-500 bg-yellow-50';
    if (status?.isRunning) return 'border-blue-500 bg-blue-50';
    return 'border-green-500 bg-green-50';
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 text-red-600 mb-4">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Bot Status Error</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchBotStatus}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full border-2 ${getStatusColor()}`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Bot</h3>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handlePauseResume}
            disabled={loading}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              status?.isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            } disabled:opacity-50`}
          >
            {status?.isPaused ? (
              <><PlayIcon className="w-4 h-4 inline mr-1" />Resume</>
            ) : (
              <><PauseIcon className="w-4 h-4 inline mr-1" />Pause</>
            )}
          </button>
          
          <button
            onClick={handleManualExecution}
            disabled={loading || status?.isRunning || status?.isPaused}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4 inline mr-1" />
            Execute Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ClockIcon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Uptime</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {status ? formatUptime(status.uptime) : '-'}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircleIcon className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Success Rate</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {metrics ? (
              metrics.totalExecutions > 0 
                ? `${Math.round((metrics.successfulExecutions / metrics.totalExecutions) * 100)}%`
                : 'N/A'
            ) : '-'}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <ArrowPathIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Total Executions</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {metrics?.totalExecutions || 0}
          </p>
        </div>
      </div>

      {status?.lastExecution && (
        <div className="border-t pt-4">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Last Execution</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Started:</span>
                <p className="font-medium">{formatDate(status.lastExecution.startTime)}</p>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <p className="font-medium">
                  {Math.round((status.lastExecution.endTime - status.lastExecution.startTime) / 1000)}s
                </p>
              </div>
              <div>
                <span className="text-gray-600">Processed:</span>
                <p className="font-medium">{status.lastExecution.totalProcessed}</p>
              </div>
              <div>
                <span className="text-gray-600">Success:</span>
                <p className={`font-medium ${
                  status.lastExecution.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.lastExecution.successfulPayments}/{status.lastExecution.totalProcessed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Next scheduled execution: {status?.nextExecution || 'Not scheduled'}
          </span>
          <button
            onClick={fetchBotStatus}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};