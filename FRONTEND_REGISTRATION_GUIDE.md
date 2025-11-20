# Frontend Registration Guide
**Version:** 1.0
**Last Updated:** 2025-11-20
**API Endpoint:** `POST /auth/register`

This document provides comprehensive guidance for frontend developers implementing the user registration form for the Casino Royal SaaS Platform.

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Field Requirements](#field-requirements)
3. [Validation Rules](#validation-rules)
4. [User-Friendly Error Messages](#user-friendly-error-messages)
5. [API Request/Response Examples](#api-requestresponse-examples)
6. [Frontend Implementation Examples](#frontend-implementation-examples)
7. [Password Security Guidelines](#password-security-guidelines)

---

## Quick Reference

### Required Fields
| Field | Type | Required | Max Length | Notes |
|-------|------|----------|------------|-------|
| `email` | EmailStr | Yes | 255 | Must be valid email format |
| `username` | string | Yes | 255 | Alphanumeric + underscore only |
| `password` | string | Yes | **72** | Special characters recommended |
| `user_type` | enum | Yes | - | "player", "client", or "admin" |
| `full_name` | string | No | 255 | Optional but recommended |
| `company_name` | string | No | 255 | Only for `user_type: "client"` |

---

## Field Requirements

### 1. Email (`email`)

**Constraints:**
- Must be a valid email format (e.g., `user@example.com`)
- Must be unique (no duplicate emails)
- Case-insensitive uniqueness check
- Maximum length: 255 characters

**Frontend Validation:**
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!email) {
    return "Email is required";
  }
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address (e.g., user@example.com)";
  }
  if (email.length > 255) {
    return "Email must be less than 255 characters";
  }
  return null; // Valid
}
```

**User-Friendly Messages:**
- Empty: "Please enter your email address"
- Invalid format: "Please enter a valid email (e.g., user@example.com)"
- Already exists (API error): "This email is already registered. Try logging in instead?"
- Too long: "Email address is too long (max 255 characters)"

---

### 2. Username (`username`)

**Constraints:**
- Must be unique (no duplicate usernames)
- Alphanumeric characters and underscores only (`a-z`, `A-Z`, `0-9`, `_`)
- Minimum length: 3 characters (recommended)
- Maximum length: 255 characters
- Case-sensitive uniqueness check

**Recommended Pattern:**
- No spaces allowed
- No special characters except underscore
- Start with a letter (optional but recommended)

**Frontend Validation:**
```javascript
const usernameRegex = /^[a-zA-Z0-9_]{3,255}$/;

function validateUsername(username) {
  if (!username) {
    return "Username is required";
  }
  if (username.length < 3) {
    return "Username must be at least 3 characters long";
  }
  if (username.length > 255) {
    return "Username must be less than 255 characters";
  }
  if (!usernameRegex.test(username)) {
    return "Username can only contain letters, numbers, and underscores (no spaces or special characters)";
  }
  return null; // Valid
}
```

**User-Friendly Messages:**
- Empty: "Please choose a username"
- Too short: "Username must be at least 3 characters"
- Too long: "Username is too long (max 255 characters)"
- Invalid characters: "Username can only contain letters, numbers, and underscores (_). No spaces or special characters like @, !, #, etc."
- Already exists (API error): "This username is already taken. Please choose another one"

**Examples:**
- ✅ Good: `john_doe`, `player123`, `CasinoKing_77`
- ❌ Bad: `jo` (too short), `john doe` (space), `user@123` (special char), `player#1` (special char)

---

### 3. Password (`password`)

**Critical Constraint: Maximum 72 Characters**

Due to bcrypt's technical limitation, passwords are truncated to 72 characters. This is a security industry standard.

**Constraints:**
- Minimum length: 8 characters (recommended)
- **Maximum length: 72 characters** (bcrypt limit)
- Must contain at least:
  - 1 uppercase letter (A-Z)
  - 1 lowercase letter (a-z)
  - 1 number (0-9)
  - 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

**Frontend Validation:**
```javascript
function validatePassword(password) {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (password.length > 72) {
    return "Password must be 72 characters or less (security limitation)";
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

  if (!hasUpperCase) {
    return "Password must contain at least one uppercase letter (A-Z)";
  }
  if (!hasLowerCase) {
    return "Password must contain at least one lowercase letter (a-z)";
  }
  if (!hasNumber) {
    return "Password must contain at least one number (0-9)";
  }
  if (!hasSpecialChar) {
    return "Password must contain at least one special character (!@#$%^&* etc.)";
  }

  return null; // Valid
}
```

**User-Friendly Messages:**
- Empty: "Please create a password"
- Too short: "Password must be at least 8 characters for security"
- **Too long: "Password is too long (max 72 characters due to security system)"**
- Missing uppercase: "Add at least one uppercase letter (A-Z)"
- Missing lowercase: "Add at least one lowercase letter (a-z)"
- Missing number: "Add at least one number (0-9)"
- Missing special char: "Add at least one special character (!, @, #, $, etc.)"

**Password Strength Indicator (Recommended UI):**
```
Weak:     ████░░░░░░ (1-2 requirements met)
Fair:     ████████░░ (3 requirements met)
Good:     ████████████ (All requirements met, 8-12 chars)
Strong:   ████████████████ (All requirements met, 13+ chars)
```

**Examples:**
- ✅ Good: `MyP@ssw0rd`, `Secure123!`, `Casino$King2024`
- ❌ Bad: `password` (no uppercase, number, special char), `Pass123` (no special char), `P@ss` (too short)

**Important Warning to Display:**
> ⚠️ **Important:** Passwords are limited to 72 characters due to our security system (bcrypt). Longer passwords will be automatically truncated.

---

### 4. User Type (`user_type`)

**Constraints:**
- Must be one of: `"player"`, `"client"`, `"admin"`
- Required field
- Case-sensitive

**User Type Descriptions:**
| Type | Description | Approval Required |
|------|-------------|-------------------|
| `player` | Regular casino players | No (auto-approved) |
| `client` | Casino operators/businesses | Yes (admin approval) |
| `admin` | Platform administrators | Yes (admin approval) |

**Frontend Implementation:**
```javascript
const userTypes = [
  { value: 'player', label: 'Player', description: 'I want to play casino games' },
  { value: 'client', label: 'Casino Operator', description: 'I want to manage a casino' },
  { value: 'admin', label: 'Administrator', description: 'Platform administrator access' }
];
```

**User-Friendly Messages:**
- Empty: "Please select your account type"
- Invalid (API error): "Invalid account type selected. Please choose Player, Casino Operator, or Administrator"

**Important Notes:**
- **Players**: Auto-approved, can play immediately
- **Clients**: Require admin approval before accessing features
- **Admins**: Require admin approval and should typically not self-register (invite-only recommended)

---

### 5. Full Name (`full_name`)

**Constraints:**
- Optional (but recommended for better user experience)
- Maximum length: 255 characters
- Accepts any characters (including spaces, international characters)

**Frontend Validation:**
```javascript
function validateFullName(fullName) {
  if (fullName && fullName.length > 255) {
    return "Full name must be less than 255 characters";
  }
  return null; // Valid (or empty)
}
```

**User-Friendly Messages:**
- Too long: "Full name is too long (max 255 characters)"

**Examples:**
- ✅ Good: `John Doe`, `María García`, `李明`, `O'Brien`
- ❌ Bad: (Over 255 characters)

---

### 6. Company Name (`company_name`)

**Constraints:**
- Optional
- Only relevant for `user_type: "client"`
- Maximum length: 255 characters
- Should be hidden/disabled for `user_type: "player"` or `"admin"`

**Frontend Validation:**
```javascript
function validateCompanyName(companyName, userType) {
  if (userType === 'client' && !companyName) {
    return "Company name is required for casino operators";
  }
  if (companyName && companyName.length > 255) {
    return "Company name must be less than 255 characters";
  }
  return null; // Valid
}
```

**User-Friendly Messages:**
- Required for clients: "Please enter your company name"
- Too long: "Company name is too long (max 255 characters)"

---

## Validation Rules

### Client-Side Validation Checklist

Before submitting the registration form, validate:

1. ✅ Email is not empty and matches email format
2. ✅ Username is not empty, 3-255 chars, alphanumeric + underscore only
3. ✅ Password is not empty, 8-72 chars, meets complexity requirements
4. ✅ User type is selected (player/client/admin)
5. ✅ Full name (if provided) is ≤ 255 chars
6. ✅ Company name is provided if user_type is "client"
7. ✅ All fields ≤ max length to prevent API errors

**Validation Timing:**
- **On Blur**: Validate individual field when user leaves input
- **On Change**: Provide real-time feedback for password strength
- **On Submit**: Validate all fields before API call

---

## User-Friendly Error Messages

### Inline Field Errors (Real-Time Validation)

Display errors directly below each input field:

```html
<div class="form-field">
  <label>Password *</label>
  <input type="password" id="password" />
  <div class="error-message">
    Password must contain at least one special character (!@#$%^&* etc.)
  </div>
  <div class="helper-text">
    Must be 8-72 characters with uppercase, lowercase, number, and special character
  </div>
</div>
```

**CSS Styling Recommendation:**
- Error messages: Red text, small font
- Helper text: Gray text, small font (always visible)
- Valid fields: Green checkmark icon
- Invalid fields: Red exclamation icon

---

### API Error Messages (Backend Validation)

Map API error responses to user-friendly messages:

| API Response | User-Friendly Message |
|--------------|----------------------|
| `"Email already registered"` | "This email is already in use. <a href="/login">Log in instead?</a>" |
| `"Username already taken"` | "This username is taken. Please try another one (e.g., username_123)" |
| `"Field required"` | "This field is required. Please fill it in." |
| `"String should have at most 72 characters"` | "Password is too long (max 72 characters). Please shorten it." |
| `"value is not a valid email address"` | "Please enter a valid email address (e.g., user@example.com)" |
| 500 Internal Server Error | "Something went wrong on our end. Please try again in a moment." |

---

### Success Message

After successful registration:

```
✅ Registration Successful!

Welcome to Casino Royal, [Username]!

[For Players]
You can now start playing. Redirecting to your dashboard...

[For Clients]
Your account is pending admin approval. You'll receive an email once approved.

[For Admins]
Your account is pending approval. Please contact the system administrator.
```

---

## API Request/Response Examples

### Successful Registration (Player)

**Request:**
```json
POST /auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "username": "johndoe123",
  "full_name": "John Doe",
  "password": "MySecureP@ss123",
  "user_type": "player"
}
```

**Response: 200 OK**
```json
{
  "email": "john.doe@example.com",
  "username": "johndoe123",
  "full_name": "John Doe",
  "user_type": "player",
  "id": 42,
  "user_id": "ABCD1234",
  "is_active": true,
  "is_approved": true,
  "created_at": "2025-11-20T10:30:00Z",
  "company_name": null,
  "player_level": 1,
  "credits": 1000,
  "profile_picture": null,
  "is_online": false,
  "is_email_verified": false
}
```

---

### Successful Registration (Client)

**Request:**
```json
POST /auth/register
Content-Type: application/json

{
  "email": "contact@mycasino.com",
  "username": "mycasino_operator",
  "full_name": "Casino Manager",
  "password": "Secur3Casino!2024",
  "user_type": "client",
  "company_name": "My Casino Ltd."
}
```

**Response: 200 OK**
```json
{
  "email": "contact@mycasino.com",
  "username": "mycasino_operator",
  "full_name": "Casino Manager",
  "user_type": "client",
  "id": 43,
  "user_id": "EFGH5678",
  "is_active": true,
  "is_approved": false,  // ⚠️ Clients need admin approval
  "created_at": "2025-11-20T10:35:00Z",
  "company_name": "My Casino Ltd.",
  "player_level": null,
  "credits": null
}
```

---

### Error: Email Already Registered

**Request:**
```json
POST /auth/register
Content-Type: application/json

{
  "email": "existing@example.com",
  "username": "newuser123",
  "password": "MyP@ssw0rd123",
  "user_type": "player"
}
```

**Response: 400 Bad Request**
```json
{
  "detail": "Email already registered"
}
```

**Frontend Handling:**
```javascript
if (error.detail === "Email already registered") {
  showError("email", "This email is already in use. Try logging in instead?");
  suggestLogin(); // Optionally redirect to login page
}
```

---

### Error: Username Already Taken

**Response: 400 Bad Request**
```json
{
  "detail": "Username already taken"
}
```

**Frontend Handling:**
```javascript
if (error.detail === "Username already taken") {
  showError("username", "This username is taken. Try adding numbers or underscores (e.g., username_123)");
  suggestAlternatives(username); // e.g., username_1, username_2024
}
```

---

### Error: Validation Error (Missing Required Field)

**Response: 422 Unprocessable Entity**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "status": 422,
  "details": [
    {
      "field": "user_type",
      "message": "Field required",
      "type": "missing"
    }
  ]
}
```

**Frontend Handling:**
```javascript
if (error.status === 422) {
  error.details.forEach(detail => {
    showError(detail.field, `${detail.field} is required`);
  });
}
```

---

### Error: Password Too Long

**Response: 422 Unprocessable Entity**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "status": 422,
  "details": [
    {
      "field": "password",
      "message": "String should have at most 72 characters",
      "type": "string_too_long"
    }
  ]
}
```

**Frontend Handling:**
```javascript
if (detail.field === "password" && detail.type === "string_too_long") {
  showError("password", "Password is too long (max 72 characters). Please shorten it.");
}
```

---

## Frontend Implementation Examples

### React Example (with Formik)

```jsx
import { useFormik } from 'formik';
import * as Yup from 'yup';

const RegistrationSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .required('Email is required'),

  username: Yup.string()
    .min(3, 'Username must be at least 3 characters')
    .max(255, 'Username must be less than 255 characters')
    .matches(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores (_)'
    )
    .required('Username is required'),

  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or less')
    .matches(/[A-Z]/, 'Password must contain an uppercase letter')
    .matches(/[a-z]/, 'Password must contain a lowercase letter')
    .matches(/[0-9]/, 'Password must contain a number')
    .matches(
      /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
      'Password must contain a special character'
    )
    .required('Password is required'),

  user_type: Yup.string()
    .oneOf(['player', 'client', 'admin'], 'Invalid account type')
    .required('Please select your account type'),

  full_name: Yup.string()
    .max(255, 'Full name must be less than 255 characters'),

  company_name: Yup.string()
    .max(255, 'Company name must be less than 255 characters')
    .when('user_type', {
      is: 'client',
      then: schema => schema.required('Company name is required for casino operators')
    })
});

function RegistrationForm() {
  const formik = useFormik({
    initialValues: {
      email: '',
      username: '',
      password: '',
      user_type: 'player',
      full_name: '',
      company_name: ''
    },
    validationSchema: RegistrationSchema,
    onSubmit: async (values) => {
      try {
        const response = await fetch('https://test-1-g3yi.onrender.com/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values)
        });

        if (!response.ok) {
          const error = await response.json();

          if (error.detail === 'Email already registered') {
            formik.setFieldError('email', 'This email is already in use. Try logging in instead?');
          } else if (error.detail === 'Username already taken') {
            formik.setFieldError('username', 'This username is taken. Please try another one.');
          } else if (error.details) {
            // Handle validation errors
            error.details.forEach(detail => {
              formik.setFieldError(detail.field, detail.message);
            });
          }
          return;
        }

        const data = await response.json();

        // Success handling
        if (data.user_type === 'player' && data.is_approved) {
          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          // Show pending approval message
          alert('Account created! Pending admin approval.');
        }
      } catch (error) {
        alert('Registration failed. Please try again.');
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      {/* Email Field */}
      <div>
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          name="email"
          type="email"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.email}
        />
        {formik.touched.email && formik.errors.email && (
          <div className="error">{formik.errors.email}</div>
        )}
        <div className="helper-text">Use a valid email address</div>
      </div>

      {/* Username Field */}
      <div>
        <label htmlFor="username">Username *</label>
        <input
          id="username"
          name="username"
          type="text"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.username}
        />
        {formik.touched.username && formik.errors.username && (
          <div className="error">{formik.errors.username}</div>
        )}
        <div className="helper-text">
          3-255 characters, letters, numbers, and underscores only (no spaces)
        </div>
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password">Password *</label>
        <input
          id="password"
          name="password"
          type="password"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.password}
        />
        {formik.touched.password && formik.errors.password && (
          <div className="error">{formik.errors.password}</div>
        )}
        <div className="helper-text">
          8-72 characters with uppercase, lowercase, number, and special character
        </div>
        <PasswordStrength password={formik.values.password} />
      </div>

      {/* User Type Field */}
      <div>
        <label htmlFor="user_type">Account Type *</label>
        <select
          id="user_type"
          name="user_type"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.user_type}
        >
          <option value="player">Player - I want to play casino games</option>
          <option value="client">Casino Operator - I manage a casino</option>
          <option value="admin">Administrator - Platform access</option>
        </select>
        {formik.touched.user_type && formik.errors.user_type && (
          <div className="error">{formik.errors.user_type}</div>
        )}
      </div>

      {/* Full Name Field */}
      <div>
        <label htmlFor="full_name">Full Name (Optional)</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.full_name}
        />
        {formik.touched.full_name && formik.errors.full_name && (
          <div className="error">{formik.errors.full_name}</div>
        )}
      </div>

      {/* Company Name Field (Conditional) */}
      {formik.values.user_type === 'client' && (
        <div>
          <label htmlFor="company_name">Company Name *</label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.company_name}
          />
          {formik.touched.company_name && formik.errors.company_name && (
            <div className="error">{formik.errors.company_name}</div>
          )}
        </div>
      )}

      <button type="submit" disabled={formik.isSubmitting}>
        Create Account
      </button>
    </form>
  );
}

// Password Strength Component
function PasswordStrength({ password }) {
  const calculateStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) strength++;
    return strength;
  };

  const strength = calculateStrength(password);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', 'red', 'orange', 'yellow', 'lightgreen', 'green'];

  return (
    <div className="password-strength">
      <div className="strength-bar" style={{
        width: `${strength * 20}%`,
        backgroundColor: colors[strength]
      }}></div>
      <span>{labels[strength]}</span>
    </div>
  );
}
```

---

### Vue.js Example (with Vuelidate)

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <!-- Email -->
    <div class="form-field">
      <label for="email">Email *</label>
      <input
        id="email"
        v-model="form.email"
        @blur="v$.form.email.$touch"
        type="email"
      />
      <div v-if="v$.form.email.$error" class="error">
        {{ v$.form.email.$errors[0].$message }}
      </div>
      <div class="helper-text">Use a valid email address</div>
    </div>

    <!-- Username -->
    <div class="form-field">
      <label for="username">Username *</label>
      <input
        id="username"
        v-model="form.username"
        @blur="v$.form.username.$touch"
        type="text"
      />
      <div v-if="v$.form.username.$error" class="error">
        {{ v$.form.username.$errors[0].$message }}
      </div>
      <div class="helper-text">
        3-255 characters, letters, numbers, and underscores only (no spaces)
      </div>
    </div>

    <!-- Password -->
    <div class="form-field">
      <label for="password">Password *</label>
      <input
        id="password"
        v-model="form.password"
        @blur="v$.form.password.$touch"
        type="password"
      />
      <div v-if="v$.form.password.$error" class="error">
        {{ v$.form.password.$errors[0].$message }}
      </div>
      <div class="helper-text">
        8-72 characters with uppercase, lowercase, number, and special character
      </div>
    </div>

    <!-- User Type -->
    <div class="form-field">
      <label for="user_type">Account Type *</label>
      <select id="user_type" v-model="form.user_type">
        <option value="player">Player</option>
        <option value="client">Casino Operator</option>
        <option value="admin">Administrator</option>
      </select>
    </div>

    <!-- Full Name -->
    <div class="form-field">
      <label for="full_name">Full Name (Optional)</label>
      <input id="full_name" v-model="form.full_name" type="text" />
    </div>

    <!-- Company Name (if client) -->
    <div v-if="form.user_type === 'client'" class="form-field">
      <label for="company_name">Company Name *</label>
      <input id="company_name" v-model="form.company_name" type="text" />
      <div v-if="v$.form.company_name.$error" class="error">
        {{ v$.form.company_name.$errors[0].$message }}
      </div>
    </div>

    <button type="submit" :disabled="isSubmitting">Create Account</button>
  </form>
</template>

<script>
import { reactive, computed } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import { required, email, minLength, maxLength, helpers } from '@vuelidate/validators';

export default {
  setup() {
    const form = reactive({
      email: '',
      username: '',
      password: '',
      user_type: 'player',
      full_name: '',
      company_name: ''
    });

    const usernameValidator = helpers.regex(/^[a-zA-Z0-9_]+$/);
    const passwordUppercase = helpers.regex(/[A-Z]/);
    const passwordLowercase = helpers.regex(/[a-z]/);
    const passwordNumber = helpers.regex(/[0-9]/);
    const passwordSpecial = helpers.regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);

    const rules = computed(() => ({
      form: {
        email: {
          required: helpers.withMessage('Email is required', required),
          email: helpers.withMessage('Please enter a valid email', email),
          maxLength: helpers.withMessage('Email must be less than 255 characters', maxLength(255))
        },
        username: {
          required: helpers.withMessage('Username is required', required),
          minLength: helpers.withMessage('Username must be at least 3 characters', minLength(3)),
          maxLength: helpers.withMessage('Username must be less than 255 characters', maxLength(255)),
          usernameValidator: helpers.withMessage(
            'Username can only contain letters, numbers, and underscores',
            usernameValidator
          )
        },
        password: {
          required: helpers.withMessage('Password is required', required),
          minLength: helpers.withMessage('Password must be at least 8 characters', minLength(8)),
          maxLength: helpers.withMessage('Password must be 72 characters or less', maxLength(72)),
          passwordUppercase: helpers.withMessage('Password must contain an uppercase letter', passwordUppercase),
          passwordLowercase: helpers.withMessage('Password must contain a lowercase letter', passwordLowercase),
          passwordNumber: helpers.withMessage('Password must contain a number', passwordNumber),
          passwordSpecial: helpers.withMessage('Password must contain a special character', passwordSpecial)
        },
        company_name: {
          requiredIf: helpers.withMessage(
            'Company name is required for casino operators',
            (value) => form.user_type !== 'client' || value
          ),
          maxLength: helpers.withMessage('Company name must be less than 255 characters', maxLength(255))
        }
      }
    }));

    const v$ = useVuelidate(rules, { form });
    const isSubmitting = reactive(false);

    const handleSubmit = async () => {
      const isValid = await v$.value.$validate();
      if (!isValid) return;

      isSubmitting.value = true;

      try {
        const response = await fetch('https://test-1-g3yi.onrender.com/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });

        if (!response.ok) {
          const error = await response.json();
          handleApiError(error);
          return;
        }

        const data = await response.json();
        // Handle success
        alert('Registration successful!');
      } catch (error) {
        alert('Registration failed. Please try again.');
      } finally {
        isSubmitting.value = false;
      }
    };

    const handleApiError = (error) => {
      if (error.detail === 'Email already registered') {
        alert('This email is already in use. Try logging in instead?');
      } else if (error.detail === 'Username already taken') {
        alert('This username is taken. Please try another one.');
      }
    };

    return { form, v$, isSubmitting, handleSubmit };
  }
};
</script>
```

---

## Password Security Guidelines

### Why 72 Characters Maximum?

**Technical Explanation:**
The password maximum length of 72 characters is a limitation of the bcrypt hashing algorithm, which is an industry-standard security mechanism for password storage.

**User-Facing Explanation:**
> Our security system uses bcrypt, a highly secure password encryption method. Bcrypt has a technical limit of 72 characters. This is industry-standard and doesn't reduce security—most secure passwords are 12-20 characters long.

**Best Practices:**
- Recommend passwords between 12-20 characters
- Encourage password managers (they handle length limits)
- Emphasize complexity over length: `P@ssw0rd!` is stronger than `passwordpasswordpassword`

### Password Recommendations to Display

```
✅ Use a mix of uppercase, lowercase, numbers, and symbols
✅ Avoid common words or patterns (e.g., "password123")
✅ Use a password manager to generate strong passwords
✅ Don't reuse passwords from other websites
❌ Don't use personal information (birthdays, names)
❌ Don't share your password with anyone
```

---

## Testing Checklist

### Frontend Validation Testing

Test these scenarios before deployment:

**Email Field:**
- [ ] Empty email shows error
- [ ] Invalid format (e.g., `user@com`) shows error
- [ ] Valid email (e.g., `user@example.com`) passes
- [ ] Duplicate email shows API error message
- [ ] Email > 255 chars shows error

**Username Field:**
- [ ] Empty username shows error
- [ ] Username < 3 chars shows error
- [ ] Username with spaces shows error
- [ ] Username with special chars (@, !, #) shows error
- [ ] Valid username (letters, numbers, underscore) passes
- [ ] Duplicate username shows API error message
- [ ] Username > 255 chars shows error

**Password Field:**
- [ ] Empty password shows error
- [ ] Password < 8 chars shows error
- [ ] Password > 72 chars shows error with clear message
- [ ] Password without uppercase shows error
- [ ] Password without lowercase shows error
- [ ] Password without number shows error
- [ ] Password without special char shows error
- [ ] Valid password passes all checks
- [ ] Password strength indicator updates in real-time

**User Type Field:**
- [ ] Default selection is "player"
- [ ] Can change to "client" or "admin"
- [ ] Changing to "client" shows company name field
- [ ] Changing from "client" hides company name field

**Company Name Field:**
- [ ] Hidden when user_type is "player" or "admin"
- [ ] Shown and required when user_type is "client"
- [ ] Empty company name for client shows error
- [ ] Company name > 255 chars shows error

**Form Submission:**
- [ ] All validation errors prevent submission
- [ ] Valid form submits successfully
- [ ] API errors are displayed clearly
- [ ] Success message shows after registration
- [ ] Player users are redirected to dashboard
- [ ] Client users see "pending approval" message

---

## API Endpoint Reference

**Endpoint:** `POST /auth/register`
**Base URL:** `https://test-1-g3yi.onrender.com`
**Full URL:** `https://test-1-g3yi.onrender.com/auth/register`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body Schema:**
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

**Success Response: 200 OK**
```json
{
  "email": "string",
  "username": "string",
  "full_name": "string | null",
  "user_type": "player | client | admin",
  "id": number,
  "user_id": "string",
  "is_active": boolean,
  "is_approved": boolean,
  "created_at": "ISO 8601 datetime",
  "company_name": "string | null",
  "player_level": number | null,
  "credits": number | null,
  "profile_picture": "string | null",
  "is_online": boolean,
  "last_seen": "ISO 8601 datetime",
  "last_activity": "ISO 8601 datetime",
  "secondary_email": "string | null",
  "is_email_verified": boolean
}
```

**Error Responses:**
- `400 Bad Request`: Email or username already exists
- `422 Unprocessable Entity`: Validation errors (missing fields, invalid formats)
- `500 Internal Server Error`: Server-side issues

---

## Additional Resources

- **API Documentation:** https://test-1-g3yi.onrender.com/docs
- **Bcrypt Password Hashing:** https://en.wikipedia.org/wiki/Bcrypt
- **OWASP Password Guidelines:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

**Questions or Issues?**
Contact the backend team or refer to the API documentation for more details.

---

**Version History:**
- **1.0** (2025-11-20): Initial guide created with comprehensive validation rules and frontend examples
