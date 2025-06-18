import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth, AuthHook } from '../hooks/useAuth';
import { useAccount } from 'wagmi';

// Context for authentication state and methods
const AuthContext = createContext<AuthHook | undefined>(undefined);

// Hook to use the auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();
  const { isConnected, address } = useAccount();
  
  // Enhanced security monitoring
  useEffect(() => {
    // Monitor for potential security issues
    const securityMonitor = () => {
      // Check for session hijacking attempts
      if (auth.isAuthenticated && auth.address && address && auth.address !== address) {
        console.warn('🚨 SECURITY ALERT: Address mismatch detected, signing out');
        auth.signOut();
        return;
      }
      
      // Check for cross-tab session synchronization
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'auth_session') {
          if (!e.newValue && auth.isAuthenticated) {
            console.log('Session cleared in another tab, syncing...');
            auth.signOut();
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    };
    
    const cleanup = securityMonitor();
    return cleanup;
  }, [auth, address]);
  
  // Auto-logout on wallet disconnect
  useEffect(() => {
    if (!isConnected && auth.isAuthenticated) {
      console.log('Wallet disconnected, clearing authentication...');
      auth.signOut();
    }
  }, [isConnected, auth]);
  
  // Session timeout warning
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.sessionExpiry) {
      return;
    }
    
    const timeUntilExpiry = auth.sessionExpiry.getTime() - Date.now();
    const warningTime = 15 * 60 * 1000; // 15 minutes before expiry
    
    if (timeUntilExpiry <= warningTime) {
      return; // Already close to expiry
    }
    
    const warningTimeout = setTimeout(() => {
      if (auth.isAuthenticated) {
        const shouldRefresh = window.confirm(
          '⚠️ Session Expiring Soon\n\n' +
          'Your authentication session will expire in 15 minutes.\n\n' +
          'Would you like to refresh your session now to avoid interruption?'
        );
        
        if (shouldRefresh) {
          // Trigger re-authentication
          auth.signIn().catch(() => {
            console.warn('Failed to refresh session, user will need to sign in again');
          });
        }
      }
    }, timeUntilExpiry - warningTime);
    
    return () => clearTimeout(warningTimeout);
  }, [auth.isAuthenticated, auth.sessionExpiry, auth]);
  
  // Debug logging in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Auth State:', {
        isAuthenticated: auth.isAuthenticated,
        address: auth.address,
        hasSessionToken: !!auth.sessionToken,
        sessionExpiry: auth.sessionExpiry?.toISOString(),
        isLoading: auth.isLoading,
        error: auth.error
      });
    }
  }, [auth]);
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

// HOC for components that require authentication
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const auth = useAuthContext();
    
    if (!auth.isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please connect your wallet and sign in to access this feature.
            </p>
            <button
              onClick={auth.signIn}
              disabled={auth.isLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {auth.isLoading ? 'Signing In...' : 'Sign In with Wallet'}
            </button>
            {auth.error && (
              <p className="text-red-500 mt-4 text-sm">{auth.error}</p>
            )}
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

// Hook for protected routes
export const useRequireAuth = () => {
  const auth = useAuthContext();
  const { isConnected } = useAccount();
  
  useEffect(() => {
    if (!isConnected) {
      console.log('Wallet not connected, authentication not possible');
      return;
    }
    
    if (!auth.isAuthenticated) {
      console.log('User not authenticated, prompting sign in...');
      // Could trigger automatic sign-in prompt or redirect
    }
  }, [isConnected, auth.isAuthenticated]);
  
  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    signIn: auth.signIn
  };
};

export default AuthContext;