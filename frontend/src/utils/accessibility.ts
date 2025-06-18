// Accessibility utility functions and constants

import type { VoidFunction } from '@/types';

// ARIA role constants
export const ARIA_ROLES = {
  BUTTON: 'button',
  DIALOG: 'dialog',
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  TABLIST: 'tablist',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  LISTBOX: 'listbox',
  OPTION: 'option',
  MENUBAR: 'menubar',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  TOOLTIP: 'tooltip',
  STATUS: 'status',
  PROGRESSBAR: 'progressbar',
} as const;

// Common ARIA attributes
export const ARIA_ATTRIBUTES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  LIVE: 'aria-live',
  CURRENT: 'aria-current',
  PRESSED: 'aria-pressed',
  VALUENOW: 'aria-valuenow',
  VALUEMIN: 'aria-valuemin',
  VALUEMAX: 'aria-valuemax',
  VALUETEXT: 'aria-valuetext',
  MULTISELECTABLE: 'aria-multiselectable',
  READONLY: 'aria-readonly',
  REQUIRED: 'aria-required',
  INVALID: 'aria-invalid',
  AUTOCOMPLETE: 'aria-autocomplete',
  HASPOPUP: 'aria-haspopup',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  ACTIVEDESCENDANT: 'aria-activedescendant',
  MODAL: 'aria-modal',
  ORIENTATION: 'aria-orientation',
} as const;

// Screen reader announcement utilities
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  public static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer();
    }
    return ScreenReaderAnnouncer.instance;
  }

  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('aria-relevant', 'additions text');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(this.liveRegion);
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }

  public announceSuccess(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }

  public announceError(message: string): void {
    this.announce(`Error: ${message}`, 'assertive');
  }

  public announceWarning(message: string): void {
    this.announce(`Warning: ${message}`, 'assertive');
  }

  public announceInfo(message: string): void {
    this.announce(`Information: ${message}`, 'polite');
  }
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  public static pushFocus(element: HTMLElement): void {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus && currentFocus !== document.body) {
      FocusManager.focusStack.push(currentFocus);
    }
    element.focus();
  }

  public static popFocus(): void {
    const previousFocus = FocusManager.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  public static trapFocus(container: HTMLElement): VoidFunction {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
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

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  public static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  public static moveFocusToNextElement(container: HTMLElement): void {
    const focusableElements = FocusManager.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
    focusableElements[nextIndex]?.focus();
  }

  public static moveFocusToPreviousElement(container: HTMLElement): void {
    const focusableElements = FocusManager.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
    focusableElements[previousIndex]?.focus();
  }
}

// Keyboard navigation utilities
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export class KeyboardNavigation {
  public static handleMenuNavigation(
    e: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect?: (index: number) => void,
    onClose?: VoidFunction
  ): number {
    let newIndex = currentIndex;

    switch (e.key) {
      case KeyboardKeys.ARROW_DOWN:
        e.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.ARROW_UP:
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.HOME:
        e.preventDefault();
        newIndex = 0;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.END:
        e.preventDefault();
        newIndex = items.length - 1;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.ENTER:
      case KeyboardKeys.SPACE:
        e.preventDefault();
        onSelect?.(currentIndex);
        break;

      case KeyboardKeys.ESCAPE:
        e.preventDefault();
        onClose?.();
        break;
    }

    return newIndex;
  }

  public static handleTabNavigation(
    e: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onSelect?: (index: number) => void
  ): number {
    let newIndex = currentIndex;

    switch (e.key) {
      case KeyboardKeys.ARROW_LEFT:
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.ARROW_RIGHT:
        e.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.HOME:
        e.preventDefault();
        newIndex = 0;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.END:
        e.preventDefault();
        newIndex = items.length - 1;
        items[newIndex]?.focus();
        break;

      case KeyboardKeys.ENTER:
      case KeyboardKeys.SPACE:
        e.preventDefault();
        onSelect?.(currentIndex);
        break;
    }

    return newIndex;
  }
}

// Color contrast utilities
export class ColorContrast {
  public static getContrastRatio(color1: string, color2: string): number {
    const lum1 = ColorContrast.getLuminance(color1);
    const lum2 = ColorContrast.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  public static meetsWCAGAA(color1: string, color2: string): boolean {
    return ColorContrast.getContrastRatio(color1, color2) >= 4.5;
  }

  public static meetsWCAGAAA(color1: string, color2: string): boolean {
    return ColorContrast.getContrastRatio(color1, color2) >= 7;
  }

  private static getLuminance(color: string): number {
    const rgb = ColorContrast.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : null;
  }
}

// Accessible component helpers
export const AccessibilityHelpers = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix: string = 'a11y'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Create ARIA attributes object
  createAriaAttributes: (attributes: Record<string, string | boolean | number>): Record<string, string> => {
    const ariaAttributes: Record<string, string> = {};
    
    Object.entries(attributes).forEach(([key, value]) => {
      const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
      ariaAttributes[ariaKey] = String(value);
    });

    return ariaAttributes;
  },

  // Announce status changes
  announceStatus: (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
    const announcer = ScreenReaderAnnouncer.getInstance();
    
    switch (type) {
      case 'success':
        announcer.announceSuccess(message);
        break;
      case 'error':
        announcer.announceError(message);
        break;
      case 'warning':
        announcer.announceWarning(message);
        break;
      default:
        announcer.announceInfo(message);
        break;
    }
  },

  // Check if element is focusable
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
    ];

    return focusableSelectors.some(selector => element.matches(selector));
  },

  // Reduce motion detection
  prefersReducedMotion: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // High contrast detection
  prefersHighContrast: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
};

// Export the main instances for convenience
export const announcer = ScreenReaderAnnouncer.getInstance();
export const focusManager = FocusManager;
export const keyboardNav = KeyboardNavigation;
export const colorContrast = ColorContrast;
export const a11y = AccessibilityHelpers;