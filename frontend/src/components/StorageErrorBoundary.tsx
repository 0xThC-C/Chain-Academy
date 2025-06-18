import { Component, ErrorInfo, ReactNode } from 'react';
import { autoFixStorageIssues, emergencyStorageReset, detectStorageIssues } from '../utils/storageCleanup';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isFixing: boolean;
  fixAttempted: boolean;
}

class StorageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isFixing: false,
      fixAttempted: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a storage-related error
    const isStorageError = 
      error.message?.includes('IndexedDB') ||
      error.message?.includes('IDBDatabase') ||
      error.message?.includes('transaction') ||
      error.message?.includes('object stores') ||
      error.message?.includes('localStorage') ||
      error.message?.includes('sessionStorage') ||
      error.name === 'NotFoundError' ||
      error.name === 'DataError' ||
      error.name === 'QuotaExceededError';

    if (isStorageError) {
      console.error('🚨 StorageErrorBoundary: Storage-related error detected:', error);
      return { hasError: true, error };
    }

    // Not a storage error, don't handle it
    return {};
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 StorageErrorBoundary: Error caught:', error, errorInfo);
    
    // Only handle storage-related errors
    const isStorageError = 
      error.message?.includes('IndexedDB') ||
      error.message?.includes('IDBDatabase') ||
      error.message?.includes('transaction') ||
      error.message?.includes('object stores') ||
      error.message?.includes('localStorage') ||
      error.message?.includes('sessionStorage') ||
      error.name === 'NotFoundError' ||
      error.name === 'DataError' ||
      error.name === 'QuotaExceededError';

    if (isStorageError) {
      this.setState({
        hasError: true,
        error,
        errorInfo
      });

      // Attempt automatic fix if not already attempted
      if (!this.state.fixAttempted) {
        this.attemptAutoFix();
      }
    } else {
      // Re-throw non-storage errors
      throw error;
    }
  }

  attemptAutoFix = async () => {
    if (this.state.isFixing || this.state.fixAttempted) return;

    console.log('🔧 StorageErrorBoundary: Attempting automatic storage fix...');
    this.setState({ isFixing: true, fixAttempted: true });

    try {
      const success = await autoFixStorageIssues();
      
      if (success) {
        console.log('✅ StorageErrorBoundary: Auto-fix successful, attempting recovery...');
        
        // Small delay then try to recover
        setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isFixing: false
          });
        }, 1000);
      } else {
        console.warn('⚠️ StorageErrorBoundary: Auto-fix failed');
        this.setState({ isFixing: false });
      }
    } catch (error) {
      console.error('❌ StorageErrorBoundary: Auto-fix error:', error);
      this.setState({ isFixing: false });
    }
  };

  handleManualFix = async () => {
    this.setState({ isFixing: true });

    try {
      const success = await autoFixStorageIssues();
      
      if (success) {
        // Try to recover after manual fix
        setTimeout(() => {
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isFixing: false
          });
        }, 500);
      } else {
        this.setState({ isFixing: false });
      }
    } catch (error) {
      console.error('❌ StorageErrorBoundary: Manual fix error:', error);
      this.setState({ isFixing: false });
    }
  };

  handleEmergencyReset = async () => {
    if (window.confirm(
      '⚠️ Emergency Storage Reset\n\n' +
      'This will clear ALL browser storage data for this site, including:\n' +
      '• Wallet connections\n' +
      '• User preferences\n' +
      '• Session data\n' +
      '• Cached data\n\n' +
      'Are you sure you want to continue?'
    )) {
      this.setState({ isFixing: true });
      await emergencyStorageReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      const diagnostics = detectStorageIssues();
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Storage Error Detected
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                There was an issue with browser storage that prevented the app from loading properly.
              </p>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Diagnostics */}
            {diagnostics.hasIssues && (
              <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Detected Issues:
                </h3>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  {diagnostics.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Loading State */}
            {this.state.isFixing && (
              <div className="mb-6 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Fixing storage issues...
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {!this.state.isFixing && (
                <>
                  <button
                    onClick={this.handleManualFix}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Auto-Fix
                  </button>
                  
                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleEmergencyReset}
                    className="w-full flex justify-center py-2 px-4 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Emergency Reset
                  </button>
                </>
              )}
            </div>

            {/* Technical Details (Collapsible) */}
            <details className="mt-6">
              <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400">
                Technical Details
              </summary>
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                <div>Error: {this.state.error?.name}</div>
                <div>Message: {this.state.error?.message}</div>
                {this.state.errorInfo && (
                  <div>Stack: {this.state.errorInfo.componentStack}</div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default StorageErrorBoundary;