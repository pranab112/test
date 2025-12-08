# Deploy to Railway - Step by Step Guide

## Your Generated Secrets (SAVE THESE!)

```
SECRET_KEY=8d440925489b66132ade62b809120bb0ffc98d02e3bab9dfcd850c3d67b9f088
CREDENTIAL_ENCRYPTION_KEY=Z_iT0VGUhBuUOhR-NiPlLQC6vntAa6FxN31qTLbRwks=
```

**⚠️ IMPORTANT: Copy these secrets now! You'll need them in step 5.**

---

## Step 1: Push Your Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Railway deployment"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your casino repository
6. Click **"Deploy Now"**

Railway will start building your app automatically.

---

## Step 3: Add PostgreSQL Database

1. In your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait for database to provision (~30 seconds)
4. The `DATABASE_URL` variable is automatically added to your app

---

## Step 4: Get Your Railway App URL

1. Click on your web service (not the database)
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**
5. Copy the generated URL (example: `casino-royal-production.up.railway.app`)

**Save this URL - you'll need it in the next step!**

---

## Step 5: Set Environment Variables

1. Click on your web service
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add each variable below

### Copy and paste these variables:

```bash
# Core Application Settings
ENVIRONMENT=production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Your generated secrets (from above)
SECRET_KEY=8d440925489b66132ade62b809120bb0ffc98d02e3bab9dfcd850c3d67b9f088
CREDENTIAL_ENCRYPTION_KEY=Z_iT0VGUhBuUOhR-NiPlLQC6vntAa6FxN31qTLbRwks=

# Replace YOUR_RAILWAY_URL with your actual Railway URL from Step 4
BASE_URL=https://YOUR_RAILWAY_URL.up.railway.app
CORS_ORIGINS=https://YOUR_RAILWAY_URL.up.railway.app

# Feature Flags
ENABLE_RATE_LIMITING=True
LOG_LEVEL=INFO
```

**Important**: Replace `YOUR_RAILWAY_URL` with your actual domain from Step 4!

4. Click **"Add"** for each variable

---

## Step 6: Optional - Configure AWS S3 (Recommended)

Railway has ephemeral storage. For persistent file uploads, configure S3:

```bash
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

**Skip this for now if you don't have AWS S3 set up.**

---

## Step 7: Optional - Configure Email (AWS SES)

For email verification to work:

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Casino Royal
```

**Skip this for now if you don't have email service set up.**

---

## Step 8: Trigger Redeploy

1. After adding all environment variables
2. Railway automatically redeploys
3. Or manually click **"Deploy"** button
4. Watch the deployment logs

---

## Step 9: Verify Deployment

1. Wait for deployment to complete (~2-3 minutes)
2. Visit: `https://YOUR_RAILWAY_URL.up.railway.app/health`
3. You should see: `{"status": "healthy"}`

---

## Step 10: Create Admin Account

### Option A: Using Railway Shell (Recommended)

1. Click on your web service
2. Click the **three dots (⋮)** menu → **"Shell"**
3. Run this command:

```bash
python create_admin.py
```

Follow the prompts to create admin credentials.

### Option B: Using API

```bash
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "user_type": "admin"
  }'
```

---

## Step 11: Populate Games Database

In Railway shell:

```bash
python populate_games_postgres.py
```

---

## Step 12: Test Your Application

Visit these URLs (replace YOUR_RAILWAY_URL):

- **Health Check**: `https://YOUR_RAILWAY_URL.up.railway.app/health`
- **Client Dashboard**: `https://YOUR_RAILWAY_URL.up.railway.app/client`
- **Player Dashboard**: `https://YOUR_RAILWAY_URL.up.railway.app/player`
- **Admin Dashboard**: `https://YOUR_RAILWAY_URL.up.railway.app/admin`

### Test Checklist:
- ✅ Register a new user
- ✅ Login with credentials
- ✅ Check admin dashboard
- ✅ Send a chat message (WebSocket test)
- ✅ Upload avatar (if S3 configured)
- ✅ Create a game credential

---

## Troubleshooting

### App won't start?

**Check Logs:**
1. Click on your service
2. Go to **"Deployments"** tab
3. Click latest deployment
4. Check logs for errors

**Common Issues:**
- Missing environment variables (check Step 5)
- Database not connected (check Step 3)
- CORS errors (check BASE_URL and CORS_ORIGINS match)

### Database errors?

**Verify Database Connection:**
1. Go to PostgreSQL service
2. Check it's running (green status)
3. Go to your web service → Variables
4. Verify `DATABASE_URL` exists

**Run Migrations Manually:**
```bash
# In Railway Shell
alembic upgrade head
```

### 500 Internal Server Error?

**Check Environment:**
- All required variables from Step 5 are set
- SECRET_KEY is set correctly
- CREDENTIAL_ENCRYPTION_KEY is set correctly

**Check Logs:**
Look for Python traceback in deployment logs

---

## Security Reminders

After deployment:

1. ✅ **Delete** `.secrets.txt` file from your local machine
2. ✅ **Never commit** `.env` or secrets to GitHub
3. ✅ Save your admin credentials securely
4. ✅ Use different secrets for different environments
5. ✅ Rotate secrets regularly

---

## Your Deployment Summary

**Application URL**: `https://YOUR_RAILWAY_URL.up.railway.app`

**Credentials Generated**:
- JWT Secret: ✅
- Encryption Key: ✅
- Admin Account: (create in Step 10)

**Services**:
- Web Service: ✅
- PostgreSQL Database: ✅
- AWS S3: ⏭️ Optional
- Email Service: ⏭️ Optional

---

## Next Steps

1. **Custom Domain**: Add your own domain in Railway Settings → Domains
2. **Monitoring**: Set up error tracking (e.g., Sentry)
3. **Backups**: Configure automated database backups
4. **Staging Environment**: Create a staging Railway project
5. **CI/CD**: Set up GitHub Actions for automated deployments

---

## Need Help?

- **Full Documentation**: See `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Railway Support**: https://discord.gg/railway
- **Project Issues**: Create GitHub issue

---

## Quick Reference

### Railway Dashboard
```
https://railway.app/dashboard
```

### Environment Variables Format
```bash
ENVIRONMENT=production
SECRET_KEY=8d440925489b66132ade62b809120bb0ffc98d02e3bab9dfcd850c3d67b9f088
CREDENTIAL_ENCRYPTION_KEY=Z_iT0VGUhBuUOhR-NiPlLQC6vntAa6FxN31qTLbRwks=
BASE_URL=https://YOUR-APP.up.railway.app
CORS_ORIGINS=https://YOUR-APP.up.railway.app
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENABLE_RATE_LIMITING=True
LOG_LEVEL=INFO
```

---

**🎰 You're all set! Follow the steps above to deploy your Casino Royal app to Railway. 🚀**

**Estimated Time**: 15-20 minutes

**Cost**: ~$10-15/month (Railway Hobby + PostgreSQL)
