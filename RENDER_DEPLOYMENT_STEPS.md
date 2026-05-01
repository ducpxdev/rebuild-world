# Render.com Deployment Guide - Rebuild World

Your GitHub repository is ready! Follow these steps to deploy:

## Step 1: Sign Up on Render.com
1. Go to: https://render.com
2. Click **Sign Up**
3. **Sign up with GitHub** (recommended for auto-deployment)
4. Authorize Render to access your GitHub account

## Step 2: Create Web Service
1. In Render dashboard, click **New** → **Web Service**
2. Click **Connect** next to your `ducpxdev/rebuild-world` repository
3. If you don't see it, click **Connect account** to authorize access

## Step 3: Configure Deployment Settings
Fill in these exact values:

| Field | Value |
|-------|-------|
| **Name** | `rebuildworld` |
| **Environment** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instances** | Free (1 instance) |

## Step 4: Set Environment Variables
Click **Advanced** and add these variables:

```
PORT = 3000
JWT_SECRET = your_super_secret_jwt_key_change_in_production_12345
JWT_EXPIRES_IN = 7d
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = ducphamxuan1st@gmail.com
EMAIL_PASS = pxd11112002
EMAIL_FROM = "Rebuild World <ducphamxuan1st@gmail.com>"
CLIENT_URL = https://rebuildworld.onrender.com
```

**Important:** Make sure `JWT_SECRET` is a strong, random string in production!

## Step 5: Deploy
1. Click **Create Web Service**
2. Render will start building automatically
3. Wait for the build to complete (3-5 minutes)
4. Once deployed, you'll see: **Status: Live**

## Step 6: Access Your Site
Your website will be live at:
```
https://rebuildworld.onrender.com
```

## Auto-Deployment
Every time you push to `main` branch, Render will automatically deploy:

```bash
cd /home/duckie/workspace/web_project
git add .
git commit -m "your message"
git push origin main
```

## Troubleshooting

### Build Fails
- Check the **Logs** tab in Render for error messages
- Ensure all dependencies are listed in package.json
- Verify environment variables are set correctly

### Site Won't Load
- Check if the app is still running in the **Logs**
- Verify `CLIENT_URL` in environment variables
- Wait for free tier to wake up (it sleeps after 15 min inactivity)

### Email Not Sending
- Verify Gmail App Password is correct (not your regular password)
- Enable "Less secure app access" if still using regular password
- Check spam folder for test emails

## Performance Notes
- **Free tier:** Service sleeps after 15 minutes of inactivity (cold start ~20 sec)
- **Paid tier:** For persistent performance, upgrade to paid plan
- **Database:** Using sql.js (in-memory with file persistence)

## Next Steps
- Monitor the deployment in Render dashboard
- Test user registration and email verification
- Test creating and viewing stories
- Configure custom domain (optional) in Render settings

---
**Repository:** https://github.com/ducpxdev/rebuild-world
