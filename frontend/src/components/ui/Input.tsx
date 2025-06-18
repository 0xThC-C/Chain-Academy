import React, { forwardRef, useState } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import type { BaseComponentProps } from '@/types';

interface InputProps extends BaseComponentProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'minimal';
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = 'text',
    label,
    description,
    error,
    success,
    leftIcon,
    rightIcon,
    size = 'md',
    variant = 'default',
    fullWidth = true,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    const inputType = isPassword && showPassword ? 'text' : type;
    const inputId = props.id || props.name || 'input';

    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className={cn(
              'absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none',
              size === 'sm' ? 'pl-2.5' : size === 'lg' ? 'pl-4' : 'pl-3'
            )}>
              <span className={cn(
                'text-gray-400 dark:text-gray-500',
                size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
              )}>
                {leftIcon}
              </span>
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            type={inputType}
            id={inputId}
            className={cn(
              // Base styles
              'block w-full rounded-lg border transition-colors duration-200',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800',
              
              // Size variants
              {
                'px-2.5 py-1.5 text-sm': size === 'sm',
                'px-3 py-2 text-sm': size === 'md', 
                'px-4 py-3 text-base': size === 'lg',
              },
              
              // Style variants
              {
                // Default variant
                'border-gray-300 bg-white text-gray-900 focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-red-400':
                  variant === 'default' && !hasError && !hasSuccess,
                  
                // Filled variant
                'border-transparent bg-gray-100 text-gray-900 focus:bg-white focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:text-white dark:focus:bg-gray-800 dark:focus:border-red-400':
                  variant === 'filled' && !hasError && !hasSuccess,
                  
                // Minimal variant
                'border-transparent border-b-2 border-b-gray-300 bg-transparent rounded-none px-0 focus:border-b-red-500 focus:ring-0 dark:border-b-gray-600 dark:focus:border-b-red-400':
                  variant === 'minimal' && !hasError && !hasSuccess,
              },
              
              // Error state
              hasError && [
                'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500',
                'dark:border-red-600 dark:text-red-100 dark:focus:border-red-400',
                variant === 'filled' && 'bg-red-50 dark:bg-red-900/20',
              ],
              
              // Success state
              hasSuccess && [
                'border-green-300 text-green-900 focus:border-green-500 focus:ring-green-500',
                'dark:border-green-600 dark:text-green-100 dark:focus:border-green-400',
                variant === 'filled' && 'bg-green-50 dark:bg-green-900/20',
              ],
              
              // Icon padding adjustments
              leftIcon && {
                'pl-8': size === 'sm',
                'pl-10': size === 'md',
                'pl-12': size === 'lg',
              },
              
              (rightIcon || isPassword) && {
                'pr-8': size === 'sm',
                'pr-10': size === 'md',
                'pr-12': size === 'lg',
              },
              
              className
            )}
            disabled={disabled}
            {...props}
          />

          {/* Right icons */}
          <div className={cn(
            'absolute right-0 inset-y-0 flex items-center space-x-1',
            size === 'sm' ? 'pr-2.5' : size === 'lg' ? 'pr-4' : 'pr-3'
          )}>
            {/* Error icon */}
            {hasError && (
              <ExclamationCircleIcon className={cn(
                'text-red-400',
                size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
              )} />
            )}

            {/* Custom right icon */}
            {!hasError && rightIcon && (
              <span className={cn(
                'text-gray-400 dark:text-gray-500',
                size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
              )}>
                {rightIcon}
              </span>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400',
                  'focus:outline-none focus:text-gray-600 dark:focus:text-gray-400',
                  size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
                )}
                tabIndex={-1}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {description && !error && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };