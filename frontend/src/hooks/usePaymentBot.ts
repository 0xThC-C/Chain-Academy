import { useState, useEffect, useCallback } from 'react';

interface PaymentBotStatus {
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

interface PaymentBotMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  recentExecutions: any[];
}

interface UsePaymentBotReturn {
  status: PaymentBotStatus | null;
  metrics: PaymentBotMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  executeManually: () => Promise<void>;
  pauseBot: () => Promise<void>;
  resumeBot: () => Promise<void>;
}

/**
 * Hook for managing Payment Bot status and operations
 * Provides real-time bot status, metrics, and control functions
 */
export const usePaymentBot = (): UsePaymentBotReturn => {
  const [status, setStatus] = useState<PaymentBotStatus | null>(null);
  const [metrics, setMetrics] = useState<PaymentBotMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBotData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusResponse, metricsResponse] = await Promise.all([
        fetch('/api/bot/health'),
        fetch('/api/bot/status')
      ]);
      
      if (!statusResponse.ok) {
        throw new Error(`Health check failed: ${statusResponse.status}`);
      }
      
      if (!metricsResponse.ok) {
        throw new Error(`Metrics fetch failed: ${metricsResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      const metricsData = await metricsResponse.json();
      
      setStatus(statusData);
      setMetrics(metricsData.execution);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to fetch bot data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeManually = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bot/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Manual execution failed');
      }
      
      const result = await response.json();
      console.log('Manual execution result:', result);
      
      // Refetch data to get updated status
      await fetchBotData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Manual execution failed';
      setError(errorMessage);
      console.error('Manual execution error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchBotData]);

  const pauseBot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bot/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to pause bot');
      }
      
      // Update local status immediately for better UX
      setStatus(prev => prev ? { ...prev, isPaused: true } : null);
      
      // Refetch to confirm
      await fetchBotData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause bot';
      setError(errorMessage);
      console.error('Pause bot error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchBotData]);

  const resumeBot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bot/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume bot');
      }
      
      // Update local status immediately for better UX
      setStatus(prev => prev ? { ...prev, isPaused: false } : null);
      
      // Refetch to confirm
      await fetchBotData();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume bot';
      setError(errorMessage);
      console.error('Resume bot error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchBotData]);

  // Initial fetch and setup polling
  useEffect(() => {
    fetchBotData();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBotData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchBotData]);

  // Visibility change handler to refetch when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBotData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBotData]);

  return {
    status,
    metrics,
    loading,
    error,
    refetch: fetchBotData,
    executeManually,
    pauseBot,
    resumeBot
  };
};

/**
 * Hook for monitoring bot execution history
 */
export const usePaymentBotHistory = (limit: number = 50) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/bot/history/${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }
      
      const data = await response.json();
      setHistory(data.executions || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(errorMessage);
      console.error('Failed to fetch bot history:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
};

/**
 * Hook for bot health monitoring with alerts
 */
export const usePaymentBotHealth = () => {
  const { status, metrics } = usePaymentBot();
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [healthMessages, setHealthMessages] = useState<string[]>([]);

  useEffect(() => {
    if (!status || !metrics) return;

    const messages: string[] = [];
    let level: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check if bot is paused
    if (status.isPaused) {
      messages.push('Bot is currently paused');
      level = 'warning';
    }

    // Check last execution time
    if (status.lastExecution) {
      const timeSinceLastExecution = Date.now() - status.lastExecution.endTime;
      const hoursOld = timeSinceLastExecution / (1000 * 60 * 60);
      
      if (hoursOld > 25) {
        messages.push(`Last execution was ${Math.round(hoursOld)} hours ago`);
        level = 'critical';
      } else if (hoursOld > 24.5) {
        messages.push('Next execution is overdue');
        level = 'warning';
      }
    }

    // Check failure rate
    if (metrics.totalExecutions > 0) {
      const failureRate = metrics.failedExecutions / metrics.totalExecutions;
      if (failureRate > 0.5) {
        messages.push(`High failure rate: ${Math.round(failureRate * 100)}%`);
        level = 'critical';
      } else if (failureRate > 0.2) {
        messages.push(`Elevated failure rate: ${Math.round(failureRate * 100)}%`);
        if (level === 'healthy') level = 'warning';
      }
    }

    // Check recent failures
    if (metrics.recentExecutions) {
      const recentFailures = metrics.recentExecutions.slice(0, 5).filter(e => !e.success);
      if (recentFailures.length >= 3) {
        messages.push('Multiple recent execution failures');
        level = 'critical';
      } else if (recentFailures.length >= 2) {
        messages.push('Recent execution failures detected');
        if (level === 'healthy') level = 'warning';
      }
    }

    setHealthStatus(level);
    setHealthMessages(messages);
  }, [status, metrics]);

  return {
    healthStatus,
    healthMessages,
    isHealthy: healthStatus === 'healthy'
  };
};