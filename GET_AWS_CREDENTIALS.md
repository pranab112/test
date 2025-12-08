# 🔑 How to Get Your AWS S3 Credentials

Follow these steps to retrieve your AWS credentials:

---

## 📋 **Step 1: Get S3 Bucket Name and Region**

### **Option A: From AWS Console (Easiest)**

1. **Login to AWS Console**: https://console.aws.amazon.com
2. **Search for "S3"** in the top search bar
3. **Click on S3** service
4. You'll see your buckets listed

**Copy these values:**
```
AWS_S3_BUCKET_NAME = [Your bucket name - e.g., casino-royal-uploads-prod]
AWS_REGION = [Region shown next to bucket - e.g., us-east-1]
```

**Example:**
- Bucket name: `casino-royal-uploads-prod`
- Region: `us-east-1` (or `us-west-2`, `eu-west-1`, etc.)

---

## 🔐 **Step 2: Get AWS Access Keys**

### **If you already have access keys:**

**Check your password manager or where you saved them initially.**

The keys look like:
- `AWS_ACCESS_KEY_ID`: Starts with `AKIA...` (20 characters)
- `AWS_SECRET_ACCESS_KEY`: Long random string (40 characters)

---

### **If you need to retrieve or create new keys:**

1. **Go to IAM Console**: https://console.aws.amazon.com/iam

2. **Click "Users"** in the left sidebar

3. **Find your IAM user** (the one you used for S3)
   - If you don't remember, look for a user named:
     - `casino-royal-user`
     - `s3-user`
     - Or your main account user

4. **Click on the username**

5. **Go to "Security credentials" tab**

6. **Scroll to "Access keys" section**

---

### **Option A: If you see existing access keys**

**You'll see something like:**
```
Access key ID: AKIA****************
Created: 2024-XX-XX
Last used: Recently
Status: Active
```

**Problem:** You can only see the full secret key when you first create it.

**Solution:** If you didn't save the secret key, you need to create a new one (continue to Option B)

---

### **Option B: Create new access keys (Recommended if you lost the old ones)**

1. **In the "Access keys" section**, click **"Create access key"**

2. **Select use case**: Choose **"Application running outside AWS"**

3. Click **"Next"**

4. **Add description** (optional): "Railway deployment"

5. Click **"Create access key"**

6. **⚠️ CRITICAL - COPY THESE NOW!**

   You'll see:
   ```
   Access key ID: AKIAIOSFODNN7EXAMPLE
   Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

   **This is your ONLY CHANCE to see the secret key!**

7. **Click "Download .csv file"** (saves them safely)

8. **OR Copy them manually:**
   - Copy `Access key ID`
   - Copy `Secret access key`

9. Click **"Done"**

---

## 📝 **Step 3: Provide Me With All 4 Values**

Once you have all the values, paste them here in this format:

```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=casino-royal-uploads-prod
AWS_REGION=us-east-1
```

**Replace with your actual values!**

---

## 🎯 **Quick Navigation**

### **Direct Links:**

1. **S3 Console**: https://s3.console.aws.amazon.com/s3/buckets
   → Get bucket name and region

2. **IAM Users**: https://console.aws.amazon.com/iam/home#/users
   → Get or create access keys

3. **Security Credentials** (if using root account):
   https://console.aws.amazon.com/iam/home#/security_credentials
   → Access keys section

---

## ⚠️ **Security Warnings**

1. **Never commit credentials to git**
2. **Never share credentials publicly**
3. **If you create new keys, delete the old ones** (in IAM → Users → Your user → Security credentials → Deactivate/Delete old keys)
4. **Save the .csv file in a secure location** (password manager recommended)

---

## 🆘 **Troubleshooting**

### **"I don't have an IAM user"**

If you're using the root account:
1. Go to: https://console.aws.amazon.com/iam/home#/security_credentials
2. Look for "Access keys" section
3. Create access key there

**⚠️ Not recommended for production!** You should create an IAM user with limited S3 permissions.

### **"I can't find my S3 bucket"**

1. Make sure you're in the correct AWS region (check top-right corner)
2. Try switching regions in the dropdown
3. Or search for "S3" and click "Buckets" to see all buckets across all regions

### **"I forgot which IAM user I used"**

1. Go to S3 bucket → Permissions tab
2. Check Bucket Policy or Access Control List (ACL)
3. You'll see the IAM user ARN mentioned

---

## ✅ **Ready?**

Once you have all 4 values, just paste them here like this:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJa...
AWS_S3_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1
```

**I'll immediately add them to Railway and your app will have persistent file storage!** 🚀

---

## 📞 **Need More Help?**

Tell me:
- "I'm on the S3 page, what next?"
- "I'm on IAM users, what do I click?"
- "I found the bucket but not the keys"
- Or describe what you see and I'll guide you
