# Admin Dashboard - Testing Guide

## ✅ Issue Fixed!

**Problem**: API responses were being double-unwrapped
**Solution**: Updated admin API to handle interceptor's automatic data unwrapping

---

## Access the Admin Dashboard

### 1. Login

**URL**: http://localhost:5173/a9f8e7d6c5b4a3918273645/login

**Credentials**:
- Username: `admin`
- Password: `admin123`

### 2. After Login

You'll be redirected to: http://localhost:5173/a9f8e7d6c5b4a3918273645

---

## Test Each Section

### ✅ Overview Section (Dashboard Home)

**What to Check**:
- [ ] Statistics load (Total Users, Clients, Players, etc.)
- [ ] Numbers are accurate (match database)
- [ ] Platform Statistics panel shows data
- [ ] Quick action buttons work

**Expected Data**:
```
Total Users: 1 (just the admin)
Total Clients: 0
Total Players: 0
Pending Approvals: 0
Active Reports: 0
Online Users: 0 or 1
```

### ✅ User Management

**What to Check**:
- [ ] Click "Users" in sidebar
- [ ] Admin user appears in table
- [ ] Filter buttons work (All/Clients/Players)
- [ ] User shows: username, email, type badge, status, join date
- [ ] Actions column has activate/deactivate and delete buttons

**Expected**:
- Should show the admin user
- Type badge: "ADMIN"
- Status: "Active" (green badge)
- Approved: "Yes" (green badge)

**Try**:
- Filter by "Clients" → Should show "No users found"
- Filter by "Players" → Should show "No users found"
- Filter by "All" → Should show admin user

### ✅ Pending Approvals

**What to Check**:
- [ ] Click "Approvals" in sidebar
- [ ] Shows empty state: "No pending approvals"

**To Test Fully**:
1. Open http://localhost:5173/register in another browser/incognito
2. Register as a Client (company name, etc.)
3. Go back to admin dashboard → Approvals
4. Client should appear in pending list
5. Click "Approve" → Success toast
6. Client disappears from list
7. Check Users section → Client now appears there

### ✅ Reports Management

**What to Check**:
- [ ] Click "Reports" in sidebar
- [ ] Shows empty state: "No reports found"

**Expected**:
- Empty table (no reports yet)
- When reports exist, they'll show:
  - Reporter username
  - Reported user
  - Reason
  - Status badge
  - "Review" button

### ✅ Promotions

**What to Check**:
- [ ] Click "Promotions" in sidebar
- [ ] Shows: "Total: 0" or empty table

**Expected**:
- No promotions (clients create these)
- When promotions exist, table shows:
  - Title
  - Type badge
  - Value
  - Claims count
  - Status
  - End date
  - Cancel button (if active)

### ✅ Reviews

**What to Check**:
- [ ] Click "Reviews" in sidebar
- [ ] Shows empty state: "No reviews found"

**Expected**:
- Empty table initially
- Reviews show: reviewer, reviewee, rating stars, title, date

### ✅ Messages

**What to Check**:
- [ ] Click "Messages" in sidebar
- [ ] Shows: "Total: 0 messages" or empty state

**Expected**:
- No messages initially
- Messages would show: sender, receiver, content, read status

### ✅ Broadcast

**What to Check**:
- [ ] Click "Broadcast" in sidebar
- [ ] Target audience dropdown has 3 options
- [ ] Message textarea is empty
- [ ] "Send Broadcast" button is disabled (no message)

**Test Broadcast** (if you have created client/player users):
1. Select "All Users"
2. Type message: "Welcome to Golden Ace!"
3. Click "Send Broadcast"
4. Confirm dialog appears
5. Success toast: "Broadcast sent to X users!"
6. Message field clears

**Try Different Targets**:
- "All Clients" → Only sends to clients
- "All Players" → Only sends to players
- "All Users" → Sends to everyone except admin

---

## Common Issues & Solutions

### Issue: "Failed to load dashboard statistics"

**Check**:
1. Backend is running: `http://localhost:8000`
2. Check browser console for errors
3. Verify admin token in localStorage

**Fix**:
```bash
# Restart backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload
```

### Issue: "Failed to load users"

**Check**:
1. Database exists: `casino.db`
2. Admin user exists in database
3. API endpoint accessible: `http://localhost:8000/admin/users`

**Fix**:
```bash
# Recreate admin
python scripts/create_admin.py
```

### Issue: Toast notifications not showing

**Check**:
1. Browser console for errors
2. `react-hot-toast` is imported
3. No CSS conflicts

### Issue: 401 Unauthorized

**Cause**: Token expired or invalid

**Fix**:
1. Logout and login again
2. Clear browser localStorage
3. Hard refresh (Ctrl+Shift+R)

---

## API Endpoints Being Used

### Dashboard Stats
```
GET /admin/dashboard-stats
```

### Users
```
GET /admin/users
GET /admin/users?user_type=client
GET /admin/users?user_type=player
PATCH /admin/users/{id}/approve
PATCH /admin/users/{id}/reject
PATCH /admin/users/{id}/toggle-status
DELETE /admin/users/{id}
```

### Approvals
```
GET /admin/pending-approvals
```

### Reports
```
GET /admin/reports
PATCH /admin/reports/{id}/status
```

### Promotions
```
GET /admin/promotions
PATCH /admin/promotions/{id}/cancel
```

### Reviews
```
GET /admin/reviews
DELETE /admin/reviews/{id}
```

### Messages
```
GET /admin/messages
```

### Broadcast
```
POST /admin/broadcast-message
Body: { message: string, user_type?: string }
```

---

## Browser Console Commands (for Testing)

### Check Token
```javascript
localStorage.getItem('access_token')
```

### Check User Data
```javascript
JSON.parse(localStorage.getItem('user'))
```

### Clear Auth
```javascript
localStorage.removeItem('access_token')
localStorage.removeItem('user')
window.location.reload()
```

### Manual API Test
```javascript
fetch('http://localhost:8000/admin/dashboard-stats', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(r => r.json())
.then(console.log)
```

---

## Success Indicators

**✅ Everything Working If**:
1. Login redirects to admin dashboard
2. Statistics load without errors
3. All sections accessible via sidebar
4. No console errors
5. Toast notifications appear
6. Tables show data or empty states
7. Actions (approve, delete, etc.) work
8. Broadcast can be sent

**❌ Issues If**:
1. "Failed to load" errors
2. Red error toasts
3. Console errors about undefined
4. Tables show nothing (not even empty state)
5. Buttons don't respond
6. Redirects to login repeatedly

---

## Testing with Multiple Users

### Create Test Users

**1. Create Client**:
```
http://localhost:5173/register
- User Type: Client
- Company Name: "Test Company"
- Username: client1
- Email: client1@test.com
- Password: test123
```

**2. Approve Client** (as admin):
- Go to Approvals section
- Click "Approve" on client1

**3. Create Player** (via client):
- Login as client1
- Create player accounts
- These will need client approval

**4. Test Admin Actions**:
- View users list
- Filter by type
- Activate/deactivate users
- Send broadcasts

---

## Performance Check

**Expected Load Times**:
- Dashboard stats: < 500ms
- Users list: < 1s
- Other sections: < 500ms

**If Slow**:
1. Check database size
2. Add pagination (already has limit: 100)
3. Check network tab for slow requests

---

## Final Checklist

Before marking as complete, verify:

- [x] Build successful (189 modules)
- [ ] Admin can login
- [ ] Dashboard loads statistics
- [ ] All 8 sections accessible
- [ ] Users section shows data
- [ ] Approvals section functional
- [ ] Actions (approve, delete) work
- [ ] Broadcast can send messages
- [ ] No console errors
- [ ] Toast notifications work
- [ ] Loading states appear
- [ ] Empty states show correctly

---

## Quick Test Script

```bash
# 1. Ensure servers are running
ps aux | grep -E "vite|uvicorn" | grep -v grep

# 2. Check admin exists
sqlite3 casino.db "SELECT username, user_type, is_approved FROM users WHERE user_type='admin';"

# 3. Test API directly
curl -X GET http://localhost:8000/admin/dashboard-stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Open browser
# http://localhost:5173/a9f8e7d6c5b4a3918273645/login
```

---

## Support

If issues persist:

1. **Check browser console** for JavaScript errors
2. **Check backend logs** for API errors
3. **Verify database** has correct data
4. **Clear cache** and hard refresh
5. **Recreate admin user** if needed

**Backend Logs**:
```bash
# Terminal running uvicorn shows all API requests
# Look for 200 (success) or 4xx/5xx (errors)
```

**Frontend Debug**:
```bash
# Check build output
npm run build

# Check dev server
npm run dev
```

---

## Success! 🎉

If all sections load and you can perform actions without errors, the **admin dashboard is fully operational**!

Next steps:
1. Create test client/player users
2. Test approval workflow
3. Test broadcast messaging
4. Monitor system usage
