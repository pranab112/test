# Render Environment Variables Setup Guide

**Quick Reference:** Setting up environment variables for Render deployment

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Open Render Dashboard
1. Go to: https://dashboard.render.com
2. Select your service: `casino-royal-backend`
3. Click "Environment" in left sidebar

### Step 2: Add Required Variables

**Copy these into Render Dashboard** (click "Add Environment Variable" for each):

#### CRITICAL (App won't start without these):
```
ENVIRONMENT=production
SECRET_KEY=[Click "Generate Value" button]
CORS_ORIGINS=https://your-frontend-domain.com
CREDENTIAL_ENCRYPTION_KEY=[Generate locally, see below]
```

#### EMAIL (Required for email verification):
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=[Your SendGrid API Key]
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Casino Royal
```

#### AWS S3 (Highly recommended):
```
AWS_ACCESS_KEY_ID=[Your AWS Access Key]
AWS_SECRET_ACCESS_KEY=[Your AWS Secret Key]
AWS_S3_BUCKET_NAME=[Your bucket name]
AWS_REGION=us-east-1
```

#### OPTIONAL (Recommended for production):
```
ENABLE_RATE_LIMITING=True
LOG_LEVEL=INFO
```

---

## 🔑 Generating Secure Keys

### SECRET_KEY (JWT Token Signing)
**In Render Dashboard:**
- Just click "Generate Value" button (recommended)

**OR manually generate:**
```bash
openssl rand -hex 32
```

### CREDENTIAL_ENCRYPTION_KEY (Game Credentials)
**Run locally:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
**Example output:** `gAAAAABhX1234567890abcdefGHIJKLMNOPQRSTUVWXYZ=`

**Add to Render:**
1. Copy the generated key
2. Add as environment variable in Render
3. Toggle "Secret" ON to hide value

---

## 📧 SendGrid Setup (Email Service)

### Free Tier: 100 emails/day

1. **Create account:** https://signup.sendgrid.com
2. **Verify your email**
3. **Create API Key:**
   - Settings > API Keys > Create API Key
   - Name: "Casino Royal Production"
   - Permissions: "Full Access" or "Mail Send"
   - Copy the key (starts with `SG.`)
4. **Verify sender email:**
   - Settings > Sender Authentication
   - Single Sender Verification
   - Enter `noreply@yourdomain.com`
   - Verify via email link
5. **Add to Render:**
   ```
   SMTP_PASSWORD=SG.your_api_key_here
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   ```

---

## ☁️ AWS S3 Setup (File Storage)

### Free Tier: 5GB storage, 20K GET requests/month

1. **Create AWS Account:** https://aws.amazon.com
2. **Create S3 Bucket:**
   - Go to S3 Console
   - Click "Create bucket"
   - Name: `casino-royal-uploads-prod` (must be globally unique)
   - Region: `us-east-1` (same as Render)
   - Block Public Access: OFF (for public file access)
   - Click "Create bucket"
3. **Create IAM User:**
   - Go to IAM Console > Users > Create User
   - Name: `casino-royal-s3-user`
   - Attach policy: `AmazonS3FullAccess`
4. **Create Access Keys:**
   - Select user > Security Credentials
   - Create Access Key > Application running outside AWS
   - Copy Access Key ID and Secret Access Key
5. **Add to Render:**
   ```
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_S3_BUCKET_NAME=casino-royal-uploads-prod
   AWS_REGION=us-east-1
   ```

**Detailed guide:** See `AWS_S3_SETUP_GUIDE.md`

---

## 💳 Stripe Setup (Payments)

### Test Mode First (Development)

1. **Create Stripe Account:** https://dashboard.stripe.com/register
2. **Get Test API Keys:**
   - Dashboard > Developers > API Keys
   - Copy "Publishable key" (starts with `pk_test_`)
   - Copy "Secret key" (starts with `sk_test_`)
3. **Setup Webhook:**
   - Dashboard > Developers > Webhooks > Add Endpoint
   - Endpoint URL: `https://your-app.onrender.com/payments/webhook`
   - Events to send:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.created`
     - `customer.updated`
   - Copy "Signing secret" (starts with `whsec_`)
4. **Add to Render (Test Mode):**
   ```
   STRIPE_API_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_secret
   ```

### Production Mode (After Testing)

1. **Complete Business Verification:**
   - Dashboard > Settings > Business Settings
   - Complete all required fields
2. **Activate Live Mode:**
   - Toggle "Test Mode" OFF in Dashboard
3. **Get Live API Keys:**
   - Starts with `sk_live_` and `pk_live_`
4. **Update Webhook:**
   - Create new webhook for production URL
   - Get new `whsec_` signing secret
5. **Update Render Variables:**
   - Replace test keys with live keys

---

## 📋 Render Dashboard Checklist

Open: https://dashboard.render.com > Your Service > Environment

### Required Variables:
- [ ] `ENVIRONMENT` = `production`
- [ ] `SECRET_KEY` = [Generated value] (Secret ON)
- [ ] `CORS_ORIGINS` = `https://your-frontend.com`
- [ ] `CREDENTIAL_ENCRYPTION_KEY` = [Fernet key] (Secret ON)

### Email (Required):
- [ ] `SMTP_HOST` = `smtp.sendgrid.net`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USERNAME` = `apikey`
- [ ] `SMTP_PASSWORD` = [SendGrid API key] (Secret ON)
- [ ] `SMTP_FROM_EMAIL` = `noreply@yourdomain.com`
- [ ] `SMTP_FROM_NAME` = `Casino Royal`

### AWS S3 (Recommended):
- [ ] `AWS_ACCESS_KEY_ID` = [IAM Access Key] (Secret ON)
- [ ] `AWS_SECRET_ACCESS_KEY` = [IAM Secret Key] (Secret ON)
- [ ] `AWS_S3_BUCKET_NAME` = [Bucket name]
- [ ] `AWS_REGION` = `us-east-1`

### Stripe (Required for payments):
- [ ] `STRIPE_API_KEY` = [Secret key] (Secret ON)
- [ ] `STRIPE_PUBLISHABLE_KEY` = [Publishable key]
- [ ] `STRIPE_WEBHOOK_SECRET` = [Webhook secret] (Secret ON)

### Optional (Recommended):
- [ ] `ENABLE_RATE_LIMITING` = `True`
- [ ] `LOG_LEVEL` = `INFO`

### Auto-Provided (Don't set these):
- ✅ `DATABASE_URL` (Render PostgreSQL auto-injects)
- ✅ `PORT` (Render auto-sets to 10000)

---

## 🔒 Security Best Practices

1. **Use "Secret" Toggle:**
   - Enable for: SECRET_KEY, API keys, passwords
   - Hides value in Render UI

2. **Rotate Keys Quarterly:**
   - SECRET_KEY (invalidates sessions)
   - API keys (SendGrid, Stripe, AWS)
   - CREDENTIAL_ENCRYPTION_KEY (tricky, see docs)

3. **Never Use Test Keys in Production:**
   - Stripe: `sk_test_` → `sk_live_`
   - AWS: Create separate IAM user for production

4. **CORS Must Be Specific:**
   - ❌ `CORS_ORIGINS=*`
   - ✅ `CORS_ORIGINS=https://app.example.com`

5. **Enable Rate Limiting:**
   - `ENABLE_RATE_LIMITING=True` in production

---

## 🐛 Common Issues & Solutions

### App Won't Start
**Error:** `ValueError: CORS_ORIGINS must be explicitly set in production`
**Solution:** Add `CORS_ORIGINS=https://your-domain.com` in Render

### CORS Errors in Browser
**Error:** `Access to XMLHttpRequest blocked by CORS policy`
**Solutions:**
1. Verify `CORS_ORIGINS` exactly matches frontend URL (including `https://`)
2. No trailing slashes
3. No spaces between domains

### Email Not Sending
**Possible causes:**
1. SMTP_PASSWORD incorrect (verify SendGrid API key)
2. Sender email not verified in SendGrid
3. Check Render logs: `Dashboard > Logs`

### File Uploads Lost on Restart
**Cause:** Render has ephemeral filesystem
**Solution:** Configure AWS S3 (see above)

### Database Connection Failed
**Error:** `Could not connect to database`
**Solutions:**
1. Verify PostgreSQL service is linked in Render
2. Check `DATABASE_URL` is auto-injected (don't set manually)
3. Restart service: `Dashboard > Manual Deploy > Clear Build Cache & Deploy`

### Stripe Webhook Not Working
**Possible causes:**
1. Wrong webhook URL (must match Render URL)
2. Wrong STRIPE_WEBHOOK_SECRET
3. Webhook signature verification failing
**Solution:**
1. Test with Stripe CLI: `stripe listen --forward-to localhost:8000/payments/webhook`
2. Check Render logs for webhook errors

---

## 📊 Environment Variable Priority

1. **Render Dashboard Variables** (highest priority)
2. `.env` file (local development only)
3. `app/config.py` defaults (lowest priority)

**In production:** Render Dashboard variables override everything

---

## 🔄 After Adding Variables

1. **Save Changes:**
   - Click "Save Changes" in Render Dashboard
   - This triggers automatic redeploy

2. **Monitor Deployment:**
   - Go to "Logs" tab
   - Watch for successful startup
   - Check for errors

3. **Verify Health:**
   - Visit: `https://your-app.onrender.com/health`
   - Should return: `{"status": "healthy", "database": "connected"}`

4. **Test Email:**
   - Try email verification flow
   - Check SendGrid dashboard for delivery status

5. **Test Payments (if configured):**
   - Use Stripe test cards: `4242 4242 4242 4242`
   - Verify webhook events in Stripe Dashboard

---

## 📞 Support

**Render Issues:**
- Docs: https://render.com/docs
- Support: Dashboard > Help

**Project Issues:**
- Check `COMPLETION_ROADMAP.md`
- Check `RENDER_DEPLOYMENT_GUIDE.md`
- GitHub Issues

**Service-Specific:**
- SendGrid: https://sendgrid.com/support
- Stripe: https://stripe.com/docs
- AWS S3: https://aws.amazon.com/support

---

## ✅ Done!

Once all variables are set:
1. Render will auto-deploy
2. Check logs for successful startup
3. Test your app: `https://your-app.onrender.com`
4. Start using your production deployment!

**Next Step:** See `PM_EXECUTION_PLAN.md` for completing remaining features (CI/CD, test coverage, payments).
