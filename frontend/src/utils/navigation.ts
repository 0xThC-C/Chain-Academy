import { NavigateFunction } from 'react-router-dom';

// Track navigation attempts to prevent loops
const navigationAttempts = new Map<string, number>();
const MAX_NAVIGATION_ATTEMPTS = 3;
const NAVIGATION_COOLDOWN = 1000; // 1 second

/**
 * Safe navigation wrapper that handles potential navigation errors and prevents loops
 */
export const safeNavigate = (
  navigate: NavigateFunction, 
  path: string, 
  options?: { replace?: boolean; state?: any }
) => {
  const attempts = navigationAttempts.get(path) || 0;

  try {
    // Check if we've exceeded max attempts for this path
    if (attempts >= MAX_NAVIGATION_ATTEMPTS) {
      console.warn(`Max navigation attempts exceeded for path: ${path}`);
      
      // Clear attempts after cooldown
      setTimeout(() => {
        navigationAttempts.delete(path);
      }, NAVIGATION_COOLDOWN);
      
      // Force navigation as last resort
      if (path !== '/') {
        window.history.pushState({}, '', path);
        return;
      }
      
      return;
    }

    // Increment attempt counter
    navigationAttempts.set(path, attempts + 1);

    // Attempt navigation
    navigate(path, options);

    // Clear successful navigation attempt
    setTimeout(() => {
      navigationAttempts.delete(path);
    }, 100);

  } catch (error) {
    console.error('Navigation error:', error);
    
    // Fallback strategies based on error type
    if (path !== '/') {
      try {
        // Try navigating to home instead
        navigate('/', { replace: true });
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        // Use history API as last resort
        safeHistoryNavigation('/');
      }
    } else {
      // Already trying to go home, use history API
      safeHistoryNavigation('/');
    }
  }
};

/**
 * Safe history-based navigation that doesn't rely on React Router
 */
export const safeHistoryNavigation = (path: string) => {
  try {
    window.history.pushState({}, '', path);
    // Trigger a popstate event to notify React Router
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (historyError) {
    console.error('History navigation failed:', historyError);
    // Ultimate fallback
    window.location.href = path;
  }
};

/**
 * Safe cleanup function that ensures all resources are cleaned up before navigation
 */
export const safeCleanupAndNavigate = (
  cleanupFn: () => void, 
  navigate: NavigateFunction, 
  path: string = '/',
  delay: number = 100
) => {
  let cleanupCompleted = false;
  let navigationTimeout: NodeJS.Timeout;
  let emergencyTimeout: NodeJS.Timeout;

  const performNavigation = () => {
    try {
      console.log(`Performing navigation to ${path}`);
      
      // Use React Router navigation instead of full page reload
      safeNavigate(navigate, path, { replace: true });
      
      // Ensure React components update properly after navigation
      setTimeout(() => {
        // Dispatch a custom event to notify components about navigation
        window.dispatchEvent(new CustomEvent('navigation-complete', { 
          detail: { path, timestamp: Date.now() }
        }));
      }, 50);
    } catch (error) {
      console.error('Error in performNavigation:', error);
      safeHistoryNavigation(path);
    }
  };

  try {
    // Set a shorter emergency timeout for better UX
    emergencyTimeout = setTimeout(() => {
      if (!cleanupCompleted) {
        console.warn('Cleanup taking too long, forcing navigation');
        cleanupCompleted = true; // Prevent double navigation
        performNavigation();
      }
    }, delay + 2000); // 2 seconds after intended delay

    // Perform cleanup with proper error handling
    const cleanupPromise = new Promise<void>((resolve) => {
      try {
        // Execute cleanup function
        cleanupFn();
        
        // Add a small delay to ensure all async cleanup operations complete
        setTimeout(() => {
          // Double-check that cleanup completed by dispatching a cleanup event
          window.dispatchEvent(new CustomEvent('session-cleanup-complete', {
            detail: { timestamp: Date.now() }
          }));
          resolve();
        }, 100);
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
        // Resolve anyway but with shorter delay
        setTimeout(() => {
          resolve();
        }, 50);
      }
    });

    cleanupPromise.then(() => {
      if (!cleanupCompleted) { // Check if emergency timeout already fired
        cleanupCompleted = true;
        clearTimeout(emergencyTimeout);
        
        // Reduced buffer for faster navigation
        navigationTimeout = setTimeout(performNavigation, delay + 50);
      }
    });

  } catch (error) {
    console.error('Cleanup setup error:', error);
    // Navigate with shorter delay if cleanup setup fails
    setTimeout(performNavigation, delay + 100);
  }

  // Return cleanup function for component unmount
  return () => {
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
    if (emergencyTimeout) {
      clearTimeout(emergencyTimeout);
    }
  };
};

/**
 * Safe route change that checks if route is valid before navigating
 */
export const safeRouteChange = (
  navigate: NavigateFunction,
  path: string,
  validRoutes: string[] = ['/', '/mentors', '/dashboard', '/session', '/feedback']
) => {
  // Check if path starts with any valid route
  const isValidRoute = validRoutes.some(route => path.startsWith(route));
  
  if (!isValidRoute) {
    console.warn(`Invalid route attempted: ${path}, redirecting to home`);
    safeNavigate(navigate, '/', { replace: true });
    return false;
  }

  safeNavigate(navigate, path);
  return true;
};

/**
 * Debounced navigation to prevent rapid successive calls
 */
let navigationDebounceTimer: NodeJS.Timeout;
export const debouncedNavigate = (
  navigate: NavigateFunction,
  path: string,
  options?: { replace?: boolean; state?: any },
  delay: number = 300
) => {
  clearTimeout(navigationDebounceTimer);
  navigationDebounceTimer = setTimeout(() => {
    safeNavigate(navigate, path, options);
  }, delay);
};