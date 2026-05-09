# Rebuild World - Web Novel Platform

A full-stack platform for reading and sharing web novels with copy-protection for chapter content.

## Deployment Guide

Your project is ready for deployment! Follow these steps:

### Step 1: Push to GitHub

If you haven't already:

```bash
# Set your GitHub token (or use SSH key)
export GH_TOKEN=your_github_personal_access_token

# Create a new repo on GitHub via web interface at github.com/new
# Name it: rebuild-world
# Then add the remote:
git remote add origin https://github.com/YOUR_USERNAME/rebuild-world.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render.com (Free with "rebuildworld" subdomain)

1. Go to https://render.com
2. Sign up (free account)
3. Click **New** → **Web Service**
4. **Connect your GitHub repo** (`rebuild-world`)
5. Configure deployment:
   - **Name:** `rebuildworld` (gets you `rebuildworld.onrender.com`)
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`

6. **Add Environment Variables** (in Render dashboard):
   ```
   PORT=3000
   DATABASE_URL=<persistent_postgres_connection_url>
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM="Rebuild World <your_email@gmail.com>"
   CLIENT_URL=https://rebuildworld.onrender.com
   ```

7. Click **Create Web Service**
8. Render will auto-deploy on every push to `main`

### Environment Variables Needed

- `DATABASE_URL`: Persistent Postgres connection string (required)
- `JWT_SECRET`: Change from the default value in production
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: Gmail or other SMTP
  - For Gmail: Use an [App Password](https://support.google.com/accounts/answer/185833)
- `CLIENT_URL`: Set to your deployed Render URL

### Local Testing Before Deploy

```bash
# Terminal 1: Start server
cd server
npm install
node src/index.js

# Terminal 2: Build & serve client
cd client
npm install
npm run build
```

Visit `http://localhost:3001`

### Project Structure

- **Server:** Node.js/Express with PostgreSQL database
- **Client:** React + TypeScript + Vite with Tailwind CSS
- **Database:** PostgreSQL (persistent across redeploys)
- **File Uploads:** Chapter cover images stored in `server/uploads/`

### Features

✓ User authentication with email verification
✓ Story creation and management
✓ Chapter upload (text & comic formats)
✓ Copy-protection on chapter content
✓ Comments system
✓ User profiles and follow system
✓ Story ratings and bookmarks

---

**After deployment, your site will be live at:** `https://rebuildworld.onrender.com`

Note: Render's free tier has some limitations (sleeps after 15 min inactivity). For production, consider their paid plans.
