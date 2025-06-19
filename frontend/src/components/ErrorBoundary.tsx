import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });

    // Report error to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).errorReporting) {
      (window as any).errorReporting.captureException(error, { extra: errorInfo });
    }
  }

  override componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  override render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const handleGoHome = () => {
    try {
      resetError();
      // Use history.pushState instead of navigate to avoid React Router issues
      window.history.pushState({}, '', '/');
      window.location.reload();
    } catch (navError) {
      console.error('Navigation error:', navError);
      // Fallback: force navigation
      window.location.href = '/';
    }
  };

  const handleRefresh = () => {
    try {
      resetError();
      window.location.reload();
    } catch (refreshError) {
      console.error('Refresh error:', refreshError);
      // Fallback: force reload
      window.location.reload();
    }
  };

  const handleRetry = () => {
    resetError();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-red-500 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-red-500">
          Something went wrong
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error?.message || 'An unexpected error occurred'}
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-left bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors mr-3"
          >
            Try Again
          </button>
          <button
            onClick={handleRefresh}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors mr-3"
          >
            Refresh Page
          </button>
          <button
            onClick={handleGoHome}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;