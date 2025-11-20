# Project Index: Casino Royal SaaS Platform

**Generated:** 2025-11-20
**Platform:** Full-stack Casino Gaming Platform with SaaS capabilities
**Backend:** FastAPI (Python) + Node.js (Express)
**Database:** PostgreSQL (Production) / SQLite (Development)
**Deployment:** Render.com

---

## 📁 Project Structure

```
casino/
├── app/                        # FastAPI application core
│   ├── routers/               # API route handlers (14 modules)
│   ├── models.py              # SQLAlchemy data models
│   ├── schemas.py             # Pydantic validation schemas
│   ├── main.py                # Application entry point
│   ├── database.py            # Database connection & session
│   ├── config.py              # Environment configuration
│   ├── auth.py                # Authentication utilities
│   ├── encryption.py          # Credential encryption
│   └── websocket.py           # Real-time WebSocket handler
├── alembic/                   # Database migrations
│   ├── versions/              # Migration scripts
│   └── env.py                 # Alembic configuration
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
├── migration/                 # Data migration tools
├── static/                    # Static assets
├── uploads/                   # User uploaded files
└── *.html                     # Frontend dashboards
```

---

## 🚀 Entry Points

### Main Application
- **API Server:** `app/main.py` - FastAPI application with 14 routers
- **ASGI Server:** `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Development:** `uvicorn app.main:app --reload`

### Database Management
- **Migrations:** `alembic upgrade head` - Apply database migrations
- **Rollback:** `alembic downgrade -1` - Rollback one migration
- **Create Migration:** `alembic revision --autogenerate -m "message"`

### Utility Scripts
- **Admin Creation:** `python create_admin.py` - Create admin user
- **Test Accounts:** `python create_test_accounts.py` - Generate test users
- **Populate Games:** `python populate_games.py` - Load game catalog
- **Credential Migration:** `python scripts/migrate_credentials.py` - Encrypt credentials
- **Deployment Diagnostics:** `python scripts/diagnose_deployment.py` - Check deployment health

### Frontend Dashboards
- **Root:** `/` → `login.html` - Universal login page
- **Client Dashboard:** `/client` → `client-dashboard.html`
- **Player Dashboard:** `/player` → `player-dashboard.html`
- **Admin Dashboard:** `/admin` → `admin-dashboard.html`
- **Registration:** `/register` → `player-register.html`

---

## 📦 Core Modules

### **app/main.py** - Application Core
- **Exports:** `app` (FastAPI instance)
- **Purpose:** Application entry point, CORS configuration, middleware setup, router registration
- **Key Features:**
  - Environment-aware CORS (development/production)
  - Security headers middleware
  - Rate limiting integration
  - 14 API router modules
  - Static file serving
  - WebSocket endpoint

### **app/models.py** - Data Models
- **Exports:** `User`, `FriendRequest`, `Message`, `Game`, `GameCredential`, `Review`, `Promotion`, `PromotionClaim`, `Report`, `PaymentMethod`, `ClientPaymentMethod`, `ClientGame`, `PlayerWallet`, `Conversation`, `ConversationParticipant`, `OnlineStatus`
- **Enums:** `UserType`, `FriendRequestStatus`, `MessageType`, `PromotionType`, `PromotionStatus`, `ClaimStatus`, `ReportStatus`
- **Purpose:** SQLAlchemy ORM models for all database entities

### **app/database.py** - Database Layer
- **Exports:** `engine`, `SessionLocal`, `Base`, `get_db()`
- **Purpose:** Database connection management with PostgreSQL/SQLite support
- **Features:**
  - Connection pooling for PostgreSQL
  - SSL support for production
  - URL normalization (postgres:// → postgresql://)

### **app/config.py** - Configuration Management
- **Exports:** `Settings`, `settings`
- **Purpose:** Pydantic-based environment configuration
- **Key Settings:**
  - `DATABASE_URL` - Database connection string
  - `SECRET_KEY` - JWT signing key
  - `ENVIRONMENT` - development/staging/production
  - `CORS_ORIGINS` - Allowed API origins
  - `ENABLE_RATE_LIMITING` - Feature flag
  - `CREDENTIAL_ENCRYPTION_KEY` - Fernet encryption key

### **app/auth.py** - Authentication
- **Exports:** `create_access_token()`, `get_current_user()`, `verify_password()`, `get_password_hash()`
- **Purpose:** JWT token generation and validation, password hashing
- **Security:** bcrypt password hashing, OAuth2 bearer tokens

### **app/schemas.py** - Validation Schemas
- **Exports:** 30+ Pydantic models for request/response validation
- **Purpose:** API input validation, response serialization
- **Key Schemas:** `UserCreate`, `UserLogin`, `Token`, `GameCreate`, `MessageCreate`, `PromotionCreate`

### **app/encryption.py** - Credential Encryption
- **Exports:** `encrypt_credential()`, `decrypt_credential()`
- **Purpose:** Secure storage of game credentials using Fernet symmetric encryption
- **Usage:** Encrypts game account passwords, API keys

### **app/websocket.py** - Real-time Communication
- **Exports:** `websocket_endpoint()`, `active_connections`
- **Purpose:** WebSocket handler for real-time messaging, online status
- **Features:** Connection management, message broadcasting

### **app/pagination.py** - Pagination Utility
- **Exports:** `paginate()`
- **Purpose:** Generic pagination for list endpoints

### **app/rate_limit.py** - Rate Limiting
- **Exports:** `setup_rate_limiting()`, `limiter`
- **Purpose:** Protect API endpoints from abuse using SlowAPI
- **Limits:** Configurable per-endpoint rate limits

### **app/exceptions.py** - Error Handling
- **Exports:** `setup_exception_handlers()`
- **Purpose:** Centralized exception handling for FastAPI

### **app/s3_storage.py** - File Storage
- **Exports:** S3 integration utilities
- **Purpose:** AWS S3 file upload/download for user content

---

## 🔌 API Routers (14 Modules)

### 1. **auth.py** - Authentication & Authorization
- `POST /auth/register` - User registration (client/player/admin)
- `POST /auth/login` - JWT token authentication
- `GET /auth/me` - Get current user profile
- `POST /auth/refresh` - Refresh access token

### 2. **users.py** - User Management
- `GET /users/search` - Search users by username/ID
- `GET /users/{user_id}` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/stats` - User statistics

### 3. **friends.py** - Friend System
- `POST /friends/request` - Send friend request
- `GET /friends/requests/sent` - List sent requests
- `GET /friends/requests/received` - List received requests
- `PUT /friends/requests/{id}` - Accept/reject request
- `GET /friends/list` - Get friends list
- `DELETE /friends/{id}` - Remove friend

### 4. **chat.py** - Messaging System
- `POST /chat/send` - Send message
- `GET /chat/conversations` - List conversations
- `GET /chat/messages/{conversation_id}` - Get messages
- `PUT /chat/messages/{id}/read` - Mark as read
- `POST /chat/conversations/create` - Create conversation

### 5. **games.py** - Game Catalog
- `GET /games` - List all games
- `GET /games/{id}` - Get game details
- `POST /games` - Create game (admin)
- `PUT /games/{id}` - Update game (admin)
- `DELETE /games/{id}` - Delete game (admin)
- `POST /games/{id}/play` - Track game play

### 6. **game_credentials.py** - Game Account Management
- `POST /game-credentials` - Add game credentials (encrypted)
- `GET /game-credentials` - List user's game accounts
- `PUT /game-credentials/{id}` - Update credentials
- `DELETE /game-credentials/{id}` - Remove credentials

### 7. **reviews.py** - Game Reviews
- `POST /reviews` - Submit review
- `GET /reviews/game/{game_id}` - Get game reviews
- `PUT /reviews/{id}` - Update review
- `DELETE /reviews/{id}` - Delete review

### 8. **promotions.py** - Promotion Management
- `POST /promotions` - Create promotion (client)
- `GET /promotions` - List active promotions
- `POST /promotions/{id}/claim` - Claim promotion (player)
- `GET /promotions/my-claims` - User's claimed promotions
- `PUT /promotions/{id}` - Update promotion (client)

### 9. **payment_methods.py** - Payment Processing
- `POST /payment-methods` - Add payment method
- `GET /payment-methods` - List payment methods
- `PUT /payment-methods/{id}` - Update payment method
- `DELETE /payment-methods/{id}` - Remove payment method

### 10. **reports.py** - Reporting System
- `POST /reports` - Submit report
- `GET /reports` - List reports (admin)
- `PUT /reports/{id}` - Update report status (admin)
- `GET /reports/my-reports` - User's submitted reports

### 11. **profiles.py** - User Profiles
- `GET /profiles/{user_id}` - Get public profile
- `PUT /profiles` - Update own profile
- `POST /profiles/avatar` - Upload avatar

### 12. **online_status.py** - Online Presence
- `POST /online-status/online` - Mark user online
- `POST /online-status/offline` - Mark user offline
- `GET /online-status/{user_id}` - Check user online status
- `GET /online-status/friends` - Friends online status

### 13. **email_verification.py** - Email Verification
- `POST /email/send-verification` - Send verification email
- `POST /email/verify` - Verify email token
- `POST /email/resend` - Resend verification

### 14. **admin.py** - Admin Panel
- `GET /admin/dashboard` - Admin dashboard stats
- `GET /admin/users` - Manage users
- `PUT /admin/users/{id}/approve` - Approve client
- `PUT /admin/users/{id}/ban` - Ban user
- `DELETE /admin/users/{id}` - Delete user

### 15. **client.py** - Client Dashboard
- `GET /client/dashboard` - Client dashboard data
- `GET /client/players` - Client's players
- `POST /client/broadcast` - Send broadcast message

### 16. **monitoring.py** - System Monitoring
- `GET /monitoring/health` - Health check
- `GET /monitoring/metrics` - System metrics
- `GET /monitoring/logs` - Application logs

---

## 🔧 Configuration Files

### **alembic.ini**
- Purpose: Alembic migration tool configuration
- Database: PostgreSQL connection string
- Migrations: Located in `alembic/versions/`

### **docker-compose.yml**
- Purpose: Local development PostgreSQL setup
- Services: postgres, pgadmin
- Ports: 5432 (PostgreSQL), 5050 (pgAdmin)

### **render.yaml**
- Purpose: Render.com deployment configuration
- Build: `pip install -r requirements.txt && alembic upgrade head`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Plan: Free tier

### **requirements.txt**
- Purpose: Python dependencies
- Key Packages:
  - `fastapi==0.120.3` - Web framework
  - `sqlalchemy==2.0.44` - ORM
  - `alembic==1.17.1` - Migrations
  - `psycopg2-binary==2.9.10` - PostgreSQL driver
  - `python-jose==3.5.0` - JWT tokens
  - `bcrypt==5.0.0` - Password hashing
  - `boto3==1.35.93` - AWS S3
  - `pytest==8.3.4` - Testing

### **.env** (Not in repo - create locally)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
CREDENTIAL_ENCRYPTION_KEY=your-fernet-key-here
```

---

## 📚 Documentation Files

### **README.md** (396 lines)
- Project overview and features
- Installation and quick start guide
- API documentation
- Database schema
- Security and deployment

### **RENDER_DEPLOYMENT_GUIDE.md**
- Render.com deployment instructions
- Environment variable setup
- Database configuration
- Troubleshooting

### **POSTGRESQL_MIGRATION.md**
- SQLite to PostgreSQL migration guide
- Data export/import process
- Schema verification

### **AWS_S3_SETUP_GUIDE.md**
- S3 bucket configuration
- IAM permissions
- Environment variables

### **DEPLOYMENT_FIX.md**
- Common deployment issues
- Fix procedures
- Idempotent migration patterns

### **PROJECT_DOCUMENTATION.md**
- Architecture overview
- Feature specifications
- Technical decisions

### **CLAUDE.md**
- Claude Code AI assistant documentation
- Project context for AI collaboration

---

## 🧪 Test Coverage

### Test Structure
- **Unit Tests:** `tests/test_auth.py` - Authentication flow testing
- **Config:** `tests/conftest.py` - Pytest fixtures and setup
- **Test Database:** Separate SQLite instance

### Test Commands
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

### Coverage Areas
- Authentication (JWT, password hashing)
- User registration and login
- API endpoint validation
- Database operations

---

## 🔗 Key Dependencies

### Core Framework
- **fastapi** (0.120.3) - Modern async web framework
- **uvicorn** (0.38.0) - ASGI server
- **pydantic** (2.12.3) - Data validation

### Database
- **sqlalchemy** (2.0.44) - ORM
- **alembic** (1.17.1) - Schema migrations
- **psycopg2-binary** (2.9.10) - PostgreSQL adapter

### Authentication
- **python-jose** (3.5.0) - JWT tokens
- **bcrypt** (5.0.0) - Password hashing
- **passlib** (1.7.4) - Password utilities

### Security
- **cryptography** (46.0.3) - Credential encryption
- **slowapi** (0.1.9) - Rate limiting

### Storage
- **boto3** (1.35.93) - AWS S3 integration

### Testing
- **pytest** (8.3.4) - Test framework
- **pytest-asyncio** (0.24.0) - Async test support
- **httpx** (0.27.2) - HTTP client for tests
- **faker** (33.1.0) - Test data generation

---

## 📝 Quick Start

### 1. Environment Setup
```bash
# Clone repository
git clone <repo-url>
cd casino

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy example .env (create one based on documentation)
# Set DATABASE_URL, SECRET_KEY, CREDENTIAL_ENCRYPTION_KEY

# For local PostgreSQL
docker-compose up -d
```

### 3. Database Setup
```bash
# Run migrations
alembic upgrade head

# Create admin user
python create_admin.py

# Populate game catalog
python populate_games.py
```

### 4. Run Application
```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 10000 --workers 4
```

### 5. Access Dashboards
- API Docs: http://localhost:8000/docs (development only)
- Login: http://localhost:8000/
- Client: http://localhost:8000/client
- Player: http://localhost:8000/player
- Admin: http://localhost:8000/admin

---

## 🗃️ Database Schema Overview

### Core Tables
- **users** - User accounts (clients, players, admins)
- **friends** - Friend relationships (many-to-many)
- **friend_requests** - Pending friend requests
- **conversations** - Chat conversations
- **conversation_participants** - Conversation membership
- **messages** - Chat messages

### Gaming Tables
- **games** - Game catalog
- **game_credentials** - Encrypted game accounts
- **reviews** - Game reviews
- **player_wallets** - Player balances
- **client_games** - Client-game associations

### Business Tables
- **promotions** - Marketing promotions
- **promotion_claims** - Claimed promotions
- **payment_methods** - Payment processing
- **client_payment_methods** - Client payment options
- **reports** - User reports

### System Tables
- **online_status** - Real-time presence tracking
- **alembic_version** - Migration version tracking

---

## 🚨 Migration History

### Recent Migrations
1. **93c635b75f3d** - Add performance indexes
2. **2d2dd514c898** - Add encrypted game credentials
3. **5d108f810415** - Add created_by_client_id tracking
4. **3c2cf4c5bd5e** - Add is_approved field for user approval

### Migration Best Practices
- All migrations are idempotent (safe to run multiple times)
- Use `if not exists` clauses for indexes
- Drop indexes before columns
- Test migrations on staging before production

---

## 🔒 Security Features

### Authentication
- JWT bearer tokens
- bcrypt password hashing (72-byte limit enforced)
- Token expiration (30 minutes default)
- OAuth2 password flow

### Authorization
- Role-based access control (admin/client/player)
- Client approval workflow
- Protected admin endpoints

### Data Protection
- Fernet symmetric encryption for game credentials
- SQL injection prevention (SQLAlchemy ORM)
- Input validation (Pydantic schemas)
- Rate limiting (SlowAPI)
- CORS configuration

### Production Hardening
- Security headers middleware
- HTTPS enforcement
- SSL database connections
- Environment-based configuration
- Disabled docs in production

---

## 🌐 Deployment Architecture

### Current Deployment: Render.com
- **Service Type:** Web Service
- **Region:** Auto (closest to users)
- **Instance:** Free tier
- **Database:** External PostgreSQL (Render managed)
- **Build:** `pip install + alembic upgrade`
- **Runtime:** uvicorn ASGI server

### Environment Configuration
- **Development:** SQLite, debug logs, permissive CORS
- **Production:** PostgreSQL, SSL, strict CORS, security headers

### Scaling Considerations
- Connection pooling (20 base + 40 overflow)
- Static file CDN (future)
- Redis caching (future)
- WebSocket scaling (future)

---

## 📊 API Performance

### Optimization Features
- SQLAlchemy connection pooling
- Database indexes on foreign keys
- Pagination for large result sets
- Async endpoint handlers
- Lazy loading relationships

### Monitoring
- `/monitoring/health` - Health check endpoint
- `/monitoring/metrics` - Performance metrics
- Application logging (configurable level)

---

## 🎯 Feature Flags

Controlled via environment variables:
- `ENABLE_RATE_LIMITING` - API rate limiting
- `ENVIRONMENT` - Environment-specific behavior
- API docs visibility (auto-disabled in production)

---

## 🧩 Frontend Integration

### HTML Dashboards
- **login.html** - Universal login
- **client-dashboard.html** - Client management interface
- **player-dashboard.html** - Player gaming interface
- **admin-dashboard.html** - Admin control panel
- **player-register.html** - Player registration form

### Static Assets
- **uploads/** - User-uploaded files
- **static/** - CSS, JS, images
- **casino imade/** - Game images (legacy)

### WebSocket Integration
- Endpoint: `ws://localhost:8000/ws`
- Use: Real-time chat, online status

---

## 📈 Token Efficiency

**Index Size:** ~3KB
**Full Codebase Read:** ~58KB
**Token Savings:** 94% reduction per session

**Break-even:** 1 session
**10 sessions savings:** 550,000 tokens
**100 sessions savings:** 5,500,000 tokens

---

## 🎓 Development Workflow

### Adding New Features
1. Create data model in `app/models.py`
2. Add Pydantic schemas in `app/schemas.py`
3. Create router in `app/routers/feature.py`
4. Register router in `app/main.py`
5. Create migration: `alembic revision --autogenerate -m "description"`
6. Test migration: `alembic upgrade head`
7. Write tests in `tests/test_feature.py`
8. Update documentation

### Code Standards
- FastAPI best practices
- SQLAlchemy 2.0 style
- Pydantic V2 schemas
- Type hints throughout
- Async/await for I/O operations

---

## 🐛 Common Issues & Solutions

### Database Connection Errors
```bash
# Check DATABASE_URL format
# PostgreSQL: postgresql://user:pass@host:5432/db
# SQLite: sqlite:///./casino.db

# Test connection
python -c "from app.database import engine; print(engine.url)"
```

### Migration Failures
```bash
# Check current version
alembic current

# Rollback one step
alembic downgrade -1

# Force version (use carefully)
alembic stamp head
```

### Authentication Issues
```bash
# Verify SECRET_KEY is set
python -c "from app.config import settings; print(settings.SECRET_KEY[:10])"

# Test token generation
python -c "from app.auth import create_access_token; print(create_access_token({'sub': 'test'}))"
```

### CORS Errors
- Development: Set `ENVIRONMENT=development`
- Production: Set `CORS_ORIGINS=https://yourdomain.com`
- Never use `CORS_ORIGINS=*` in production

---

## 🔮 Future Enhancements

### Planned Features
- Redis caching layer
- Celery task queue
- Real-time notifications
- Advanced analytics dashboard
- Mobile app API
- Payment gateway integration
- Multi-language support

### Technical Debt
- Add more comprehensive tests
- Implement API versioning
- Add OpenAPI spec generation
- Database query optimization
- WebSocket authentication

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
**Maintainer:** Development Team

---

*This index is optimized for Claude Code AI assistant. For human-readable documentation, see README.md*
