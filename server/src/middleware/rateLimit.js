import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Configuration
 * Prevents spam and brute-force attacks
 * 
 * SECURITY STRATEGY:
 * - Global API limiter: 100 requests per 15 minutes per IP
 * - Login limiter: 5 requests per 15 minutes per IP (strict)
 * - Register limiter: 3 requests per 15 minutes per IP (very strict)
 * - Reset password: 3 requests per hour per IP (prevent spam)
 */

/**
 * General API rate limiter
 * Applies to all API requests
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/api/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

/**
 * Strict rate limiter for login endpoint
 * Prevents brute-force attacks on login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for non-login requests
    return req.method !== 'POST';
  },
  handler: (req, res) => {
    // Precise error message for login attempts
    const remainingTime = Math.ceil(req.rateLimit?.resetTime / 1000);
    res.status(429).json({
      error: `Too many login attempts. Please try again in ${remainingTime} seconds.`,
      retryAfter: remainingTime,
      remaining: 0
    });
  },
  // Store in memory - in production, consider using redis for distributed rate limiting
  store: undefined // Uses default memory store
});

/**
 * Strict rate limiter for registration
 * Prevents spam account creation
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 registration attempts per windowMs
  message: 'Too many registration attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const remainingTime = Math.ceil(req.rateLimit?.resetTime / 1000);
    res.status(429).json({
      error: `Too many registration attempts. Please try again in ${remainingTime} seconds.`,
      retryAfter: remainingTime,
      remaining: 0
    });
  }
});

/**
 * Password reset rate limiter
 * Prevents reset email spam and abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 reset attempts per hour
  message: 'Too many password reset attempts, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const remainingTime = Math.ceil(req.rateLimit?.resetTime / 1000 / 60); // Convert to minutes
    res.status(429).json({
      error: `Too many password reset attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60,
      remaining: 0
    });
  }
});

/**
 * Image upload rate limiter
 * Prevents upload spam and storage abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many uploads, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const remainingTime = Math.ceil(req.rateLimit?.resetTime / 1000 / 60);
    res.status(429).json({
      error: `Too many upload attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60,
      remaining: 0
    });
  }
});

/**
 * Comment posting rate limiter
 * Prevents comment spam
 */
export const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 comments per 5 minutes
  message: 'Too many comments posted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'You are posting comments too quickly. Please wait a moment before posting again.',
      retryAfter: Math.ceil(req.rateLimit?.resetTime / 1000)
    });
  }
});

/**
 * Email verification rate limiter
 * Prevents email verification spam
 */
export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 verification attempts per hour
  message: 'Too many verification attempts, please try again after 1 hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const remainingTime = Math.ceil(req.rateLimit?.resetTime / 1000 / 60);
    res.status(429).json({
      error: `Too many verification attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60,
      remaining: 0
    });
  }
});

/**
 * Rate limiter by user ID (for authenticated requests)
 * More lenient than IP-based limiting for valid users
 */
export function createUserRateLimiter(windowMs, max, operation) {
  return rateLimit({
    windowMs,
    max,
    message: `Too many ${operation} requests.`,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Only apply to authenticated users
      // Unauthenticated requests still hit IP-based limiters
      return !req.user;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: `Too many ${operation} requests. Please slow down.`,
        retryAfter: Math.ceil(req.rateLimit?.resetTime / 1000)
      });
    }
  });
}

export default {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  uploadLimiter,
  commentLimiter,
  verifyEmailLimiter,
  createUserRateLimiter
};
