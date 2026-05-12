/**
 * Frontend Rate Limiting
 * Prevents rapid-fire requests and improves UX
 * Works in conjunction with backend rate limiting
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  retryAfterMs: number;
}

/**
 * Rate limiter for login attempts
 * Prevents rapid-fire login attempts
 */
export class LoginRateLimiter {
  private attempts: number = 0;
  private lastAttemptTime: number = 0;
  private blockedUntil: number = 0;

  private config: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    retryAfterMs: 30 * 1000, // 30 seconds between attempts
  };

  /**
   * Check if login attempt is allowed
   */
  isAllowed(): { allowed: boolean; error?: string; retryAfter?: number } {
    const now = Date.now();

    // Check if still blocked
    if (now < this.blockedUntil) {
      const remainingMs = this.blockedUntil - now;
      return {
        allowed: false,
        error: `Too many login attempts. Please try again in ${Math.ceil(remainingMs / 1000)} seconds.`,
        retryAfter: remainingMs
      };
    }

    // Reset window if expired
    if (now - this.lastAttemptTime > this.config.windowMs) {
      this.attempts = 0;
    }

    // Check max attempts
    if (this.attempts >= this.config.maxAttempts) {
      this.blockedUntil = now + this.config.windowMs;
      return {
        allowed: false,
        error: `Maximum login attempts exceeded. Please try again in 15 minutes.`,
        retryAfter: this.config.windowMs
      };
    }

    return { allowed: true };
  }

  /**
   * Record a login attempt
   */
  recordAttempt() {
    const now = Date.now();
    
    // Reset if window expired
    if (now - this.lastAttemptTime > this.config.windowMs) {
      this.attempts = 0;
    }

    this.attempts++;
    this.lastAttemptTime = now;

    // Block briefly after each attempt
    this.blockedUntil = now + this.config.retryAfterMs;
  }

  /**
   * Mark login as successful - reset counter
   */
  reset() {
    this.attempts = 0;
    this.lastAttemptTime = 0;
    this.blockedUntil = 0;
  }

  /**
   * Get remaining attempts
   */
  getRemaining(): number {
    return Math.max(0, this.config.maxAttempts - this.attempts);
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingTime(): number {
    return Math.max(0, Math.ceil((this.blockedUntil - Date.now()) / 1000));
  }
}

/**
 * Request debouncer for API calls
 * Prevents duplicate requests if user clicks button multiple times
 */
export class RequestDebouncer {
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Deduplicate requests
   * Returns same promise for concurrent identical requests
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If same request is already pending, return that promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new promise and store it
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }
}

/**
 * API call throttler
 * Limits API calls per time window
 */
export class ApiThrottler {
  private callTimes: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number = 30, windowMs: number = 60 * 1000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  /**
   * Check if API call is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();

    // Remove old calls outside window
    this.callTimes = this.callTimes.filter(time => now - time < this.windowMs);

    // Check if under limit
    if (this.callTimes.length < this.maxCalls) {
      this.callTimes.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get remaining calls
   */
  getRemaining(): number {
    const now = Date.now();
    this.callTimes = this.callTimes.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxCalls - this.callTimes.length);
  }
}

/**
 * Global rate limit tracker
 */
export const rateLimiting = {
  login: new LoginRateLimiter(),
  debouncer: new RequestDebouncer(),
  apiThrottler: new ApiThrottler(30, 60 * 1000), // 30 calls per minute
};

/**
 * Check if error is rate limit error
 */
export function isRateLimitError(error: any): boolean {
  return error?.response?.status === 429;
}

/**
 * Get retry-after time from error
 */
export function getRetryAfter(error: any): number | null {
  if (!isRateLimitError(error)) return null;

  // Check for retryAfter field
  if (error.response?.data?.retryAfter) {
    return error.response.data.retryAfter;
  }

  // Check Retry-After header
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
  }

  // Default to 60 seconds
  return 60;
}

/**
 * Format time for display
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
