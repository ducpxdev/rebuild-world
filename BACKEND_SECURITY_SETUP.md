# Backend Security Implementation Guide

## Overview

This guide covers the backend changes needed to support secure httpOnly cookie-based authentication instead of tokens in response bodies.

## Key Changes Required

### 1. Install Required Packages

```bash
cd server
npm install cookie-parser
npm install express-rate-limit
npm install helmet
npm install express-csrf-protection
```

### 2. Update Authentication Routes

#### Login Endpoint

**Before:**
```javascript
router.post('/login', async (req, res) => {
  // ... validation and password check ...
  
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  // ❌ Insecure: Token in response body
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email }
  });
});
```

**After:**
```javascript
router.post('/login', async (req, res) => {
  // ... validation and password check ...
  
  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  // ✅ Secure: Token in httpOnly cookie
  res.cookie('auth_token', token, {
    httpOnly: true,           // Cannot be accessed by JavaScript (XSS protection)
    secure: true,             // Only sent over HTTPS
    sameSite: 'strict',       // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: '/',
    domain: process.env.COOKIE_DOMAIN  // Set to your domain
  });
  
  // Only send user data (safe, non-sensitive)
  res.json({
    user: { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      avatar_url: user.avatar_url,
      is_admin: !!user.is_admin
    }
  });
});
```

#### Logout Endpoint

**Add this endpoint:**
```javascript
router.post('/logout', (req, res) => {
  // Clear the authentication cookie
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({ success: true });
});
```

#### Verify Auth Endpoint

**Update to read from cookies:**
```javascript
router.get('/me', authenticateToken, async (req, res) => {
  // Token is already validated by authenticateToken middleware
  // User data is in req.user from the middleware
  
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar_url, bio, is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      bio: user.bio,
      is_admin: !!user.is_admin
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Failed to verify authentication' });
  }
});
```

### 3. Update Authentication Middleware

**Before:**
```javascript
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}
```

**After:**
```javascript
export function authenticateToken(req, res, next) {
  // Read token from httpOnly cookie instead of Authorization header
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // Token expired or invalid
      res.clearCookie('auth_token');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  });
}

export function optionalAuth(req, res, next) {
  const token = req.cookies.auth_token;
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  
  next();
}
```

### 4. Update App Configuration

**In your main server file (e.g., index.js):**

```javascript
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'express-csrf-protection';
import cors from 'cors';

const app = express();

// ✅ Security: Set security headers
app.use(helmet());

// ✅ Security: Parse cookies
app.use(cookieParser());

// ✅ Security: Parse JSON
app.use(express.json());

// ✅ Security: CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,  // Allow cookies in cross-origin requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Authorization'],
  exposedHeaders: ['X-CSRF-Token']
}));

// ✅ Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ✅ Security: CSRF protection for state-changing requests
app.use('/api/', csrf());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
// ... other routes

// ✅ Security: Error handling without exposing details
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Never expose sensitive error details
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
```

### 5. Environment Variables

Add to `.env`:
```env
# Server Port
PORT=3001

# HTTPS - MUST be enabled in production
NODE_ENV=production
HTTPS=true

# Cookie Configuration
COOKIE_DOMAIN=storyforge.com
COOKIE_SECURE=true

# JWT Configuration
JWT_SECRET=your-strong-secret-64-characters-minimum
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@host:5432/rebuild_world

# CORS
CLIENT_URL=https://storyforge.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 6. HTTPS Configuration

**In production, HTTPS must be enabled:**

```javascript
import https from 'https';
import fs from 'fs';

if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  
  https.createServer(options, app).listen(process.env.PORT, () => {
    console.log(`HTTPS Server running on port ${process.env.PORT}`);
  });
} else {
  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}
```

## Security Checklist

### Authentication
- [x] Tokens stored in httpOnly cookies
- [x] Tokens NOT in response body
- [x] Tokens NOT logged in console
- [x] Tokens NOT exposed in errors
- [ ] HTTPS enforced in production
- [ ] Secure flag set on cookies
- [ ] SameSite attribute set
- [ ] Token expiration configured

### CORS
- [x] CORS configured for specific origin
- [x] Credentials allowed (`credentials: true`)
- [x] Appropriate methods allowed
- [x] CSRF tokens supported

### Error Handling
- [x] Sensitive data not in error responses
- [x] Errors logged on server only
- [x] Generic errors returned to client
- [x] No stack traces in production

### Rate Limiting
- [x] Rate limiting enabled
- [x] Appropriate limits set
- [x] Applies to all API routes

### Headers
- [x] Security headers via Helmet
- [x] Content Security Policy configured
- [x] X-Frame-Options set
- [x] X-Content-Type-Options set

## Testing Backend Security

### 1. Test Cookie Setting
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  -i
```

Look for:
```
Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict
```

### 2. Test Automatic Cookie Sending
```bash
curl http://localhost:3001/api/auth/me \
  -b "auth_token=your-token-here" \
  -i
```

Should return user data (200) or unauthorized (401).

### 3. Test Token in URL (should NOT work)
```bash
curl "http://localhost:3001/api/auth/me?token=your-token-here" \
  -i
```

Should return 401 Unauthorized.

### 4. Test Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b "auth_token=your-token-here" \
  -i
```

Look for:
```
Set-Cookie: auth_token=; expires=...
```

## Deployment Configuration

### Railway
```yaml
# railway.yml
services:
  server:
    environment:
      NODE_ENV: production
      HTTPS: true
      JWT_SECRET: ${{ secrets.JWT_SECRET }}
      DATABASE_URL: ${{ services.postgres.connectionString }}
      CLIENT_URL: https://storyforge.com
```

### Render
In Render Dashboard:
```
NODE_ENV=production
HTTPS=true
JWT_SECRET=<generate strong secret>
DATABASE_URL=<your postgres url>
CLIENT_URL=https://your-domain.com
```

## References

- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [HTTP Cookies - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [CSRF Protection](https://owasp.org/www-community/attacks/csrf)
