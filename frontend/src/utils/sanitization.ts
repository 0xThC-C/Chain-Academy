import DOMPurify from 'dompurify';

/**
 * XSS Protection Utilities
 * 🔒 SECURITY: Sanitizes user-generated content to prevent XSS attacks
 */

// Configuration for different content types
const sanitizeConfigs = {
  // For rich text content (reviews, descriptions)
  richText: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote'],
    ALLOWED_ATTR: ['class'],
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
  },
  
  // For plain text content (names, titles)
  plainText: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
  
  // For chat messages
  chat: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'img'],
  }
};

/**
 * Sanitize HTML content for rich text areas
 */
export const sanitizeRichText = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return DOMPurify.sanitize(content, sanitizeConfigs.richText);
};

/**
 * Sanitize content for plain text display (removes all HTML)
 */
export const sanitizePlainText = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return DOMPurify.sanitize(content, sanitizeConfigs.plainText);
};

/**
 * Sanitize chat messages (limited HTML allowed)
 */
export const sanitizeChatMessage = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return DOMPurify.sanitize(content, sanitizeConfigs.chat);
};

/**
 * Sanitize and validate Ethereum addresses
 */
export const sanitizeEthereumAddress = (address: string): string => {
  if (!address || typeof address !== 'string') return '';
  
  // Remove any HTML tags and validate format
  const cleaned = DOMPurify.sanitize(address, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  
  if (!ethAddressRegex.test(cleaned)) {
    throw new Error('Invalid Ethereum address format');
  }
  
  return cleaned.toLowerCase();
};

/**
 * Sanitize URLs to prevent javascript: and data: schemes
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  // Remove HTML tags
  const cleaned = DOMPurify.sanitize(url, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  
  // Only allow http:, https:, and relative URLs
  const allowedProtocols = /^(https?:\/\/|\/|\.\/|\.\.\/)/i;
  
  if (!allowedProtocols.test(cleaned)) {
    console.warn('🔒 SECURITY: Blocked potentially dangerous URL:', url);
    return '#'; // Safe fallback
  }
  
  return cleaned;
};

/**
 * Sanitize numeric input to prevent injection
 */
export const sanitizeNumericInput = (input: string | number): number => {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  
  if (!input || typeof input !== 'string') return 0;
  
  // Remove any HTML and non-numeric characters except decimal point
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  const numericOnly = cleaned.replace(/[^0-9.]/g, '');
  
  const parsed = parseFloat(numericOnly);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Sanitize object properties recursively
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  sanitizeFunction: (value: string) => string = sanitizePlainText
): T => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj } as T;
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key as keyof T];
    
    if (typeof value === 'string') {
      (sanitized as any)[key] = sanitizeFunction(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as any)[key] = sanitizeObject(value, sanitizeFunction);
    } else if (Array.isArray(value)) {
      (sanitized as any)[key] = value.map((item: any) => 
        typeof item === 'string' ? sanitizeFunction(item) : 
        typeof item === 'object' ? sanitizeObject(item, sanitizeFunction) : item
      );
    }
  });
  
  return sanitized;
};

/**
 * React component wrapper for safe HTML rendering
 */
export const createSafeHTML = (content: string, type: 'rich' | 'plain' | 'chat' = 'plain') => {
  let sanitized: string;
  
  switch (type) {
    case 'rich':
      sanitized = sanitizeRichText(content);
      break;
    case 'chat':
      sanitized = sanitizeChatMessage(content);
      break;
    default:
      sanitized = sanitizePlainText(content);
  }
  
  return { __html: sanitized };
};

/**
 * Validate and sanitize form inputs
 */
export const sanitizeFormInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags and limit length
  const sanitized = sanitizePlainText(input);
  
  if (sanitized.length > maxLength) {
    console.warn('🔒 SECURITY: Input length exceeded limit:', sanitized.length, 'max:', maxLength);
    return sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// Configure DOMPurify for the current environment
if (typeof window !== 'undefined') {
  // Add hooks for additional security
  DOMPurify.addHook('beforeSanitizeElements', function (node) {
    // Log suspicious content attempts
    if (node.nodeName && ['SCRIPT', 'OBJECT', 'EMBED', 'FORM'].includes(node.nodeName)) {
      console.warn('🔒 SECURITY: Blocked potentially dangerous element:', node.nodeName);
    }
  });
  
  DOMPurify.addHook('beforeSanitizeAttributes', function (node) {
    // Remove any attributes that start with 'on' (event handlers)
    const attrs = node.attributes;
    if (attrs) {
      for (let i = attrs.length - 1; i >= 0; i--) {
        const attr = attrs[i];
        if (attr.name.toLowerCase().startsWith('on')) {
          console.warn('🔒 SECURITY: Removed event handler attribute:', attr.name);
          node.removeAttribute(attr.name);
        }
      }
    }
  });
}