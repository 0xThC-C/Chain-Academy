import rateLimit from 'express-rate-limit';

// 🔒 SECURITY: Enhanced rate limiting with user-based identification
const createSecureKeyGenerator = (fallbackToIP: boolean = true) => {
  return (req: any) => {
    // Try to use authenticated user address if available
    const userAddress = req.user?.address || req.body?.userAddress || req.query?.userAddress;
    
    if (userAddress && typeof userAddress === 'string') {
      return `user_${userAddress}`;
    }
    
    // Fallback to IP-based limiting if no user or if explicitly allowed
    if (fallbackToIP) {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
      return `ip_${ip}`;
    }
    
    // For auth endpoints, reject if no user identification
    return 'anonymous_user';
  };
};

// General API rate limiter with user-aware limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user/IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  keyGenerator: createSecureKeyGenerator(true), // Allow IP fallback
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user/IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: createSecureKeyGenerator(true), // Allow IP fallback for auth
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// WebRTC signaling rate limiter - user-based preferred
export const webrtcLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each authenticated user to 30 WebRTC signals per minute
  message: 'Too many WebRTC signals, please slow down.',
  keyGenerator: createSecureKeyGenerator(false), // Require user identification
  standardHeaders: true,
  legacyHeaders: false,
  // Skip if no user identification available
  skip: (req) => {
    const userAddress = req.user?.address || req.body?.userAddress || req.query?.userAddress;
    return !userAddress;
  },
});

// Session creation rate limiter - user-based
export const sessionCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each user to 10 session creations per hour
  message: 'Too many session creation attempts, please try again later.',
  keyGenerator: createSecureKeyGenerator(false), // Require user identification
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per windowMs
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});