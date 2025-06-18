import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ResponseHandler } from '../utils/responses';
import { AuthRequest } from '../types';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

/**
 * 🔒 Enhanced error handler with security considerations
 */
export const errorHandler = (
  error: ApiError,
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const { statusCode = 500, message, code, details } = error;
  const isProduction = process.env.NODE_ENV === 'production';

  // 🔒 SECURITY: Enhanced error logging with context
  const errorContext = {
    error: {
      message: error.message,
      stack: error.stack,
      statusCode,
      code,
      name: error.name,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      timestamp: new Date().toISOString(),
    },
    user: req.user ? {
      address: req.user.address,
      authenticated: req.user.authenticated,
      sessionId: req.user.sessionId,
    } : null,
    session: req.session?.address ? {
      address: req.session.address,
      chainId: req.session.chainId,
    } : null,
  };

  // Log different error levels
  if (statusCode >= 500) {
    logger.error('🔥 Server Error:', errorContext);
  } else if (statusCode >= 400) {
    logger.warn('🔒 Client Error:', errorContext);
  } else {
    logger.info('📝 Request Info:', errorContext);
  }

  // 🔒 SECURITY: Sanitize error messages for production
  const getErrorMessage = () => {
    if (isProduction && statusCode === 500) {
      return 'Internal server error';
    }
    
    // 🔒 SECURITY: Never expose sensitive error details in production
    if (isProduction) {
      const safeCodes = ['VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED', 'INSUFFICIENT_PERMISSIONS'];
      if (code && safeCodes.includes(code)) {
        return message;
      }
      return 'An error occurred';
    }
    
    return message;
  };

  // 🔒 SECURITY: Add security headers for error responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  // Use ResponseHandler for consistent error formatting
  const errorResponse = {
    success: false,
    message: getErrorMessage(),
    ...(code && { code }),
    ...(details && !isProduction && { details }),
    ...(error.stack && !isProduction && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * 🔒 NEW: Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 🔒 NEW: Create standardized API errors
 */
export class StandardApiError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    this.name = 'StandardApiError';

    // Maintain proper stack trace
    Error.captureStackTrace(this, StandardApiError);
  }

  static badRequest(message: string, details?: any) {
    return new StandardApiError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message: string = 'Authentication required') {
    return new StandardApiError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message: string = 'Insufficient permissions') {
    return new StandardApiError(message, 403, 'FORBIDDEN');
  }

  static notFound(message: string = 'Resource not found') {
    return new StandardApiError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: any) {
    return new StandardApiError(message, 409, 'CONFLICT', details);
  }

  static validationError(message: string, details?: any) {
    return new StandardApiError(message, 422, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message: string = 'Too many requests') {
    return new StandardApiError(message, 429, 'TOO_MANY_REQUESTS');
  }

  static internal(message: string = 'Internal server error') {
    return new StandardApiError(message, 500, 'INTERNAL_ERROR');
  }
}