import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

interface ErrorRecoveryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  recoveryAttempts: number;
  isRecovering: boolean;
  corruptionDetected: boolean;
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  maxRecoveryAttempts?: number;
  enableAutoRecovery?: boolean;
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  recoveryAttempts: number;
  isRecovering: boolean;
  corruptionDetected: boolean;
  onRecover: () => void;
  onForceReload: () => void;
  onClearState: () => void;
}

// Development mode corruption detection patterns
const CORRUPTION_PATTERNS = [
  /Cannot read prop/i,
  /Cannot access before initialization/i,
  /Maximum update depth exceeded/i,
  /Cannot update a component while rendering/i,
  /Memory limit exceeded/i,
  /WebSocket/i,
  /Network request failed/i,
  /Hydration/i,
  /chunk loading/i
];

// State validation and cleanup utilities
const StateValidator = {
  validateLocalStorage(): boolean {
    try {
      localStorage.setItem('__test__', 'test');
      localStorage.removeItem('__test__');
      return true;
    } catch {
      return false;
    }
  },

  validateSessionStorage(): boolean {
    try {
      sessionStorage.setItem('__test__', 'test');
      sessionStorage.removeItem('__test__');
      return true;
    } catch {
      return false;
    }
  },

  detectCorruption(error: Error): boolean {
    if (!error?.message) return false;
    return CORRUPTION_PATTERNS.some(pattern => pattern.test(error.message));
  },

  emergencyCleanup(): void {
    try {
      // Clear potentially corrupted storage
      const keysToPreserve = ['darkMode', 'wagmi.connected', 'wagmi.store'];
      const localStorageBackup: Record<string, string> = {};
      
      // Backup important keys
      keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) localStorageBackup[key] = value;
      });

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Restore important keys
      Object.entries(localStorageBackup).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn(`Failed to restore ${key}:`, e);
        }
      });

      // Clear any global window properties that might be corrupted
      if (typeof window !== 'undefined') {
        delete (window as any).__webpackChunkName;
        delete (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        // Reset webpack HMR state if in development
        if (process.env.NODE_ENV === 'development') {
          delete (window as any).webpackHotUpdate;
          delete (window as any).__webpack_require__;
        }
      }

      console.log('Emergency cleanup completed');
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  },

  async validateWebSocketHealth(): Promise<boolean> {
    try {
      // Check if WebSocket connections are healthy
      const testWs = new WebSocket('ws://echo.websocket.org');
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          testWs.close();
          resolve(false);
        }, 1000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve(true);
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }
};

class EnhancedErrorBoundary extends React.Component<EnhancedErrorBoundaryProps, ErrorRecoveryState> {
  private recoveryTimeoutId: NodeJS.Timeout | null = null;
  // private mountTime: number = Date.now(); // Used for performance tracking

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      recoveryAttempts: 0,
      isRecovering: false,
      corruptionDetected: false
    };

    // Bind methods
    this.handleRecover = this.handleRecover.bind(this);
    this.handleForceReload = this.handleForceReload.bind(this);
    this.handleClearState = this.handleClearState.bind(this);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorRecoveryState> {
    const corruptionDetected = StateValidator.detectCorruption(error);
    
    return {
      hasError: true,
      error,
      corruptionDetected
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Enhanced Error Boundary caught error:', error, errorInfo);
    
    this.setState((_prevState) => ({
      error,
      errorInfo,
      corruptionDetected: StateValidator.detectCorruption(error)
    }));

    // Automatic recovery for development mode corruption
    if (process.env.NODE_ENV === 'development' && this.props.enableAutoRecovery !== false) {
      this.attemptAutoRecovery(error);
    }

    // Report to external monitoring if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, {
        extra: errorInfo,
        tags: {
          component: 'EnhancedErrorBoundary',
          recoveryAttempts: this.state.recoveryAttempts,
          corruptionDetected: this.state.corruptionDetected
        }
      });
    }
  }

  override componentWillUnmount() {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
  }

  async attemptAutoRecovery(_error: Error): Promise<void> {
    const maxAttempts = this.props.maxRecoveryAttempts || 3;
    
    if (this.state.recoveryAttempts >= maxAttempts) {
      console.log('Max recovery attempts reached');
      return;
    }

    this.setState({ isRecovering: true });

    try {
      // Progressive recovery strategy
      if (this.state.recoveryAttempts === 0) {
        // First attempt: Simple reset
        await this.simpleRecovery();
      } else if (this.state.recoveryAttempts === 1) {
        // Second attempt: Clear corrupted state
        await this.stateCleanupRecovery();
      } else {
        // Final attempt: Emergency cleanup
        await this.emergencyRecovery();
      }

      // Delay before attempting recovery
      this.recoveryTimeoutId = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          recoveryAttempts: prevState.recoveryAttempts + 1,
          isRecovering: false
        }));
      }, 1000 + (this.state.recoveryAttempts * 500));

    } catch (recoveryError) {
      console.error('Auto recovery failed:', recoveryError);
      this.setState({ isRecovering: false });
    }
  }

  async simpleRecovery(): Promise<void> {
    console.log('Attempting simple recovery...');
    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  async stateCleanupRecovery(): Promise<void> {
    console.log('Attempting state cleanup recovery...');
    
    // Validate and fix storage
    if (!StateValidator.validateLocalStorage()) {
      StateValidator.emergencyCleanup();
    }

    // Validate WebSocket health
    const wsHealthy = await StateValidator.validateWebSocketHealth();
    if (!wsHealthy) {
      console.warn('WebSocket health check failed');
    }
  }

  async emergencyRecovery(): Promise<void> {
    console.log('Attempting emergency recovery...');
    StateValidator.emergencyCleanup();
  }

  handleRecover(): void {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      isRecovering: false
    });
  }

  handleForceReload(): void {
    try {
      // Clean slate reload
      StateValidator.emergencyCleanup();
      window.location.reload();
    } catch (error) {
      console.error('Force reload failed:', error);
      window.location.reload();
    }
  }

  handleClearState(): void {
    try {
      StateValidator.emergencyCleanup();
      this.handleRecover();
    } catch (err) {
      console.error('Clear state failed:', err);
      this.handleForceReload();
    }
  }

  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          recoveryAttempts={this.state.recoveryAttempts}
          isRecovering={this.state.isRecovering}
          corruptionDetected={this.state.corruptionDetected}
          onRecover={this.handleRecover}
          onForceReload={this.handleForceReload}
          onClearState={this.handleClearState}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  recoveryAttempts,
  isRecovering,
  corruptionDetected,
  onRecover,
  onForceReload,
  onClearState
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="text-center max-w-lg mx-auto">
        <div className={`${
          corruptionDetected ? 'bg-orange-500' : 'bg-red-500'
        } rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
          <ExclamationTriangleIcon className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-semibold mb-2 text-red-500">
          {corruptionDetected ? 'State Corruption Detected' : 'Something went wrong'}
        </h2>

        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {corruptionDetected
            ? 'The application state has become corrupted. This often happens during development.'
            : error?.message || 'An unexpected error occurred'
          }
        </p>

        {isDevelopment && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 text-left">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <strong>Development Info:</strong>
            </p>
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li>• Recovery attempts: {recoveryAttempts}/3</li>
              <li>• Corruption detected: {corruptionDetected ? 'Yes' : 'No'}</li>
              <li>• Auto-recovery: {isRecovering ? 'In progress...' : 'Available'}</li>
            </ul>
          </div>
        )}

        {error && isDevelopment && (
          <details className="mb-4 text-left bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
            <pre className="mt-2 text-xs overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          {!isRecovering && (
            <>
              <button
                onClick={onRecover}
                disabled={isRecovering}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors mr-3 inline-flex items-center"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
              </button>

              {corruptionDetected && (
                <button
                  onClick={onClearState}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors mr-3"
                >
                  Clear State & Retry
                </button>
              )}

              <button
                onClick={onForceReload}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors mr-3"
              >
                Reload Application
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors inline-flex items-center"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Go to Home
              </button>
            </>
          )}

          {isRecovering && (
            <div className="flex items-center justify-center space-x-2 text-blue-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Attempting recovery...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedErrorBoundary;
export { StateValidator };