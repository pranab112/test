# 🪣 AWS S3 Setup Guide for Casino Royal

## 📋 **Table of Contents**
1. [Why AWS S3?](#why-aws-s3)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Cost Estimation](#cost-estimation)

---

## 🤔 **Why AWS S3?**

### **The Problem**
Render.com (and most cloud platforms) use **ephemeral filesystems**:
- ❌ Uploaded files (images, voice messages, profile pictures) are **deleted on every deployment**
- ❌ Files are **lost when the server restarts**
- ❌ Not suitable for production applications

### **The Solution: AWS S3**
- ✅ **Persistent storage** - files never deleted
- ✅ **Highly available** - 99.999999999% durability
- ✅ **Scalable** - unlimited storage
- ✅ **Fast CDN** - global content delivery
- ✅ **Cost-effective** - pay only for what you use (~$0.023/GB/month)

---

## 📌 **Prerequisites**

- ✅ AWS Account (sign up at https://aws.amazon.com)
- ✅ Credit/Debit card (for AWS verification - free tier available)
- ✅ Your casino project code (already updated with S3 integration)

---

## 🚀 **Step-by-Step Setup**

### **STEP 1: Create AWS Account**

1. Go to: https://aws.amazon.com
2. Click **"Create an AWS Account"**
3. Fill in:
   - Email address
   - Password
   - AWS account name (e.g., "Casino Royal")
4. Choose **"Personal"** account type
5. Enter payment information (won't be charged if you stay in free tier)
6. Verify phone number
7. Select **"Basic Support - Free"** plan

⏳ **Time**: 5-10 minutes

---

### **STEP 2: Create S3 Bucket**

1. **Login to AWS Console**: https://console.aws.amazon.com
2. Search for **"S3"** in the top search bar
3. Click **"Create bucket"**

#### **Bucket Configuration**:

**General Configuration**:
- **Bucket name**: `casino-royal-uploads-prod` (must be globally unique)
  - If taken, try: `casino-royal-uploads-[your-name]`
  - Or: `casino-uploads-[random-number]`
- **AWS Region**: `US East (N. Virginia)` us-east-1
  - ⚠️ **Important**: Remember this region!

**Object Ownership**:
- Select: **"ACLs enabled"**
- Select: **"Object writer"**

**Block Public Access**:
- ⚠️ **UNCHECK** all 4 boxes:
  - ☐ Block all public access
  - ☐ Block public access to buckets and objects granted through new access control lists (ACLs)
  - ☐ Block public access to buckets and objects granted through any access control lists (ACLs)
  - ☐ Block public and cross-account access to buckets and objects through any public bucket or access point policies
- Check: **"I acknowledge that the current settings might result in this bucket and the objects within becoming public"**

**Why?** Your images/files need to be publicly accessible (like on Facebook/Instagram).

**Bucket Versioning**:
- Select: **"Disable"** (to save costs)

**Encryption**:
- Select: **"Server-side encryption with Amazon S3 managed keys (SSE-S3)"** (default)

**Leave everything else as default** and click **"Create bucket"**

⏳ **Time**: 2-3 minutes

---

### **STEP 3: Configure Bucket Permissions (CORS)**

1. Click on your newly created bucket name
2. Go to **"Permissions"** tab
3. Scroll down to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"**
5. Paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

6. Click **"Save changes"**

⚠️ **Production Note**: Replace `"*"` in `AllowedOrigins` with your actual domain:
```json
"AllowedOrigins": [
    "https://test-xbyp.onrender.com",
    "https://your-custom-domain.com"
]
```

⏳ **Time**: 1 minute

---

### **STEP 4: Create IAM User (Get API Keys)**

1. Go to **IAM Console**: https://console.aws.amazon.com/iam/
2. Click **"Users"** in left sidebar
3. Click **"Create user"**

#### **User Details**:
- **User name**: `casino-royal-s3-user`
- ☑ **Check**: "Provide user access to the AWS Management Console" - **UNCHECK THIS**
- Click **"Next"**

#### **Set Permissions**:
- Select: **"Attach policies directly"**
- Search for: **"AmazonS3FullAccess"**
- ☑ **Check** the box next to "AmazonS3FullAccess"
- Click **"Next"**
- Click **"Create user"**

#### **Create Access Key**:
1. Click on the newly created user (`casino-royal-s3-user`)
2. Go to **"Security credentials"** tab
3. Scroll down to **"Access keys"**
4. Click **"Create access key"**
5. Select use case: **"Application running outside AWS"**
6. Click **"Next"**
7. Description tag: `Casino Royal Production` (optional)
8. Click **"Create access key"**

#### **⚠️ CRITICAL - Save These Keys NOW**:

You'll see:
```
Access key ID: AKIAIOSFODNN7EXAMPLE
Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

📋 **Copy both and save them securely** (you won't be able to see the secret key again!)

**Best practice**: Save in a password manager (1Password, LastPass, etc.)

⏳ **Time**: 3-5 minutes

---

## ⚙️ **Configuration**

### **For Render.com Deployment**

1. Go to: https://dashboard.render.com
2. Select your **"casino-royal"** service
3. Go to **"Environment"** tab
4. Add these environment variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your secret access key | `wJalrXUtnFEMI/K7MDENG/...` |
| `AWS_S3_BUCKET_NAME` | Your bucket name | `casino-royal-uploads-prod` |
| `AWS_REGION` | Your bucket region | `us-east-1` |

5. Click **"Save Changes"**

⏳ Render will automatically redeploy (2-5 minutes)

---

### **For Local Development**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add:
   ```bash
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_S3_BUCKET_NAME=casino-royal-uploads-prod
   AWS_REGION=us-east-1
   ```

3. Restart your development server

---

## 🧪 **Testing**

### **Test 1: Check S3 is Enabled**

Create a test script `test_s3.py`:

```python
import os
from app.s3_storage import s3_storage

# Check if S3 is enabled
info = s3_storage.get_bucket_info()
print("S3 Configuration:")
print(f"  Enabled: {info['enabled']}")
print(f"  Bucket: {info['bucket_name']}")
print(f"  Region: {info['region']}")
print(f"  Has Credentials: {info['has_credentials']}")
```

Run it:
```bash
python test_s3.py
```

**Expected output**:
```
S3 Configuration:
  Enabled: True
  Bucket: casino-royal-uploads-prod
  Region: us-east-1
  Has Credentials: True
```

---

### **Test 2: Upload a Test File**

```python
from app.s3_storage import s3_storage
from io import BytesIO

# Create a test file
test_content = b"Hello from Casino Royal!"
test_file = BytesIO(test_content)

# Upload to S3
url = s3_storage.upload_file(
    test_file,
    "test.txt",
    folder="uploads/test",
    content_type="text/plain"
)

print(f"File uploaded to: {url}")
print(f"Access it at: {url}")
```

**Expected output**:
```
File uploaded to: https://casino-royal-uploads-prod.s3.amazonaws.com/uploads/test/test.txt
Access it at: https://casino-royal-uploads-prod.s3.amazonaws.com/uploads/test/test.txt
```

Open the URL in your browser - you should see "Hello from Casino Royal!"

---

### **Test 3: Upload via Application**

1. **Start your application**
2. **Login as client**
3. **Upload a profile picture**:
   - Go to Profile → Upload Picture
   - Select an image
   - Click Upload
4. **Check if it worked**:
   - Right-click on the uploaded image
   - Select "Open image in new tab"
   - URL should start with: `https://casino-royal-uploads-prod.s3.amazonaws.com/...`
   - ✅ If yes: **S3 is working!**
   - ❌ If no (starts with `/uploads/...`): **Still using local storage**

5. **Send an image message**:
   - Go to Messages
   - Send an image to a friend
   - Check the image URL (same as above)

---

## 🐛 **Troubleshooting**

### **Problem: "S3 storage is disabled"**

**Check logs**:
```
S3 storage disabled - missing environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

**Solution**:
1. Verify environment variables are set in Render dashboard
2. Check for typos in variable names (case-sensitive!)
3. Restart your Render service

---

### **Problem: "Access Denied" or "403 Forbidden"**

**Causes**:
- IAM user doesn't have S3 permissions
- Bucket policy is blocking access

**Solution**:
1. Go to IAM → Users → casino-royal-s3-user
2. Check "Permissions" tab
3. Ensure "AmazonS3FullAccess" policy is attached
4. If not, click "Add permissions" → "Attach policies" → Select "AmazonS3FullAccess"

---

### **Problem: "NoSuchBucket" error**

**Causes**:
- Bucket name is wrong
- Bucket is in different region

**Solution**:
1. Check `AWS_S3_BUCKET_NAME` matches exactly (case-sensitive!)
2. Verify `AWS_REGION` matches your bucket's region
3. Go to S3 console and confirm bucket exists

---

### **Problem: "InvalidAccessKeyId"**

**Causes**:
- Access key is wrong or has extra spaces

**Solution**:
1. Go to IAM → Users → casino-royal-s3-user → Security credentials
2. Delete old access key
3. Create new access key
4. Update environment variables with new keys
5. Ensure no spaces before/after the keys

---

### **Problem: Files upload but show broken image**

**Causes**:
- Bucket is not public
- CORS is not configured

**Solution**:
1. Go to S3 → Your Bucket → Permissions
2. Check "Block public access" - should be OFF
3. Check "CORS configuration" - should match the configuration from Step 3
4. Try accessing the S3 URL directly in browser

---

### **Problem: "Image saved locally (ephemeral)"**

**This is a WARNING, not an error**. It means:
- S3 is not configured
- App is falling back to local storage
- Files will be lost on deployment

**Solution**:
- Follow the configuration steps above to enable S3

---

## 💰 **Cost Estimation**

### **AWS Free Tier** (First 12 months):
- ✅ **5 GB storage** free
- ✅ **20,000 GET requests** per month free
- ✅ **2,000 PUT requests** per month free

### **After Free Tier**:
- **Storage**: $0.023 per GB/month
- **GET requests**: $0.0004 per 1,000 requests
- **PUT requests**: $0.005 per 1,000 requests
- **Data transfer OUT**: $0.09 per GB (first GB free)

### **Example Cost Calculation**:

**Scenario**: 1,000 active users
- Each user uploads 10 images/month (average 500KB each)
- Each user views 100 images/month

**Monthly Usage**:
- Storage: 1,000 users × 10 images × 0.5MB = 5GB → **$0.12**
- PUT requests: 1,000 × 10 = 10,000 → **$0.05**
- GET requests: 1,000 × 100 = 100,000 → **$0.04**
- **Total**: **~$0.21/month**

**At 10,000 users**: ~$2.10/month

💡 **Very affordable!** Much cheaper than dedicated storage solutions.

---

## 🔒 **Security Best Practices**

### **1. Use IAM User (Not Root Account)**
- ✅ Created dedicated IAM user for S3
- ❌ Never use AWS root account credentials

### **2. Principle of Least Privilege**
- Current setup: `AmazonS3FullAccess` (good for single bucket)
- **Better** (advanced): Custom policy for specific bucket only:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::casino-royal-uploads-prod/*"
        }
    ]
}
```

### **3. Rotate Access Keys Regularly**
- Recommended: Every 90 days
- Go to IAM → Users → Security credentials → Create new key → Delete old key

### **4. Monitor S3 Usage**
- Enable CloudWatch metrics (free)
- Set up billing alerts

### **5. Enable S3 Bucket Versioning** (Optional)
- Protects against accidental deletions
- Small additional cost

---

## 📚 **Additional Resources**

- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **S3 Pricing Calculator**: https://calculator.aws/

---

## ✅ **Post-Setup Checklist**

- [ ] AWS account created
- [ ] S3 bucket created with public access
- [ ] CORS configured
- [ ] IAM user created with S3 access
- [ ] Access keys generated and saved securely
- [ ] Environment variables added to Render
- [ ] Application redeployed
- [ ] Test upload successful (image shows with S3 URL)
- [ ] Old uploads migrated (if needed)
- [ ] Billing alerts configured (optional but recommended)

---

## 🎉 **You're All Set!**

Your Casino Royal application now has **persistent, scalable file storage** with AWS S3!

**Benefits**:
- ✅ Files persist across deployments
- ✅ Fast CDN delivery worldwide
- ✅ Unlimited scalability
- ✅ Professional-grade infrastructure
- ✅ Costs pennies per month

**Need Help?**
- Check the troubleshooting section above
- Review Render logs for error messages
- Verify all environment variables are correct

---

*Last Updated: 2025-11-18*
*Version: 1.0*
