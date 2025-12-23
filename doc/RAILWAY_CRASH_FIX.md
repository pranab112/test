# Railway Deployment Crash - Common Issues & Fixes

## Your App Was Working on Render - Why Not Railway?

Your app is configured correctly for Render. Railway has slightly different requirements. Here's what's been fixed:

---

## ✅ Fixes Applied

### 1. **Added Smart Startup Script** (`start.sh`)
- Checks all required environment variables before starting
- Retries database migrations if they fail (network issues)
- Better error messages
- Handles Railway's postgres:// URL format

### 2. **Updated railway.json**
- Uses the startup script for better control
- Explicit build command
- Proper restart policy

### 3. **Added runtime.txt**
- Specifies Python 3.11.x explicitly

---

## 🔍 Common Crash Reasons & Solutions

### Crash #1: Missing Environment Variables

**Error in logs:**
```
ValidationError: 1 validation error for Settings
DATABASE_URL
  field required
```

**Fix:**
Make sure ALL these variables are set in Railway:

```bash
# REQUIRED - App will crash without these
DATABASE_URL          # Auto-set when you add PostgreSQL
SECRET_KEY            # Generate with: openssl rand -hex 32
CREDENTIAL_ENCRYPTION_KEY  # From generate_secrets.py
ENVIRONMENT           # Set to: production
ALGORITHM             # Set to: HS256
ACCESS_TOKEN_EXPIRE_MINUTES  # Set to: 30

# REQUIRED for production
CORS_ORIGINS          # Your Railway URL
BASE_URL              # Your Railway URL

# OPTIONAL but recommended
ENABLE_RATE_LIMITING  # Set to: True
LOG_LEVEL             # Set to: INFO
```

**Your Generated Secrets (Use These):**
```
SECRET_KEY=8d440925489b66132ade62b809120bb0ffc98d02e3bab9dfcd850c3d67b9f088
CREDENTIAL_ENCRYPTION_KEY=Z_iT0VGUhBuUOhR-NiPlLQC6vntAa6FxN31qTLbRwks=
```

---

### Crash #2: CORS_ORIGINS Not Set in Production

**Error in logs:**
```
ValueError: CORS_ORIGINS must be explicitly set in production environment!
```

**Fix:**
1. Get your Railway URL (Settings → Domains → Generate Domain)
2. Add these variables:
```bash
CORS_ORIGINS=https://your-app.up.railway.app
BASE_URL=https://your-app.up.railway.app
```

**Important**: Use your ACTUAL Railway URL, not the example!

---

### Crash #3: Database Not Connected

**Error in logs:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Fix:**
1. Go to Railway dashboard
2. Click "New" → "Database" → "Add PostgreSQL"
3. Wait 30 seconds for it to provision
4. Verify `DATABASE_URL` appears in your service's Variables tab

---

### Crash #4: Migration Failures

**Error in logs:**
```
alembic.util.exc.CommandError: Can't locate revision identified by 'xxxxx'
```

**Fix:**
The new start.sh script handles this with retries. If still failing:
1. Go to Railway Shell
2. Run: `python -m alembic stamp head`
3. Then: `python -m alembic upgrade head`
4. Redeploy

---

### Crash #5: Port Binding Issues

**Error in logs:**
```
OSError: [Errno 98] Address already in use
```

**Fix:**
Railway sets `$PORT` automatically. The app uses it correctly:
```python
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
No action needed - Railway handles this.

---

### Crash #6: Module Import Errors

**Error in logs:**
```
ModuleNotFoundError: No module named 'xxx'
```

**Fix:**
1. Check requirements.txt includes the module
2. Railway should auto-install during build
3. If persists, add explicit buildCommand:
```json
"buildCommand": "pip install --upgrade pip && pip install -r requirements.txt"
```

---

## 🔧 How to Diagnose Your Crash

### Step 1: Check Railway Logs

1. Go to Railway dashboard
2. Click your web service
3. Click "Deployments" tab
4. Click latest deployment
5. Look for RED error messages

### Step 2: Common Error Patterns

**If you see:**
- `ValidationError` → Missing environment variable
- `CORS_ORIGINS` error → Set CORS_ORIGINS and BASE_URL
- `could not connect` → Database not added or not ready
- `pip: command not found` → Fixed with new config
- `ModuleNotFoundError` → requirements.txt issue
- `Address already in use` → Should auto-resolve

### Step 3: Check Environment Variables

1. Click your service → "Variables" tab
2. Verify you have at minimum:
   - DATABASE_URL (auto-set by PostgreSQL)
   - SECRET_KEY
   - CREDENTIAL_ENCRYPTION_KEY
   - ENVIRONMENT=production
   - CORS_ORIGINS (your Railway URL)
   - BASE_URL (your Railway URL)

---

## 📋 Complete Deployment Checklist

### Before Deployment

- ✅ Code pushed to GitHub
- ✅ PostgreSQL database added in Railway
- ✅ All environment variables set

### Environment Variables to Set

Copy these into Railway (Variables tab):

```bash
# 1. Core Settings
ENVIRONMENT=production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 2. Security (use your generated secrets)
SECRET_KEY=8d440925489b66132ade62b809120bb0ffc98d02e3bab9dfcd850c3d67b9f088
CREDENTIAL_ENCRYPTION_KEY=Z_iT0VGUhBuUOhR-NiPlLQC6vntAa6FxN31qTLbRwks=

# 3. URLs (replace with YOUR Railway URL)
CORS_ORIGINS=https://YOUR-APP.up.railway.app
BASE_URL=https://YOUR-APP.up.railway.app

# 4. Optional
ENABLE_RATE_LIMITING=True
LOG_LEVEL=INFO
```

### After Setting Variables

1. Railway will auto-redeploy
2. Watch the build logs
3. Should see: "✓ Database migrations completed successfully"
4. Should see: "Application startup complete"

---

## 🚀 Quick Fix Commands

### Force Redeploy
1. Go to Settings → Scroll to bottom
2. Click "Redeploy"

### Run Commands in Railway
1. Click service → three dots (⋮) → "Shell"
2. Useful commands:
```bash
# Check migrations
python -m alembic current

# Run migrations manually
python -m alembic upgrade head

# Check if app can start
python -c "from app.main import app; print('OK')"

# Create admin
python create_admin.py

# Populate games
python populate_games_postgres.py
```

---

## 🆘 Still Crashing?

### Get the Exact Error

1. Copy the FULL error from Railway logs
2. Look for the line that says `Error:` or `Exception:`
3. Copy the full stack trace

### Common Issues Not Listed

**1. Missing Files**
- Make sure all files are committed to git
- Check `.gitignore` isn't excluding important files

**2. Build Timeout**
- Railway has 10min build timeout
- Your build should complete in 2-3 minutes

**3. Memory Issues**
- Free tier: 512MB RAM
- Your app uses ~200-300MB, should be fine

---

## 📞 Get Help

**Railway Logs**: Service → Deployments → Click deployment → View logs

**Railway Community**: https://discord.gg/railway

**Your Working Render Config** (for reference):
```yaml
buildCommand: "pip install -r requirements.txt && alembic upgrade head"
startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

---

## ✅ Expected Success Logs

When deployment works, you'll see:

```
✅ Using Nixpacks
✅ Installing dependencies from requirements.txt
✅ Build completed successfully
==========================================
Casino Royal - Starting on Railway
==========================================
✓ Required environment variables found
✓ Fixed DATABASE_URL format for SQLAlchemy
==========================================
Running database migrations...
✓ Database migrations completed successfully
==========================================
Starting application...
INFO:     Started server process
INFO:     Application startup complete
```

---

**Once you see "Application startup complete", your app is LIVE!** 🎉

Visit: `https://YOUR-URL.up.railway.app/health`

Should return: `{"status":"healthy"}`
