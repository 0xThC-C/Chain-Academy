import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { ResponseHandler } from '../utils/responses';

/**
 * 🔒 SECURITY: Advanced input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Recursively sanitize all string inputs
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Remove potential XSS patterns
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else if (typeof value === 'object' && value !== null) {
        const sanitized: any = {};
        for (const key in value) {
          sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
      }
      return value;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    next();
  } catch (error) {
    logger.error('🔒 Input sanitization error:', error);
    next(); // Don't block on sanitization errors
  }
};

/**
 * 🔒 SECURITY: Request validation middleware
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check for suspicious patterns in request
    const suspiciousPatterns = [
      /\.\.\//g, // Path traversal
      /\x00/g,   // Null bytes
      /<script/gi, // Script tags
      /union\s+select/gi, // SQL injection
      /exec\s*\(/gi, // Code execution
    ];

    const requestString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const foundSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

    if (foundSuspicious) {
      logger.warn(`🔒 Suspicious request pattern detected from ${req.ip}: ${req.method} ${req.path}`);
      ResponseHandler.error(res, 'Invalid request format', 400);
      return;
    }

    // Validate request size
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      logger.warn(`🔒 Request too large: ${contentLength} bytes from ${req.ip}`);
      ResponseHandler.error(res, 'Request too large', 413);
      return;
    }

    next();
  } catch (error) {
    logger.error('🔒 Request validation error:', error);
    next();
  }
};

/**
 * 🔒 SECURITY: Enhanced security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Set comprehensive security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server fingerprinting
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * 🔒 SECURITY: API versioning and deprecation middleware
 */
export const apiVersioning = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Extract API version from path or header
    const pathVersion = req.path.match(/^\/api\/v(\d+)\//)?.[1];
    const headerVersion = req.headers['api-version'];
    
    const version = pathVersion || headerVersion || '1';
    
    // Set version context
    req.apiVersion = version;
    
    // Check for deprecated versions
    const deprecatedVersions = ['0'];
    if (deprecatedVersions.includes(version)) {
      res.setHeader('Warning', '299 - "Deprecated API version"');
      logger.warn(`🔒 Deprecated API version ${version} used by ${req.ip}`);
    }
    
    // Add version header to response
    res.setHeader('API-Version', version);
    
    next();
  } catch (error) {
    logger.error('🔒 API versioning error:', error);
    next();
  }
};

/**
 * 🔒 SECURITY: WebRTC room access control
 */
export const validateWebRTCAccess = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Only apply to WebRTC routes
    if (!req.path.includes('/webrtc/')) {
      next();
      return;
    }

    // Ensure user is authenticated for all WebRTC operations
    if (!req.user?.authenticated) {
      logger.warn(`🔒 Unauthenticated WebRTC access attempt: ${req.ip} -> ${req.path}`);
      ResponseHandler.error(res, 'WebRTC requires authentication', 401);
      return;
    }

    // Rate limit WebRTC operations per user
    const userAddress = req.user.address;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30;

    // Simple in-memory rate limiting (in production, use Redis)
    if (!global.webrtcRateLimit) {
      global.webrtcRateLimit = new Map();
    }

    const userKey = `webrtc_${userAddress}`;
    const userRequests = global.webrtcRateLimit.get(userKey) || { count: 0, resetTime: now + windowMs };

    if (now > userRequests.resetTime) {
      userRequests.count = 1;
      userRequests.resetTime = now + windowMs;
    } else {
      userRequests.count++;
    }

    global.webrtcRateLimit.set(userKey, userRequests);

    if (userRequests.count > maxRequests) {
      logger.warn(`🔒 WebRTC rate limit exceeded: ${userAddress} (${userRequests.count}/${maxRequests})`);
      ResponseHandler.error(res, 'Too many WebRTC requests', 429);
      return;
    }

    next();
  } catch (error) {
    logger.error('🔒 WebRTC access validation error:', error);
    next();
  }
};

/**
 * 🔒 SECURITY: Blockchain address validation middleware
 */
export const validateBlockchainData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const addressFields = ['address', 'mentorAddress', 'studentAddress', 'userAddress'];
    const hashFields = ['transactionHash', 'txHash', 'hash'];
    
    // Validate Ethereum addresses
    addressFields.forEach(field => {
      const value = req.body?.[field] || req.query?.[field] || req.params?.[field];
      if (value && typeof value === 'string') {
        const addressPattern = /^0x[a-fA-F0-9]{40}$/;
        if (!addressPattern.test(value)) {
          logger.warn(`🔒 Invalid address format: ${field}=${value} from ${req.ip}`);
          ResponseHandler.error(res, `Invalid ${field} format`, 400);
          return;
        }
      }
    });

    // Validate transaction hashes
    hashFields.forEach(field => {
      const value = req.body?.[field] || req.query?.[field] || req.params?.[field];
      if (value && typeof value === 'string') {
        const hashPattern = /^0x[a-fA-F0-9]{64}$/;
        if (!hashPattern.test(value)) {
          logger.warn(`🔒 Invalid hash format: ${field}=${value} from ${req.ip}`);
          ResponseHandler.error(res, `Invalid ${field} format`, 400);
          return;
        }
      }
    });

    next();
  } catch (error) {
    logger.error('🔒 Blockchain data validation error:', error);
    next();
  }
};

/**
 * 🔒 SECURITY: Request timing attack prevention
 */
export const preventTimingAttacks = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Override res.json to add random delay
  const originalJson = res.json;
  res.json = function(obj: any) {
    const processingTime = Date.now() - startTime;
    const minResponseTime = 100; // Minimum response time in ms
    
    if (processingTime < minResponseTime) {
      const delay = minResponseTime - processingTime + Math.random() * 50;
      setTimeout(() => {
        originalJson.call(this, obj);
      }, delay);
    } else {
      originalJson.call(this, obj);
    }
    
    return this;
  };
  
  next();
};

/**
 * 🔒 SECURITY: Resource access control
 */
export const validateResourceAccess = (resourceType: 'mentorship' | 'session' | 'profile') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user?.authenticated) {
        ResponseHandler.error(res, 'Authentication required', 401);
        return;
      }

      const userAddress = req.user.address;
      const resourceId = req.params.id;

      // Log resource access for audit
      logger.info(`🔒 Resource access: ${userAddress} -> ${resourceType}:${resourceId} (${req.method})`);

      // TODO: Implement actual ownership/permission checks with database
      // For now, this is a placeholder for future access control logic

      next();
    } catch (error) {
      logger.error('🔒 Resource access validation error:', error);
      ResponseHandler.error(res, 'Access validation failed', 500);
    }
  };
};

// Global rate limiting maps (in production, use Redis)
declare global {
  var webrtcRateLimit: Map<string, { count: number; resetTime: number }>;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}