# 🚀 Quick Start - Railway Frontend Deployment

## ✅ Pre-Deployment Verification

Run this first to ensure everything is configured correctly:

```bash
cd frontend
node pre-deploy-check.cjs
```

If all checks pass, you're ready to deploy!

## 🎯 Deploy to Railway (3 Methods)

### Method 1: Automated Script (Easiest)

**Windows:**
```cmd
cd frontend
deploy-railway.bat
```

**Linux/Mac:**
```bash
cd frontend
chmod +x deploy-railway.sh
./deploy-railway.sh
```

This script will:
- ✓ Verify Railway CLI is installed
- ✓ Check authentication
- ✓ Set all environment variables
- ✓ Deploy your application

### Method 2: Railway Dashboard (Visual)

1. Go to https://railway.app
2. Open your project: `casino-royal`
3. Click **"New Service"**
4. Select **"GitHub Repo"**
5. Choose your repository
6. Set **Root Directory** to: `frontend`
7. Add environment variables (see `.env.production`)
8. Deploy automatically starts!

### Method 3: Manual CLI

```bash
# 1. Navigate to frontend
cd frontend

# 2. Initialize/Link to Railway
railway link
# Select: casino-royal project
# Select: Create new service (or existing frontend service)

# 3. Set environment variables
railway variables set VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645
railway variables set VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2
railway variables set VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1
railway variables set VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws
railway variables set VITE_FILE_URL=https://casino-royal-production.up.railway.app
railway variables set VITE_ENVIRONMENT=production

# 4. Deploy
railway up
```

## 📋 Environment Variables Checklist

Make sure these are set in Railway:

- [ ] `VITE_ADMIN_ROUTE_TOKEN` - Admin route security token
- [ ] `VITE_CLIENT_ROUTE_TOKEN` - Client route security token
- [ ] `VITE_API_URL` - Backend API endpoint (HTTPS)
- [ ] `VITE_WS_URL` - WebSocket endpoint (WSS)
- [ ] `VITE_FILE_URL` - File upload URL
- [ ] `VITE_ENVIRONMENT` - Set to `production`

## 🔍 Verify Deployment

### 1. Check Status
```bash
railway status
```

Should show:
- ✓ Service: Running
- ✓ Latest deployment: Success

### 2. View Logs
```bash
railway logs
```

Look for:
- ✓ Dependencies installed
- ✓ Build completed
- ✓ Server started on port

### 3. Open Application
```bash
railway open
```

### 4. Test Routes

Replace `your-frontend.railway.app` with your actual Railway URL:

- **Admin:** `https://your-frontend.railway.app/a9f8e7d6c5b4a3918273645/login`
- **Client:** `https://your-frontend.railway.app/x1y2z3a4b5c6d7e8f9g0h1i2/login`
- **Player:** `https://your-frontend.railway.app/login`

## ⚠️ Important: Update Backend CORS

Your backend must allow requests from your Railway frontend domain:

```bash
# Switch to backend service
cd ..
railway link
# Select: casino-royal (backend service)

# Add frontend URL to CORS
railway variables set FRONTEND_URL=https://your-frontend.railway.app

# Redeploy backend
railway up
```

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs
railway logs

# Common fixes:
- Ensure package-lock.json is committed
- Run "npm run build" locally to test
- Check TypeScript errors
```

### Cannot Connect to API
- Verify `VITE_API_URL` is correct
- Check backend CORS settings
- Ensure backend is running

### WebSocket Errors
- Verify `VITE_WS_URL` uses `wss://` (not `ws://`)
- Check backend WebSocket is accessible
- Look at browser console for specific errors

## 📚 Documentation

- **Full Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Railway Setup Guide:** [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- **Pre-Deploy Check:** Run `node pre-deploy-check.cjs`

## 🔄 Update Deployment

After making changes:

```bash
# Commit changes
git add .
git commit -m "Update frontend"
git push origin main

# Railway auto-deploys if connected to Git
# Or manually deploy:
railway up
```

## 📊 Monitor

```bash
# View real-time logs
railway logs --follow

# Check service status
railway status

# View metrics in Railway dashboard
railway open --dashboard
```

## 🎉 Success Checklist

- [ ] Pre-deployment check passes
- [ ] Environment variables configured
- [ ] Deployment succeeds
- [ ] Application loads in browser
- [ ] Can access admin/client/player routes
- [ ] WebSocket connects successfully
- [ ] API calls work (check browser console)
- [ ] Backend CORS configured
- [ ] No console errors

## 💡 Quick Commands

```bash
# Deploy
railway up

# View logs
railway logs

# Check status
railway status

# Open in browser
railway open

# Set environment variable
railway variables set KEY=value

# Restart service
railway restart

# Rollback
railway rollback
```

## 🆘 Need Help?

1. Check logs: `railway logs`
2. Run verification: `node pre-deploy-check.cjs`
3. Review guides: DEPLOYMENT.md, RAILWAY_SETUP.md
4. Check Railway status: https://status.railway.app
5. Railway Discord: https://discord.gg/railway

---

**Ready to deploy?** Run `deploy-railway.bat` (Windows) or `./deploy-railway.sh` (Linux/Mac)!
