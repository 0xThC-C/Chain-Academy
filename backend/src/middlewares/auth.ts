import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { ResponseHandler } from '../utils/responses';
import { AuthService } from '../services/auth.service';

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authService = AuthService.getInstance();
  
  try {
    // 🔒 SECURITY: Enhanced authentication validation
    if (!req.session || !req.session.address) {
      logger.warn(`🔒 Unauthorized access attempt from ${req.ip} to ${req.path}`);
      ResponseHandler.error(res, 'Authentication required', 401);
      return;
    }

    // 🔒 SECURITY: Validate address format to prevent injection
    if (!authService.isValidAddress(req.session.address)) {
      logger.warn(`🔒 Invalid address format in session: ${req.session.address}`);
      req.session.destroy((err) => {
        if (err) logger.error('Session destruction error:', err);
      });
      ResponseHandler.error(res, 'Invalid session data', 401);
      return;
    }

    // 🔒 SECURITY: Check session expiration with grace period
    const sessionExpiry = req.session.expirationTime;
    if (sessionExpiry && new Date(sessionExpiry) < new Date()) {
      logger.info(`🔒 Session expired for ${req.session.address}`);
      req.session.destroy((err) => {
        if (err) logger.error('Session destruction error:', err);
      });
      ResponseHandler.error(res, 'Session expired', 401);
      return;
    }

    // 🔒 SECURITY: Check for session hijacking (IP changes)
    if (req.session.lastIP && req.session.lastIP !== req.ip) {
      logger.warn(`🔒 Potential session hijacking: IP changed from ${req.session.lastIP} to ${req.ip} for ${req.session.address}`);
      // For now, log but don't block (some users have dynamic IPs)
      // In production, you might want to force re-authentication
    }

    // Update session activity tracking
    req.session.lastIP = req.ip;
    req.session.lastActivity = new Date();
    
    // Extend session on activity
    if (req.session && req.session.touch) {
      req.session.touch();
    }

    // 🔒 SECURITY: Add user context to request for downstream use
    req.user = {
      address: req.session.address,
      chainId: req.session.chainId,
      authenticated: true,
      sessionId: req.sessionID
    };

    logger.debug(`🔒 Authentication successful for ${req.session.address}`);
    next();
  } catch (error) {
    logger.error('🔒 Authentication middleware error:', error);
    ResponseHandler.error(res, 'Authentication error', 500);
  }
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authService = AuthService.getInstance();
  
  try {
    // 🔒 SECURITY: Safely check auth without blocking
    if (req.session && req.session.address && authService.isValidAddress(req.session.address)) {
      // Session exists and is valid
      const sessionExpiry = req.session.expirationTime;
      if (!sessionExpiry || new Date(sessionExpiry) >= new Date()) {
        // Add user context if authenticated
        req.user = {
          address: req.session.address,
          chainId: req.session.chainId,
          authenticated: true,
          sessionId: req.sessionID
        };
        
        // Update session activity
        req.session.lastIP = req.ip;
        req.session.lastActivity = new Date();
        
        if (req.session.touch) {
          req.session.touch();
        }
        
        logger.debug(`🔒 Optional auth: User ${req.session.address} authenticated`);
      } else {
        logger.debug(`🔒 Optional auth: Session expired for ${req.session.address}`);
      }
    } else {
      logger.debug('🔒 Optional auth: No valid session found');
    }
    
    next();
  } catch (error) {
    logger.error('🔒 Optional auth middleware error:', error);
    // Don't block the request for optional auth errors
    next();
  }
};

export const requireWebRTCAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authService = AuthService.getInstance();
  
  try {
    // 🔒 SECURITY: Enhanced WebRTC authentication
    if (!req.session || !req.session.address) {
      logger.warn(`🔒 WebRTC access denied: No authentication for ${req.ip}`);
      ResponseHandler.error(res, 'Authentication required for WebRTC', 401);
      return;
    }

    // 🔒 SECURITY: Validate address format
    if (!authService.isValidAddress(req.session.address)) {
      logger.warn(`🔒 WebRTC access denied: Invalid address ${req.session.address}`);
      ResponseHandler.error(res, 'Invalid authentication data', 401);
      return;
    }

    // 🔒 SECURITY: Check session expiration
    const sessionExpiry = req.session.expirationTime;
    if (sessionExpiry && new Date(sessionExpiry) < new Date()) {
      logger.warn(`🔒 WebRTC access denied: Expired session for ${req.session.address}`);
      ResponseHandler.error(res, 'Session expired', 401);
      return;
    }

    // 🔒 SECURITY: Enhanced participant validation for room operations
    if (req.body.participants && Array.isArray(req.body.participants)) {
      const userAddress = req.session.address.toLowerCase();
      
      // Validate all participant addresses
      const invalidParticipants = req.body.participants.filter((p: string) => 
        !authService.isValidAddress(p)
      );
      
      if (invalidParticipants.length > 0) {
        logger.warn(`🔒 WebRTC access denied: Invalid participant addresses ${invalidParticipants.join(', ')}`);
        ResponseHandler.error(res, 'Invalid participant addresses', 400);
        return;
      }
      
      const participants = req.body.participants.map((p: string) => p.toLowerCase());
      
      // 🔒 SECURITY: User must be a participant in their own room
      if (!participants.includes(userAddress)) {
        logger.warn(`🔒 WebRTC access denied: ${userAddress} not in participant list`);
        ResponseHandler.error(res, 'You are not a participant in this session', 403);
        return;
      }
      
      // 🔒 SECURITY: Limit number of participants (prevent DoS)
      if (participants.length > 10) {
        logger.warn(`🔒 WebRTC access denied: Too many participants (${participants.length})`);
        ResponseHandler.error(res, 'Too many participants for WebRTC session', 400);
        return;
      }
    }

    // 🔒 SECURITY: For room access, verify user is authorized
    if (req.params.roomId) {
      // This will be validated against the actual room participants in the route
      logger.debug(`🔒 WebRTC room access request: ${req.session.address} -> ${req.params.roomId}`);
    }

    // Add user context
    req.user = {
      address: req.session.address,
      chainId: req.session.chainId,
      authenticated: true,
      sessionId: req.sessionID
    };

    logger.debug(`🔒 WebRTC authentication successful for ${req.session.address}`);
    next();
  } catch (error) {
    logger.error('🔒 WebRTC auth middleware error:', error);
    ResponseHandler.error(res, 'WebRTC authentication error', 500);
  }
};

/**
 * 🔒 NEW: Role-based authorization middleware
 */
export const requireRole = (requiredRole: 'mentor' | 'student' | 'admin') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user?.authenticated) {
        ResponseHandler.error(res, 'Authentication required', 401);
        return;
      }

      // TODO: Implement role checking logic with database
      // For now, this is a placeholder for future role-based access control
      logger.debug(`🔒 Role check: ${req.user.address} requires ${requiredRole}`);
      
      next();
    } catch (error) {
      logger.error('🔒 Role authorization error:', error);
      ResponseHandler.error(res, 'Authorization error', 500);
    }
  };
};

/**
 * 🔒 NEW: Rate limiting by user address
 */
export const requireUserRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequestMap = new Map<string, { count: number; resetTime: number }>();
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user?.authenticated) {
        // Fall back to regular rate limiting for unauthenticated users
        next();
        return;
      }

      const userAddress = req.user.address;
      const now = Date.now();
      const userEntry = userRequestMap.get(userAddress);

      if (!userEntry || now > userEntry.resetTime) {
        // Reset or initialize counter
        userRequestMap.set(userAddress, {
          count: 1,
          resetTime: now + windowMs
        });
        next();
        return;
      }

      if (userEntry.count >= maxRequests) {
        logger.warn(`🔒 User rate limit exceeded: ${userAddress} (${userEntry.count}/${maxRequests})`);
        ResponseHandler.error(res, 'Too many requests', 429);
        return;
      }

      userEntry.count++;
      next();
    } catch (error) {
      logger.error('🔒 User rate limit error:', error);
      next(); // Don't block on rate limit errors
    }
  };
};

/**
 * 🔒 NEW: Session security validator
 */
export const validateSessionSecurity = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.session) {
      next();
      return;
    }

    // 🔒 SECURITY: Check for suspicious session activity
    const now = new Date();
    const lastActivity = req.session.lastActivity ? new Date(req.session.lastActivity) : now;
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
    
    // If inactive for more than 24 hours, require re-authentication
    if (timeSinceLastActivity > 24 * 60 * 60 * 1000) {
      logger.info(`🔒 Session timeout: ${req.session.address} inactive for ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes`);
      req.session.destroy((err) => {
        if (err) logger.error('Session destruction error:', err);
      });
      ResponseHandler.error(res, 'Session timeout - please re-authenticate', 401);
      return;
    }

    // 🔒 SECURITY: Check for rapid session switches (potential attack)
    if (req.session.switchCount && req.session.switchCount > 10) {
      logger.warn(`🔒 Suspicious session activity: ${req.session.address} switched contexts ${req.session.switchCount} times`);
      // Log but don't block - could be legitimate multi-tab usage
    }

    next();
  } catch (error) {
    logger.error('🔒 Session security validation error:', error);
    next(); // Don't block on security check errors
  }
};