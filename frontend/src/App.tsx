import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import { QueryClient } from '@tanstack/react-query';
import { AppKitProvider } from './config/appkit';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ReviewsProvider } from './contexts/ReviewsContext';
import { WebRTCProvider } from './contexts/WebRTCContext';
import EnhancedErrorBoundary from './components/EnhancedErrorBoundary';
import StorageErrorBoundary from './components/StorageErrorBoundary';
import RouteGuard from './components/RouteGuard';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import MentorshipGallery from './pages/MentorshipGallery';
import ReviewsPage from './pages/ReviewsPage';
import UserDashboard from './pages/UserDashboard';
import UserProfileDetail from './pages/UserProfileDetail';
import UserProfilePage from './pages/UserProfilePage';
import SessionPageBypass from './pages/SessionPageBypass';
import FeedbackPage from './pages/FeedbackPage';
import PaymentPage from './pages/PaymentPage';
import SocialMediaButtons from './components/SocialMediaButtons';
import { developmentModeProtector } from './utils/developmentModeProtection';
import { stateValidator } from './utils/stateValidation';
import { autoFixStorageIssues, detectStorageIssues } from './utils/storageCleanup';
import { testIndexedDB, testNotificationIndexedDB } from './utils/indexedDBTest';
// import './utils/addSampleReviews'; // Import sample reviews utility for development
import './styles/hide-phantom.css'; // Import CSS to hide Phantom wallet

// QueryClient configuration available if needed in the future
// const queryClient = new QueryClient({ ... });

// Component to conditionally render social media buttons
const ConditionalSocialMediaButtons: React.FC = () => {
  const location = useLocation();
  
  // Hide social media buttons on session pages
  const isSessionPage = location.pathname.startsWith('/session/');
  
  if (isSessionPage) {
    return null;
  }
  
  return <SocialMediaButtons twitterUrl="https://x.com/LearnWithCA" discordUrl="https://discord.gg/ZNkshwD7TF" />;
};

function App() {
  // Enhanced global error handling with state validation and recovery
  useEffect(() => {
    // CRITICAL: Initialize storage diagnostics and cleanup
    const initializeStorage = async () => {
      console.log('🔧 Chain Academy: Initializing storage diagnostics...');
      
      try {
        const diagnostics = detectStorageIssues();
        
        if (diagnostics.hasIssues) {
          console.warn('🚨 Storage issues detected on startup:', diagnostics.issues);
          console.log('🔧 Attempting auto-fix...');
          
          const fixSuccess = await autoFixStorageIssues();
          if (fixSuccess) {
            console.log('✅ Storage auto-fix completed');
          } else {
            console.warn('⚠️ Storage auto-fix failed, manual intervention may be required');
          }
        } else {
          console.log('✅ Storage health check passed');
        }
        
        // Run IndexedDB tests to verify fixes are working
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 Running IndexedDB tests...');
          
          try {
            const generalTest = await testIndexedDB();
            if (generalTest.success) {
              console.log('✅ General IndexedDB test passed');
            } else {
              console.warn('⚠️ General IndexedDB test failed:', generalTest.errors);
            }
            
            const notificationTest = await testNotificationIndexedDB();
            if (notificationTest.success) {
              console.log('✅ Notification IndexedDB test passed');
            } else {
              console.warn('⚠️ Notification IndexedDB test failed:', notificationTest.errors);
            }
          } catch (testError) {
            console.warn('⚠️ IndexedDB tests failed:', testError);
          }
        }
        
      } catch (error) {
        console.error('❌ Error during storage initialization:', error);
      }
    };
    
    // Run storage initialization
    initializeStorage();
    
    // CRITICAL: Verify protection system is loaded
    if (process.env.NODE_ENV === 'development') {
      if (!window.__PROTECTION_LOADED__) {
        console.error('[Chain Academy] CRITICAL: Protection system not loaded! Loading now...');
        import('./setupProtection');
      } else {
        console.log('[Chain Academy] Protection system verified active');
      }
      
      developmentModeProtector.registerConflictListener('app', (conflict: any) => {
        console.warn('Development conflict detected:', conflict);
        
        if (conflict.type === 'memory_pressure' || conflict.type === 'global_pollution') {
          // Trigger state validation and cleanup
          const healthCheck = stateValidator.performHealthCheck();
          if (!healthCheck.overall) {
            console.warn('State corruption detected, attempting cleanup...');
            stateValidator.cleanupCorruptedStorage();
          }
        }
      });
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Enhanced error handling with state validation
      if (event.reason && typeof event.reason.message === 'string') {
        // Check for corruption patterns
        const corruptionPatterns = [
          /Cannot read prop/i,
          /Cannot access before initialization/i,
          /WebSocket/i,
          /Network request failed/i
        ];
        
        const isCorruption = corruptionPatterns.some(pattern => 
          pattern.test(event.reason.message)
        );
        
        if (isCorruption) {
          console.warn('Potential state corruption detected in promise rejection');
          
          // Perform emergency cleanup if in development
          if (process.env.NODE_ENV === 'development') {
            setTimeout(() => {
              stateValidator.cleanupCorruptedStorage();
              developmentModeProtector.forceCleanup();
            }, 1000);
          }
        }
      }
      
      // Prevent the default behavior (which would crash the app)
      event.preventDefault();
      
      // Log to external service if available
      if ((window as any).errorReporting) {
        (window as any).errorReporting.captureException(event.reason);
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      // Enhanced error analysis
      if (event.error) {
        // Validate application state after error
        setTimeout(() => {
          const healthCheck = stateValidator.performHealthCheck();
          if (!healthCheck.overall) {
            console.warn('Application state corruption detected after error');
            stateValidator.cleanupCorruptedStorage();
          }
        }, 500);
      }
      
      // Log to external service if available
      if ((window as any).errorReporting) {
        (window as any).errorReporting.captureException(event.error);
      }
    };

    // Add global error listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Periodic health checks in development
    let healthCheckInterval: NodeJS.Timeout | undefined;
    if (process.env.NODE_ENV === 'development') {
      healthCheckInterval = setInterval(() => {
        const healthCheck = stateValidator.performHealthCheck();
        if (!healthCheck.overall) {
          console.warn('Periodic health check failed, cleaning up state...');
          stateValidator.cleanupCorruptedStorage();
        }
      }, 60000); // Check every minute in development
    }

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      
      if (process.env.NODE_ENV === 'development') {
        developmentModeProtector.unregisterConflictListener('app');
      }
    };
  }, []);

  // Component to conditionally render Header based on route
  const AppContent: React.FC = () => {
    const location = useLocation();
    const isSessionPage = location.pathname.startsWith('/session/');
    
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
        {!isSessionPage && <Header />}
        <main>
                      <EnhancedErrorBoundary>
                        <RouteGuard>
                          <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/mentors" element={<MentorshipGallery />} />
                            <Route path="/reviews" element={<ReviewsPage />} />
                            <Route path="/dashboard" element={<UserDashboard />} />
                            <Route path="/profile/:userAddress" element={
                              <EnhancedErrorBoundary>
                                <UserProfileDetail />
                              </EnhancedErrorBoundary>
                            } />
                            <Route path="/user-profile/:userAddress" element={
                              <EnhancedErrorBoundary>
                                <UserProfilePage />
                              </EnhancedErrorBoundary>
                            } />
                            <Route path="/payment" element={
                              <EnhancedErrorBoundary>
                                <PaymentPage />
                              </EnhancedErrorBoundary>
                            } />
                            <Route path="/session/:sessionId" element={
                              <SessionPageBypass />
                            } />
                            {/* Deprecated: Feedback functionality now integrated into session flow */}
                            <Route path="/feedback/:sessionId" element={<FeedbackPage />} />
                            {/* Catch-all route for 404 pages */}
                            <Route path="*" element={<HomePage />} />
                          </Routes>
                        </RouteGuard>
                      </EnhancedErrorBoundary>
                    </main>
                    
        {/* Social Media Buttons - Fixed positioned (hidden on session pages) */}
        <ConditionalSocialMediaButtons />
      </div>
    );
  };

  return (
    <EnhancedErrorBoundary enableAutoRecovery={process.env.NODE_ENV === 'development'}>
      <StorageErrorBoundary>
        <AppKitProvider>
          <ThemeProvider>
            <AuthProvider>
              <StorageErrorBoundary>
                <NotificationProvider>
                  <ReviewsProvider>
                    <WebRTCProvider>
                      <Router>
                        <EnhancedErrorBoundary>
                          <AppContent />
                        </EnhancedErrorBoundary>
                      </Router>
                    </WebRTCProvider>
                  </ReviewsProvider>
                </NotificationProvider>
              </StorageErrorBoundary>
            </AuthProvider>
          </ThemeProvider>
        </AppKitProvider>
      </StorageErrorBoundary>
    </EnhancedErrorBoundary>
  );
}

export default App;
