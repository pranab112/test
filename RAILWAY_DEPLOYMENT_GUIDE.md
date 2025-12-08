# Railway Deployment Guide - Casino Royal SaaS Platform

This guide will walk you through deploying your Casino Royal application to Railway.app.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Railway Setup](#railway-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Setup](#post-deployment-setup)
8. [Troubleshooting](#troubleshooting)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying to Railway, ensure you have:

- ✅ **Railway Account**: Sign up at [railway.app](https://railway.app)
- ✅ **GitHub Account**: Your code should be in a GitHub repository
- ✅ **AWS Account**: For S3 file storage (free tier available)
- ✅ **Email Service**: SendGrid account for email verification (optional but recommended)
- ✅ **Git Repository**: Push your code to GitHub

---

## Project Overview

### Technology Stack
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (Railway managed)
- **ORM**: SQLAlchemy with Alembic migrations
- **Authentication**: JWT with bcrypt
- **File Storage**: AWS S3 (recommended) or local fallback
- **Email**: AWS SES with OTP verification

### Key Features
- Multi-user system (Clients, Players, Admins)
- Real-time chat and friend system via WebSocket
- Game management with encrypted credentials
- Email verification with OTP
- Payment methods and promotions
- Admin and client dashboards

---

## Railway Setup

### Step 1: Create New Project

1. **Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "Login" and authenticate with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your casino repository
   - Railway will automatically detect it's a Python project

### Step 2: Add PostgreSQL Database

1. **Add PostgreSQL Service**
   - In your project dashboard, click "New"
   - Select "Database" → "Add PostgreSQL"
   - Railway will automatically provision a database
   - Database credentials are auto-injected as `DATABASE_URL`

2. **Verify Database Connection**
   - Go to PostgreSQL service → "Variables"
   - You should see `DATABASE_URL` automatically set
   - Format: `postgresql://user:password@host:port/dbname`

---

## Environment Variables

### Required Environment Variables

Railway will auto-provide some variables. You need to manually add the rest.

#### Auto-Provided by Railway (DO NOT SET MANUALLY)
```bash
DATABASE_URL          # Auto-set when PostgreSQL is added
PORT                  # Auto-set by Railway (usually 8000 or dynamic)
RAILWAY_ENVIRONMENT   # production, staging, etc.
```

#### You Must Add These Variables

Go to your service → **Variables** tab and add:

### 1. Core Application Settings

```bash
# Application Environment
ENVIRONMENT=production

# JWT Secret Key (CRITICAL - Generate a secure random key)
# Generate with: openssl rand -hex 32
SECRET_KEY=your-super-secret-key-here-change-this

# JWT Configuration
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Base URL (Replace with your Railway domain)
BASE_URL=https://your-app-name.up.railway.app
```

### 2. CORS Configuration

```bash
# IMPORTANT: Set to your actual frontend domain(s)
# Never use "*" in production!
CORS_ORIGINS=https://your-app-name.up.railway.app,https://your-custom-domain.com
```

### 3. Credential Encryption

```bash
# Generate Fernet key with:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CREDENTIAL_ENCRYPTION_KEY=your-44-character-fernet-key-here
```

### 4. AWS S3 Configuration (HIGHLY RECOMMENDED)

Railway has ephemeral storage - files are deleted on restart. Use S3 for persistence.

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# S3 Bucket Configuration
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

**AWS S3 Setup Guide:**
1. Create AWS account (free tier: 5GB storage)
2. Go to S3 → Create bucket (choose same region as Railway)
3. Go to IAM → Users → Create user with S3 access
4. Create access key → Copy credentials
5. Add to Railway environment variables

### 5. Email Service (AWS SES) - REQUIRED for Email Verification

```bash
# AWS SES Configuration
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Casino Royal
```

**AWS SES Setup:**
1. Go to AWS SES Console
2. Verify your domain or email address
3. Create SMTP credentials
4. Request production access (remove sandbox limits)

### 6. Optional Configuration

```bash
# Feature Flags
ENABLE_RATE_LIMITING=True

# Logging
LOG_LEVEL=INFO
```

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
# If not already done
git init
git add .
git commit -m "Initial commit for Railway deployment"
git branch -M main
git remote add origin https://github.com/yourusername/casino.git
git push -u origin main
```

### Step 2: Configure Railway Project

1. **Set Environment Variables**
   - Go to your service → **Variables** tab
   - Click "New Variable"
   - Add each variable from the list above
   - Use "Add Reference" for `DATABASE_URL` (should already be there)

2. **Configure Build Settings** (Optional - already in `railway.json`)
   - Go to **Settings** tab
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Deploy

1. **Trigger Deployment**
   - Railway auto-deploys on git push
   - Or click "Deploy" in Railway dashboard
   - Watch build logs for any errors

2. **Monitor Build Logs**
   - Click on deployment to see live logs
   - Ensure migrations run successfully
   - Check for any Python errors

### Step 4: Database Migration

Railway will automatically run migrations on startup (via start command), but verify:

```bash
# Check logs for migration output
# You should see: "Database migrations completed successfully"
```

If migrations fail, you can run them manually via Railway's shell:

```bash
# In Railway service → Shell
alembic upgrade head
```

---

## Post-Deployment Setup

### Step 1: Access Your Application

Your app will be available at: `https://your-app-name.up.railway.app`

Test the following endpoints:
- `GET /health` - Should return `{"status": "healthy"}`
- `GET /docs` - API documentation (disabled in production by default)
- `GET /client` - Client dashboard
- `GET /player` - Player dashboard
- `GET /admin` - Admin dashboard

### Step 2: Create Admin Account

You need to create an admin account. SSH into Railway or use the shell:

```bash
# Via Railway Shell
python create_admin.py
```

Or create via API:
```bash
curl -X POST https://your-app-name.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "user_type": "admin"
  }'
```

### Step 3: Populate Games

```bash
# Via Railway Shell
python populate_games_postgres.py
```

### Step 4: Test Core Functionality

1. **Authentication**
   - Register a new user
   - Login and verify JWT token works
   - Test password reset (requires email service)

2. **WebSocket Connection**
   - Connect to `wss://your-app-name.up.railway.app/ws`
   - Test real-time chat

3. **File Uploads**
   - Upload avatar (should go to S3 if configured)
   - Verify file persists after deployment

4. **Email Verification**
   - Register with email
   - Check OTP email arrives
   - Verify OTP code works

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Error**: "Application failed to respond"

**Solutions**:
- Check Railway logs for Python errors
- Verify all required environment variables are set
- Ensure `DATABASE_URL` is correctly formatted
- Check `Procfile` uses correct start command

```bash
# Verify in Railway Settings → Start Command:
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### 2. Database Connection Failed

**Error**: "could not connect to server"

**Solutions**:
- Verify PostgreSQL service is running
- Check `DATABASE_URL` is set correctly
- Ensure database accepts SSL connections (app already handles this)

```python
# app/database.py already fixes Railway's postgres:// URLs
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
```

#### 3. CORS Errors

**Error**: "Access to fetch has been blocked by CORS policy"

**Solutions**:
- Set `CORS_ORIGINS` to your actual domain
- Never use `*` in production
- Include both `http://` and `https://` if testing

```bash
# Correct format
CORS_ORIGINS=https://your-app.up.railway.app,https://www.your-app.com
```

#### 4. Migration Errors

**Error**: "Target database is not up to date"

**Solutions**:
```bash
# Via Railway Shell
alembic current  # Check current version
alembic upgrade head  # Run migrations
```

#### 5. File Upload Issues

**Error**: "Files disappear after restart"

**Solution**: Railway has ephemeral storage. You MUST use S3:
- Configure AWS S3 (see environment variables above)
- Verify `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` are set

#### 6. Email Not Sending

**Error**: "SMTP authentication failed"

**Solutions**:
- Verify AWS SES credentials
- Ensure sender email is verified in SES
- Check SES is not in sandbox mode (request production access)
- Verify SMTP port (587 for TLS)

#### 7. Rate Limiting Issues

**Error**: "Too many requests"

**Solution**: Adjust rate limiting or disable for testing:
```bash
ENABLE_RATE_LIMITING=False  # Only for testing!
```

---

## Monitoring & Maintenance

### View Logs

**Railway Dashboard**:
- Go to your service → **Logs** tab
- Filter by severity (Info, Warning, Error)
- Search for specific errors

**Important Log Patterns**:
```
"Database migrations completed successfully"  # Good ✓
"CORS origins configured"                     # Check values
"Starting application in production"          # Verify environment
```

### Performance Monitoring

**Railway Metrics**:
- Go to service → **Metrics** tab
- Monitor CPU, Memory, Network
- Check response times

**Database Metrics**:
- PostgreSQL service → **Metrics**
- Monitor connections, queries
- Watch for slow queries

### Health Checks

Railway automatically monitors `/health` endpoint:
```bash
curl https://your-app-name.up.railway.app/health
# Should return: {"status": "healthy"}
```

### Database Backups

**Automatic Backups** (Railway Pro):
- PostgreSQL service → **Backups**
- Automated daily backups
- Point-in-time recovery

**Manual Backup**:
```bash
# Via Railway Shell
pg_dump $DATABASE_URL > backup.sql
```

### Scaling

**Horizontal Scaling**:
- Railway Settings → **Replicas**
- Increase instance count
- Load balancing is automatic

**Vertical Scaling**:
- Railway Settings → **Resources**
- Increase CPU/Memory
- Restart required

### Custom Domain

1. **Add Domain**:
   - Railway Settings → **Domains**
   - Click "Add Domain"
   - Enter your domain (e.g., `api.yourdomain.com`)

2. **Configure DNS**:
   - Add CNAME record: `api.yourdomain.com` → `your-app.up.railway.app`
   - Wait for DNS propagation (5-60 minutes)

3. **Update Environment**:
   ```bash
   BASE_URL=https://api.yourdomain.com
   CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
   ```

---

## Security Best Practices

### Production Checklist

- ✅ **Secrets**: Never commit `.env` file
- ✅ **JWT Secret**: Use cryptographically secure random key (32+ bytes)
- ✅ **CORS**: Set specific origins, never `*`
- ✅ **HTTPS**: Always enabled (Railway provides SSL)
- ✅ **Rate Limiting**: Enable in production (`ENABLE_RATE_LIMITING=True`)
- ✅ **Environment**: Set `ENVIRONMENT=production`
- ✅ **API Docs**: Disabled in production (automatic)
- ✅ **Database SSL**: Enabled (automatic in app/database.py)
- ✅ **Encryption Key**: Different for dev/staging/prod
- ✅ **Error Logging**: Set `LOG_LEVEL=INFO` or `WARNING`

### Regular Maintenance

**Weekly**:
- Review error logs
- Check disk usage
- Monitor API response times

**Monthly**:
- Database backup verification
- Security updates (`pip list --outdated`)
- Review access logs for suspicious activity

**Quarterly**:
- Rotate JWT secret (invalidates all sessions)
- Rotate AWS credentials
- Update dependencies (`pip install -U -r requirements.txt`)

---

## Cost Optimization

### Railway Pricing (as of 2024)

**Free Trial**:
- $5 credit for new accounts
- Enough for 1 small app + database for ~1 month

**Hobby Plan** ($5/month):
- Unlimited services
- 512 MB RAM per service
- Good for small apps

**Developer Plan** ($20/month):
- Priority support
- More resources
- Custom domains included

### Estimated Costs

**Minimal Setup** (~$10-15/month):
- Railway Hobby: $5/month
- PostgreSQL Starter: $5/month
- AWS S3: ~$0.50/month (minimal usage)
- AWS SES: Free tier (62,000 emails/month)

**Production Setup** (~$30-50/month):
- Railway Developer: $20/month
- PostgreSQL Standard: $15/month
- AWS S3: ~$2/month
- AWS SES: Free tier or ~$0.10/1000 emails

---

## Support & Resources

### Documentation
- **Railway Docs**: https://docs.railway.app
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Alembic Docs**: https://alembic.sqlalchemy.org
- **Project README**: See `README.md` in repository

### Get Help
- **Railway Discord**: https://discord.gg/railway
- **Project Issues**: Create GitHub issue
- **Email Support**: For critical production issues

### Useful Commands

```bash
# Railway CLI (install first: npm i -g @railway/cli)
railway login
railway link
railway logs
railway run python create_admin.py
railway run alembic upgrade head
railway shell

# Local Testing
uvicorn app.main:app --reload
alembic upgrade head
python create_admin.py
pytest
```

---

## Next Steps After Deployment

1. **Custom Domain**: Set up your branded domain
2. **Monitoring**: Set up error tracking (e.g., Sentry)
3. **Analytics**: Integrate usage analytics
4. **CI/CD**: Set up automated testing with GitHub Actions
5. **Backups**: Configure automated database backups
6. **Staging**: Create staging environment for testing

---

## Conclusion

You now have a fully deployed Casino Royal SaaS platform on Railway!

**Quick Access**:
- **Application**: `https://your-app-name.up.railway.app`
- **Health Check**: `https://your-app-name.up.railway.app/health`
- **Client Dashboard**: `https://your-app-name.up.railway.app/client`
- **Player Dashboard**: `https://your-app-name.up.railway.app/player`
- **Admin Dashboard**: `https://your-app-name.up.railway.app/admin`

**Support**: If you encounter issues, check the troubleshooting section or create a GitHub issue.

---

**Happy Deploying! 🎰🚀**
