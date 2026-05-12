# Rate Limiting Implementation Guide

## Overview

This document covers the comprehensive rate limiting implementation to prevent spam, brute-force attacks, and API abuse.

## Architecture

### Two-Layer Rate Limiting

1. **Frontend Rate Limiting** - Prevents accidental rapid-fire requests and improves UX
2. **Backend Rate Limiting** - Enforces actual limits and protects against distributed attacks

Both layers work together to provide defense-in-depth protection.

## Backend Rate Limiting

### Middleware Configuration

File: [server/src/middleware/rateLimit.js](server/src/middleware/rateLimit.js)

#### Global API Limiter
```
Limit: 100 requests per 15 minutes per IP
Applied to: All /api/* routes
```

#### Endpoint-Specific Limiters

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `/auth/login` | 5 attempts | 15 min | Prevent brute-force attacks |
| `/auth/register` | 3 attempts | 15 min | Prevent spam account creation |
| `/auth/forgot-password` | 3 attempts | 1 hour | Prevent email spam |
| `/auth/verify-email` | 5 attempts | 1 hour | Prevent verification spam |
| `/auth/resend-verification` | 5 attempts | 1 hour | Prevent email spam |
| Image uploads | 20 uploads | 1 hour | Prevent storage abuse |
| Comments | 10 posts | 5 min | Prevent comment spam |

### Response Format (429 Too Many Requests)

```json
{
  "error": "Too many login attempts. Please try again in 30 seconds.",
  "retryAfter": 30,
  "remaining": 0
}
```

### Installation

```bash
npm install express-rate-limit
```

### Implementation in Express

The rate limiters are applied in [server/src/index.js](server/src/index.js):

```javascript
import { apiLimiter } from './middleware/rateLimit.js';

// Apply to all API routes
app.use('/api/', apiLimiter);
```

And on specific auth routes in [server/src/routes/auth.js](server/src/routes/auth.js):

```javascript
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimit.js';

router.post('/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

## Frontend Rate Limiting

### Client Rate Limiting Utilities

File: [client/src/lib/rateLimit.ts](client/src/lib/rateLimit.ts)

#### LoginRateLimiter
Prevents rapid-fire login attempts locally:

```typescript
import { rateLimiting } from '../lib/rateLimit';

// Check if attempt is allowed
const { allowed, error, retryAfter } = rateLimiting.login.isAllowed();

if (allowed) {
  // Proceed with login
  rateLimiting.login.recordAttempt();
} else {
  // Show error: "Too many login attempts..."
}

// On success, reset
rateLimiting.login.reset();
```

**Behavior:**
- Max 5 attempts per 15 minutes
- 30-second throttle between attempts
- Countdown timer shown to user
- Remaining attempts displayed

#### RequestDebouncer
Prevents duplicate requests when user clicks button multiple times:

```typescript
const { debouncer } = rateLimiting;

// Deduplicate concurrent requests
const result = await debouncer.deduplicate(
  'unique-key',
  () => api.post('/api/endpoint', data)
);
```

#### ApiThrottler
Throttles all API calls:

```typescript
const { apiThrottler } = rateLimiting;

if (apiThrottler.isAllowed()) {
  // Make API call
} else {
  // Show: "Please slow down - too many requests"
}
```

### Error Handling

Utilities for detecting and handling rate limit errors:

```typescript
import { 
  isRateLimitError, 
  getRetryAfter, 
  formatRetryTime 
} from '../lib/rateLimit';

try {
  await api.post('/login', data);
} catch (error) {
  if (isRateLimitError(error)) {
    const seconds = getRetryAfter(error); // 30
    const formatted = formatRetryTime(seconds); // "30 seconds"
    setError(`Try again in ${formatted}`);
  }
}
```

## Frontend Integration

### LoginPage.tsx

The login page has been updated with comprehensive rate limiting:

```typescript
import { rateLimiting, isRateLimitError, getRetryAfter } from '../lib/rateLimit';

export default function LoginPage() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e) => {
    // Check frontend rate limiting
    const rateLimitCheck = rateLimiting.login.isAllowed();
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.error);
      setIsRateLimited(true);
      setRetryAfter(rateLimitCheck.retryAfter);
      return;
    }

    try {
      await login(email, password);
      rateLimiting.login.reset(); // Success - reset
    } catch (err) {
      rateLimiting.login.recordAttempt();
      
      if (isRateLimitError(err)) {
        const seconds = getRetryAfter(err);
        setIsRateLimited(true);
        setRetryAfter(seconds);
      }
    }
  };

  // Show warnings when approaching limit
  const remaining = rateLimiting.login.getRemaining();
  if (remaining < 5) {
    // Display warning
  }
}
```

**UX Features:**
- ✅ Warning when approaching limit
- ✅ Countdown timer when blocked
- ✅ Disabled form inputs during lockout
- ✅ Clear retry instructions
- ✅ Distinguishes rate limit errors from auth failures

## Security Benefits

### Prevents Brute-Force Attacks
- Limits login attempts to 5 per 15 minutes
- Each failed attempt adds 30-second delay
- Attackers need 75+ minutes for 10 attempts

### Prevents Spam
- Registration: 3 attempts per 15 minutes
- Comments: 10 posts per 5 minutes
- Uploads: 20 per hour
- Email verification: 5 attempts per hour

### Prevents Distributed Attacks
- Backend rate limiting by IP address
- Works even if frontend is bypassed
- Still protects against distributed botnets

### API Abuse Protection
- Global 100 requests per 15 minutes per IP
- Gradual backoff prevents server overload
- Automatic recovery after time window

## HTTP Status Codes and Headers

### 429 Too Many Requests
Standard HTTP status code for rate limiting.

**Response Headers:**
```
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1652000000
```

**Response Body:**
```json
{
  "error": "Too many login attempts. Please try again in 30 seconds.",
  "retryAfter": 30,
  "remaining": 0
}
```

## Configuration

### Environment Variables

Add to `.env`:
```env
# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Customizing Limits

Edit [server/src/middleware/rateLimit.js](server/src/middleware/rateLimit.js):

```javascript
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                     // Max 5 attempts
  // ... rest of config
});
```

### Production Considerations

#### Memory Store (Default)
- Built into express-rate-limit
- Sufficient for small to medium deployments
- Limited to single server instance

#### Redis Store (Recommended for Production)
For distributed systems, use Redis:

```bash
npm install rate-limit-redis redis
```

```javascript
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const client = redis.createClient();

export const loginLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
});
```

## Testing Rate Limiting

### Manual Testing

#### Test Login Rate Limit
```bash
# First 5 attempts should succeed (validation), then fail
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@test.com","password":"wrong"}'
  echo "Attempt $i"
done
```

#### Check Rate Limit Headers
```bash
curl -I http://localhost:3001/api/auth/login \
  -X POST \
  -H "Content-Type: application/json"
```

Look for:
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1652000000
```

#### Test 429 Response
After limit exceeded:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"wrong"}'
```

Should return:
```
HTTP/1.1 429 Too Many Requests
{
  "error": "Too many login attempts. Please try again in 30 seconds.",
  "retryAfter": 30,
  "remaining": 0
}
```

### Automated Testing

```typescript
describe('Rate Limiting', () => {
  test('should block login after 5 attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await api.post('/auth/login', {
        email: 'test@example.com',
        password: 'wrong'
      });
      expect(res.status).toBe(401); // Auth failure, not rate limit
    }

    // 6th attempt should be rate limited
    const res = await api.post('/auth/login', {
      email: 'test@example.com',
      password: 'wrong'
    });
    expect(res.status).toBe(429);
    expect(res.data.error).toContain('Too many');
  });

  test('should show frontend warnings', async () => {
    const { getByText } = render(<LoginPage />);
    
    // Trigger 4 attempts (frontend only)
    for (let i = 0; i < 4; i++) {
      userEvent.click(getByText('Sign In'));
    }

    // Should show warning
    expect(getByText(/1 login attempt remaining/i)).toBeInTheDocument();
  });
});
```

## Monitoring and Alerting

### Log Rate Limit Events

In production, log rate limit events for monitoring:

```javascript
app.use('/api/', (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 429) {
      console.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        timestamp: new Date().toISOString()
      });
      // Send to monitoring service
    }
  });
  next();
});
```

### Alert Thresholds
- Alert if > 10 rate limit events per minute per IP
- Alert if > 100 rate limit events per hour globally
- Review and adjust limits if legitimate users are affected

## Troubleshooting

### "Too Many Requests" for Legitimate Users

**Problem:** Users getting rate limited on valid requests

**Solutions:**
1. Increase limits in rateLimit.js
2. Implement whitelist for trusted IPs
3. Use Redis to better distribute limits
4. Consider authenticated vs unauthenticated limits

### Rate Limiting Not Working

**Problem:** Requests not being limited

**Debugging:**
1. Check middleware is applied: `curl -i` to see headers
2. Verify `express-rate-limit` is installed
3. Check for multiple express apps (limits apply per app)
4. Ensure rate limiter middleware is before routes

### False Positives (NAT/VPN Users)

**Problem:** Multiple users behind same IP all get rate limited

**Solutions:**
1. Use `trust proxy` setting if behind reverse proxy
2. Accept additional proxy headers
3. Implement user-based rate limiting instead of IP

```javascript
app.set('trust proxy', 1); // Trust first proxy

export const userLimiter = rateLimit({
  keyGenerator: (req, res) => {
    // Use user ID instead of IP
    return req.user?.id || req.ip;
  }
});
```

## Best Practices

### ✅ DO
- Combine frontend and backend rate limiting
- Use different limits for different endpoints
- Return `Retry-After` header
- Log rate limit events
- Use Redis for distributed systems
- Whitelist health check endpoints
- Scale limits based on load testing
- Document limits in API docs

### ❌ DON'T
- Only use frontend rate limiting (easy to bypass)
- Use same limits for all endpoints
- Hide rate limit information from users
- Ignore rate limit bypass attempts
- Store rate limits in memory for production
- Rate limit all users equally (authenticated vs anonymous)
- Return confusing error messages
- Lock out users permanently

## References

- [Express Rate Limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [OWASP: Brute Force Protection](https://owasp.org/www-community/attacks/Brute_force_attack)
- [RFC 6585: HTTP Status Code 429](https://tools.ietf.org/html/rfc6585#section-4)
- [HTTP Rate Limiting Strategies](https://www.cloudflare.com/learning/bots/rate-limiting/)
