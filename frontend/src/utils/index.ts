import { clsx, type ClassValue } from 'clsx';

// Export accessibility utilities (temporarily disabled to fix compilation)
// export { a11y, keyboardNav, KeyboardKeys, announcer, focusManager, colorContrast } from './accessibility';
// export { sanitizeRichText, sanitizePlainText, sanitizeChatMessage, sanitizeEthereumAddress, sanitizeUrl, sanitizeNumericInput, sanitizeObject, createSafeHTML, sanitizeFormInput } from './sanitization';
// export { stateValidator, ValidationPatterns } from './stateValidation';
// export { default as StateValidationSystem } from './stateValidation';
// export { safeNavigate, safeHistoryNavigation, safeCleanupAndNavigate, safeRouteChange, debouncedNavigate } from './navigation';
// export { getDisplayName, getUserBio, formatAddress, hasCompleteProfile, getReviewRelationshipText } from './profileUtils';

// Export types
export type { VoidFunction } from '@/types';

// Utility function for combining classes (similar to shadcn/ui approach)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Note: formatAddress is exported from profileUtils.ts

// Format currency
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Format crypto amount
export const formatCryptoAmount = (amount: number, symbol = 'USDC', decimals = 2): string => {
  return `${amount.toFixed(decimals)} ${symbol}`;
};

// Format time duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Format relative time
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Async retry function
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay);
    }
    throw error;
  }
}

// Safe JSON parse
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Local storage helpers with error handling
export const _storage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save to localStorage:`, error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from localStorage:`, error);
    }
  }
};

// URL helpers
export const url = {
  isValid: (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  },
  
  addParams: (baseUrl: string, params: Record<string, string>): string => {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
};

// Array helpers
export const array = {
  unique: <T>(arr: T[]): T[] => [...new Set(arr)],
  
  groupBy: <T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> => {
    return arr.reduce((groups, item) => {
      const groupKey = String(item[key]);
      return {
        ...groups,
        [groupKey]: [...(groups[groupKey] || []), item]
      };
    }, {} as Record<string, T[]>);
  },
  
  chunk: <T>(arr: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
};

// Object helpers
export const object = {
  pick: <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  },
  
  omit: <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => {
      delete result[key];
    });
    return result;
  }
};

// Performance helpers
export const _performance = {
  measure: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`⏱️ ${name} took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  }
};

// Browser detection
export const browser = {
  isSupported: (): boolean => {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      window.RTCPeerConnection
    );
  },
  
  isMobile: (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  },
  
  isDesktop: (): boolean => {
    return !browser.isMobile();
  }
};

// Validation helpers
export const validation = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  ethereum: {
    address: (address: string): boolean => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    },
    
    txHash: (hash: string): boolean => {
      return /^0x[a-fA-F0-9]{64}$/.test(hash);
    }
  }
};

// Error handling helpers
export const errorHandler = {
  getErrorMessage: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  },
  
  isNetworkError: (error: unknown): boolean => {
    const message = errorHandler.getErrorMessage(error).toLowerCase();
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('connection');
  }
};

// Color utilities for theme
export const colors = {
  primary: {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000'
  },
  
  variants: {
    primary: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  }
};

// Constants
export const CONSTANTS = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  HEARTBEAT_INTERVAL: 30 * 1000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  DEBOUNCE_DELAY: 300,
  THROTTLE_LIMIT: 1000,
  MAX_MESSAGE_LENGTH: 500,
  SUPPORTED_FILE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;