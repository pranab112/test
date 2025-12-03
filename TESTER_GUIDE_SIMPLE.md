# Email Verification System - Tester Guide
## Simple Testing Instructions (No AWS Needed)

This guide will help you test the **OTP Email Verification** feature for Casino Royal. You'll use server logs to get verification codes instead of checking email.

---

## 🎯 What You're Testing

Players can:
1. Add an email address
2. Get a 6-digit verification code
3. Verify their email with the code
4. Claim special email verification bonuses

---

## 🚀 Quick Start

### Access Information
- **Website**: https://test-1-g3yi.onrender.com
- **Test as**: Player
- **Server Logs**: Ask developer for Render dashboard access

---

## 📝 Step-by-Step Testing

### Step 1: Create/Login as Player

1. Go to: **https://test-1-g3yi.onrender.com/player**
2. **Register a new player account** or use existing credentials
   - Username: (your choice)
   - Password: (your choice)
   - User Type: **Player**
3. Login with your credentials

---

### Step 2: Find Email Verification Section

1. After login, click **Settings** (gear icon) or **Profile**
2. Scroll to **"Email Verification"** section
3. You should see a text box to enter an email

---

### Step 3: Send Verification Code

1. Enter **any email address** (doesn't need to be real)
   - Example: `test123@example.com`
2. Click **"Send Code"** button
3. Wait for success message: ✅ *"Verification code sent to your email!"*

**What happens:**
- The screen updates to show 6 input boxes
- A 6-digit code is generated
- The code is logged on the server

---

### Step 4: Get the OTP Code from Logs

**IMPORTANT: This is how you get the verification code**

1. Open **Render Dashboard** (ask developer for access)
2. Go to: **Dashboard → Your Service → Logs**
3. Look for this text block (scroll if needed):

```
===========================================
EMAIL VERIFICATION OTP (DEV MODE)
===========================================
To: test123@example.com
OTP Code: 123456
Expires in: 10 minutes
===========================================
```

4. **Copy the 6-digit code** (e.g., `123456`)

**Screenshot/Example of what to look for:**
- Look for text that says "EMAIL VERIFICATION OTP"
- The code will be 6 digits
- It's shown in plain text

---

### Step 5: Enter the Code

1. Go back to the player dashboard
2. You'll see **6 empty boxes** for entering the code
3. Type each digit of the code:
   - Type the first digit → cursor moves automatically
   - Type the second digit → cursor moves automatically
   - Continue until all 6 boxes are filled
4. Example: If code is `123456`, type: `1` `2` `3` `4` `5` `6`

---

### Step 6: Verify the Code

1. Click **"Verify Code"** button
2. Wait for the response

**Expected Result:**
- ✅ Success message: **"Email verified successfully!"**
- Green checkmark appears
- Status shows: **"Email Verified"**

**If it fails:**
- ❌ Error message appears
- Code inputs are cleared
- Try clicking "Resend Code" to get a new code

---

### Step 7: Test Email Verification Bonus

1. Navigate to **"Platform Offers"** or **"Bonuses"** section
2. Find an offer with type: **EMAIL_VERIFICATION**
3. You should now be able to claim it
4. Click **"Claim Offer"**
5. Select a client from the dropdown
6. Click **"Confirm"**

**Expected Result:**
- ✅ Offer is successfully claimed
- Client receives a message notification

---

## 🧪 Additional Tests

### Test 1: Resend Code
1. After sending a code, wait 1 minute
2. Click **"Resend Code"**
3. Check logs for a **new 6-digit code**
4. Old code should no longer work
5. New code should work ✅

### Test 2: Invalid Code
1. Enter a wrong code (e.g., `111111`)
2. Click "Verify Code"
3. Should get error: ❌ *"Invalid verification code"*
4. Inputs should clear automatically

### Test 3: Expired Code
1. Send a code
2. Wait 10+ minutes
3. Try to verify with the old code
4. Should get error: ❌ *"Verification code has expired"*

### Test 4: Rate Limiting
1. Send a code
2. Try to send another code immediately (within 1 minute)
3. Should get error: ⚠️ *"Please wait X seconds before requesting another code"*

---

## ✅ Testing Checklist

Copy this checklist and mark items as you test:

```
[ ] Step 1: Created/logged in as player
[ ] Step 2: Found email verification section
[ ] Step 3: Sent verification code successfully
[ ] Step 4: Retrieved OTP from Render logs
[ ] Step 5: Entered 6-digit code in boxes
[ ] Step 6: Code verified successfully
[ ] Step 7: Claimed email verification bonus

Additional Tests:
[ ] Resend code works
[ ] Invalid code shows error
[ ] Expired code rejected (10+ min old)
[ ] Rate limiting works (1 min cooldown)

UI/UX:
[ ] 6 input boxes display correctly
[ ] Cursor auto-moves between boxes
[ ] Success/error messages are clear
[ ] Email verified status updates correctly
```

---

## 🐛 Common Issues

### "Can't find the OTP in logs"
**Solution:**
- Refresh the Render logs page
- Scroll to the bottom of logs
- Look for "EMAIL VERIFICATION OTP" text
- Code appears within 5 seconds of clicking "Send Code"

### "Invalid verification code" error
**Solution:**
- Double-check you copied the correct code
- Make sure code is less than 10 minutes old
- Try requesting a new code

### "6 input boxes not showing"
**Solution:**
- Refresh the page
- Try logging out and back in
- Check that you clicked "Send Code" first

### "Can't claim bonus after verification"
**Solution:**
- Refresh the offers page
- Verify status shows green "Email Verified"
- Check if offer has other requirements

---

## 📊 Quick Test Report

After testing, fill this out:

```
✅ PASS or ❌ FAIL for each:

Basic Flow:
[ ] Send code
[ ] Get code from logs
[ ] Enter code
[ ] Verify code
[ ] Claim bonus

Additional:
[ ] Resend code
[ ] Invalid code error
[ ] Rate limiting

Issues Found:
1. _____________________
2. _____________________

Screenshots: (attach if any issues)

Overall: Working / Has Issues / Not Working

Comments:
_____________________
```

---

## 💡 Key Points to Remember

1. ✅ **Use Render logs** to get OTP codes (not email)
2. ✅ Codes expire in **10 minutes**
3. ✅ Can only request new code every **1 minute**
4. ✅ Enter code in **6 separate boxes**
5. ✅ Must verify email **before** claiming EMAIL_VERIFICATION bonuses

---

## 📞 Need Help?

If you get stuck:
1. Take a screenshot of the issue
2. Note what step you're on
3. Check if there are errors in Render logs
4. Contact the developer with details

---

## 🎉 That's It!

The system should work smoothly. Any issues you find help us improve the platform. Thank you for testing!

---

**Testing Guide Version:** 1.0
**Last Updated:** November 22, 2025
**Focus:** Testing OTP email verification using server logs