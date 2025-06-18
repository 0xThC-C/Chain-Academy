import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { ResponseHandler } from '../utils/responses';
import { StandardApiError } from './errorHandler';
import { AuthRequest } from '../types';

/**
 * 🔒 Enhanced body validation with security logging
 */
export const validateBody = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const validationOptions = {
        abortEarly: false, // Collect all errors
        stripUnknown: true, // Remove unknown properties
        ...options
      };

      const { error, value } = schema.validate(req.body, validationOptions);
      
      if (error) {
        const validationDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn(`🔒 Body validation failed for ${req.user?.address || req.ip}:`, {
          path: req.path,
          method: req.method,
          errors: validationDetails
        });

        throw StandardApiError.validationError('Request body validation failed', validationDetails);
      }

      // Replace request body with validated/sanitized value
      req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 🔒 NEW: Business logic validation helpers
 */
export const BusinessValidation = {
  /**
   * Validate mentorship creation data
   */
  createMentorship: Joi.object({
    title: ValidationSchemas.safeString(5, 100).required(),
    description: ValidationSchemas.safeString(20, 1000).required(),
    category: ValidationSchemas.safeString(3, 50).required(),
    skills: Joi.array().items(ValidationSchemas.safeString(2, 30)).min(1).max(10).required(),
    duration: ValidationSchemas.duration,
    price: ValidationSchemas.price,
    currency: ValidationSchemas.currency,
    maxStudents: Joi.number().integer().min(1).max(10).default(1),
  }),

  /**
   * Validate session booking data
   */
  bookSession: Joi.object({
    mentorshipId: ValidationSchemas.id,
    scheduledAt: ValidationSchemas.futureDate,
  }),

  /**
   * Validate profile update data
   */
  updateProfile: Joi.object({
    username: ValidationSchemas.safeString(3, 30).optional(),
    bio: ValidationSchemas.safeString(10, 500).optional(),
    skills: Joi.array().items(ValidationSchemas.safeString(2, 30)).max(20).optional(),
    isMentor: Joi.boolean().optional(),
    hourlyRate: ValidationSchemas.price.optional(),
    currency: ValidationSchemas.currency.optional(),
  }),

  /**
   * Validate WebRTC room creation
   */
  createWebRTCRoom: Joi.object({
    sessionId: ValidationSchemas.id,
    participants: Joi.array()
      .items(ValidationSchemas.ethereumAddress)
      .min(2)
      .max(10)
      .unique()
      .required(),
  }),

  /**
   * Validate pagination parameters
   */
  pagination: Joi.object(ValidationSchemas.pagination),

  /**
   * Validate search parameters
   */
  search: Joi.object({
    ...ValidationSchemas.pagination,
    category: ValidationSchemas.safeString(2, 50).optional(),
    skills: Joi.array().items(ValidationSchemas.safeString(2, 30)).optional(),
    minPrice: Joi.number().positive().optional(),
    maxPrice: Joi.number().positive().optional(),
    currency: ValidationSchemas.currency.optional(),
  }),
};

/**
 * 🔒 NEW: Rate limiting validation
 */
export const validateRateLimit = (identifier: string, maxRequests: number, windowMs: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const key = req.user?.address || req.ip;
      const rateLimitKey = `${identifier}_${key}`;
      
      // In production, use Redis for distributed rate limiting
      // For now, using in-memory storage
      if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
      }

      const now = Date.now();
      const userLimit = global.rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: now + windowMs };

      if (now > userLimit.resetTime) {
        userLimit.count = 1;
        userLimit.resetTime = now + windowMs;
      } else {
        userLimit.count++;
      }

      global.rateLimitStore.set(rateLimitKey, userLimit);

      if (userLimit.count > maxRequests) {
        logger.warn(`🔒 Rate limit exceeded: ${key} for ${identifier} (${userLimit.count}/${maxRequests})`);
        throw StandardApiError.tooManyRequests(`Too many requests for ${identifier}`);
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userLimit.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(userLimit.resetTime / 1000));

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Global rate limit storage (use Redis in production)
declare global {
  var rateLimitStore: Map<string, { count: number; resetTime: number }>;
}

/**
 * 🔒 Enhanced query validation with security logging
 */
export const validateQuery = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(req.query, validationOptions);
      
      if (error) {
        const validationDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn(`🔒 Query validation failed for ${req.user?.address || req.ip}:`, {
          path: req.path,
          method: req.method,
          errors: validationDetails
        });

        throw StandardApiError.validationError('Query parameter validation failed', validationDetails);
      }

      // Replace query with validated/sanitized value
      req.query = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 🔒 NEW: Params validation
 */
export const validateParams = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(req.params, validationOptions);
      
      if (error) {
        const validationDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        logger.warn(`🔒 Params validation failed for ${req.user?.address || req.ip}:`, {
          path: req.path,
          method: req.method,
          errors: validationDetails
        });

        throw StandardApiError.validationError('URL parameter validation failed', validationDetails);
      }

      req.params = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 🔒 NEW: Comprehensive request validation (body, query, params)
 */
export const validateRequest = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const errors: any[] = [];

      // Validate body
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
          errors.push(...error.details.map(d => ({ type: 'body', ...d })));
        } else {
          req.body = value;
        }
      }

      // Validate query
      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, { abortEarly: false, stripUnknown: true });
        if (error) {
          errors.push(...error.details.map(d => ({ type: 'query', ...d })));
        } else {
          req.query = value;
        }
      }

      // Validate params
      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, { abortEarly: false });
        if (error) {
          errors.push(...error.details.map(d => ({ type: 'params', ...d })));
        } else {
          req.params = value;
        }
      }

      if (errors.length > 0) {
        const validationDetails = errors.map(error => ({
          type: error.type,
          field: error.path?.join('.') || 'unknown',
          message: error.message,
        }));

        logger.warn(`🔒 Request validation failed for ${req.user?.address || req.ip}:`, {
          path: req.path,
          method: req.method,
          errors: validationDetails
        });

        throw StandardApiError.validationError('Request validation failed', validationDetails);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 🔒 NEW: Common validation schemas
 */
export const ValidationSchemas = {
  // Ethereum address validation
  ethereumAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid Ethereum address (0x followed by 40 hex characters)',
    }),

  // Transaction hash validation
  transactionHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .messages({
      'string.pattern.base': 'Must be a valid transaction hash (0x followed by 64 hex characters)',
    }),

  // Chain ID validation
  chainId: Joi.number()
    .integer()
    .valid(1, 137, 42161, 10, 8453) // Supported chains
    .messages({
      'any.only': 'Chain ID must be one of: 1 (Ethereum), 137 (Polygon), 42161 (Arbitrum), 10 (Optimism), 8453 (Base)',
    }),

  // Currency validation
  currency: Joi.string()
    .valid('USDT', 'USDC')
    .required()
    .messages({
      'any.only': 'Currency must be either USDT or USDC',
    }),

  // Pagination validation
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  },

  // Common string validations
  safeString: (minLength: number = 1, maxLength: number = 1000) =>
    Joi.string()
      .min(minLength)
      .max(maxLength)
      .pattern(/^[^<>"'&]*$/) // Prevent basic XSS
      .messages({
        'string.pattern.base': 'String contains invalid characters',
      }),

  // ID validation (UUID or similar)
  id: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .min(1)
    .max(100)
    .required(),

  // Date validation
  futureDate: Joi.date()
    .greater('now')
    .required()
    .messages({
      'date.greater': 'Date must be in the future',
    }),

  // Price validation
  price: Joi.number()
    .positive()
    .precision(6) // Support up to 6 decimal places for tokens
    .required(),

  // Duration validation (in minutes)
  duration: Joi.number()
    .integer()
    .min(30) // Minimum 30 minutes
    .max(480) // Maximum 8 hours
    .required(),
};

/**
 * 🔒 NEW: Validate file uploads
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], required = false } = options;

      if (!req.file && required) {
        throw StandardApiError.badRequest('File upload is required');
      }

      if (req.file) {
        // Check file size
        if (req.file.size > maxSize) {
          throw StandardApiError.badRequest(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
        }

        // Check file type
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw StandardApiError.badRequest(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        logger.info(`🔒 File upload validated: ${req.file.originalname} (${req.file.size} bytes)`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};