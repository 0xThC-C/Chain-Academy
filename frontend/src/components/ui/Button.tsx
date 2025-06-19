import React, { forwardRef } from 'react';
import { cn } from '@/utils';
import type { ButtonVariant, BaseComponentProps } from '@/types';

interface ButtonProps 
  extends ButtonVariant, 
          BaseComponentProps,
          Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          
          // Size variants
          {
            'h-8 px-3 text-sm gap-1.5': size === 'sm',
            'h-10 px-4 text-sm gap-2': size === 'md',
            'h-12 px-6 text-base gap-2.5': size === 'lg',
          },
          
          // Style variants
          {
            // Primary and Danger - Red brand color
            'bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 hover:border-primary-700 focus-visible:ring-primary-500 shadow-sm':
              variant === 'primary' || variant === 'danger',
              
            // Secondary - Gray with border
            'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500 shadow-sm dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500':
              variant === 'secondary',
              
            // Ghost - No background, hover effect
            'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white':
              variant === 'ghost',
          },
          
          // Full width
          fullWidth && 'w-full',
          
          // Loading state
          loading && 'cursor-wait',
          
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg 
            className={cn(
              'animate-spin',
              size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
            )}
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        
        {/* Left icon */}
        {!loading && icon && iconPosition === 'left' && (
          <span className={cn(
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
          )}>
            {icon}
          </span>
        )}
        
        {/* Button text */}
        {loading && loadingText ? loadingText : children}
        
        {/* Right icon */}
        {!loading && icon && iconPosition === 'right' && (
          <span className={cn(
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
          )}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };