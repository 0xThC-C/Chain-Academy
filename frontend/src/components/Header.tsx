import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon, Bars3Icon, AcademicCapIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '@/utils';
// import { a11y, keyboardNav, KeyboardKeys } from '@/utils';
// import { announcer, focusManager } from '@/utils/accessibility';
import WalletConnectionV2 from './WalletConnectionV2';
import NotificationMenu from './NotificationMenu';
import { useAccount } from 'wagmi';
import { useWebRTC } from '../contexts/WebRTCContext';

const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { isInActiveSession, navigationBlocked, requestLeaveSession } = useWebRTC();
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  
  // Navigation IDs for ARIA
  // const _navigationId = a11y.generateId('navigation');
  // const _mobileMenuId = a11y.generateId('mobile-menu');

  const navigation = [
    { name: 'Home', href: '/', current: location.pathname === '/' },
    { name: 'Find Mentors', href: '/mentors', current: location.pathname === '/mentors' },
    { name: 'Reviews', href: '/reviews', current: location.pathname === '/reviews' },
    { name: 'Dashboard', href: '/dashboard', current: location.pathname.startsWith('/dashboard') },
  ];

  // Mobile menu handlers

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    // announcer.announce('Mobile menu closed');
    mobileMenuButtonRef.current?.focus();
  }, []);

  // Theme toggle with announcement

  // Secure navigation handler
  const handleSecureNavigation = useCallback((href: string, itemName: string) => {
    if (!navigationBlocked) {
      navigate(href);
      // announcer.announce(`Navigated to ${itemName}`);
      setIsMobileMenuOpen(false); // Close mobile menu if open
      return;
    }

    requestLeaveSession(
      () => {
        console.log(`Navigating to ${itemName} after user confirmation`);
        navigate(href);
        // announcer.announce(`Navigated to ${itemName}`);
        setIsMobileMenuOpen(false);
      },
      () => {
        console.log(`Navigation to ${itemName} cancelled by user`);
        // announcer.announce('Navigation cancelled');
      }
    );
  }, [navigate, navigationBlocked, requestLeaveSession]);

  // Focus management for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      // const cleanup = focusManager.trapFocus(mobileMenuRef.current);
      // return cleanup;
    }
  }, [isMobileMenuOpen]);

  // Escape key handler
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <header 
      className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50"
      role="banner"
    >

      {/* Active Session Warning Banner */}
      {isInActiveSession && (
        <div 
          className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                <ExclamationTriangleIcon 
                  className="h-4 w-4" 
                  aria-hidden="true"
                />
                <span>Active Session - Protected Navigation</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16 min-h-[4rem]">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => handleSecureNavigation('/', 'Home')}
              disabled={navigationBlocked}
              className={cn(
                'flex items-center space-x-2 whitespace-nowrap transition-opacity focus:outline-none',
                navigationBlocked 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'hover:opacity-90'
              )}
              aria-label="Chain Academy - Go to homepage"
              aria-describedby={navigationBlocked ? 'navigation-blocked-notice' : undefined}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                navigationBlocked 
                  ? 'bg-gray-400' 
                  : 'bg-primary-600'
              )}>
                <AcademicCapIcon 
                  className="h-5 w-5 text-white" 
                  aria-hidden="true"
                />
              </div>
              <span className={cn(
                'text-xl font-bold',
                navigationBlocked 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-900 dark:text-white'
              )}>
                Chain Academy
              </span>
            </button>
            {navigationBlocked && (
              <span 
                id="navigation-blocked-notice" 
                className="sr-only"
              >
                Navigation is currently blocked due to active session
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex space-x-4 xl:space-x-8 items-center h-16 flex-shrink-0 mx-4">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleSecureNavigation(item.href, item.name)}
                disabled={navigationBlocked && item.href !== location.pathname}
                className={`${
                  item.current
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : navigationBlocked && item.href !== location.pathname
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                } px-2 xl:px-3 py-4 text-sm font-medium transition-colors duration-200 flex items-center h-16 whitespace-nowrap relative`}
              >
                {item.name}
                {navigationBlocked && item.href !== location.pathname && (
                  <ExclamationTriangleIcon className="h-4 w-4 ml-1 text-amber-500" />
                )}
              </button>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2 xl:space-x-4 h-16 flex-shrink-0">
            {/* Notifications - only show when wallet is connected */}
            {isConnected && <NotificationMenu />}

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Wallet Connection */}
            <div className="flex-shrink-0">
              <WalletConnectionV2 />
            </div>

            {/* Mobile menu button */}
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex-shrink-0"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-3 absolute top-full left-0 right-0 bg-white dark:bg-black shadow-lg z-40">
            <div className="flex flex-col space-y-2 px-4">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleSecureNavigation(item.href, item.name)}
                  disabled={navigationBlocked && item.href !== location.pathname}
                  className={`${
                    item.current
                      ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : navigationBlocked && item.href !== location.pathname
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed bg-gray-100 dark:bg-neutral-800'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800'
                  } block px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 text-left w-full flex items-center justify-between`}
                >
                  <span>{item.name}</span>
                  {navigationBlocked && item.href !== location.pathname && (
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
    </header>
  );
};

export default Header;