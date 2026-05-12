# Login Redirect Bug - Root Cause Analysis and Fix

## 🐛 The Problem

You were getting redirected back to the login page immediately after signing in with a registered account. This happened because:

1. You click "Sign In" with valid credentials
2. Login appears successful and you're taken to the home page
3. App immediately redirects you back to `/login`
4. You're stuck in a login loop

## 🔍 Root Cause

The security refactoring created a mismatch between frontend and backend:

### What the Frontend Expected (After Security Update)
```
1. POST /api/auth/login → Backend sets httpOnly cookie, returns user data
2. Frontend stores user in state
3. Next request → Browser automatically sends cookie
4. GET /api/auth/me → Reads user from cookie ✓
5. User stays logged in ✓
```

### What the Backend Was Actually Doing (Before Fix)
```
1. POST /api/auth/login → Returns { token: "...", user: {...} }
2. Frontend ignores token (as per security design)
3. No cookie was set ✗
4. GET /api/auth/me → No cookie sent
5. Request fails with 401 → Redirect to login ✗
```

## 🔧 The Fix

### 1. **Backend Login Endpoint** (`server/src/routes/auth.js`)

**Before:**
```javascript
res.json({
  token,  // ← Token in response body (ignored by frontend)
  user: { ... }
});
```

**After:**
```javascript
// Set httpOnly cookie
res.cookie('auth_token', token, {
  httpOnly: true,                           // JS can't access
  secure: process.env.NODE_ENV === 'production', // HTTPS in production
  sameSite: 'strict',                       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 days
  path: '/'
});

// Only return user data
res.json({
  user: { ... }  // No token in response
});
```

### 2. **Backend Logout Endpoint** (`server/src/routes/auth.js`)

Added new POST endpoint:
```javascript
router.post('/logout', async (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({ success: true });
});
```

### 3. **Authentication Middleware** (`server/src/middleware/auth.js`)

**Before:**
```javascript
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1]; // Read from header
```

**After:**
```javascript
const token = req.cookies?.auth_token; // Read from cookie
```

Also clears cookie if token is invalid:
```javascript
if (!token) {
  return res.status(401).json({ error: 'Not authenticated' });
}

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
} catch {
  res.clearCookie('auth_token'); // Clear invalid token
  return res.status(401).json({ error: 'Not authenticated' });
}
```

### 4. **Express Setup** (`server/src/index.js`)

Added cookie-parser middleware:
```javascript
import cookieParser from 'cookie-parser';

app.use(cors({
  origin: true,
  credentials: true,  // Allow credentials
}));
app.use(cookieParser());  // Parse cookies
app.use(express.json({ limit: '10mb' }));
```

### 5. **Installed Dependencies**

```bash
npm install cookie-parser
```

## 📊 How It Works Now

### Login Flow

```
User enters credentials
        ↓
POST /api/auth/login
        ↓
Backend validates credentials
        ↓
Backend sets httpOnly cookie
        ↓
res.json({ user: {...} })
        ↓
Frontend stores user in React state
        ↓
Navigate to home page
        ↓
useEffect calls GET /api/auth/me
        ↓
Browser automatically sends auth_token cookie
        ↓
Backend reads cookie, validates JWT
        ↓
Returns user data
        ↓
Frontend confirms user is authenticated ✓
        ↓
User sees home page (NOT redirected to login)
```

### Subsequent Requests

```
Frontend wants to access protected endpoint
        ↓
POST /api/stories (or any protected route)
        ↓
Browser automatically adds auth_token cookie
        ↓
authenticateToken middleware reads cookie
        ↓
Validates JWT from cookie
        ↓
req.user is set
        ↓
Route handler can access req.user
```

### Logout Flow

```
User clicks "Logout"
        ↓
POST /api/auth/logout
        ↓
Backend clears auth_token cookie
        ↓
res.json({ success: true })
        ↓
Frontend clears user from state
        ↓
Navigate to login page
        ↓
Next request has no cookie
        ↓
401 response → User must log in again ✓
```

## 🔐 Security Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Token Storage** | Response body (exposed) | httpOnly cookie (protected) |
| **JavaScript Access** | Yes (XSS vulnerable) | No (XSS safe) |
| **HTTPS Required** | No | Yes (in production) |
| **CSRF Protection** | No | Yes (sameSite=strict) |
| **Automatic Sending** | Manual (via auth header) | Automatic (browser) |
| **Logout Capability** | Manual clearing | Server-side cookie clear |

## ✅ Testing

### 1. **Test Login**
- Go to `/login`
- Enter valid registered email and password
- Should navigate to home page (NOT redirect back to login)
- Page should stay logged in on refresh

### 2. **Test Logout**
- Click "Logout" button
- Should redirect to login page
- Page should not show user data

### 3. **Test Cookie in DevTools**
- Open Browser DevTools → Application/Storage → Cookies
- After login, should see `auth_token` cookie
  - Type: HttpOnly
  - SameSite: Strict
  - Path: /
  - Expires: 7 days from login
- After logout, cookie should be gone

### 4. **Test Protected Routes**
- Log in successfully
- Try to access `/dashboard` or other protected page
- Should work without re-login
- Refresh the page - should still work

## 🚀 What's Changed

**Modified Files:**
- `server/src/routes/auth.js` - Set cookies in login, added logout
- `server/src/middleware/auth.js` - Read from cookies instead of headers
- `server/src/index.js` - Added cookie-parser middleware
- `server/package.json` - Added cookie-parser dependency

**No Changes Needed:**
- Frontend code (`AuthContext.tsx`, `api.ts`) - Already correct
- Database schema - No changes
- API contract - Similar structure, just moved token to cookie

## 📝 Migration Notes

If you have existing logged-in users:
- Old tokens in localStorage will be ignored
- Users will need to log in once to get the new cookie-based token
- This is a security improvement, not a bug

## 🔗 Related Documentation

- [SECURITY_BEST_PRACTICES.md](../SECURITY_BEST_PRACTICES.md) - Overall security strategy
- [BACKEND_SECURITY_SETUP.md](../BACKEND_SECURITY_SETUP.md) - Backend configuration details
- [RATE_LIMITING_GUIDE.md](../RATE_LIMITING_GUIDE.md) - Rate limiting for brute-force protection

---

**Commit:** `eab19f6`  
**Status:** ✅ Fixed and tested  
**Build:** ✅ Passing with no errors
