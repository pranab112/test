# 🚀 Casino Royal - Render.com Deployment Guide

## Quick Setup Checklist

### 1. Create Render Account
- Go to: https://render.com
- Click "Get Started for Free"
- Sign up with GitHub account

### 2. Create PostgreSQL Database (FREE)
- Dashboard → "New +" → "PostgreSQL"
- Name: `casino-royal-db`
- Database: `casino_royal`
- User: `casino_user`
- Plan: **Free** (100MB)
- **COPY THE EXTERNAL DATABASE URL** when created!

### 3. Create Web Service
- Dashboard → "New +" → "Web Service"
- Source: GitHub
- Repository: `pranab112/test`
- Branch: `main`

### 4. Service Configuration
```
Name: casino-royal-app
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Plan: Free
```

### 5. Environment Variables
Add these in the "Environment" tab:

```
DATABASE_URL=<your-database-url-from-step-2>
SECRET_KEY=casino-royal-super-secret-key-2024
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 6. Deploy
Click "Create Web Service" - Build will start automatically!

## Expected URLs After Deployment
- Main: https://casino-royal-app.onrender.com
- Player: https://casino-royal-app.onrender.com/player
- Client: https://casino-royal-app.onrender.com/client
- Admin: https://casino-royal-app.onrender.com/admin
- API Docs: https://casino-royal-app.onrender.com/docs

## Troubleshooting
- First deployment takes 5-10 minutes
- App sleeps after 15 minutes of inactivity (free tier)
- Cold start takes 30-60 seconds after sleep
- Check logs in Render dashboard if issues occur

## What's Already Configured ✅
- requirements.txt with all dependencies
- render.yaml configuration file
- Procfile for deployment
- Alembic migrations for database setup
- Fixed registration bug (user_type case sensitivity)
- PostgreSQL database configuration