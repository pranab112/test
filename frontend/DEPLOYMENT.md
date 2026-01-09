# Casino Royal Frontend - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Casino Royal frontend application to Railway using Nixpacks.

## Prerequisites

1. **Node.js** (v20 or higher)
2. **Railway CLI** - Install with:
   ```bash
   npm install -g @railway/cli
   ```
3. **Railway Account** - Sign up at [railway.app](https://railway.app)
4. **Git** - For version control

## Environment Variables

The application requires the following environment variables:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_ADMIN_ROUTE_TOKEN` | Secure token for admin route | `a9f8e7d6c5b4a3918273645` |
| `VITE_CLIENT_ROUTE_TOKEN` | Secure token for client route | `x1y2z3a4b5c6d7e8f9g0h1i2` |
| `VITE_API_URL` | Backend API URL | `https://your-backend.railway.app/api/v1` |
| `VITE_WS_URL` | WebSocket URL | `wss://your-backend.railway.app/ws` |
| `VITE_FILE_URL` | File upload URL | `https://your-backend.railway.app` |
| `VITE_ENVIRONMENT` | Environment name | `production` |

### Environment Files

- **`.env`** - Local development (not committed)
- **`.env.example`** - Template with placeholder values
- **`.env.production`** - Production values (not committed)

## Deployment Methods

### Method 1: Automated Script (Recommended)

#### Windows:
```cmd
cd frontend
deploy-railway.bat
```

#### Linux/Mac:
```bash
cd frontend
chmod +x deploy-railway.sh
./deploy-railway.sh
```

The script will:
1. Check Railway CLI installation
2. Verify authentication
3. Confirm project link
4. Set environment variables
5. Deploy the application

### Method 2: Manual Deployment

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Link to Project:**
   ```bash
   cd frontend
   railway link
   ```
   Select your project from the list or create a new one.

3. **Set Environment Variables:**
   ```bash
   railway variables set VITE_ADMIN_ROUTE_TOKEN=a9f8e7d6c5b4a3918273645
   railway variables set VITE_CLIENT_ROUTE_TOKEN=x1y2z3a4b5c6d7e8f9g0h1i2
   railway variables set VITE_API_URL=https://casino-royal-production.up.railway.app/api/v1
   railway variables set VITE_WS_URL=wss://casino-royal-production.up.railway.app/ws
   railway variables set VITE_FILE_URL=https://casino-royal-production.up.railway.app
   railway variables set VITE_ENVIRONMENT=production
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

### Method 3: Git-based Deployment

1. **Connect Repository:**
   - Go to Railway dashboard
   - Create new project
   - Connect your GitHub repository
   - Select the `frontend` directory as root

2. **Configure Build:**
   Railway will automatically detect the `nixpacks.toml` configuration:
   ```toml
   [phases.setup]
   nixPkgs = ["nodejs_20"]

   [phases.install]
   cmds = ["npm ci"]

   [phases.build]
   cmds = ["npm run build"]

   [start]
   cmd = "npm run start"
   ```

3. **Set Environment Variables:**
   - Go to project settings
   - Add all required environment variables
   - Deploy automatically triggers

## Configuration Files

### `nixpacks.toml`
Configures the build process for Railway Nixpacks:
- Uses Node.js 20
- Installs dependencies with `npm ci`
- Builds with `npm run build`
- Starts with `npm run start`

### `railway.json`
Additional Railway-specific configuration:
- Build command
- Start command
- Restart policy

### `package.json` Scripts
- `dev` - Development server (Vite)
- `build` - Production build (TypeScript + Vite)
- `start` - Serve production build on Railway
- `preview` - Preview production build locally

## Build Process

1. **Install Dependencies:**
   ```bash
   npm ci
   ```

2. **Build Application:**
   ```bash
   npm run build
   ```
   - Compiles TypeScript
   - Bundles with Vite
   - Outputs to `dist/` directory

3. **Serve:**
   ```bash
   npm run start
   ```
   - Uses `serve` package
   - Serves static files from `dist/`
   - Binds to Railway's `$PORT` variable

## Verification

### Check Deployment Status
```bash
railway status
```

### View Logs
```bash
railway logs
```

### Open Application
```bash
railway open
```

### Test API Connection
1. Open browser console
2. Check WebSocket connection
3. Verify API calls to backend

## Troubleshooting

### Build Fails

**Issue:** TypeScript compilation errors
**Solution:**
```bash
npm run build
# Fix any TypeScript errors locally first
```

**Issue:** Missing dependencies
**Solution:**
```bash
npm ci
# Ensure package-lock.json is committed
```

### Runtime Errors

**Issue:** Cannot connect to API
**Solution:** Verify `VITE_API_URL` environment variable is correct

**Issue:** WebSocket connection fails
**Solution:**
- Check `VITE_WS_URL` is set to `wss://` (not `ws://`)
- Verify backend WebSocket endpoint is accessible

**Issue:** Routes not working
**Solution:** Check that admin/client route tokens match between frontend and backend

### Environment Variables Not Loading

**Issue:** Variables not available in build
**Solution:**
- Ensure all variables start with `VITE_`
- Rebuild application after changing variables
- Verify variables are set in Railway dashboard

## Security Considerations

1. **Route Tokens:**
   - Use strong, random tokens in production
   - Never commit actual tokens to version control
   - Rotate tokens periodically

2. **CORS Configuration:**
   - Ensure backend allows frontend domain
   - Update CORS settings when domain changes

3. **HTTPS:**
   - Always use HTTPS in production
   - WebSocket should use WSS protocol

## Monitoring

### Railway Dashboard
- View deployment history
- Monitor resource usage
- Check application logs
- Track uptime

### Application Health
Monitor these endpoints:
- Frontend: `https://your-frontend.railway.app`
- API Health: `https://your-backend.railway.app/health`
- WebSocket: Check browser console for connection status

## Rollback

### Using Railway Dashboard
1. Go to deployments
2. Select previous working deployment
3. Click "Redeploy"

### Using CLI
```bash
railway rollback
```

## Production Checklist

- [ ] All environment variables set correctly
- [ ] Route tokens are strong and secure
- [ ] API URL points to production backend
- [ ] WebSocket URL uses WSS protocol
- [ ] CORS configured correctly on backend
- [ ] Build completes without errors
- [ ] Application starts successfully
- [ ] Can access all routes
- [ ] WebSocket connects properly
- [ ] API calls work correctly
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] SSL certificate is valid

## Support

For issues or questions:
1. Check Railway logs: `railway logs`
2. Review browser console for errors
3. Verify environment variables
4. Check backend API status
5. Review this deployment guide

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Nixpacks Documentation](https://nixpacks.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
