# Email Verification Testing Guide
## OTP-Based Email Verification System

This guide will help you test the new OTP (One-Time Password) email verification feature for Casino Royal platform.

---

## 🎯 What You're Testing

The **Email Verification Bonus System** allows players to:
1. Add a secondary email address
2. Receive a 6-digit verification code via email
3. Verify their email using the code
4. Claim special EMAIL_VERIFICATION bonuses after verification

---

## 📋 Prerequisites

Before testing, ensure you have:
- Access to the deployed application: **https://test-1-g3yi.onrender.com**
- A valid email address for receiving OTP codes
- Player account credentials (or ability to create one)
- Access to Render dashboard logs (if emails fail)

---

## 🚀 Testing Instructions

### Step 1: Login as Player

1. Go to: **https://test-1-g3yi.onrender.com/player**
2. If you don't have an account:
   - Click "Register" or "Sign Up"
   - Fill in the registration form
   - Choose "Player" as user type
   - Complete registration
3. Login with your player credentials

---

### Step 2: Navigate to Email Verification

1. Once logged in, locate the **Settings** or **Profile** section
2. Look for the **"Email Verification"** section
3. You should see an input field to add your email address

---

### Step 3: Send OTP Code

1. **Enter your email address** in the input field
   - Example: `yourname@gmail.com`
2. Click the **"Send Code"** button
3. You should see a success notification:
   ```
   ✅ "Verification code sent to your email!"
   ```

**Expected Behavior:**
- A 6-digit OTP code is generated
- Email is sent to your address
- The UI updates to show OTP input boxes

---

### Step 4: Retrieve the OTP Code

**Option A: Check Your Email (Primary Method)**
1. Open your email inbox
2. Look for an email with subject: **"Your Casino Royal Verification Code"**
3. The email will contain a 6-digit code like: **123456**
4. **Note:** Check your spam/junk folder if you don't see it

**Email Format:**
```
Subject: Your Casino Royal Verification Code

Hi [your username],

Your Casino Royal verification code is:

123456

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Casino Royal Team
```

**Option B: Get OTP from Render Logs (If Email Fails)**
1. Ask the developer for access to Render dashboard
2. Go to: **Dashboard → Your Service → Logs**
3. Look for this in the logs:
   ```
   ===========================================
   EMAIL VERIFICATION OTP (DEV MODE)
   ===========================================
   To: yourname@gmail.com
   OTP Code: 123456
   Expires in: 10 minutes
   ===========================================
   ```
4. Copy the 6-digit OTP code

---

### Step 5: Enter the OTP Code

1. You'll see **6 individual input boxes** on the screen
2. Enter each digit of your OTP code in the boxes
   - The cursor will automatically move to the next box
   - Example: If your code is **123456**, type 1-2-3-4-5-6
3. All 6 boxes should be filled

---

### Step 6: Verify the Code

1. Click the **"Verify Code"** button
2. Wait for the verification process

**Expected Success:**
- ✅ Success notification: **"Email verified successfully!"**
- The section updates to show: **"Email Verified"** with a green checkmark
- Your email address is now verified

**If Verification Fails:**
- ❌ Error notification: **"Invalid verification code"**
- OTP inputs are cleared
- Try clicking **"Resend Code"** to get a new code

---

### Step 7: Test the Email Verification Bonus

1. Navigate to **"Platform Offers"** or **"Bonuses"** section
2. Look for offers marked as **"EMAIL_VERIFICATION"** type
3. You should now be able to claim these offers
4. Click **"Claim Offer"** on an email verification bonus
5. Select a client from the list
6. Click **"Confirm"**

**Expected Behavior:**
- ✅ Offer claim is successful
- The selected client receives a message notification:
  ```
  🎁 Bonus Claim Request

  [Your Name] has verified their email address and wants to
  claim the "[Offer Title]" bonus ($[Amount]) with you.

  Please review and approve their claim in the Pending Claims section.
  ```

---

## 🔄 Additional Test Cases

### Test Case 1: Resend OTP Code
1. After sending initial code, wait 1 minute
2. Click **"Resend Code"** button
3. You should receive a new 6-digit code
4. Old code should no longer work
5. New code should work for verification

### Test Case 2: OTP Expiration
1. Send OTP code
2. Wait for **10 minutes** (OTP expires after 10 min)
3. Try to verify with the expired code
4. Should get error: **"Verification code has expired. Please request a new one."**

### Test Case 3: Rate Limiting
1. Send OTP code
2. Immediately try to send another code (within 1 minute)
3. Should get error: **"Please wait X seconds before requesting another code"**

### Test Case 4: Invalid OTP
1. Enter an incorrect 6-digit code (e.g., 111111)
2. Click "Verify Code"
3. Should get error: **"Invalid verification code"**
4. OTP inputs should clear automatically

---

## ✅ Success Criteria

The email verification system is working correctly if:

1. ✅ **OTP Email Sent**: Code is sent to email (or visible in logs)
2. ✅ **OTP Input UI**: 6 input boxes display correctly
3. ✅ **Code Verification**: Valid codes are accepted
4. ✅ **Expiration Works**: Expired codes (>10 min) are rejected
5. ✅ **Rate Limiting**: Can't spam requests (1 min cooldown)
6. ✅ **Invalid Codes**: Wrong codes are rejected with clear error
7. ✅ **Email Verified Status**: Status updates correctly after verification
8. ✅ **Bonus Access**: Can claim EMAIL_VERIFICATION offers after verification
9. ✅ **Message System**: Client receives notification when player claims offer

---

## 🐛 Known Issues & Troubleshooting

### Issue 1: Email Not Received
**Solution:**
- Check spam/junk folder
- Use Render logs to get OTP code
- Verify AWS SES is configured correctly

### Issue 2: OTP Inputs Not Showing
**Solution:**
- Refresh the page
- Clear browser cache
- Try different browser

### Issue 3: "Invalid Verification Code" Error
**Solution:**
- Double-check you entered the correct code
- Code might be expired (10 min limit)
- Request a new code

### Issue 4: Can't Claim Bonus After Verification
**Solution:**
- Refresh the offers page
- Verify email status shows "Verified" with green checkmark
- Check if offer has other requirements (e.g., min deposits)

---

## 📊 Test Report Template

After testing, please provide feedback using this format:

```
Email Verification Test Report
Date: [Date]
Tester: [Your Name]
Browser: [Chrome/Firefox/Safari/etc.]
Device: [Desktop/Mobile/Tablet]

Test Results:
[ ] Step 1-2: Login & Navigation - PASS/FAIL
[ ] Step 3: Send OTP Code - PASS/FAIL
[ ] Step 4: Receive OTP - PASS/FAIL (Email or Logs)
[ ] Step 5-6: Enter & Verify Code - PASS/FAIL
[ ] Step 7: Claim Bonus - PASS/FAIL

Additional Tests:
[ ] Resend Code - PASS/FAIL
[ ] OTP Expiration - PASS/FAIL
[ ] Rate Limiting - PASS/FAIL
[ ] Invalid OTP - PASS/FAIL

Issues Found:
1. [Describe any issues]
2. [Describe any issues]

Screenshots: [Attach if applicable]

Overall Assessment: [Working Well / Needs Fixes / Not Working]

Comments: [Any additional feedback]
```

---

## 📞 Support

If you encounter issues during testing:
1. **Check Render Logs** for error messages
2. **Take Screenshots** of any errors
3. **Note the exact steps** that caused the issue
4. **Contact the development team** with details

---

## 🎉 Testing Complete!

Thank you for testing the OTP email verification system. Your feedback helps ensure a smooth experience for all Casino Royal players!

---

**Version:** 1.0
**Last Updated:** November 22, 2025
**System:** OTP-Based Email Verification