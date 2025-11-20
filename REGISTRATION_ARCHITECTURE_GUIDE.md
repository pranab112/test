# Registration Architecture Guide
**Version:** 2.0
**Last Updated:** 2025-11-20
**Critical Issues:** Security vulnerability identified

This document explains the complete registration architecture for the Casino Royal SaaS Platform, including all registration flows, endpoints, and validation requirements.

---

## Table of Contents
1. [Application Architecture Overview](#application-architecture-overview)
2. [Registration Flows](#registration-flows)
3. [Endpoint Details](#endpoint-details)
4. [Critical Security Issue](#critical-security-issue)
5. [Frontend Implementation](#frontend-implementation)
6. [Validation Rules](#validation-rules)

---

## Application Architecture Overview

### URL Structure

```
/                    → login.html (homepage/login page)
/login               → login.html
/register            → player-register.html (self-registration)
/client              → client-dashboard.html (requires CLIENT role)
/player              → player-dashboard.html (requires PLAYER role)
/admin               → admin-dashboard.html (requires ADMIN role)
```

### User Roles

| Role | Description | Self-Registration | Created By |
|------|-------------|-------------------|------------|
| **PLAYER** | Casino players | ✅ Yes (`/register`) | Self or Client |
| **CLIENT** | Casino operators | ✅ Yes (`/register`) | Self (pending approval) |
| **ADMIN** | Platform administrators | ✅ Yes (`/register`) | Self (pending approval) |

---

## Registration Flows

### Flow 1: Player Self-Registration (`/register`)

**User Journey:**
1. User visits `/register` (player-register.html)
2. Fills registration form
3. Submits to `POST /auth/register` with `user_type: "player"`
4. Account created instantly (auto-approved)
5. Redirected to `/player` dashboard

**API Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "player@example.com",
  "username": "player123",
  "full_name": "John Doe",
  "password": "MyP@ssw0rd123",
  "user_type": "player"
}
```

**Password Hashing:** ✅ bcrypt (secure)

**Approval:** Auto-approved (`is_approved: true`)

---

### Flow 2: Client Self-Registration (`/register`)

**User Journey:**
1. User visits `/register`
2. Fills registration form with company name
3. Submits to `POST /auth/register` with `user_type: "client"`
4. Account created but **pending admin approval**
5. Cannot access `/client` dashboard until approved

**API Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "client@casino.com",
  "username": "mycasino_operator",
  "full_name": "Casino Manager",
  "password": "Secur3Casino!2024",
  "user_type": "client",
  "company_name": "My Casino Ltd."
}
```

**Password Hashing:** ✅ bcrypt (secure)

**Approval:** Pending (`is_approved: false`) - requires admin approval

---

### Flow 3: Admin Self-Registration (`/register`)

**User Journey:**
1. User visits `/register`
2. Fills registration form
3. Submits to `POST /auth/register` with `user_type: "admin"`
4. Account created but **pending admin approval**
5. Cannot access `/admin` dashboard until approved

**API Endpoint:** `POST /auth/register`

**Password Hashing:** ✅ bcrypt (secure)

**Approval:** Pending (`is_approved: false`) - requires existing admin approval

---

### Flow 4: Client Creates Player (`/client` dashboard)

**User Journey:**
1. Client logs in and navigates to `/client` dashboard
2. In client dashboard, finds "Register Player" section
3. Fills player registration form
4. Submits to `POST /client/register-player` (requires authentication)
5. Player account created instantly
6. Client can manage this player

**API Endpoint:** `POST /client/register-player` (requires CLIENT role authentication)

**Request Body:**
```json
{
  "email": "player@example.com",
  "username": "player456",
  "full_name": "Jane Smith",
  "password": "OptionalP@ss123"  // Optional - auto-generated if not provided
}
```

**Password Hashing:** ⚠️ **CRITICAL ISSUE** - Uses SHA256 (insecure!)

**Approval:** Auto-approved (`is_approved: true`)

**Special Features:**
- Password is optional (auto-generated if not provided)
- Client receives temp password if auto-generated
- Player is automatically linked to client (friend connection)
- Player tracked with `created_by_client_id`

---

## Endpoint Details

### 1. Self-Registration Endpoint

**Endpoint:** `POST /auth/register`
**Access:** Public (no authentication required)
**File:** `app/routers/auth.py:20-59`

**Request Schema:**
```json
{
  "email": "string (required, max 255)",
  "username": "string (required, max 255)",
  "password": "string (required, max 72)",
  "user_type": "player | client | admin (required)",
  "full_name": "string (optional, max 255)",
  "company_name": "string (optional for player/admin, required for client, max 255)"
}
```

**Validation Rules:**
- Email: Valid format, unique
- Username: Alphanumeric + underscore, unique, 3-255 chars
- Password: 8-72 chars, must contain uppercase, lowercase, number, special char
- User Type: Must be one of: "player", "client", "admin"
- Company Name: Required ONLY if `user_type === "client"`

**Password Security:** ✅ bcrypt with salt (app/auth.py:58-71)

**Approval Logic:**
```python
is_approved = user.user_type != models.UserType.CLIENT
# Players: auto-approved (true)
# Clients: pending approval (false)
# Admins: pending approval (false)
```

---

### 2. Client Creates Player Endpoint

**Endpoint:** `POST /client/register-player`
**Access:** Authenticated CLIENT role required
**File:** `app/routers/client.py:31-112`

**Authentication Required:** Yes (Bearer token with CLIENT role)

**Request Schema:**
```json
{
  "email": "string (required, max 255)",
  "username": "string (required, max 255)",
  "full_name": "string (required, max 255)",
  "password": "string (optional, max 72)"  // Auto-generated if omitted
}
```

**Response (if password auto-generated):**
```json
{
  "id": 42,
  "email": "player@example.com",
  "username": "player456",
  "full_name": "Jane Smith",
  "user_type": "player",
  "user_id": "ABCD1234",
  "is_active": true,
  "created_at": "2025-11-20T10:30:00Z",
  "temp_password": "aBcDeFgH1234"  // ⚠️ Only returned if password was auto-generated
}
```

**Password Security:** ⚠️ **CRITICAL VULNERABILITY**
```python
# client.py:55 - INSECURE!
hashed_password = hashlib.sha256(password.encode()).hexdigest()
```
**Issue:** SHA256 is NOT suitable for password hashing! Should use bcrypt.

**Auto-Generated Password:**
- 12 characters, alphanumeric
- Returned in response ONLY if password wasn't provided
- Client should display this to user and/or send via email

---

## Critical Security Issue

### ⚠️ VULNERABILITY: Insecure Password Hashing in Client Registration

**Location:** `app/routers/client.py:55`

**Current Code (INSECURE):**
```python
hashed_password = hashlib.sha256(password.encode()).hexdigest()
```

**Problem:**
- SHA256 is a **fast** hashing algorithm designed for data integrity, NOT passwords
- No salt - identical passwords produce identical hashes (rainbow table attacks)
- Vulnerable to brute-force attacks (billions of hashes per second on modern hardware)
- **Does NOT meet OWASP password storage guidelines**

**Correct Implementation (from auth.py):**
```python
from app.auth import get_password_hash
hashed_password = get_password_hash(password)  # Uses bcrypt with salt
```

**Impact:**
- All players created by clients have insecure password hashes
- If database is compromised, these passwords are easily crackable
- Incompatible with existing bcrypt hashes from `/auth/register`

**Recommendation:**
1. **Immediate Fix:** Change line 55 in client.py to use bcrypt
2. **Data Migration:** Migrate existing SHA256 hashes to bcrypt (require password reset)
3. **Testing:** Verify players created by clients can log in after fix

---

## Frontend Implementation

### For `/register` Page (player-register.html)

**Registration Form Requirements:**

```html
<form id="registrationForm">
  <!-- Email -->
  <input type="email" name="email" required maxlength="255" />
  <span class="helper-text">Valid email address</span>

  <!-- Username -->
  <input type="text" name="username" required minlength="3" maxlength="255" pattern="[a-zA-Z0-9_]+" />
  <span class="helper-text">Letters, numbers, and underscores only (no spaces or @, !, #)</span>

  <!-- Password -->
  <input type="password" name="password" required minlength="8" maxlength="72" />
  <span class="helper-text">8-72 characters with uppercase, lowercase, number, and special character</span>
  <div id="passwordStrength"></div>

  <!-- User Type -->
  <select name="user_type" required>
    <option value="player">Player - I want to play games</option>
    <option value="client">Casino Operator - I manage a casino</option>
    <option value="admin">Administrator - Platform admin</option>
  </select>

  <!-- Full Name (Optional) -->
  <input type="text" name="full_name" maxlength="255" />

  <!-- Company Name (Conditional - only for clients) -->
  <input type="text" name="company_name" id="companyName" maxlength="255" style="display:none;" />

  <button type="submit">Create Account</button>
</form>

<script>
// Show/hide company name based on user type
document.querySelector('[name="user_type"]').addEventListener('change', function(e) {
  const companyField = document.getElementById('companyName');
  if (e.target.value === 'client') {
    companyField.style.display = 'block';
    companyField.required = true;
  } else {
    companyField.style.display = 'none';
    companyField.required = false;
  }
});

// Form submission
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = {
    email: this.email.value,
    username: this.username.value,
    password: this.password.value,
    user_type: this.user_type.value,
    full_name: this.full_name.value || undefined,
    company_name: this.user_type.value === 'client' ? this.company_name.value : undefined
  };

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.detail === 'Email already registered') {
        alert('This email is already in use. Try logging in instead?');
      } else if (error.detail === 'Username already taken') {
        alert('This username is taken. Try another one (e.g., username_123)');
      } else {
        alert('Registration failed: ' + error.detail);
      }
      return;
    }

    const data = await response.json();

    // Handle success based on user type
    if (data.user_type === 'player' && data.is_approved) {
      alert('Registration successful! Redirecting to your dashboard...');
      window.location.href = '/player';
    } else if (data.user_type === 'client' && !data.is_approved) {
      alert('Registration successful! Your account is pending admin approval. You\'ll receive an email once approved.');
      window.location.href = '/login';
    } else if (data.user_type === 'admin' && !data.is_approved) {
      alert('Registration successful! Your admin account is pending approval.');
      window.location.href = '/login';
    }
  } catch (error) {
    alert('Network error. Please try again.');
  }
});
</script>
```

---

### For `/client` Dashboard (client-dashboard.html)

**Player Registration Section in Client Dashboard:**

```html
<section id="registerPlayerSection">
  <h2>Register New Player</h2>
  <form id="clientRegisterPlayerForm">
    <!-- Email -->
    <input type="email" name="email" required maxlength="255" />
    <span class="helper-text">Player's email address</span>

    <!-- Username -->
    <input type="text" name="username" required minlength="3" maxlength="255" pattern="[a-zA-Z0-9_]+" />
    <span class="helper-text">Letters, numbers, and underscores only (no spaces)</span>

    <!-- Full Name -->
    <input type="text" name="full_name" required maxlength="255" />

    <!-- Password (Optional) -->
    <input type="password" name="password" minlength="8" maxlength="72" />
    <span class="helper-text">Leave blank to auto-generate a temporary password</span>

    <button type="submit">Register Player</button>
  </form>

  <div id="tempPasswordDisplay" style="display:none;">
    <h3>⚠️ Temporary Password Generated</h3>
    <p>Player: <span id="displayUsername"></span></p>
    <p>Temporary Password: <strong id="displayTempPassword"></strong></p>
    <p>Please send this password to the player securely.</p>
    <button onclick="copyPassword()">Copy Password</button>
  </div>
</section>

<script>
// Get authentication token (from login)
const token = localStorage.getItem('auth_token');

document.getElementById('clientRegisterPlayerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = {
    email: this.email.value,
    username: this.username.value,
    full_name: this.full_name.value,
    password: this.password.value || undefined  // Omit if empty (auto-generate)
  };

  try {
    const response = await fetch('/client/register-player', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.detail === 'Email already registered') {
        alert('This email is already registered.');
      } else if (error.detail === 'Username already taken') {
        alert('This username is taken. Try another one.');
      } else if (error.detail === 'Client access required') {
        alert('Authentication error. Please log in again.');
        window.location.href = '/login';
      } else {
        alert('Registration failed: ' + error.detail);
      }
      return;
    }

    const data = await response.json();

    // Show temp password if it was auto-generated
    if (data.temp_password) {
      document.getElementById('displayUsername').textContent = data.username;
      document.getElementById('displayTempPassword').textContent = data.temp_password;
      document.getElementById('tempPasswordDisplay').style.display = 'block';
    } else {
      alert(`Player "${data.username}" registered successfully!`);
    }

    // Reset form
    this.reset();

    // Refresh player list
    loadMyPlayers();
  } catch (error) {
    alert('Network error. Please try again.');
  }
});

function copyPassword() {
  const password = document.getElementById('displayTempPassword').textContent;
  navigator.clipboard.writeText(password);
  alert('Password copied to clipboard!');
}

async function loadMyPlayers() {
  const response = await fetch('/client/my-players', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const players = await response.json();
  // Display players in a table...
}
</script>
```

---

## Validation Rules

### Common Validation (All Registration Flows)

**Email:**
- Required
- Valid email format
- Unique (no duplicates)
- Max 255 characters
- Error messages:
  - Empty: "Please enter your email address"
  - Invalid: "Please enter a valid email (e.g., user@example.com)"
  - Duplicate: "This email is already registered. Try logging in instead?"

**Username:**
- Required
- 3-255 characters
- Alphanumeric + underscore ONLY (`/^[a-zA-Z0-9_]+$/`)
- Unique (no duplicates)
- Error messages:
  - Empty: "Please choose a username"
  - Too short: "Username must be at least 3 characters"
  - Invalid chars: "Username can only contain letters, numbers, and underscores (_). No spaces or special characters like @, !, #, etc."
  - Duplicate: "This username is taken. Try another one (e.g., username_123)"

**Password:**
- Required
- 8-72 characters (**bcrypt limit!**)
- Must contain:
  - 1 uppercase letter (A-Z)
  - 1 lowercase letter (a-z)
  - 1 number (0-9)
  - 1 special character (!@#$%^&* etc.)
- Error messages:
  - Empty: "Please create a password"
  - Too short: "Password must be at least 8 characters"
  - **Too long: "Password must be 72 characters or less (security system limit)"**
  - Missing uppercase: "Add at least one uppercase letter (A-Z)"
  - Missing lowercase: "Add at least one lowercase letter (a-z)"
  - Missing number: "Add at least one number (0-9)"
  - Missing special char: "Add at least one special character (!, @, #, $, etc.)"

---

### `/auth/register` Specific Validation

**User Type:**
- Required
- Must be one of: "player", "client", "admin"
- Error: "Please select your account type"

**Company Name:**
- Required ONLY if `user_type === "client"`
- Max 255 characters
- Error (for clients): "Company name is required for casino operators"

---

### `/client/register-player` Specific Validation

**Full Name:**
- Required (unlike `/auth/register` where it's optional)
- Max 255 characters
- Error: "Player's full name is required"

**Password:**
- Optional (auto-generated if not provided)
- If provided: same validation as above (8-72 chars, complexity)
- **Important:** Client should be informed if password was auto-generated

---

## Testing Checklist

### Test Self-Registration (`/auth/register`)

**Player Registration:**
- [ ] Can register with all required fields
- [ ] Auto-approved (`is_approved: true`)
- [ ] Can log in immediately after registration
- [ ] Redirected to `/player` dashboard

**Client Registration:**
- [ ] Must provide company name
- [ ] Pending approval (`is_approved: false`)
- [ ] Cannot access `/client` until approved
- [ ] Shown "pending approval" message

**Admin Registration:**
- [ ] Pending approval (`is_approved: false`)
- [ ] Cannot access `/admin` until approved

### Test Client Creates Player (`/client/register-player`)

**With Password Provided:**
- [ ] Player created successfully
- [ ] ⚠️ **SECURITY TEST:** Verify password hashing (currently insecure!)
- [ ] Can log in with provided password
- [ ] Linked to client (`created_by_client_id` set)

**Without Password (Auto-Generated):**
- [ ] Temp password generated (12 chars, alphanumeric)
- [ ] Temp password returned in API response
- [ ] Displayed to client in UI
- [ ] Player can log in with temp password
- [ ] Client can copy temp password

**Authentication:**
- [ ] Endpoint requires authentication
- [ ] Non-clients receive 403 Forbidden
- [ ] Invalid token receives 401 Unauthorized

---

## Recommended Fixes

### Priority 1: Fix SHA256 Password Hashing

**File:** `app/routers/client.py`
**Lines:** 55, 240

**Current (INSECURE):**
```python
import hashlib
hashed_password = hashlib.sha256(password.encode()).hexdigest()
```

**Replace With (SECURE):**
```python
from app.auth import get_password_hash
hashed_password = get_password_hash(password)
```

**Migration Plan:**
1. Fix code to use bcrypt
2. Deploy fix
3. Force password reset for all players created by clients
4. Send email: "For security reasons, please reset your password"

---

### Priority 2: Add Password Validation to Client Registration

Currently, client registration doesn't validate password complexity. Add validation:

```python
# Before hashing password
if password and len(password) > 72:
    raise HTTPException(status_code=400, detail="Password must be 72 characters or less")

# Validate complexity (optional but recommended)
if password and not validate_password_complexity(password):
    raise HTTPException(status_code=400, detail="Password must meet complexity requirements")
```

---

### Priority 3: Add Rate Limiting

Both registration endpoints should have rate limiting to prevent abuse:

```python
@router.post("/register")
@limiter.limit("5/minute")  # Max 5 registrations per minute per IP
def register(...):
    ...

@router.post("/register-player")
@limiter.limit("10/minute")  # Max 10 player creations per minute per client
def register_player(...):
    ...
```

---

## API Summary

| Endpoint | Method | Auth Required | User Type | Password Hashing | Auto-Approved |
|----------|--------|---------------|-----------|------------------|---------------|
| `/auth/register` | POST | No | Any (self-select) | ✅ bcrypt | Players: Yes<br>Clients/Admins: No |
| `/client/register-player` | POST | Yes (CLIENT) | Player (fixed) | ⚠️ SHA256 (insecure!) | Yes |

---

## Version History

- **2.0** (2025-11-20): Complete architecture documentation with security audit
- **1.0** (2025-11-20): Initial incorrect documentation (assumed `/auth/register` was only endpoint)

---

**Critical Action Required:**
Fix SHA256 password hashing in `app/routers/client.py` before production use.
