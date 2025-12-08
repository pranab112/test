# Quick Railway Deployment Guide

## Prerequisites
✅ Railway account created
✅ Railway workspace token: `f2155410-17eb-40df-aa2f-5ad81fb28826`
✅ Node.js and npm installed (confirmed: v20.19.0)

## 🚀 One-Command Deployment

### Option 1: Automated Script (Recommended)

```bash
# Set your Railway token
set RAILWAY_TOKEN=f2155410-17eb-40df-aa2f-5ad81fb28826

# Run the deployment script
deploy_to_railway.bat
```

The script will automatically:
1. ✅ Install Railway CLI
2. ✅ Generate security secrets
3. ✅ Link to Railway project
4. ✅ Set environment variables
5. ✅ Deploy application
6. ✅ Run database migrations
7. ✅ Create admin account
8. ✅ Populate games

### Option 2: Manual Step-by-Step

#### Step 1: Generate Secrets
```bash
python generate_secrets.py
```
Save the output - you'll need it for environment variables.

#### Step 2: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 3: Login to Railway
```bash
set RAILWAY_TOKEN=f2155410-17eb-40df-aa2f-5ad81fb28826
railway whoami
```

#### Step 4: Initialize Project
```bash
railway init
```

#### Step 5: Add PostgreSQL
Go to Railway Dashboard → New → Database → PostgreSQL

#### Step 6: Set Environment Variables
```bash
# Core settings
railway variables set ENVIRONMENT=production
railway variables set SECRET_KEY=<from-generate-secrets>
railway variables set CREDENTIAL_ENCRYPTION_KEY=<from-generate-secrets>
railway variables set ALGORITHM=HS256
railway variables set ACCESS_TOKEN_EXPIRE_MINUTES=30

# Your Railway URL (get this after first deployment)
railway variables set BASE_URL=https://your-app.up.railway.app
railway variables set CORS_ORIGINS=https://your-app.up.railway.app

# Features
railway variables set ENABLE_RATE_LIMITING=True
railway variables set LOG_LEVEL=INFO
```

#### Step 7: Deploy
```bash
git add .
git commit -m "Deploy to Railway"
railway up
```

#### Step 8: Post-Deployment
```bash
# Run migrations
railway run alembic upgrade head

# Create admin
railway run python create_admin.py

# Populate games
railway run python populate_games_postgres.py
```

## 🔧 Important Environment Variables

### Required (Must Set)
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `CREDENTIAL_ENCRYPTION_KEY` - Generate with script
- `ENVIRONMENT=production`
- `BASE_URL` - Your Railway app URL
- `CORS_ORIGINS` - Your app domain(s)

### Recommended (For Full Functionality)
- AWS S3 credentials (file storage)
- AWS SES credentials (email verification)

### Auto-Provided by Railway
- `DATABASE_URL` - PostgreSQL connection
- `PORT` - Application port

## 📝 After Deployment Checklist

1. ✅ Visit `https://your-app.up.railway.app/health`
2. ✅ Login to admin dashboard
3. ✅ Test user registration
4. ✅ Test email verification (if configured)
5. ✅ Test file upload (check S3)
6. ✅ Test WebSocket chat
7. ✅ Delete `.secrets.txt` file

## 🔐 Security Reminders

1. **Delete `.secrets.txt`** after copying to Railway
2. **Never commit** `.env` or secrets to git
3. **Rotate token** after deployment for security
4. **Use different secrets** for dev/staging/prod

## 🆘 Troubleshooting

### Railway CLI not found
```bash
npm install -g @railway/cli
```

### Can't authenticate
```bash
set RAILWAY_TOKEN=f2155410-17eb-40df-aa2f-5ad81fb28826
railway whoami
```

### Deployment fails
```bash
# Check logs
railway logs

# Check environment variables
railway variables
```

### Database not connected
Go to Railway Dashboard → Link PostgreSQL service to your app

## 📞 Support

- Full Guide: See `RAILWAY_DEPLOYMENT_GUIDE.md`
- Railway Docs: https://docs.railway.app
- Project README: `README.md`

## 🎯 Quick Links After Deployment

- Health Check: `https://your-app.up.railway.app/health`
- Client Dashboard: `https://your-app.up.railway.app/client`
- Player Dashboard: `https://your-app.up.railway.app/player`
- Admin Dashboard: `https://your-app.up.railway.app/admin`

---

**Ready to deploy? Run:** `deploy_to_railway.bat`
