# Security Best Practices for API Key and Token Protection

## Overview

This document outlines the security measures implemented to prevent API keys, tokens, passwords, and other sensitive information from being exposed in the frontend.

## Security Architecture

### Token Management

**❌ INSECURE (Before):**
```typescript
// Storing tokens in localStorage - vulnerable to XSS
const token = localStorage.getItem('token');
config.headers.Authorization = `Bearer ${token}`;

// Passing tokens in URL - can be logged, cached, shared
?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ SECURE (After):**
```typescript
// Tokens in httpOnly cookies - secure by default
// Browser automatically sends cookies with requests
// Backend sets: Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict

// No tokens in URLs, localStorage, or visible to JavaScript
```

### How It Works

1. **User logs in** → POST `/api/auth/login`
2. **Backend validates credentials** → Issues JWT token
3. **Backend sets httpOnly cookie** → `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict`
4. **Frontend receives user data** → Stored in React state (safe, non-sensitive)
5. **Subsequent requests** → Browser automatically includes cookie
6. **Backend validates token** → From cookie, not from JavaScript

## Environment Variables

### ✅ Safe to Expose (VITE_ prefix)
```env
VITE_API_BASE_URL=https://api.storyforge.com
VITE_APP_ENV=production
VITE_ANALYTICS_ID=analytics-tracking-id
```

### ❌ NEVER Expose
```env
VITE_JWT_SECRET=...
VITE_API_KEY=...
VITE_DATABASE_URL=...
VITE_STRIPE_SECRET_KEY=...
VITE_SENDGRID_API_KEY=...
VITE_SESSION_SECRET=...
```

## Frontend Security Implementation

### 1. Security Module (`client/src/lib/security.ts`)

Provides utilities for:
- ✅ Validating environment variables at startup
- ✅ Sanitizing error messages
- ✅ Detecting token leaks in localStorage
- ✅ Cleaning up tokens from URLs
- ✅ Secure logging (disabled in production)
- ✅ XSS detection in data
- ✅ Security header validation

```typescript
import { initializeSecurity } from './lib/security'

// Run on app startup
initializeSecurity()
```

### 2. API Configuration (`client/src/lib/api.ts`)

Key changes:
- ✅ Removed token from Authorization header
- ✅ Added `withCredentials: true` for cookie sending
- ✅ Added CSRF token support
- ✅ Removed token storage in response
- ✅ Secure error handling

```typescript
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // Send cookies
});

// Token automatically sent via cookie
// No localStorage, no Authorization header
```

### 3. Auth Context (`client/src/context/AuthContext.tsx`)

Key changes:
- ✅ Removed `token` from state and context
- ✅ Replaced with `isAuthenticated` boolean
- ✅ Added cleanup of stored tokens on init
- ✅ Backend calls handle cookie-based auth
- ✅ Added logout endpoint call

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;  // Not the token
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
}
```

## Backend Requirements

Backend must be configured to:

1. **Set httpOnly Cookies:**
```javascript
res.cookie('auth_token', token, {
  httpOnly: true,        // Cannot be accessed by JavaScript
  secure: true,          // Only sent over HTTPS
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});
```

2. **Handle CSRF Protection:**
```javascript
// Issue CSRF tokens for state-changing requests
app.post('/api/auth/login', csrfProtection, (req, res) => {
  // ... auth logic
  res.set('X-CSRF-Token', newToken);
});
```

3. **Validate Tokens from Cookies:**
```javascript
app.use((req, res, next) => {
  const token = req.cookies.auth_token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Invalid token
    }
  }
  next();
});
```

4. **Implement Logout Endpoint:**
```javascript
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});
```

## What Changed in the Frontend

### Before (Insecure)
```typescript
// ❌ Token in localStorage
localStorage.setItem('token', response.token);

// ❌ Token in context
interface AuthContextType {
  token: string | null;  // Exposed to entire app
}

// ❌ Token in URL
?token=eyJhbGciOi...

// ❌ Token in Authorization header
config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
```

### After (Secure)
```typescript
// ✅ Token in httpOnly cookie (set by backend)
// Frontend never receives or stores token

// ✅ Only user data in state
interface AuthContextType {
  user: User | null;        // Safe, non-sensitive
  isAuthenticated: boolean; // Simple boolean flag
}

// ✅ No tokens in URLs
// Clean URLs, no sensitive data exposed

// ✅ Token sent automatically via cookie
// Browser handles it transparently
withCredentials: true  // Include cookies in requests
```

## Security Checklist

Frontend:
- [x] No `token` in localStorage
- [x] No `token` in sessionStorage
- [x] No `token` in state/context
- [x] No `token` in URLs
- [x] No `token` in Authorization header
- [x] Automatic cookie sending enabled
- [x] CSRF token support implemented
- [x] Environment variables validated
- [x] Secure logging in production
- [x] Token cleanup on auth errors

Backend:
- [ ] httpOnly cookie for auth token
- [ ] CSRF protection middleware
- [ ] Secure flag for cookies (HTTPS)
- [ ] SameSite attribute set
- [ ] Token validation from cookies
- [ ] Logout endpoint clears cookie
- [ ] Error messages don't expose tokens
- [ ] No tokens in API responses
- [ ] Database connection strings not exposed
- [ ] API keys not logged

## Common Issues and Solutions

### Issue: "Token not being sent with requests"
**Solution:** Ensure `withCredentials: true` is set in axios config.

### Issue: "CORS errors with credentials"
**Solution:** Backend must set `credentials: 'include'` and proper CORS headers.

### Issue: "Tokens in localStorage during migration"
**Solution:** Security module automatically detects and clears them.

### Issue: "Tokens passed in OAuth redirect URL"
**Solution:** Cleanup function removes tokens from URL on app load.

## Testing Security

### 1. Check Environment Variables
```bash
# Should see no sensitive variables exposed
grep -r "JWT_SECRET\|API_KEY\|DATABASE" client/src/
```

### 2. Verify Cookies
```javascript
// In browser console
console.log(document.cookie);  // Should show app cookies (not auth tokens)

// Check for auth cookie (opaque, cannot be read by JS)
// Network tab → Response Headers → Set-Cookie
```

### 3. Test Token Cleanup
```javascript
// If tokens exist in localStorage, security module will detect:
// "❌ SECURITY: Tokens found in storage!"
```

### 4. Validate API Requests
```javascript
// Network tab → fetch request
// Should have: Cookie: auth_token=...
// Should NOT have: Authorization: Bearer ...
```

## Production Checklist

Before deploying:
1. [ ] Backend configured for httpOnly cookies
2. [ ] HTTPS enforced in production
3. [ ] CSRF tokens issued and validated
4. [ ] Security headers configured
5. [ ] No console.logs of sensitive data
6. [ ] Environment variables validated
7. [ ] Logout endpoint clears cookies
8. [ ] Error messages sanitized
9. [ ] CORS configured correctly
10. [ ] Rate limiting enabled

## References

- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Cross-Site Request Forgery (CSRF)](https://owasp.org/www-community/attacks/csrf)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

## Support

For security concerns:
1. Review this guide
2. Check `client/src/lib/security.ts` for implementation
3. Review backend auth configuration
4. Check browser Network tab for actual requests
5. Report vulnerabilities responsibly
