# Railway Frontend Setup Guide

This guide explains how to set up and deploy the Casino Royal frontend as a separate service on Railway.

## Prerequisites

- Railway account
- Railway CLI installed: `npm install -g @railway/cli`
- Backend already deployed on Railway
- Git repository with frontend code

## Step-by-Step Setup

### 1. Create New Railway Service

You have two options:

#### Option A: Via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app)
2. Open your Casino Royal project
3. Click "New Service"
4. Select "GitHub Repo"
5. Choose your repository
6. Set the **Root Directory** to `frontend`
7. Railway will auto-detect the configuration from `nixpacks.toml`

#### Option B: Via CLI

```bash
cd frontend
railway init
# Select existing project: casino-royal
# Choose "Create new service"
# Name it: casino-royal-frontend
```

### 2. Link Service Locally

```bash
cd frontend
railway link
# Select project: casino-royal
# Select service: casino-royal-frontend
```

### 3. Set Environment Variables

#### Method 1: Using CLI (Automated)

Run the deployment script which sets all variables automatically:

**Windows:**
```cmd
deploy-railway.bat
```

**Linux/Mac:**
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

#### Method 2: Using Railway Dashboard

1. Go to your frontend service settings
2. Click "Variables"
3. Add the following variables:

```env
VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645
VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2
VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1
VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws
VITE_FILE_URL=https://casino-royal-production.up.railway.app
VITE_ENVIRONMENT=production
```

#### Method 3: Using CLI Manually

```bash
railway variables set VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645
railway variables set VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2
railway variables set VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1
railway variables set VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws
railway variables set VITE_FILE_URL=https://casino-royal-production.up.railway.app
railway variables set VITE_ENVIRONMENT=production
```

### 4. Configure Custom Domain (Optional)

1. Go to service settings
2. Click "Networking"
3. Click "Generate Domain" for Railway subdomain
4. Or add your custom domain

### 5. Deploy

#### First Deployment

```bash
railway up
```

This will:
- Upload your code
- Install dependencies with `npm ci`
- Build the application with `npm run build`
- Start serving with `npm run start`

#### Subsequent Deployments

**Automatic (Git-based):**
- Push to your connected branch
- Railway auto-deploys

**Manual:**
```bash
railway up
```

## Verification

### 1. Check Build Logs

```bash
railway logs
```

Look for:
- ✓ Dependencies installed
- ✓ TypeScript compiled
- ✓ Vite build completed
- ✓ Server started

### 2. Check Application Status

```bash
railway status
```

Should show:
- Service: Running
- Latest deployment: Success

### 3. Test Frontend

```bash
railway open
```

This opens your deployed frontend in a browser.

### 4. Test API Connection

1. Open browser DevTools (F12)
2. Go to Console tab
3. Check for:
   - No CORS errors
   - WebSocket connection successful
   - API calls working

### 5. Test Routes

- Admin login: `https://your-frontend.railway.app/a9f8e7d6c5b4a3918273645/login`
- Client login: `https://your-frontend.railway.app/x1y2z3a4b5c6d7e8f9g0h1i2/login`
- Player login: `https://your-frontend.railway.app/login`

## Backend CORS Configuration

⚠️ **IMPORTANT:** Update backend CORS settings to allow your frontend domain.

### Update Backend Environment Variable

Add your Railway frontend URL to the backend's allowed origins:

```bash
# In your backend service
railway variables set FRONTEND_URL=https://your-frontend.railway.app
```

### Verify Backend CORS Settings

The backend should allow origins from your frontend domain. Check `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL"),
        "https://your-frontend.railway.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

### Build Fails

**Check logs:**
```bash
railway logs --follow
```

**Common issues:**
- Missing dependencies → Ensure `package-lock.json` is committed
- TypeScript errors → Run `npm run build` locally to check
- Out of memory → Increase Railway plan resources

### Runtime Errors

**Cannot connect to API:**
- Verify `VITE_API_URL` is correct
- Check backend CORS settings
- Ensure backend is running

**WebSocket fails:**
- Verify `VITE_WS_URL` uses `wss://`
- Check backend WebSocket is accessible
- Check browser console for specific errors

**Routes don't work:**
- Ensure route tokens match between frontend and backend
- Check that SPA fallback is working (serve handles this)

### Environment Variables Not Working

**Variables not available in build:**
- All frontend env vars must start with `VITE_`
- Re-deploy after changing variables
- Check Railway dashboard to confirm variables are set

**Variables show old values:**
- Clear Railway cache: Redeploy from scratch
- Check `.env.production` is not overriding Railway variables

## Monitoring

### View Logs

```bash
# Follow logs in real-time
railway logs --follow

# View recent logs
railway logs --tail 100
```

### Check Metrics

In Railway dashboard:
- CPU usage
- Memory usage
- Network traffic
- Response times

### Set Up Alerts

1. Go to service settings
2. Click "Observability"
3. Configure:
   - Deployment notifications
   - Error rate alerts
   - Downtime alerts

## Updating

### Update Code

```bash
# Make changes
git add .
git commit -m "Update frontend"
git push origin main

# Railway automatically deploys if connected to Git
```

### Update Environment Variables

```bash
railway variables set VARIABLE_NAME=new_value
```

Note: Changing environment variables triggers a rebuild.

### Update Dependencies

```bash
# Update package.json
npm install <package>@latest

# Commit changes
git add package.json package-lock.json
git commit -m "Update dependencies"
git push

# Or deploy directly
railway up
```

## Rollback

### Via Dashboard

1. Go to Deployments
2. Find previous working deployment
3. Click three dots → "Redeploy"

### Via CLI

```bash
railway rollback
```

## Performance Optimization

### 1. Enable Compression

Already configured in `serve` package by default.

### 2. Configure Caching

Add to `railway.json`:
```json
{
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 100
  }
}
```

### 3. Monitor Bundle Size

Check after each build:
```bash
npm run build
# Look at the bundle sizes in output
```

Consider:
- Code splitting
- Lazy loading routes
- Tree shaking
- Image optimization

## Security

### 1. Environment Variables

✅ **DO:**
- Use strong, random route tokens
- Set `VITE_ENVIRONMENT=production`
- Use HTTPS (wss://) for all URLs

❌ **DON'T:**
- Commit `.env.production` to Git
- Use placeholder values in production
- Share route tokens publicly

### 2. CORS

Ensure backend only allows your specific frontend domain(s).

### 3. Rate Limiting

Configure on Railway:
- Set reasonable limits
- Monitor for abuse
- Use Railway's DDoS protection

## Cost Optimization

### 1. Choose Appropriate Plan

- **Hobby:** Free tier, good for testing
- **Developer:** $5/month, for small production apps
- **Team:** $20/month, for larger applications

### 2. Monitor Usage

Check Railway dashboard:
- Execution time
- Network egress
- Storage

### 3. Optimize Build

- Use `npm ci` instead of `npm install`
- Enable caching in nixpacks
- Minimize bundle size

## Pre-Deployment Checklist

Run the verification script:

```bash
node pre-deploy-check.js
```

This checks:
- ✓ All required files exist
- ✓ package.json scripts are defined
- ✓ Environment variables are set
- ✓ URLs use HTTPS/WSS
- ✓ Dependencies are installed
- ✓ Build configuration is correct

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- Project README: `DEPLOYMENT.md`

## Quick Reference

```bash
# Check status
railway status

# View logs
railway logs

# Deploy
railway up

# Open in browser
railway open

# List variables
railway variables

# Set variable
railway variables set KEY=value

# Rollback
railway rollback

# Restart service
railway restart
```
