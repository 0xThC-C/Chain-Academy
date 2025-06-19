import React, { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useChainId } from 'wagmi';
import { WalletIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import { useTheme } from '../contexts/ThemeContext';
import type { BaseComponentProps } from '@/types';
import UserAvatar from './UserAvatar';
import { useWebRTC } from '../contexts/WebRTCContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuthContext } from '../contexts/AuthContext';
import { 
  detectWallets, 
  wakeUpRabby
} from '../utils/walletDetection';

interface WalletConnectionProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  showNetwork?: boolean;
  showAvatar?: boolean;
  showAuthStatus?: boolean;
}

const WalletConnectionV2: React.FC<WalletConnectionProps> = ({
  className,
  size = 'md',
  showNetwork = true,
  showAvatar = true,
  showAuthStatus = true
}) => {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { profile } = useUserProfile();
  const { isDarkMode: _isDarkMode } = useTheme();
  const auth = useAuthContext();
  
  // Get session state for blocking wallet operations during active session
  const { isInActiveSession, requestLeaveSession } = useWebRTC();
  
  // Track if connection was initiated by user gesture
  const userInitiatedConnection = useRef(false);
  const lastConnectionCheck = useRef<number>(0);

  // Enhanced connection monitoring with authentication status
  useEffect(() => {
    const now = Date.now();
    // Throttle checks to avoid excessive processing
    if (now - lastConnectionCheck.current < 1000) return;
    lastConnectionCheck.current = now;

    console.log('🔌 Wallet Connection Debug:', {
      isConnected,
      address,
      network: chainId ? `Chain ${chainId}` : 'Unknown',
      chainId: chainId,
      userInitiated: userInitiatedConnection.current,
      isAuthenticated: auth.isAuthenticated,
      hasSessionToken: !!auth.sessionToken,
      timestamp: new Date().toISOString()
    });

    // Auto-trigger SIWE authentication for user-initiated connections
    if (isConnected && address && userInitiatedConnection.current && !auth.isAuthenticated) {
      console.log('🔐 User-initiated connection detected, triggering SIWE authentication...');
      
      // Small delay to ensure wallet is fully connected
      setTimeout(() => {
        auth.signIn().then(success => {
          if (success) {
            console.log('✅ SIWE authentication completed successfully');
          } else {
            console.log('❌ SIWE authentication failed or was cancelled');
          }
        }).catch(error => {
          console.error('❌ SIWE authentication error:', error);
        });
      }, 500);
    }

    // Reset user initiated flag after processing
    if (!isConnected) {
      userInitiatedConnection.current = false;
    }

    // Check for available wallets
    const wallets = detectWallets();
    console.log('🦊 Available wallets:', wallets);
  }, [isConnected, address, chainId, auth, userInitiatedConnection]);

  // Memoized address formatter
  const formatAddress = useCallback((addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  // Handle wallet operations with session protection
  const handleWalletOperation = useCallback((operation: () => void, operationName: string) => {
    if (!isInActiveSession) {
      operation();
      return;
    }

    requestLeaveSession(
      () => {
        console.log(`${operationName} authorized after session confirmation`);
        operation();
      },
      () => {
        console.log(`${operationName} cancelled - staying in active session`);
      }
    );
  }, [isInActiveSession, requestLeaveSession]);

  // Memoized size styles
  const sizeStyles = useMemo(() => ({
    sm: {
      button: 'px-3 py-1.5 text-xs',
      text: 'text-xs',
      avatar: 'sm'
    },
    md: {
      button: 'px-4 py-2 text-sm',
      text: 'text-sm',
      avatar: 'sm'
    },
    lg: {
      button: 'px-6 py-3 text-base',
      text: 'text-base',
      avatar: 'md'
    }
  }), []);

  // Handle connection with SIWE integration
  const handleConnect = useCallback(async () => {
    console.log('🔌 User initiated wallet connection...');
    console.log('🔍 AppKit open function:', { open, type: typeof open });
    
    // Mark this as a user-initiated connection
    userInitiatedConnection.current = true;
    
    // Detect available wallets and log status
    const wallets = detectWallets();
    console.log('🦊 Available wallets:', wallets);
    
    // Try to wake up Rabby if detected but not responding
    if (wallets.rabby.detected) {
      console.log('🦊 Attempting to wake up Rabby wallet...');
      await wakeUpRabby();
    }
    
    handleWalletOperation(() => {
      console.log('🔌 Opening AppKit wallet selection modal');
      try {
        const result = open();
        console.log('🔍 AppKit open result:', result);
      } catch (error) {
        console.error('❌ Error opening AppKit modal:', error);
      }
      
    }, 'Wallet Connection');
  }, [open, handleWalletOperation]);

  const handleAccountView = useCallback(() => {
    handleWalletOperation(() => open({ view: 'Account' }), 'Account View');
  }, [handleWalletOperation, open]);

  const handleNetworkSwitch = useCallback(() => {
    handleWalletOperation(() => open({ view: 'Networks' }), 'Network Switch');
  }, [handleWalletOperation, open]);

  // Authentication button for manual sign-in
  const handleSignIn = useCallback(async () => {
    if (!isConnected || !address) {
      console.warn('Cannot sign in: wallet not connected');
      return;
    }
    
    try {
      const success = await auth.signIn();
      if (!success) {
        console.warn('SIWE authentication failed or was cancelled');
      }
    } catch (error) {
      console.error('Error during manual sign-in:', error);
    }
  }, [isConnected, address, auth]);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }, [auth]);

  if (isConnected && address) {
    return (
      <div className={cn('flex items-center', className, size === 'sm' ? 'space-x-2' : 'space-x-4')}>
        {/* Authentication Status Indicator */}
        {showAuthStatus && (
          <div className={cn(
            'flex items-center rounded-lg border px-3 py-1',
            sizeStyles[size].text,
            auth.isAuthenticated 
              ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
          )}>
            {auth.isAuthenticated ? (
              <>
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                <span className="font-medium">Authenticated</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                <span className="font-medium">Not Signed</span>
              </>
            )}
          </div>
        )}

        {/* Network Selector Button */}
        {showNetwork && (
          <button
            onClick={handleNetworkSwitch}
            disabled={isInActiveSession}
            className={cn(
              'flex items-center font-medium rounded-lg border transition-colors',
              sizeStyles[size].button,
              sizeStyles[size].text,
              isInActiveSession 
                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            )}
            title={isInActiveSession ? "Network switching disabled during session" : "Switch Network"}
          >
            <div className={cn(
              'w-2 h-2 rounded-full mr-2',
              isInActiveSession ? 'bg-gray-400' : 'bg-green-500'
            )} />
            <span>{chainId ? `Chain ${chainId}` : 'Unknown'}</span>
          </button>
        )}

        {/* Address Display with Avatar - Click to open account view */}
        <button
          onClick={handleAccountView}
          disabled={isInActiveSession}
          className={cn(
            'flex items-center font-medium rounded-lg border transition-colors',
            sizeStyles[size].button,
            sizeStyles[size].text,
            isInActiveSession
              ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          title={isInActiveSession ? "Account management disabled during session" : "Manage Account"}
        >
          {showAvatar && (
            <UserAvatar 
              address={address} 
              profileImage={profile.profileImage} 
              size={sizeStyles[size].avatar as any}
              className="mr-2" 
            />
          )}
          <span>{formatAddress(address)}</span>
        </button>

        {/* Authentication Control Button */}
        {!auth.isAuthenticated && !auth.isLoading && (
          <button
            onClick={handleSignIn}
            disabled={isInActiveSession}
            className={cn(
              'flex items-center font-medium rounded-lg border transition-colors',
              sizeStyles[size].button,
              sizeStyles[size].text,
              isInActiveSession
                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
            )}
            title={isInActiveSession ? "Authentication disabled during session" : "Sign In with SIWE"}
          >
            <ShieldCheckIcon className="w-4 h-4 mr-1" />
            <span>Sign In</span>
          </button>
        )}

        {/* Loading state during authentication */}
        {auth.isLoading && (
          <div className={cn(
            'flex items-center rounded-lg border px-3 py-1',
            sizeStyles[size].text,
            'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
          )}>
            <div className="animate-spin w-4 h-4 mr-2 border-2 border-blue-300 border-t-blue-600 rounded-full"></div>
            <span>Signing In...</span>
          </div>
        )}

        {/* Sign Out Button (when authenticated) */}
        {auth.isAuthenticated && (
          <button
            onClick={handleSignOut}
            disabled={isInActiveSession}
            className={cn(
              'flex items-center font-medium rounded-lg border transition-colors',
              sizeStyles[size].button,
              sizeStyles[size].text,
              isInActiveSession
                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
            )}
            title={isInActiveSession ? "Sign out disabled during session" : "Sign Out"}
          >
            <span>Sign Out</span>
          </button>
        )}
      </div>
    );
  }


  return (
    <button
      onClick={handleConnect}
      className={cn(
        'flex items-center font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors',
        sizeStyles[size].button,
        sizeStyles[size].text,
        className
      )}
    >
      <WalletIcon className={cn(
        'mr-2',
        size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
      )} />
      Connect Wallet
    </button>
  );
};

// Export memoized component for better performance
export default memo(WalletConnectionV2);