# Render Deployment Troubleshooting Guide

## ✅ Current Status
- ✅ Local build works correctly
- ✅ Client builds to `client/dist/`
- ✅ Server configured to serve static files
- ⚠️ "Not Found" error on Render deployment

## 🔍 How to Check Render Logs

1. Go to: https://dashboard.render.com
2. Select your **rebuildworld** service
3. Click the **Logs** tab
4. Look for:
   - Build errors (if build failed)
   - Runtime errors (if server crashed)
   - Port binding issues

## Common Issues & Fixes

### Issue 1: Build Failed on Render
**Signs:** Red error messages in Logs → Build section

**Solution:** Render might not have all dependencies. Try this:

1. In Render dashboard, go to your service
2. Click **Settings**
3. Update **Build Command** to:
   ```
   npm install && npm run build
   ```

4. Click **Save**
5. Go back to **Logs** tab
6. Click **Manual Deploy** (top right)

### Issue 2: "Cannot find module" errors
**Solution:** Add missing Node modules. Update root **package.json**:

```json
{
  "name": "rebuild-world",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd client && npm install && npm run build",
    "start": "cd server && npm install && node src/index.js",
    "install:server": "cd server && npm install",
    "postinstall": "npm run install:server && npm run build"
  },
  "dependencies": {
    "dotenv": "^16.4.5"
  }
}
```

Then redeploy.

### Issue 3: Client files not being served
**Signs:** Server is running but CSS/JS files return 404

**Solution:** Check that these files exist in Render:

1. In Render Logs, look for message like:
   ```
   Rebuild World server running on http://localhost:3000
   ```

2. If it shows the server is running, the issue might be the client wasn't built.
3. The `client/dist/index.html` must exist.

**Try this in Render Build Command:**
```
npm install && cd server && npm install && cd .. && npm run build
```

### Issue 4: Wrong PORT
**Signs:** Server starts but connection refused

**Solution:** Ensure PORT environment variable is set:

1. In Render dashboard → your service → **Environment**
2. Make sure `PORT=3000` is set
3. The server will use this automatically

## ✅ What Should Work

When properly deployed:
1. Visit `https://rebuildworld.onrender.com`
2. You should see the Rebuild World homepage
3. You can login, register, create stories
4. API calls to `/api/*` work

## Quick Restart
If Render gets stuck:
1. Go to Render dashboard
2. Click **Manual Deploy**
3. Select **Redeploy** from the dropdown
4. Wait 3-5 minutes

## Last Resort: Rebuild from Scratch
1. In Render, click your service
2. Click **Settings** (bottom right)
3. Click **Delete Web Service** (red button)
4. Go back to dashboard → **New** → **Web Service**
5. Reconnect GitHub repo and reconfigure

---

**After fixing, your site should be live at:** https://rebuildworld.onrender.com
