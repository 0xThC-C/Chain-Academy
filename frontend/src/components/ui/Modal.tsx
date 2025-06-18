import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils';
import type { ModalProps, BaseComponentProps, VoidFunction } from '@/types';

interface EnhancedModalProps extends ModalProps, BaseComponentProps {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  trapFocus?: boolean;
  animate?: boolean;
  backdrop?: 'blur' | 'dark' | 'light';
  position?: 'center' | 'top';
  onAfterOpen?: VoidFunction;
  onAfterClose?: VoidFunction;
}

// Custom hook for focus trapping
const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, containerRef]);
};

// Custom hook for body scroll prevention
const usePreventScroll = (isOpen: boolean, preventScroll: boolean) => {
  useEffect(() => {
    if (!preventScroll || !isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, preventScroll]);
};

const Modal: React.FC<EnhancedModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closable = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  trapFocus = true,
  animate = true,
  backdrop = 'blur',
  position = 'center',
  className,
  children,
  onAfterOpen,
  onAfterClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      onAfterOpen?.();
    } else {
      onAfterClose?.();
      // Restore focus when modal closes
      setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
    }
  }, [isOpen, onAfterOpen, onAfterClose]);

  // Focus trap
  useFocusTrap(isOpen && trapFocus, modalRef as React.RefObject<HTMLElement>);

  // Prevent scroll
  usePreventScroll(isOpen, preventScroll);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !closable) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, closable, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!closeOnBackdropClick || !closable) return;
    
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [closeOnBackdropClick, closable, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={backdropRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        position === 'top' && 'items-start pt-16',
        
        // Backdrop styles
        {
          'bg-black/50 backdrop-blur-sm': backdrop === 'blur',
          'bg-black/75': backdrop === 'dark',
          'bg-white/75 dark:bg-black/75': backdrop === 'light',
        },
        
        // Animation
        animate && [
          'transition-all duration-300 ease-out',
          isOpen ? 'opacity-100' : 'opacity-0'
        ]
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-h-full bg-white dark:bg-gray-900 rounded-lg shadow-xl',
          'border border-gray-200 dark:border-gray-800',
          
          // Size variants
          {
            'max-w-sm': size === 'sm',
            'max-w-md': size === 'md',
            'max-w-lg': size === 'lg',
            'max-w-4xl': size === 'xl',
            'max-w-full max-h-full m-0 rounded-none': size === 'full',
          },
          
          // Animation
          animate && [
            'transition-all duration-300 ease-out',
            isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          ],
          
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex-1">
              {title && (
                <h2 
                  id="modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p 
                  id="modal-description"
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {description}
                </p>
              )}
            </div>
            
            {showCloseButton && closable && (
              <button
                onClick={onClose}
                className={cn(
                  'ml-4 p-2 rounded-lg transition-colors',
                  'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                  'dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-red-500'
                )}
                aria-label="Close modal"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          'overflow-y-auto',
          (title || showCloseButton) ? 'px-6 pb-6' : 'p-6',
          size === 'full' && 'h-full'
        )}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render to portal
  return createPortal(modalContent, document.body);
};

// Pre-built confirmation modal variant
interface ConfirmationModalProps extends Omit<EnhancedModalProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: VoidFunction;
  onCancel?: VoidFunction;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  onClose,
  isLoading = false,
  ...props
}) => {
  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      {...props}
      onClose={onClose}
      size="sm"
      className="max-w-md"
    >
      <div className="text-center">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {message}
        </p>
        
        <div className="flex space-x-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50',
              {
                'bg-red-600 hover:bg-red-700': variant === 'danger',
                'bg-yellow-600 hover:bg-yellow-700': variant === 'warning',
                'bg-blue-600 hover:bg-blue-700': variant === 'info',
              }
            )}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export { Modal, ConfirmationModal };
export type { EnhancedModalProps, ConfirmationModalProps };