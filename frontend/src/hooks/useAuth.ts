import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

// SIWE Authentication Types
export interface SiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  address: string | null;
  sessionToken: string | null;
  sessionExpiry: Date | null;
  isLoading: boolean;
  error: string | null;
  nonce: string | null;
}

export interface AuthHook extends AuthState {
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isSessionValid: () => boolean;
  createSiweMessage: (nonce: string) => SiweMessage;
  verifySignature: (message: string, signature: string) => Promise<boolean>;
}

// Crypto-secure nonce generation
const generateCryptoNonce = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// JWT-like session token generation (client-side only for demo)
const generateSessionToken = (address: string, nonce: string): string => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };
  
  const payload = {
    sub: address,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
    nonce: nonce,
    iss: 'chain-academy-v2'
  };
  
  // Base64 encode (simplified for demo - in production use proper JWT library)
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // In production, this would be signed with server secret
  const signature = btoa(`${encodedHeader}.${encodedPayload}.signature`);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

// Session token validation
const validateSessionToken = (token: string): { valid: boolean; expired: boolean; payload?: any } => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, expired: false };
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return {
      valid: true,
      expired: now > payload.exp,
      payload
    };
  } catch {
    return { valid: false, expired: false };
  }
};

// SIWE message formatter
const formatSiweMessage = (message: SiweMessage): string => {
  const lines = [
    `${message.domain} wants you to sign in with your Ethereum account:`,
    message.address,
    '',
    message.statement,
    '',
    `URI: ${message.uri}`,
    `Version: ${message.version}`,
    `Chain ID: ${message.chainId}`,
    `Nonce: ${message.nonce}`,
    `Issued At: ${message.issuedAt}`
  ];
  
  if (message.expirationTime) {
    lines.push(`Expiration Time: ${message.expirationTime}`);
  }
  
  if (message.notBefore) {
    lines.push(`Not Before: ${message.notBefore}`);
  }
  
  if (message.requestId) {
    lines.push(`Request ID: ${message.requestId}`);
  }
  
  if (message.resources && message.resources.length > 0) {
    lines.push('', 'Resources:');
    message.resources.forEach(resource => {
      lines.push(`- ${resource}`);
    });
  }
  
  return lines.join('\n');
};

// Nonce storage with replay attack prevention
class NonceManager {
  private static readonly STORAGE_KEY = 'auth_nonces';
  private static readonly MAX_AGE = 10 * 60 * 1000; // 10 minutes
  
  static generateNonce(): string {
    const nonce = generateCryptoNonce();
    this.storeNonce(nonce);
    return nonce;
  }
  
  static validateAndConsumeNonce(nonce: string): boolean {
    const stored = this.getStoredNonces();
    const nonceData = stored[nonce];
    
    if (!nonceData) {
      console.warn('Nonce not found or already consumed');
      return false;
    }
    
    if (Date.now() - nonceData.timestamp > this.MAX_AGE) {
      console.warn('Nonce expired');
      this.removeNonce(nonce);
      return false;
    }
    
    // Consume nonce (remove after use)
    this.removeNonce(nonce);
    return true;
  }
  
  private static storeNonce(nonce: string): void {
    const stored = this.getStoredNonces();
    stored[nonce] = {
      timestamp: Date.now(),
      used: false
    };
    
    // Clean up old nonces
    this.cleanupExpiredNonces(stored);
    
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store nonce:', error);
    }
  }
  
  private static removeNonce(nonce: string): void {
    const stored = this.getStoredNonces();
    delete stored[nonce];
    
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to remove nonce:', error);
    }
  }
  
  private static getStoredNonces(): Record<string, { timestamp: number; used: boolean }> {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }
  
  private static cleanupExpiredNonces(nonces: Record<string, { timestamp: number; used: boolean }>): void {
    const now = Date.now();
    Object.keys(nonces).forEach(nonce => {
      if (now - nonces[nonce].timestamp > this.MAX_AGE) {
        delete nonces[nonce];
      }
    });
  }
}

// Main authentication hook
export const useAuth = (): AuthHook => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    address: null,
    sessionToken: null,
    sessionExpiry: null,
    isLoading: false,
    error: null,
    nonce: null
  });
  
  // Create SIWE message
  const createSiweMessage = useCallback((nonce: string): SiweMessage => {
    if (!address) {
      throw new Error('No wallet address available');
    }
    
    const now = new Date();
    const expiry = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // 4 hours
    
    return {
      domain: window.location.host,
      address: address,
      statement: 'Sign in to Chain Academy V2 - Decentralized Mentorship Platform',
      uri: window.location.origin,
      version: '1',
      chainId: 1, // Ethereum mainnet (adjust based on current network)
      nonce: nonce,
      issuedAt: now.toISOString(),
      expirationTime: expiry.toISOString(),
      resources: [
        `${window.location.origin}/profile`,
        `${window.location.origin}/dashboard`,
        `${window.location.origin}/sessions`
      ]
    };
  }, [address]);
  
  // Verify signature using ethers
  const verifySignature = useCallback(async (message: string, signature: string): Promise<boolean> => {
    try {
      if (!address) {
        console.error('No address available');
        return false;
      }
      
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }, [address]);
  
  // Check if current session is valid
  const isSessionValid = useCallback((): boolean => {
    const { sessionToken, sessionExpiry } = authState;
    
    if (!sessionToken || !sessionExpiry) {
      return false;
    }
    
    const validation = validateSessionToken(sessionToken);
    if (!validation.valid || validation.expired) {
      return false;
    }
    
    return new Date() < sessionExpiry;
  }, [authState]);
  
  // Sign in with SIWE
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !address || !walletClient) {
      setAuthState(prev => ({
        ...prev,
        error: 'Wallet not connected'
      }));
      return false;
    }
    
    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));
    
    try {
      // Generate secure nonce
      const nonce = NonceManager.generateNonce();
      console.log('Generated nonce for SIWE:', nonce);
      
      // Create SIWE message
      const siweMessage = createSiweMessage(nonce);
      const messageString = formatSiweMessage(siweMessage);
      
      console.log('SIWE message created:', messageString);
      
      // Request signature from wallet
      console.log('Requesting signature from wallet...');
      const signature = await walletClient.signMessage({ message: messageString });
      console.log('Signature received:', signature);
      
      // Verify signature
      const isValidSignature = await verifySignature(messageString, signature);
      if (!isValidSignature) {
        throw new Error('Invalid signature');
      }
      
      // Validate and consume nonce
      if (!NonceManager.validateAndConsumeNonce(nonce)) {
        throw new Error('Invalid or expired nonce');
      }
      
      // Generate session token
      const sessionToken = generateSessionToken(address, nonce);
      const sessionExpiry = new Date(Date.now() + (4 * 60 * 60 * 1000)); // 4 hours
      
      // Update auth state
      setAuthState({
        isAuthenticated: true,
        address: address,
        sessionToken: sessionToken,
        sessionExpiry: sessionExpiry,
        isLoading: false,
        error: null,
        nonce: nonce
      });
      
      // Store session in sessionStorage (not localStorage for security)
      const sessionData = {
        token: sessionToken,
        expiry: sessionExpiry.toISOString(),
        address: address,
        timestamp: Date.now()
      };
      
      try {
        sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
      } catch (error) {
        const storageError = error as Error;
        console.warn('Failed to store session data:', storageError);
        
        // If sessionStorage is full or corrupted, try to clear some space
        if (storageError.name === 'QuotaExceededError') {
          console.log('Session storage quota exceeded, attempting cleanup...');
          try {
            // Clear old auth-related data
            const keysToTry = ['auth_nonces', 'old_auth_session'];
            keysToTry.forEach(key => {
              try {
                sessionStorage.removeItem(key);
              } catch (e) {
                // Ignore individual removal errors
              }
            });
            
            // Try storing again
            sessionStorage.setItem('auth_session', JSON.stringify(sessionData));
            console.log('✅ Session data stored after cleanup');
          } catch (retryError) {
            console.error('❌ Failed to store session data even after cleanup:', retryError);
          }
        }
      }
      
      console.log('✅ SIWE authentication successful');
      return true;
      
    } catch (error) {
      console.error('❌ SIWE authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error instanceof Error) {
        if (error.message.includes('User denied')) {
          errorMessage = 'User cancelled signature request';
        } else if (error.message.includes('Invalid signature')) {
          errorMessage = 'Signature verification failed';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Security nonce validation failed';
        } else {
          errorMessage = error.message;
        }
      }
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        sessionToken: null,
        sessionExpiry: null,
        isLoading: false,
        error: errorMessage,
        nonce: null
      }));
      
      return false;
    }
  }, [isConnected, address, walletClient, createSiweMessage, verifySignature]);
  
  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    console.log('Signing out user...');
    
    // Clear session storage
    try {
      sessionStorage.removeItem('auth_session');
      sessionStorage.removeItem('auth_nonces');
    } catch (error) {
      console.warn('Failed to clear session storage:', error);
    }
    
    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      address: null,
      sessionToken: null,
      sessionExpiry: null,
      isLoading: false,
      error: null,
      nonce: null
    });
    
    console.log('✅ User signed out successfully');
  }, []);
  
  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !address) {
      return false;
    }
    
    // Check if current session is still valid
    if (isSessionValid()) {
      return true;
    }
    
    console.log('Session expired or invalid, requiring re-authentication');
    await signOut();
    return false;
  }, [isConnected, address, isSessionValid, signOut]);
  
  // Auto-restore session on page load
  useEffect(() => {
    const restoreSession = () => {
      if (!isConnected || !address) {
        return;
      }
      
      try {
        const storedSession = sessionStorage.getItem('auth_session');
        if (!storedSession) {
          return;
        }
        
        let sessionData: any;
        try {
          sessionData = JSON.parse(storedSession);
        } catch (parseError) {
          console.warn('Failed to parse stored session data:', parseError);
          // Clear corrupted session data
          try {
            sessionStorage.removeItem('auth_session');
          } catch (removeError) {
            console.error('Failed to remove corrupted session:', removeError);
          }
          return;
        }
        
        // Validate session data structure
        if (!sessionData || typeof sessionData !== 'object' || 
            !sessionData.address || !sessionData.token || !sessionData.expiry) {
          console.warn('Invalid session data structure, clearing...');
          try {
            sessionStorage.removeItem('auth_session');
          } catch (removeError) {
            console.error('Failed to remove invalid session:', removeError);
          }
          return;
        }
        
        const sessionExpiry = new Date(sessionData.expiry);
        
        // Check if session is still valid
        if (
          sessionData.address === address &&
          sessionExpiry > new Date() &&
          sessionData.token
        ) {
          try {
            const validation = validateSessionToken(sessionData.token);
            if (validation.valid && !validation.expired) {
              console.log('✅ Restored valid session from storage');
              setAuthState({
                isAuthenticated: true,
                address: address,
                sessionToken: sessionData.token,
                sessionExpiry: sessionExpiry,
                isLoading: false,
                error: null,
                nonce: validation.payload?.nonce || null
              });
              return;
            }
          } catch (validationError) {
            console.warn('Session token validation failed:', validationError);
          }
        }
        
        // Clean up invalid session
        try {
          sessionStorage.removeItem('auth_session');
        } catch (removeError) {
          console.error('Failed to remove expired session:', removeError);
        }
      } catch (error) {
        console.warn('Failed to restore session:', error);
        
        // Try to clean up on any error
        try {
          sessionStorage.removeItem('auth_session');
        } catch (removeError) {
          const error = removeError as Error;
          console.error('Failed to remove session after error:', error);
          
          // If we can't even remove the session, there might be storage corruption
          if (error.name === 'NS_ERROR_FILE_CORRUPTED' || 
              error.message?.includes('corrupted')) {
            console.error('🚨 SessionStorage appears to be corrupted!');
            
            // Try clearing entire sessionStorage as last resort
            try {
              sessionStorage.clear();
              console.log('⚠️ Cleared entire sessionStorage due to corruption');
            } catch (clearError) {
              console.error('❌ Cannot clear sessionStorage:', clearError);
            }
          }
        }
      }
    };
    
    restoreSession();
  }, [isConnected, address]);
  
  // Auto sign-out when wallet disconnects
  useEffect(() => {
    if (!isConnected && authState.isAuthenticated) {
      console.log('Wallet disconnected, signing out...');
      signOut();
    }
  }, [isConnected, authState.isAuthenticated, signOut]);
  
  // Periodic session validation
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return;
    }
    
    const interval = setInterval(() => {
      if (!isSessionValid()) {
        console.log('Session expired during periodic check');
        signOut();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [authState.isAuthenticated, isSessionValid, signOut]);
  
  return {
    ...authState,
    signIn,
    signOut,
    refreshSession,
    isSessionValid,
    createSiweMessage,
    verifySignature
  };
};