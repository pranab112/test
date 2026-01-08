# 🚀 Railway Frontend Deployment - Complete Guide

## Current Status ✅

- ✅ **Backend Service**: Running on Railway (`casino-royal`)
- ✅ **Environment Variables**: All configured in Railway project
- ✅ **Configuration Files**: Ready (`railway.toml`, `.env.production`)
- ✅ **Code**: Pushed to GitHub
- ⏳ **Frontend Service**: **Needs to be created** (2-minute task)

## Why We Need a Separate Service

Railway projects can have **multiple services**. Your current setup:
- **Service 1**: `casino-royal` (Backend - FastAPI/Python)
- **Service 2**: `casino-royal-frontend` (Frontend - React/Vite) **← Need to create this**

## 🎯 Quick Setup (2 Minutes)

### Option 1: Railway Dashboard (Recommended)

**Step 1: Open Railway Dashboard**
```
https://railway.app/project/737397c5-f143-447a-9cd3-6ca364c9fb00
```

**Step 2: Create New Service**
1. Click **"+ New"** button (top right)
2. Select **"GitHub Repo"**
3. Choose repository: **`pranab112/test`**
4. **CRITICAL**: Set **"Root Directory"** to: **`frontend`**
   - This tells Railway to deploy only the frontend folder
5. Set **"Service Name"** to: **`casino-royal-frontend`**
6. Click **"Deploy"**

**Step 3: Wait for Build**
- Railway will automatically:
  - Install dependencies (`npm ci`)
  - Build the app (`npm run build`)
  - Start the server (`npm run start`)
- Build takes ~2-3 minutes
- Check logs for any errors

**Step 4: Get Your Frontend URL**
- Go to service settings
- Under "Networking" → "Generate Domain"
- You'll get: `casino-royal-frontend.up.railway.app`

**Step 5: Update Backend CORS** ⚠️
```bash
# In your backend service
railway variables --set "FRONTEND_URL=https://casino-royal-frontend.up.railway.app"
```

**Done!** 🎉

### Option 2: CLI Method (After Creating Service)

**Step 1: Create service in dashboard** (follow Option 1, Steps 1-2)

**Step 2: Link locally**
```bash
cd frontend
railway link
# Select: casino-royal
# Select: casino-royal-frontend
```

**Step 3: Deploy**
```bash
railway up
```

## 📊 Environment Variables Status

All required variables are **already set** in your Railway project:

```env
✅ VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645
✅ VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2
✅ VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1
✅ VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws
✅ VITE_FILE_URL=https://casino-royal-production.up.railway.app
✅ VITE_ENVIRONMENT=production
```

These will automatically be available to your frontend service.

## 🔍 Verify Deployment

### 1. Check Build Logs
In Railway dashboard:
- Go to frontend service
- Click "Deployments"
- View logs for:
  ```
  ✓ Installing dependencies
  ✓ Building with Vite
  ✓ Starting server
  ```

### 2. Test Application
```bash
# Get your URL
railway domain

# Or open in browser
railway open
```

### 3. Test Routes
- Admin: `https://your-frontend.railway.app/a9f8e7d6c5b4a3918273645/login`
- Client: `https://your-frontend.railway.app/x1y2z3a4b5c6d7e8f9g0h1i2/login`
- Player: `https://your-frontend.railway.app/login`

### 4. Check Browser Console
- Open DevTools (F12)
- Console tab should show:
  - ✓ WebSocket connected
  - ✓ No CORS errors
  - ✓ API calls working

## 🐛 Troubleshooting

### Build Fails

**Check logs:**
```bash
railway logs
```

**Common issues:**
- Missing dependencies → Ensure `package-lock.json` is committed
- TypeScript errors → Run `npm run build` locally first
- Out of memory → Contact Railway support for plan upgrade

### Cannot Connect to Backend

**Issue**: CORS errors or API calls failing

**Solution**:
1. Verify frontend URL in backend CORS settings
2. Update backend environment variable:
   ```bash
   railway variables --set "FRONTEND_URL=https://your-frontend-url.railway.app"
   ```
3. Restart backend service

### WebSocket Fails

**Issue**: WebSocket connection errors

**Checklist**:
- ✓ `VITE_WS_URL` uses `wss://` (not `ws://`)
- ✓ Backend WebSocket endpoint is accessible
- ✓ No firewall blocking WSS connections

### Service Not Found

**Issue**: Railway CLI says "no deployments found"

**Reason**: You're linked to the backend service, not frontend

**Solution**:
```bash
railway link
# Select: casino-royal
# Select: casino-royal-frontend (the new service)
```

## 📋 Configuration Files

### `railway.toml` ✅
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### `package.json` ✅
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "start": "serve -s dist -l $PORT"
}
```

## 🔄 Update Deployment

### Via Git Push (Automatic)
```bash
# Make changes
git add .
git commit -m "Update frontend"
git push origin main

# Railway auto-deploys
```

### Via CLI (Manual)
```bash
cd frontend
railway up
```

## 📈 Monitoring

### View Logs
```bash
# Real-time
railway logs --follow

# Recent logs
railway logs --tail 100
```

### Check Metrics
In Railway dashboard:
- CPU usage
- Memory usage
- Network traffic
- Request volume

## 🎉 Success Checklist

- [ ] Frontend service created in Railway
- [ ] Service built successfully (no errors in logs)
- [ ] Application loads in browser
- [ ] Admin/Client/Player routes work
- [ ] WebSocket connects (check browser console)
- [ ] API calls succeed (no CORS errors)
- [ ] Backend CORS updated with frontend URL
- [ ] Custom domain configured (optional)

## 🆘 Quick Commands

```bash
# Check service status
railway status

# View logs
railway logs

# Deploy
railway up

# Open in browser
railway open

# Check variables
railway variables --kv

# Restart service
railway restart

# Link to service
railway link
```

## 🚀 Automated Scripts

### Windows
```cmd
setup-railway-frontend.bat
```

### PowerShell
```powershell
powershell -ExecutionPolicy Bypass -File create-railway-service.ps1
```

## 📞 Support

- **Railway Status**: https://status.railway.app
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Docs**: See `DEPLOYMENT.md`, `QUICKSTART.md`

---

## 🎯 TL;DR - Just Do This:

1. Open: https://railway.app/project/737397c5-f143-447a-9cd3-6ca364c9fb00
2. Click "+ New" → "GitHub Repo"
3. Select: `pranab112/test`
4. Root Directory: `frontend`
5. Service Name: `casino-royal-frontend`
6. Click "Deploy"
7. Wait 2-3 minutes
8. Done! 🎉

Environment variables are already configured. Backend CORS will need to be updated with your new frontend URL.
