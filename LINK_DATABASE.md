# 🔗 Link PostgreSQL Database to Casino Royal Service

You mentioned there are **2 Postgres databases** in your Railway project. I need to connect one of them to the casino-royal service.

---

## 📋 Quick Steps (30 Seconds)

### Step 1: Get DATABASE_URL

1. **Go to Railway Dashboard**: https://railway.com/project/737397c5-f143-447a-9cd3-6ca364c9fb00

2. **Click on one of the Postgres services**:
   - Either "postgres" or "postgres-RMmb"
   - (Choose whichever one you want to use)

3. **Find the DATABASE_URL**:
   - Click the **"Connect"** tab (or "Variables" tab)
   - Look for **"DATABASE_URL"** or **"Postgres Connection URL"**
   - It should look like:
     ```
     postgresql://postgres:password@server.railway.internal:5432/railway
     ```

4. **Copy the entire URL**

---

### Step 2: Give Me the DATABASE_URL

Once you have the DATABASE_URL, paste it here in chat and I'll immediately set it for the casino-royal service using:

```bash
railway variables --service casino-royal --set "DATABASE_URL=<your-url>"
```

---

## 🎯 Alternative: Set It Yourself (Also 30 Seconds)

If you prefer to set it directly:

### Via Railway Dashboard:
1. Go to: https://railway.com/project/737397c5-f143-447a-9cd3-6ca364c9fb00
2. Click **"casino-royal"** service (not the database)
3. Go to **"Variables"** tab
4. Click **"+ New Variable"**
5. Name: `DATABASE_URL`
6. Value: Paste the DATABASE_URL from the Postgres service
7. Click **"Add"**

Railway will automatically redeploy!

### Via CLI (if you prefer):
```bash
# 1. Get the DATABASE_URL from postgres service
railway variables --service postgres --json

# 2. Copy the DATABASE_URL value

# 3. Set it for casino-royal
railway variables --service casino-royal --set "DATABASE_URL=postgresql://..."
```

---

## 🔍 Which Postgres Database Should You Use?

If you have two Postgres databases:

### postgres
- Likely the first/main database
- **Recommended if empty** or if this is a fresh deployment

### postgres-RMmb
- Likely a second database (maybe created earlier)
- Use if it has existing data you want to keep

**If unsure**: Use **"postgres"** (the first one)

---

## ✅ After DATABASE_URL is Set

Once DATABASE_URL is added (either by you or me), Railway will:

1. ✅ Automatically redeploy casino-royal service
2. ✅ Run database migrations via start.sh
3. ✅ Start the application successfully
4. ✅ /health endpoint will work

Expected logs:
```
==========================================
Casino Royal - Starting on Railway
==========================================
✓ Required environment variables found
✓ DATABASE_URL: postgresql://postgres:...
Running database migrations...
✓ Database migrations completed successfully
Starting Uvicorn server...
INFO: Application startup complete
```

---

## 📞 Tell Me When Done

After you:
1. **Copy the DATABASE_URL** from one of the Postgres services
2. **Paste it here in chat**

I'll immediately:
1. Set it for casino-royal service
2. Monitor the deployment logs
3. Test the /health endpoint
4. Confirm everything works

---

## 🚀 You're Almost There!

You're literally **30 seconds** away from a working deployment:

1. Open Railway dashboard
2. Click a Postgres service
3. Copy DATABASE_URL
4. Paste here

Then your Casino Royal app will be **LIVE!** 🎉

---

**Dashboard Link**: https://railway.com/project/737397c5-f143-447a-9cd3-6ca364c9fb00
