import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { _storage as storage } from '@/utils';
import type { ThemeState, VoidFunction } from '@/types';

interface ThemeContextType extends ThemeState {
  toggleDarkMode: VoidFunction;
  setDarkMode: (value: boolean) => void;
  systemPrefersDark: boolean;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme storage key constant
const THEME_STORAGE_KEY = 'chain-academy-theme';

// Detect system preference
const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Get initial theme state
const getInitialTheme = (defaultTheme: 'light' | 'dark' | 'system' = 'system'): boolean => {
  try {
    // Check localStorage first
    const saved = storage.get<string | null>(THEME_STORAGE_KEY, null);
    
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    if (saved === 'system') return getSystemPreference();
    
    // Fallback to default theme
    if (defaultTheme === 'light') return false;
    if (defaultTheme === 'dark') return true;
    
    // Default to system preference
    return getSystemPreference();
  } catch (error) {
    console.warn('Failed to load theme preference:', error);
    return getSystemPreference();
  }
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'system' 
}) => {
  const [darkMode, setDarkModeState] = useState<boolean>(() => getInitialTheme(defaultTheme));
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPreference);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
      
      // If user has system preference set, update theme automatically
      const savedTheme = storage.get<string | null>(THEME_STORAGE_KEY, null);
      if (savedTheme === 'system' || savedTheme === null) {
        setDarkModeState(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        
        if (darkMode) {
          root.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
          metaThemeColor.setAttribute('content', darkMode ? '#000000' : '#ffffff');
        }
      }
    } catch (error) {
      console.warn('Failed to apply theme to document:', error);
    }
  }, [darkMode]);

  // Optimized setter that handles storage
  const setDarkMode = useCallback((value: boolean) => {
    try {
      setDarkModeState(value);
      storage.set(THEME_STORAGE_KEY, value ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
      setDarkModeState(value); // Still update state even if storage fails
    }
  }, []);

  // Toggle function
  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode);
  }, [darkMode, setDarkMode]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo<ThemeContextType>(() => ({
    darkMode,
    isDarkMode: darkMode,
    systemPrefersDark,
    toggleDarkMode,
    setDarkMode
  }), [darkMode, systemPrefersDark, toggleDarkMode, setDarkMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Enhanced hook with better error handling
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error(
      'useTheme must be used within a ThemeProvider. ' +
      'Make sure your component is wrapped with <ThemeProvider>.'
    );
  }
  
  return context;
};

// Optional: Export theme utilities
export const themeUtils = {
  getStoredTheme: () => storage.get<string | null>(THEME_STORAGE_KEY, null),
  setStoredTheme: (theme: 'light' | 'dark' | 'system') => storage.set(THEME_STORAGE_KEY, theme),
  clearStoredTheme: () => storage.remove(THEME_STORAGE_KEY),
  getSystemPreference,
  
  // CSS class helpers
  getThemeClasses: (isDark: boolean) => ({
    bg: isDark ? 'bg-black' : 'bg-white',
    text: isDark ? 'text-white' : 'text-black',
    border: isDark ? 'border-gray-800' : 'border-gray-200',
    surface: isDark ? 'bg-gray-900' : 'bg-gray-50',
  }),
  
  // Conditional class utility
  themeClass: (isDark: boolean, darkClass: string, lightClass: string) => 
    isDark ? darkClass : lightClass
};