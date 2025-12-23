# Testing Roadmap - Comprehensive Analysis

**Generated:** 2025-11-20
**Total Routers Analyzed:** 16
**Total Endpoints Identified:** 115+
**Estimated Total Testing Hours:** 280-350 hours

---

## Executive Summary

This document provides a comprehensive testing roadmap for all API endpoints in the casino platform. Each router has been analyzed for:
- Endpoint count and HTTP methods
- Critical business logic
- Security-sensitive operations
- Database operations
- Complex validation rules
- Priority levels and estimated test counts

---

## 1. Authentication Router (`auth.py`)
**File:** `D:\work\casino\app\routers\auth.py`
**Priority:** P0 - CRITICAL (Security Foundation)
**Total Endpoints:** 3

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/auth/register` | POST | None | P0 |
| `/auth/login` | POST | None | P0 |
| `/auth/me` | GET | Required | P0 |

### Critical Business Logic
1. **User Registration:**
   - Unique user_id generation (8 characters, alphanumeric)
   - Email uniqueness validation
   - Username uniqueness validation
   - Password hashing with bcrypt
   - Auto-approval logic (Clients need approval, others auto-approved)
   - Company name handling for CLIENT user type

2. **User Login:**
   - Username/password authentication
   - Account approval check (403 for pending clients)
   - Lazy migration from SHA256 to bcrypt passwords
   - JWT token generation with user metadata
   - Token expiration handling

3. **Current User Retrieval:**
   - JWT token validation
   - Active user verification

### Security-Sensitive Operations
- **Password Hashing:** bcrypt with salt (replacing SHA256)
- **Rate Limiting:** Applied to both register and login
- **JWT Token Generation:** Includes user_id, username, user_type
- **Account Status Validation:** is_approved and is_active checks
- **Password Length:** 72-byte bcrypt limit handling

### Database Operations
- User creation with transaction
- User lookup by email/username
- User update (password migration)
- Commit/rollback handling

### Test Scenarios

#### `/auth/register` (25 tests, 8 hours)
1. **Success Cases (5 tests):**
   - Register PLAYER successfully
   - Register CLIENT successfully (pending approval)
   - Register ADMIN successfully
   - Auto-generate unique user_id
   - Handle company_name for CLIENT

2. **Validation Errors (10 tests):**
   - Duplicate email
   - Duplicate username
   - Invalid email format
   - Password too short
   - Password too long (>72 bytes)
   - Missing required fields
   - Invalid user_type
   - SQL injection in fields
   - XSS in fields
   - Empty strings

3. **Edge Cases (5 tests):**
   - user_id collision (retry logic)
   - Very long valid passwords (72 bytes)
   - Unicode characters in names
   - Whitespace handling
   - Case sensitivity for email/username

4. **Rate Limiting (3 tests):**
   - Multiple rapid registrations
   - Rate limit recovery
   - Different IP addresses

5. **Database Errors (2 tests):**
   - Database connection failure
   - Transaction rollback

#### `/auth/login` (20 tests, 6 hours)
1. **Success Cases (4 tests):**
   - Valid PLAYER login
   - Valid CLIENT login
   - Valid ADMIN login
   - Password migration (SHA256 to bcrypt)

2. **Authentication Failures (8 tests):**
   - Wrong password
   - Non-existent username
   - Case sensitivity
   - Empty password
   - Empty username
   - SQL injection attempts
   - Timing attack resistance
   - Brute force patterns

3. **Account Status (4 tests):**
   - Unapproved CLIENT (403)
   - Inactive user
   - Deleted user
   - Suspended account

4. **Token Validation (2 tests):**
   - Token includes correct claims
   - Token expiration time correct

5. **Rate Limiting (2 tests):**
   - Multiple failed login attempts
   - Account lockout behavior

#### `/auth/me` (10 tests, 3 hours)
1. **Success Cases (2 tests):**
   - Valid token returns user
   - Correct user data returned

2. **Authentication Failures (5 tests):**
   - No token provided
   - Invalid token
   - Expired token
   - Malformed token
   - Revoked token

3. **Edge Cases (3 tests):**
   - Inactive user with valid token
   - User deleted after token issued
   - Token with tampered claims

**Total Tests: 55**
**Estimated Hours: 17**

---

## 2. Users Router (`users.py`)
**File:** `D:\work\casino\app\routers\users.py`
**Priority:** P1 - HIGH (Core Functionality)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/users/search` | GET | Required | P1 |
| `/users/all` | GET | Required | P1 |
| `/users/online-status` | GET | Required | P1 |
| `/users/{user_id}` | GET | Required | P1 |
| `/users/{user_id}/online` | GET | Required | P1 |

### Critical Business Logic
1. Search with query filters (username/user_id)
2. Filter by user_type
3. Exclude current user from results
4. Online status via WebSocket manager
5. Friend-based filtering

### Security-Sensitive Operations
- Authentication required for all endpoints
- User isolation (exclude self from search)
- Privacy controls (online status)

### Database Operations
- ILIKE search queries
- User type filtering
- Friend relationship queries
- Online status queries

### Test Scenarios

#### `/users/search` (15 tests, 4 hours)
1. Search by username (partial match)
2. Search by user_id (exact match)
3. Filter by user_type
4. Combined search and filter
5. Case-insensitive search
6. Empty query (all users)
7. No results found
8. SQL injection in query
9. Special characters in search
10. Pagination (limit 20)
11. Performance with large dataset
12. Unicode search terms
13. Self-exclusion verification
14. XSS in query parameter
15. Null/undefined query

#### `/users/all` (8 tests, 2 hours)
1. Returns all users
2. Excludes current user
3. Correct schema transformation
4. Performance with 1000+ users
5. Empty database
6. Authorization check
7. Pagination needed
8. Response format validation

#### `/users/online-status` (10 tests, 3 hours)
1. Returns online friends only
2. Correct friend filtering
3. WebSocket integration
4. Total online count
5. No friends online
6. Empty friends list
7. Friend offline status
8. Concurrent status changes
9. Cache invalidation
10. Real-time updates

#### `/users/{user_id}` (12 tests, 3 hours)
1. Valid user_id lookup
2. Non-existent user (404)
3. Invalid user_id format
4. SQL injection in user_id
5. Privacy controls
6. User data completeness
7. Deleted user handling
8. Authorization check
9. Self-lookup
10. Cross-user type lookup
11. Response schema validation
12. Database performance

#### `/users/{user_id}/online` (8 tests, 2 hours)
1. User online (true)
2. User offline (false)
3. Non-existent user
4. WebSocket manager integration
5. Real-time status change
6. Cache consistency
7. Multiple simultaneous checks
8. Performance testing

**Total Tests: 53**
**Estimated Hours: 14**

---

## 3. Admin Router (`admin.py`)
**File:** `D:\work\casino\app\routers\admin.py`
**Priority:** P0 - CRITICAL (Admin Controls)
**Total Endpoints:** 14

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/admin/dashboard-stats` | GET | Admin | P0 |
| `/admin/users` | GET | Admin | P0 |
| `/admin/users/{user_id}/approve` | PATCH | Admin | P0 |
| `/admin/users/{user_id}/reject` | PATCH | Admin | P0 |
| `/admin/pending-approvals` | GET | Admin | P0 |
| `/admin/users/{user_id}/toggle-status` | PATCH | Admin | P0 |
| `/admin/users/{user_id}` | DELETE | Admin | P0 |
| `/admin/messages` | GET | Admin | P1 |
| `/admin/promotions` | GET | Admin | P1 |
| `/admin/promotions/{promotion_id}/cancel` | PATCH | Admin | P1 |
| `/admin/reports` | GET | Admin | P1 |
| `/admin/reports/{report_id}/status` | PATCH | Admin | P1 |
| `/admin/reviews` | GET | Admin | P1 |
| `/admin/reviews/{review_id}` | DELETE | Admin | P1 |
| `/admin/broadcast-message` | POST | Admin | P1 |

### Critical Business Logic
1. **Dashboard Statistics:**
   - User counts by type and status
   - Recent registrations (7 days)
   - Pending approvals
   - Message/promotion/review counts
   - Average ratings calculation

2. **User Management:**
   - Approve/reject users
   - Toggle active status
   - Delete users
   - Prevent self-modification
   - Admin protection (can't delete other admins)

3. **Content Moderation:**
   - View all messages/promotions/reviews
   - Update report status
   - Delete inappropriate reviews
   - Cancel promotions

4. **Broadcasting:**
   - Send to all users
   - Filter by user_type
   - Exclude self

### Security-Sensitive Operations
- **Authorization:** Admin-only access on all endpoints
- **Self-Protection:** Cannot deactivate/delete own account
- **Admin Protection:** Cannot delete other admin accounts
- **Client Protection:** Cannot reject admin accounts
- **Audit Trail:** Track reviewed_by and reviewed_at

### Database Operations
- Complex aggregation queries
- Multi-table joins
- Soft deletes (deactivation)
- Hard deletes (user removal)
- Bulk operations (broadcast)
- Transaction management

### Test Scenarios

#### `/admin/dashboard-stats` (15 tests, 5 hours)
1. All statistics calculated correctly
2. Date filtering (7 days)
3. User type breakdown accurate
4. Zero users handling
5. Average rating calculation
6. Pending approvals count
7. Message statistics
8. Promotion statistics
9. Review statistics
10. Report statistics
11. Performance with large dataset
12. Non-admin access (403)
13. Database connection failure
14. Null value handling
15. Timezone consistency

#### `/admin/users` (20 tests, 6 hours)
1. List all users
2. Filter by user_type
3. Search functionality
4. Filter by is_active
5. Filter by is_approved
6. Pagination (skip/limit)
7. Combined filters
8. Empty result set
9. Total count accuracy
10. SQL injection in search
11. Performance with 10K+ users
12. Sort order verification
13. Response schema validation
14. Non-admin access (403)
15. Invalid filter values
16. Null filter handling
17. XSS in search term
18. Unicode search
19. Case sensitivity
20. Database optimization

#### `/admin/users/{user_id}/approve` (12 tests, 4 hours)
1. Approve pending CLIENT
2. Already approved (400)
3. Non-existent user (404)
4. Approve PLAYER
5. Approve ADMIN
6. State transition verification
7. Non-admin access (403)
8. Database rollback
9. Concurrent approval
10. Notification triggering
11. Audit log creation
12. Invalid user_id

#### `/admin/users/{user_id}/reject` (15 tests, 5 hours)
1. Reject approved CLIENT
2. Already rejected (400)
3. Cannot reject ADMIN (400)
4. Non-existent user (404)
5. State transition verification
6. Non-admin access (403)
7. Self-rejection attempt
8. Database rollback
9. Concurrent rejection
10. Notification triggering
11. Access revocation
12. Session invalidation
13. Audit log creation
14. Invalid user_id
15. Edge case handling

#### `/admin/pending-approvals` (8 tests, 2 hours)
1. List all pending CLIENTS
2. Empty list
3. Correct ordering (newest first)
4. Exclude approved users
5. Exclude other user types
6. Non-admin access (403)
7. Performance testing
8. Pagination needed

#### `/admin/users/{user_id}/toggle-status` (15 tests, 5 hours)
1. Activate inactive user
2. Deactivate active user
3. Cannot deactivate self (400)
4. Non-existent user (404)
5. State toggle verification
6. Non-admin access (403)
7. Session invalidation on deactivation
8. Concurrent toggle
9. Database rollback
10. Audit log creation
11. Notification triggering
12. Active sessions handling
13. Admin toggle protection
14. Invalid user_id
15. Edge cases

#### `/admin/users/{user_id}` DELETE (18 tests, 6 hours)
1. Delete regular user
2. Cannot delete self (400)
3. Cannot delete other admins (400)
4. Non-existent user (404)
5. Cascade deletion verification
6. Related data cleanup
7. Non-admin access (403)
8. Database rollback
9. Concurrent deletion
10. Soft vs hard delete
11. Audit log creation
12. Referential integrity
13. Foreign key constraints
14. Orphan record prevention
15. Invalid user_id
16. Already deleted user
17. Active sessions handling
18. Performance testing

#### `/admin/messages` (10 tests, 3 hours)
1. List all messages
2. Pagination (skip/limit)
3. Ordering (newest first)
4. Empty result set
5. Total count accuracy
6. Non-admin access (403)
7. Performance with 100K+ messages
8. Response schema validation
9. Privacy considerations
10. Database optimization

#### `/admin/promotions` (12 tests, 4 hours)
1. List all promotions
2. Filter by status
3. Pagination
4. Claim statistics calculation
5. Empty result set
6. Non-admin access (403)
7. Performance testing
8. Total count accuracy
9. Response schema validation
10. Ordering verification
11. Related data loading
12. Database optimization

#### `/admin/promotions/{promotion_id}/cancel` (10 tests, 3 hours)
1. Cancel active promotion
2. Cannot cancel non-active (400)
3. Non-existent promotion (404)
4. State transition verification
5. Non-admin access (403)
6. Active claims handling
7. Notification triggering
8. Database rollback
9. Audit log creation
10. Invalid promotion_id

#### `/admin/reports` (12 tests, 4 hours)
1. List all reports
2. Filter by status
3. Pagination
4. Ordering verification
5. Empty result set
6. Non-admin access (403)
7. Performance testing
8. Total count accuracy
9. Response schema validation
10. Reporter/reported info
11. Related data loading
12. Database optimization

#### `/admin/reports/{report_id}/status` (15 tests, 5 hours)
1. Update to each status
2. Add admin notes
3. Record reviewer information
4. Non-existent report (404)
5. Non-admin access (403)
6. Timestamp verification
7. Database rollback
8. Concurrent updates
9. Audit log creation
10. Notification triggering
11. Invalid status value
12. Invalid report_id
13. Null admin_notes handling
14. State transition validation
15. Edge cases

#### `/admin/reviews` (10 tests, 3 hours)
1. List all reviews
2. Pagination
3. Ordering verification
4. Empty result set
5. Non-admin access (403)
6. Performance testing
7. Total count accuracy
8. Response schema validation
9. Related data loading
10. Database optimization

#### `/admin/reviews/{review_id}` DELETE (12 tests, 4 hours)
1. Delete inappropriate review
2. Non-existent review (404)
3. Non-admin access (403)
4. Database rollback
5. Concurrent deletion
6. Audit log creation
7. Notification triggering
8. Rating recalculation
9. Invalid review_id
10. Already deleted review
11. Referential integrity
12. Performance testing

#### `/admin/broadcast-message` (15 tests, 5 hours)
1. Broadcast to all users
2. Filter by user_type
3. Exclude self from recipients
4. Empty recipient list
5. Non-admin access (403)
6. Database transaction
7. Bulk insert performance
8. Message format validation
9. Notification triggering
10. Delivery confirmation
11. Failed deliveries handling
12. Invalid user_type
13. SQL injection prevention
14. XSS prevention
15. Rate limiting

**Total Tests: 189**
**Estimated Hours: 64**

---

## 4. Client Router (`client.py`)
**File:** `D:\work\casino\app\routers\client.py`
**Priority:** P0 - CRITICAL (Core Business)
**Total Endpoints:** 4

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/client/register-player` | POST | Client | P0 |
| `/client/my-players` | GET | Client | P0 |
| `/client/player-stats` | GET | Client | P1 |
| `/client/bulk-register-players` | POST | Client | P1 |

### Critical Business Logic
1. **Player Registration:**
   - Client-initiated player creation
   - Temporary password generation
   - SHA256 password hashing (LEGACY - security issue!)
   - Auto-friend relationship creation
   - Starting credits (1000)
   - Player level initialization (1)
   - Track created_by_client_id

2. **Player Management:**
   - View players created by client
   - View players with game credentials from client
   - Union of direct and credential players

3. **Bulk Operations:**
   - Import player databases
   - Error handling per player
   - Transaction management

### Security-Sensitive Operations
- **CRITICAL SECURITY ISSUE:** Uses SHA256 for passwords (should be bcrypt!)
- Client authorization required
- Auto-approval for players
- Temporary password exposure
- Friend relationship auto-creation

### Database Operations
- Player creation with transactions
- Duplicate checking (email, username)
- user_id collision handling
- Friend relationship creation
- Bulk inserts
- Union queries (direct + credential players)

### Test Scenarios

#### `/client/register-player` (25 tests, 8 hours)
1. **Success Cases (5 tests):**
   - Register with provided password
   - Register with auto-generated password
   - Auto-friend creation verified
   - Starting credits correct (1000)
   - Player level initialized (1)

2. **Validation Errors (10 tests):**
   - Duplicate email
   - Duplicate username
   - Invalid email format
   - Missing required fields
   - SQL injection in fields
   - XSS in fields
   - Empty strings
   - Non-client access (403)
   - Very long passwords
   - Special characters handling

3. **Security Issues (5 tests):**
   - **SHA256 password hashing (document vulnerability)**
   - Temporary password exposure in response
   - Password strength validation
   - Secure password generation
   - Password transmission security

4. **Business Logic (3 tests):**
   - user_id collision handling
   - created_by_client_id tracking
   - Auto-approval verification

5. **Database (2 tests):**
   - Transaction rollback
   - Friend relationship creation

#### `/client/my-players` (15 tests, 5 hours)
1. **Success Cases (5 tests):**
   - List directly created players
   - List credential players
   - Union of both lists
   - Pagination works correctly
   - Empty list handling

2. **Authorization (3 tests):**
   - Client-only access
   - Non-client access (403)
   - Different client isolation

3. **Database (4 tests):**
   - Join query correctness
   - Union query performance
   - Duplicate prevention
   - Large dataset handling

4. **Edge Cases (3 tests):**
   - No players created
   - Only credential players
   - Only direct players

#### `/client/player-stats` (12 tests, 4 hours)
1. **Statistics Accuracy (6 tests):**
   - Total players count
   - Direct players count
   - Credential players count
   - No double counting
   - Online players count
   - New today count

2. **Authorization (2 tests):**
   - Client-only access
   - Non-client access (403)

3. **Database (2 tests):**
   - Complex query performance
   - Distinct player handling

4. **Edge Cases (2 tests):**
   - No players
   - Timezone handling for "today"

#### `/client/bulk-register-players` (20 tests, 7 hours)
1. **Success Cases (4 tests):**
   - Bulk register multiple players
   - Partial success handling
   - Success/failure counts
   - Response format verification

2. **Validation (8 tests):**
   - Duplicate emails across batch
   - Duplicate usernames across batch
   - Mixed valid/invalid data
   - Empty batch
   - Large batch (100+ players)
   - Invalid data in batch
   - SQL injection prevention
   - XSS prevention

3. **Security (3 tests):**
   - SHA256 password hashing
   - Temporary password generation
   - Bulk password exposure

4. **Database (3 tests):**
   - Transaction handling
   - Partial commit behavior
   - Performance with large batches

5. **Error Handling (2 tests):**
   - Failed player collection
   - Database errors mid-batch

**Total Tests: 72**
**Estimated Hours: 24**

---

## 5. Games Router (`games.py`)
**File:** `D:\work\casino\app\routers\games.py`
**Priority:** P1 - HIGH (Core Feature)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/games/populate` | GET | None | P2 |
| `/games/` | GET | None | P1 |
| `/games/my-games` | GET | Client | P1 |
| `/games/update-games` | POST | Client | P1 |
| `/games/client/{client_id}/games` | GET | None | P1 |

### Critical Business Logic
1. **Game Population:**
   - One-time initialization
   - 31 predefined games
   - Duplicate prevention
   - Default active status

2. **Client Game Selection:**
   - Select available games
   - Activate/deactivate games
   - Soft delete pattern

3. **Public Game Listing:**
   - Active games only
   - Client-specific games

### Security-Sensitive Operations
- Client authorization for game management
- Validation of game IDs
- Prevent unauthorized game assignment

### Database Operations
- Bulk game insertion
- Game selection joins
- Update operations
- Soft deletes (is_active flag)

### Test Scenarios

#### `/games/populate` (10 tests, 3 hours)
1. Initial population success
2. Already populated (skip)
3. Verify all 31 games
4. Duplicate prevention
5. Error handling per game
6. Database rollback
7. Icon URL validation
8. Category validation
9. Idempotency verification
10. Performance testing

#### `/games/` (8 tests, 2 hours)
1. List all active games
2. Exclude inactive games
3. Empty database
4. Response schema validation
5. Ordering verification
6. Performance testing
7. Cache behavior
8. Public access (no auth)

#### `/games/my-games` (12 tests, 4 hours)
1. List client's games
2. Only active games shown
3. Client-only access (403)
4. Empty game list
5. Join query correctness
6. Response schema validation
7. Inactive games excluded
8. Non-client access handling
9. Database performance
10. Multiple active games
11. All games inactive
12. Edge cases

#### `/games/update-games` (18 tests, 6 hours)
1. **Success Cases (4 tests):**
   - Add games to selection
   - Remove games from selection
   - Update game selection
   - Empty selection (deactivate all)

2. **Validation (7 tests):**
   - Invalid game IDs
   - Non-existent games
   - Inactive games
   - Empty game_ids array
   - Duplicate game_ids
   - SQL injection prevention
   - Large selection (100+ games)

3. **Authorization (2 tests):**
   - Client-only access
   - Non-client access (403)

4. **Database (3 tests):**
   - Soft delete verification
   - Transaction handling
   - Concurrent updates

5. **Edge Cases (2 tests):**
   - Reactivate previously selected
   - Toggle behavior verification

#### `/games/client/{client_id}/games` (10 tests, 3 hours)
1. List client's games
2. Non-existent client (404)
3. Client with no games
4. Only active games
5. Join query correctness
6. Response schema validation
7. Public access (no auth)
8. Performance testing
9. Invalid client_id
10. Non-CLIENT user type

**Total Tests: 58**
**Estimated Hours: 18**

---

## 6. Email Verification Router (`email_verification.py`)
**File:** `D:\work\casino\app\routers\email_verification.py`
**Priority:** P1 - HIGH (Security/Compliance)
**Total Endpoints:** 6

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/email/send-verification` | POST | Player | P1 |
| `/email/verify` | GET | None | P1 |
| `/email/status` | GET | Player | P1 |
| `/email/remove` | DELETE | Player | P1 |
| `/email/resend-verification` | POST | Player | P1 |

### Critical Business Logic
1. **Email Verification Flow:**
   - Generate secure token (32 bytes)
   - Store secondary email
   - Send verification email (mock implementation)
   - 24-hour token expiration
   - Mark as verified on success

2. **Rate Limiting:**
   - 5-minute cooldown for resend
   - Prevent abuse

3. **Email Uniqueness:**
   - Check primary email conflicts
   - Check secondary email conflicts
   - Cross-user validation

### Security-Sensitive Operations
- Token generation (secure random)
- Token expiration validation
- Email uniqueness validation
- Rate limiting on resend
- Player-only access

### Database Operations
- Token storage and retrieval
- Email conflict checking
- Timestamp tracking
- Status updates

### Test Scenarios

#### `/email/send-verification` (20 tests, 6 hours)
1. **Success Cases (3 tests):**
   - Send verification to new email
   - Token generated correctly
   - Email mock sent

2. **Validation Errors (8 tests):**
   - Email already used by another user
   - Email already used as secondary
   - Invalid email format
   - Empty email
   - Player-only access (403)
   - Non-player access
   - Email same as primary
   - Very long email

3. **Security (4 tests):**
   - Token uniqueness
   - Token length (32 bytes)
   - Secure random generation
   - Token complexity

4. **Database (3 tests):**
   - Transaction rollback on email failure
   - Concurrent verification requests
   - Database error handling

5. **Edge Cases (2 tests):**
   - Overwrite existing unverified
   - Unicode email addresses

#### `/email/verify` (15 tests, 5 hours)
1. **Success Cases (2 tests):**
   - Valid token verification
   - Status update correct

2. **Validation Errors (8 tests):**
   - Invalid token (400)
   - Expired token (24h+)
   - Already verified
   - Non-existent token
   - Empty token
   - Malformed token
   - SQL injection in token
   - XSS in token

3. **Edge Cases (5 tests):**
   - Token expiration boundary (23h59m)
   - Timezone handling
   - Concurrent verification
   - Token reuse prevention
   - Database error handling

#### `/email/status` (8 tests, 2 hours)
1. Get verification status
2. No secondary email
3. Verified status
4. Pending verification
5. Player-only access (403)
6. Response schema validation
7. Null value handling
8. Edge cases

#### `/email/remove` (10 tests, 3 hours)
1. Remove secondary email
2. Remove verification token
3. Clear verification status
4. No secondary email (edge case)
5. Player-only access (403)
6. Database transaction
7. Concurrent removal
8. Already removed
9. Error handling
10. State verification

#### `/email/resend-verification` (18 tests, 6 hours)
1. **Success Cases (3 tests):**
   - Resend after 5 minutes
   - New token generated
   - Timestamp updated

2. **Validation Errors (8 tests):**
   - No secondary email (400)
   - Already verified (400)
   - Too soon (429 - rate limit)
   - Player-only access (403)
   - Non-player access
   - Empty secondary email
   - Null verification data
   - Invalid state

3. **Rate Limiting (4 tests):**
   - 5-minute cooldown
   - Cooldown countdown message
   - Multiple rapid requests
   - Rate limit recovery

4. **Edge Cases (3 tests):**
   - Timezone handling
   - Concurrent resend attempts
   - Email send failure handling

**Total Tests: 71**
**Estimated Hours: 22**

---

## 7. Friends Router (`friends.py`)
**File:** `D:\work\casino\app\routers\friends.py`
**Priority:** P1 - HIGH (Social Feature)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/friends/request` | POST | Required | P1 |
| `/friends/requests/sent` | GET | Required | P1 |
| `/friends/requests/received` | GET | Required | P1 |
| `/friends/requests/{request_id}` | PUT | Required | P1 |
| `/friends/list` | GET | Required | P1 |
| `/friends/{friend_id}` | DELETE | Required | P1 |

### Critical Business Logic
1. **Friend Request System:**
   - Send request by user_id
   - Bidirectional duplicate prevention
   - Already friends check
   - Pending request check

2. **Request Management:**
   - Accept/reject requests
   - Auto-friend on accept (bidirectional)
   - Only receiver can update
   - One-time processing

3. **Friend Relationship:**
   - Many-to-many relationship
   - Bidirectional removal
   - Friend list retrieval

### Security-Sensitive Operations
- Authentication required
- Self-request prevention
- Duplicate request prevention
- Authorization (only receiver can update)
- Friend verification

### Database Operations
- Many-to-many association table
- Bidirectional relationship queries
- Friend request state management
- Transaction handling for accepts

### Test Scenarios

#### `/friends/request` (20 tests, 6 hours)
1. **Success Cases (3 tests):**
   - Send friend request
   - Request stored with PENDING status
   - Receiver notified

2. **Validation Errors (10 tests):**
   - User not found (404)
   - Send to self (400)
   - Already friends (400)
   - Pending request exists (400)
   - Reverse pending request (400)
   - Invalid user_id format
   - Empty user_id
   - SQL injection prevention
   - Non-existent receiver
   - Receiver not active

3. **Edge Cases (5 tests):**
   - Request to multiple users
   - Concurrent requests
   - Database rollback
   - Notification delivery
   - State verification

4. **Performance (2 tests):**
   - Large friend list
   - Many pending requests

#### `/friends/requests/sent` (8 tests, 2 hours)
1. List all sent requests
2. Include all statuses
3. Empty list
4. Response schema validation
5. Ordering verification
6. Pagination needed
7. Performance testing
8. Filter by status

#### `/friends/requests/received` (10 tests, 3 hours)
1. List pending received requests
2. Exclude accepted/rejected
3. Empty list
4. Response schema validation
5. Ordering verification
6. Pagination needed
7. Performance testing
8. Notification integration
9. Real-time updates
10. Filter verification

#### `/friends/requests/{request_id}` UPDATE (18 tests, 6 hours)
1. **Success Cases (4 tests):**
   - Accept request
   - Reject request
   - Bidirectional friend creation on accept
   - State transition verification

2. **Validation Errors (8 tests):**
   - Request not found (404)
   - Not the receiver (403)
   - Already processed (400)
   - Invalid request_id
   - Invalid status value
   - SQL injection prevention
   - Non-existent request
   - Concurrent processing

3. **Business Logic (4 tests):**
   - Friend relationship created
   - Both directions added
   - Request state updated
   - Notification sent

4. **Edge Cases (2 tests):**
   - Database rollback on error
   - Duplicate accept prevention

#### `/friends/list` (10 tests, 3 hours)
1. List all friends
2. Empty friend list
3. Bidirectional verification
4. Response schema validation
5. Friend details complete
6. Pagination needed
7. Performance with many friends
8. Online status included
9. Ordering verification
10. Friend type filtering

#### `/friends/{friend_id}` DELETE (15 tests, 5 hours)
1. **Success Cases (2 tests):**
   - Remove friend
   - Bidirectional removal

2. **Validation Errors (7 tests):**
   - Friend not found (404)
   - Not in friend list (400)
   - Invalid friend_id
   - SQL injection prevention
   - Already removed
   - Non-existent user
   - Self-removal attempt

3. **Business Logic (4 tests):**
   - Both directions removed
   - State verification
   - Notification sent
   - Related data handling

4. **Edge Cases (2 tests):**
   - Concurrent removal
   - Database rollback

**Total Tests: 81**
**Estimated Hours: 25**

---

## 8. Online Status Router (`online_status.py`)
**File:** `D:\work\casino\app\routers\online_status.py`
**Priority:** P2 - MEDIUM (Supporting Feature)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/online/friends` | GET | Required | P2 |
| `/online/users/{user_id}` | GET | Required | P2 |
| `/online/count` | GET | Required | P2 |
| `/online/clients` | GET | Required | P2 |
| `/online/players` | GET | Required | P2 |

### Critical Business Logic
1. Online status tracking via database flag
2. Friend-based filtering
3. User type filtering
4. Real-time count aggregation

### Security-Sensitive Operations
- Authentication required
- Privacy controls

### Database Operations
- is_online flag queries
- User type filtering
- Count aggregations

### Test Scenarios
- Each endpoint: 6-8 tests
- Total estimated: 35 tests, 10 hours

---

## 9. Payment Methods Router (`payment_methods.py`)
**File:** `D:\work\casino\app\routers\payment_methods.py`
**Priority:** P1 - HIGH (Business Critical)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/payment-methods/` | GET | None | P1 |
| `/payment-methods/client/{client_id}` | GET | None | P1 |
| `/payment-methods/my-methods` | GET | Client | P1 |
| `/payment-methods/update-methods` | POST | Client | P1 |
| `/payment-methods/remove-method/{method_id}` | DELETE | Client | P1 |

### Critical Business Logic
1. **Available Methods:**
   - System-wide payment methods
   - Active methods only
   - Public access

2. **Client Configuration:**
   - Select accepted methods
   - Update selections
   - Remove methods
   - Validation of method IDs

### Security-Sensitive Operations
- Client-only modification
- Method ID validation
- Prevent invalid assignments

### Database Operations
- Many-to-many association (ClientPaymentMethod)
- Join queries
- Bulk updates
- Soft deletes

### Test Scenarios
- Estimated: 60 tests, 18 hours

---

## 10. Promotions Router (`promotions.py`)
**File:** `D:\work\casino\app\routers\promotions.py`
**Priority:** P0 - CRITICAL (Revenue/Engagement)
**Total Endpoints:** 11

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/promotions/create` | POST | Client | P0 |
| `/promotions/my-promotions` | GET | Client | P0 |
| `/promotions/stats/{promotion_id}` | GET | Client | P0 |
| `/promotions/available` | GET | Player | P0 |
| `/promotions/claim` | POST | Player | P0 |
| `/promotions/my-claims` | GET | Player | P0 |
| `/promotions/wallet` | GET | Player | P0 |
| `/promotions/{promotion_id}/cancel` | PUT | Client | P1 |
| `/promotions/approve-claim` | POST | Client | P1 |

### Critical Business Logic
1. **Promotion Creation:**
   - Types: BONUS, CREDITS, FREE_SPINS, CASHBACK
   - Budget tracking
   - Claim limits per player
   - Minimum player level
   - End date validation
   - Target player filtering
   - Wagering requirements

2. **Promotion Claims:**
   - Eligibility validation
   - Budget depletion
   - Claim limit enforcement
   - Friend relationship verification
   - Wallet management (bonus balances)
   - Credits addition
   - Wagering tracking

3. **Wallet System:**
   - Main balance
   - Client-specific bonus balances (JSON)
   - Wagering requirements per client
   - Total wagering tracking

4. **Statistics:**
   - Total claims
   - Unique players
   - Total value claimed
   - Claim rate calculation
   - Average claim value

### Security-Sensitive Operations
- Authorization (Client/Player segregation)
- Budget validation
- Claim limit enforcement
- Friend relationship verification
- Financial transactions (credits)
- Audit trail

### Database Operations
- Complex JSON handling (bonus_balances, target_player_ids)
- Transaction management
- Budget tracking
- Claim counting
- Wallet updates
- Union queries

### Test Scenarios
- Estimated: 150+ tests, 50 hours
- Complex financial logic requires extensive testing
- Edge cases around budget depletion
- Concurrent claim handling
- Wallet balance calculations

---

## 11. Reports Router (`reports.py`)
**File:** `D:\work\casino\app\routers\reports.py`
**Priority:** P1 - HIGH (User Safety)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/reports/` | POST | Required | P1 |
| `/reports/my-reports` | GET | Required | P1 |
| `/reports/user/{user_id}` | GET | Required | P1 |
| `/reports/{report_id}` | PUT | Required | P1 |
| `/reports/{report_id}` | DELETE | Required | P1 |

### Critical Business Logic
1. Report creation with duplicate prevention
2. Self-report prevention
3. User existence validation
4. Reporter/reported tracking
5. Report status management

### Security-Sensitive Operations
- Self-report prevention
- Authorization (only reporter can update/delete)
- User verification

### Database Operations
- Report creation
- Duplicate checking
- Reporter/reported queries
- Status updates

### Test Scenarios
- Estimated: 55 tests, 16 hours

---

## 12. Reviews Router (`reviews.py`)
**File:** `D:\work\casino\app\routers\reviews.py`
**Priority:** P1 - HIGH (Reputation System)
**Total Endpoints:** 8

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/reviews/` | POST | Required | P1 |
| `/reviews/user/{user_id}` | GET | Required | P1 |
| `/reviews/my-reviews` | GET | Required | P1 |
| `/reviews/given` | GET | Required | P1 |
| `/reviews/{review_id}` | PUT | Required | P1 |
| `/reviews/{review_id}` | DELETE | Required | P1 |
| `/reviews/stats/{user_id}` | GET | Required | P1 |
| `/reviews/can-review/{user_id}` | GET | Required | P1 |

### Critical Business Logic
1. **Review Creation:**
   - Friends-only restriction
   - One review per user pair
   - Self-review prevention
   - Rating (1-5)
   - Title and comment

2. **Review Statistics:**
   - Average rating calculation
   - Rating distribution
   - Total review count

3. **Review Management:**
   - Update own reviews
   - Delete own reviews
   - View received/given reviews

### Security-Sensitive Operations
- Friend relationship verification
- Authorization (only reviewer can update/delete)
- Self-review prevention
- Duplicate review prevention

### Database Operations
- Friend relationship queries (bidirectional)
- Duplicate checking
- Average rating calculation
- Rating distribution aggregation
- Pagination

### Test Scenarios
- Estimated: 85 tests, 26 hours

---

## 13. Monitoring Router (`monitoring.py`)
**File:** `D:\work\casino\app\routers\monitoring.py`
**Priority:** P1 - HIGH (Operations)
**Total Endpoints:** 6

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/monitoring/health` | GET | None | P0 |
| `/monitoring/health/detailed` | GET | Admin | P1 |
| `/monitoring/ready` | GET | None | P0 |
| `/monitoring/live` | GET | None | P0 |
| `/monitoring/metrics` | GET | Admin | P1 |
| `/monitoring/test-error/{error_type}` | POST | Admin | P2 |

### Critical Business Logic
1. **Health Checks:**
   - Basic health status
   - Database connectivity
   - System resources (CPU, memory, disk)
   - Application metrics
   - Feature status

2. **Kubernetes Probes:**
   - Liveness probe
   - Readiness probe
   - Table existence checks

3. **Metrics:**
   - User counts by type/status
   - Message/promotion/review counts
   - System resource usage
   - Prometheus-compatible format

### Security-Sensitive Operations
- Admin-only detailed health
- Admin-only metrics
- No sensitive data exposure in public endpoints

### Database Operations
- Connection testing
- Query performance measurement
- Count aggregations
- Table existence checks

### Test Scenarios
- Estimated: 50 tests, 15 hours

---

## 14. Game Credentials Router (`game_credentials.py`)
**File:** `D:\work\casino\app\routers\game_credentials.py`
**Priority:** P0 - CRITICAL (Core Service + Security)
**Total Endpoints:** 5

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/game-credentials/` | POST | Client | P0 |
| `/game-credentials/player/{player_id}` | GET | Client/Player | P0 |
| `/game-credentials/{credential_id}` | PUT | Client | P0 |
| `/game-credentials/{credential_id}` | DELETE | Client | P0 |
| `/game-credentials/my-credentials` | GET | Player | P0 |

### Critical Business Logic
1. **Credential Creation:**
   - Client creates for players
   - Store game username/password
   - Dual-write pattern (plaintext + encrypted)
   - Send notification to player
   - Track created_by_client_id

2. **Encryption:**
   - Optional encryption (CREDENTIAL_ENCRYPTION_KEY)
   - Dual-read pattern (prefer encrypted, fallback to plaintext)
   - Backward compatibility
   - Graceful degradation

3. **Credential Management:**
   - Update credentials
   - Delete credentials
   - Player-only view own
   - Client can view any

### Security-Sensitive Operations
- **CRITICAL:** Dual-write encryption pattern
- Credential exposure in notifications
- Authorization (Client creates, Player views)
- Encryption key management
- Fallback to plaintext if encryption fails

### Database Operations
- Credential creation with dual-write
- Duplicate prevention (player + game)
- Join queries with Game table
- Update with re-encryption
- Soft deletes

### Test Scenarios
- Estimated: 90+ tests, 28 hours
- Encryption/decryption testing crucial
- Fallback scenarios
- Notification delivery
- Security testing

---

## 15. Chat Router (`chat.py`)
**File:** `D:\work\casino\app\routers\chat.py`
**Priority:** P0 - CRITICAL (Core Feature)
**Total Endpoints:** 8

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/chat/send/text` | POST | Required | P0 |
| `/chat/send/image` | POST | Required | P0 |
| `/chat/send/voice` | POST | Required | P0 |
| `/chat/conversations` | GET | Required | P0 |
| `/chat/messages/{friend_id}` | GET | Required | P0 |
| `/chat/messages/{message_id}/read` | PUT | Required | P1 |
| `/chat/messages/{message_id}` | DELETE | Required | P1 |
| `/chat/stats` | GET | Required | P2 |

### Critical Business Logic
1. **Message Types:**
   - TEXT: Content only
   - IMAGE: File upload with validation
   - VOICE: Audio file with duration

2. **File Handling:**
   - S3 upload with local fallback
   - File type validation
   - Unique filename generation
   - Content type validation

3. **Messaging:**
   - Friends-only messaging
   - WebSocket notifications
   - Read status tracking
   - Conversation management
   - Unread count

4. **File Storage:**
   - Primary: S3 (production)
   - Fallback: Local filesystem (ephemeral)
   - Directory structure: uploads/images, uploads/voice

### Security-Sensitive Operations
- Friend relationship verification
- File type validation
- File size limits (implicit)
- Authorization (only sender can delete)
- File upload validation

### Database Operations
- Message creation
- Friend relationship queries
- File URL storage
- Read status updates
- Conversation aggregation
- Message deletion with file cleanup

### Test Scenarios
- Estimated: 120+ tests, 38 hours
- File upload testing crucial
- S3 integration testing
- WebSocket integration testing
- Concurrent messaging

---

## 16. Profiles Router (`profiles.py`)
**File:** `D:\work\casino\app\routers\profiles.py`
**Priority:** P1 - HIGH (User Experience)
**Total Endpoints:** 6

### Endpoints Overview

| Endpoint | Method | Authentication | Priority |
|----------|--------|----------------|----------|
| `/profiles/{user_id}` | GET | Optional | P1 |
| `/profiles/{user_id}/reviews` | GET | Optional | P1 |
| `/profiles/{user_id}/friends` | GET | Optional | P1 |
| `/profiles/{user_id}/stats` | GET | Optional | P1 |
| `/profiles/{user_id}/profile-picture` | POST | Required | P1 |
| `/profiles/{user_id}/profile-picture` | DELETE | Required | P1 |

### Critical Business Logic
1. **Profile Data:**
   - Different data for PLAYER vs CLIENT
   - Privacy controls (friend-only info)
   - Account age calculation
   - Review statistics
   - Friend counts

2. **Player Profiles:**
   - Connected clients count
   - Player level
   - Credits (friend-only)

3. **Client Profiles:**
   - Connected players count
   - Company name
   - Accepted payment methods
   - Available games

4. **Profile Pictures:**
   - Image upload to S3/local
   - File validation (type, size)
   - Old file cleanup
   - 5MB size limit

### Security-Sensitive Operations
- Privacy controls (email, credits)
- Authorization (own picture only)
- File upload validation
- File size limits
- S3 integration security

### Database Operations
- Complex profile queries
- Friend relationship counts
- Review aggregations
- Payment method joins
- Game joins
- Profile picture updates

### Test Scenarios
- Estimated: 75 tests, 24 hours

---

## Priority Summary

### P0 - CRITICAL (Must Test First)
**Total Endpoints:** 61
**Estimated Hours:** 170

1. **Auth Router** (3 endpoints, 17 hours)
   - Foundation for all security
   - Password migration critical
   - Rate limiting essential

2. **Admin Router** (14 endpoints, 64 hours)
   - User management critical
   - Content moderation important
   - Audit trail essential

3. **Client Router** (4 endpoints, 24 hours)
   - Core business functionality
   - **SECURITY ISSUE:** SHA256 passwords
   - Player management critical

4. **Promotions Router** (11 endpoints, 50 hours)
   - Revenue-critical feature
   - Complex financial logic
   - Wallet management

5. **Game Credentials Router** (5 endpoints, 28 hours)
   - Core service delivery
   - Encryption implementation
   - Security-sensitive

6. **Chat Router** (8 endpoints, 38 hours)
   - Core user engagement
   - File handling critical
   - Real-time features

### P1 - HIGH (Test Second)
**Total Endpoints:** 43
**Estimated Hours:** 125

1. **Users Router** (5 endpoints, 14 hours)
2. **Games Router** (5 endpoints, 18 hours)
3. **Email Verification Router** (6 endpoints, 22 hours)
4. **Friends Router** (6 endpoints, 25 hours)
5. **Payment Methods Router** (5 endpoints, 18 hours)
6. **Reports Router** (5 endpoints, 16 hours)
7. **Reviews Router** (8 endpoints, 26 hours)
8. **Monitoring Router** (6 endpoints, 15 hours)
9. **Profiles Router** (6 endpoints, 24 hours)

### P2 - MEDIUM (Test Third)
**Total Endpoints:** 5
**Estimated Hours:** 10

1. **Online Status Router** (5 endpoints, 10 hours)

---

## Testing Approach Recommendations

### 1. Test Environment Setup
- Separate test database
- Mock external services (S3, email)
- WebSocket test client
- Rate limiting configuration

### 2. Test Data Management
- Fixtures for common scenarios
- Factory pattern for test data
- Database seeding scripts
- Cleanup between tests

### 3. Testing Tools
- **Framework:** pytest
- **HTTP Client:** httpx / TestClient (FastAPI)
- **Database:** SQLAlchemy test transactions
- **Mocking:** unittest.mock / pytest-mock
- **Coverage:** pytest-cov (target 80%+)
- **Load Testing:** locust / k6

### 4. Test Categories

#### Unit Tests (40% of effort)
- Individual function testing
- Business logic validation
- Edge case handling
- Mock database/external services

#### Integration Tests (40% of effort)
- API endpoint testing
- Database integration
- Authentication flows
- Transaction handling

#### End-to-End Tests (15% of effort)
- Complete user workflows
- Multi-step processes
- WebSocket integration
- File upload/download

#### Performance Tests (5% of effort)
- Load testing critical endpoints
- Database query optimization
- Concurrent user simulation
- Rate limiting verification

### 5. Critical Security Tests

#### Authentication & Authorization
- JWT token validation
- Role-based access control
- Session management
- Password security

#### Input Validation
- SQL injection prevention
- XSS prevention
- File upload validation
- Size limit enforcement

#### Data Privacy
- Friend-only data access
- Admin-only endpoints
- User isolation
- Data leak prevention

#### Encryption
- Credential encryption/decryption
- Password hashing (bcrypt)
- Secure token generation
- Key management

### 6. Test Execution Strategy

#### Phase 1: Foundation (Weeks 1-3)
- Auth Router
- Users Router
- Database connectivity
- Basic CRUD operations

#### Phase 2: Core Business (Weeks 4-7)
- Client Router
- Games Router
- Game Credentials Router
- Payment Methods Router

#### Phase 3: Engagement (Weeks 8-11)
- Promotions Router
- Chat Router
- Friends Router
- Reviews Router

#### Phase 4: Administration (Weeks 12-14)
- Admin Router
- Reports Router
- Monitoring Router

#### Phase 5: Supporting Features (Weeks 15-16)
- Email Verification Router
- Online Status Router
- Profiles Router

---

## Known Issues & Risks

### Critical Security Issues

1. **Client Router - SHA256 Password Hashing**
   - **Location:** `D:\work\casino\app\routers\client.py` line 55, 240
   - **Issue:** Using SHA256 instead of bcrypt for player passwords
   - **Risk:** HIGH - Vulnerable to rainbow table attacks
   - **Impact:** All player accounts created by clients
   - **Recommendation:** Migrate to bcrypt immediately
   - **Test Coverage Needed:** Password security tests

2. **Temporary Password Exposure**
   - **Location:** Multiple endpoints returning temp_password
   - **Issue:** Passwords sent in API responses
   - **Risk:** MEDIUM - Network interception possible
   - **Recommendation:** Use secure delivery method or force password reset

### Database Concerns

1. **No Migration Testing**
   - Password migration (SHA256 to bcrypt) lacks comprehensive tests
   - Risk of failed migrations affecting user access

2. **Concurrent Operations**
   - Limited testing for concurrent claims, updates, deletions
   - Race conditions possible in promotion claims, friend requests

3. **Transaction Management**
   - Some endpoints lack proper rollback testing
   - Partial failure scenarios need coverage

### Performance Risks

1. **N+1 Query Problems**
   - Potential in conversation listing, friend queries
   - Needs load testing with large datasets

2. **Large JSON Fields**
   - bonus_balances, target_player_ids stored as JSON
   - Performance impact with large data needs testing

3. **File Upload Scalability**
   - Local filesystem fallback not production-ready
   - S3 failure handling needs testing

---

## Test Metrics & Goals

### Coverage Goals
- **Line Coverage:** 85%+
- **Branch Coverage:** 80%+
- **Critical Paths:** 100%
- **Security Endpoints:** 100%

### Quality Gates
- All P0 tests must pass
- No critical security vulnerabilities
- Performance benchmarks met
- All database migrations tested

### Success Criteria
- Zero authentication bypasses
- Zero authorization bypasses
- Zero SQL injection vulnerabilities
- Zero XSS vulnerabilities
- < 500ms response time (95th percentile)
- > 100 concurrent users supported

---

## Resource Allocation

### Testing Team Composition
- **Lead Test Engineer:** 1 (full-time)
- **Automation Engineers:** 2 (full-time)
- **Security Tester:** 1 (part-time)
- **Performance Tester:** 1 (part-time)

### Timeline
- **Total Duration:** 16 weeks
- **Total Effort:** 280-350 hours
- **Parallel Work:** Possible after Phase 1

### Budget Estimate
- **Labor:** $150-200/hour * 300 hours = $45,000-60,000
- **Tools/Infrastructure:** $5,000
- **Total:** $50,000-65,000

---

## Appendix A: Test Template

```python
"""
Test Module: {router_name}_test.py
Priority: {P0/P1/P2}
Estimated Hours: {hours}
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db

client = TestClient(app)

class Test{RouterName}:
    """Test suite for {router_name} endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self, db_session):
        """Setup test data before each test"""
        # Create test users, data, etc.
        pass

    def test_{endpoint}_{scenario}_success(self):
        """Test {scenario} success case"""
        # Arrange
        # Act
        # Assert
        pass

    def test_{endpoint}_{scenario}_validation_error(self):
        """Test {scenario} validation error"""
        # Arrange
        # Act
        # Assert
        pass

    def test_{endpoint}_{scenario}_unauthorized(self):
        """Test {scenario} unauthorized access"""
        # Arrange
        # Act
        # Assert
        pass
```

---

## Appendix B: Critical Path Coverage

### Authentication Flow (P0)
1. Register → Login → Access Protected Endpoint
2. Register → Pending Approval → Login Failure
3. Login → Token Expiry → Re-login
4. Password Migration → Successful Login

### Core Business Flow (P0)
1. Client Registers → Admin Approves → Client Creates Player → Player Gets Credentials
2. Client Creates Promotion → Player Claims → Wallet Updated
3. Player Searches Client → Sends Friend Request → Client Accepts → Can Message

### User Engagement Flow (P1)
1. Friend Request → Accept → Send Message → Read Message
2. Friend → Create Review → View Profile → See Review
3. Player → Verify Email → Complete Profile

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-20 | Claude Code Analysis | Initial comprehensive roadmap |

---

**End of Testing Roadmap**
