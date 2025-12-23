# Casino Royale SaaS Platform - Comprehensive Documentation

## 🎰 Project Overview

Casino Royale is a comprehensive SaaS platform designed for casino/gaming businesses, featuring dual user systems (Clients and Players), real-time messaging, friend management, promotions system, and user reviews. The platform provides separate dashboards for different user types with role-specific functionality.

## 🏗️ Architecture & Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (production-ready for PostgreSQL migration)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time Communication**: WebSocket support
- **File Handling**: Upload support for images and voice messages
- **API Documentation**: Auto-generated with FastAPI/OpenAPI

### Frontend
- **Technology**: Vanilla HTML5, CSS3, JavaScript
- **UI Framework**: Custom CSS with modern gradients and animations
- **Fonts**: Inter, Orbitron (for branding)
- **Icons**: Font Awesome 6.0
- **Real-time Updates**: WebSocket integration

### Development Environment
- **Python Version**: 3.13+
- **Virtual Environment**: venv
- **Server**: Uvicorn ASGI server
- **CORS**: Enabled for cross-origin requests

## 📁 Project Structure

```
caSINOROYAL/
├── app/                           # Main application package
│   ├── routers/                   # API route handlers
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── friends.py            # Friend management
│   │   ├── users.py              # User operations
│   │   ├── chat.py               # Messaging system
│   │   ├── reviews.py            # User review system
│   │   ├── profiles.py           # User profiles
│   │   └── promotions.py         # Promotions/bonus system
│   ├── main.py                   # FastAPI application setup
│   ├── models.py                 # SQLAlchemy database models
│   ├── schemas.py                # Pydantic request/response schemas
│   ├── database.py               # Database configuration
│   ├── auth.py                   # Authentication utilities
│   ├── config.py                 # Application configuration
│   └── websocket.py              # WebSocket connection manager
├── uploads/                      # File upload storage
│   ├── images/                   # Image uploads
│   └── voice/                    # Voice message uploads
├── client-dashboard.html         # Client user interface
├── player-dashboard.html         # Player user interface
├── casino_royal.db              # SQLite database file
├── requirements.txt              # Python dependencies
├── .env                         # Environment variables
├── README.md                    # Basic project documentation
└── test_*.py                    # Test scripts
```

## 🗄️ Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    user_type VARCHAR(6) NOT NULL,      -- 'client' or 'player'
    full_name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR UNIQUE NOT NULL,     -- Auto-generated unique ID
    company_name VARCHAR,                -- For clients only
    player_level INTEGER DEFAULT 1,     -- For players only
    credits INTEGER DEFAULT 1000        -- For players only
);
```

#### Friend System
```sql
-- Many-to-many friendship association
CREATE TABLE friends (
    user_id INTEGER REFERENCES users(id),
    friend_id INTEGER REFERENCES users(id),
    PRIMARY KEY (user_id, friend_id)
);

-- Friend request management
CREATE TABLE friend_requests (
    id INTEGER PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    status VARCHAR(8) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

#### Messaging System
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    message_type VARCHAR(5) NOT NULL,    -- 'text', 'image', 'voice', 'promotion'
    content TEXT,                        -- For text messages
    file_url VARCHAR,                    -- For media messages
    file_name VARCHAR,                   -- Original filename
    duration INTEGER,                    -- For voice messages (seconds)
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Review System
```sql
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY,
    reviewer_id INTEGER REFERENCES users(id),
    reviewee_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    UNIQUE(reviewer_id, reviewee_id)     -- One review per user pair
);
```

#### Promotions & Wallet System
```sql
CREATE TABLE promotions (
    id INTEGER PRIMARY KEY,
    client_id INTEGER REFERENCES users(id),
    title VARCHAR NOT NULL,
    description TEXT,
    promotion_type VARCHAR,              -- 'bonus', 'cashback', 'free_spins', etc.
    value INTEGER NOT NULL,
    max_claims_per_player INTEGER DEFAULT 1,
    total_budget INTEGER,
    used_budget INTEGER DEFAULT 0,
    min_player_level INTEGER DEFAULT 1,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    status VARCHAR DEFAULT 'active',     -- 'active', 'expired', 'depleted', 'cancelled'
    target_player_ids TEXT,              -- JSON array of specific players
    terms TEXT,
    wagering_requirement INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotion_claims (
    id INTEGER PRIMARY KEY,
    promotion_id INTEGER REFERENCES promotions(id),
    player_id INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES users(id),
    claimed_value INTEGER NOT NULL,
    status VARCHAR DEFAULT 'claimed',    -- 'claimed', 'used', 'expired'
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    wagering_completed INTEGER DEFAULT 0,
    wagering_required INTEGER NOT NULL,
    UNIQUE(promotion_id, player_id)      -- One claim per player per promotion
);

CREATE TABLE player_wallets (
    id INTEGER PRIMARY KEY,
    player_id INTEGER UNIQUE REFERENCES users(id),
    main_balance INTEGER DEFAULT 0,
    bonus_balances TEXT DEFAULT '{}',    -- JSON: client-specific bonuses
    total_wagering INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 Authentication & Security

### JWT Token System
- **Algorithm**: HS256
- **Expiration**: 30 minutes
- **Secret Key**: Configurable via environment variables
- **Token Storage**: Client-side (localStorage/sessionStorage)

### Password Security
- **Hashing**: bcrypt with salt
- **Validation**: Minimum requirements enforced
- **Reset**: Future enhancement planned

### API Security
- **CORS**: Configured for cross-origin requests
- **Authentication**: Bearer token required for protected endpoints
- **Authorization**: Role-based access control (Client vs Player)

## 🚀 API Endpoints

### Authentication (`/auth`)
```
POST /auth/register          # User registration
POST /auth/login            # User authentication
GET  /auth/me               # Get current user profile
```

### User Management (`/users`)
```
GET  /users/search          # Search users by username/ID
GET  /users/{user_id}       # Get user by ID
```

### Friend System (`/friends`)
```
POST /friends/request       # Send friend request
GET  /friends/requests/sent # Get sent requests
GET  /friends/requests/received # Get received requests
PUT  /friends/requests/{id} # Accept/reject request
GET  /friends/list          # Get friends list
DELETE /friends/{id}        # Remove friend
```

### Messaging (`/chat`)
```
GET  /chat/conversations    # Get user conversations
GET  /chat/messages/{user_id} # Get messages with specific user
POST /chat/send/text        # Send text message
POST /chat/send/image       # Send image message
POST /chat/send/voice       # Send voice message
GET  /chat/stats           # Get chat statistics
```

### Reviews (`/reviews`)
```
POST /reviews              # Create/update review
GET  /reviews/received     # Get reviews received by user
GET  /reviews/given        # Get reviews given by user
GET  /reviews/user/{user_id} # Get reviews for specific user
DELETE /reviews/{review_id} # Delete review
```

### Promotions (`/promotions`)
```
POST /promotions           # Create promotion (clients only)
GET  /promotions           # Get available promotions
GET  /promotions/my        # Get user's promotions
POST /promotions/{id}/claim # Claim promotion (players only)
PUT  /promotions/{id}      # Update promotion
DELETE /promotions/{id}    # Delete promotion
```

### Profiles (`/profiles`)
```
GET  /profiles/{user_id}   # Get user profile
PUT  /profiles             # Update user profile
```

### WebSocket (`/ws`)
```
WebSocket /ws?token={jwt}  # Real-time messaging connection
```

## 🎨 Frontend Architecture

### Client Dashboard (`client-dashboard.html`)
**Features:**
- Modern dark theme with gold accents
- Collapsible sidebar navigation
- User profile management
- Friend search and management
- Promotion creation and management
- Real-time messaging interface
- Review system integration
- Responsive design

**Key Sections:**
- User Profile & Stats
- Friend Management
- Promotion Creation
- Messages/Chat
- Reviews & Ratings

### Player Dashboard (`player-dashboard.html`)
**Features:**
- Gaming-oriented UI design
- Player level and credits display
- Available promotions browsing
- Friend discovery and chat
- Wallet management
- Review system
- Real-time notifications

**Key Sections:**
- Player Stats (Level, Credits, Wallet)
- Available Promotions
- Friends & Social
- Messages
- Profile & Reviews

### Common UI Components
- **Login/Registration Forms**: Shared authentication UI
- **Chat Interface**: Real-time messaging with file uploads
- **Friend Management**: Search, add, and manage friends
- **Review System**: 5-star rating with comments
- **Responsive Design**: Mobile-friendly layouts

## 🔄 Real-time Features

### WebSocket Implementation
- **Connection Management**: Automatic reconnection
- **Message Broadcasting**: Real-time message delivery
- **Online Status**: User presence tracking
- **Notification System**: Instant alerts for new messages/requests

### Live Updates
- Friend requests (send/receive)
- New messages
- Promotion updates
- User status changes

## 🧪 Testing & Quality Assurance

### Test Files
- `test_player_fixes.py` - Player dashboard functionality tests
- `test_realtime_messaging.py` - WebSocket messaging tests
- `test_enhanced_player.py` - Enhanced player features
- `test_players_friends_only.py` - Friend system restrictions
- `test_conversations.py` - Conversation management
- `test_dynamic_data.py` - Dynamic data loading

### Test Coverage Areas
- Authentication flows
- Friend request system
- Messaging functionality
- API endpoint validation
- WebSocket connections
- Database operations

## 🚀 Installation & Deployment

### Development Setup
```bash
# Clone and navigate to project
cd "/Users/apple/ofiice works/caSINOROYAL"

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env  # Edit as needed

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Considerations
- **Database**: Migrate from SQLite to PostgreSQL
- **Secret Management**: Use secure secret key generation
- **File Storage**: Implement cloud storage for uploads
- **Caching**: Add Redis for session management
- **Load Balancing**: Configure for horizontal scaling
- **SSL/TLS**: Enable HTTPS encryption
- **Monitoring**: Implement logging and analytics

## 🎯 Key Features & Business Logic

### Dual User System
- **Clients**: Business entities offering promotions
- **Players**: End users consuming gaming services
- **Cross-interaction**: Clients can message players, offer promotions
- **Role-based permissions**: Different access levels and features

### Friend Management
- **Universal Search**: Find users by username or unique ID
- **Friend Requests**: Pending/accepted/rejected status
- **Bidirectional Friendship**: Mutual friend relationships
- **Privacy Controls**: Friend-only messaging

### Promotion System
- **Client Creation**: Clients create targeted promotions
- **Player Claims**: Players discover and claim offers
- **Budget Management**: Track and limit promotion spending
- **Wagering Requirements**: Configurable play-through requirements
- **Expiration**: Time-based promotion validity

### Messaging & Chat
- **Multi-format**: Text, image, and voice messages
- **File Uploads**: Secure file handling and storage
- **Read Receipts**: Message status tracking
- **Conversation Management**: Organized chat history

### Review & Rating System
- **5-Star Ratings**: Standard rating scale
- **Written Reviews**: Detailed feedback capability
- **Mutual Reviews**: Both parties can review each other
- **Reputation Building**: Trust and credibility system

## 🔮 Future Enhancements

### Technical Improvements
- **Email Verification**: User account validation
- **Password Reset**: Secure password recovery
- **Two-Factor Authentication**: Enhanced security
- **API Rate Limiting**: Prevent abuse
- **Caching Layer**: Performance optimization
- **Database Migrations**: Automated schema updates

### Feature Expansions
- **Game Integration**: Connect with actual casino games
- **Payment Gateway**: Real money transactions
- **Analytics Dashboard**: Business intelligence
- **Mobile Apps**: Native iOS/Android applications
- **Push Notifications**: Mobile and web notifications
- **Advanced Promotions**: Complex bonus structures
- **Tournament System**: Competitive gaming events
- **Leaderboards**: Player rankings and achievements

### Business Features
- **Multi-tenant**: Support multiple casino brands
- **White-label**: Customizable branding
- **Reporting**: Financial and operational reports
- **Compliance**: Regulatory and audit features
- **Customer Support**: Integrated help desk
- **Marketing Tools**: Campaign management

## 📊 Performance & Scalability

### Current Capacity
- **Database**: SQLite suitable for development/small deployments
- **Concurrent Users**: Limited by single-threaded SQLite
- **File Storage**: Local filesystem storage
- **WebSocket Connections**: In-memory management

### Scaling Strategies
- **Database Migration**: PostgreSQL with connection pooling
- **Horizontal Scaling**: Load balancer with multiple app instances
- **CDN Integration**: Static asset delivery
- **Microservices**: Break into specialized services
- **Queue System**: Background job processing
- **Caching**: Redis for sessions and frequently accessed data

## 🛡️ Security Considerations

### Current Security Measures
- JWT token authentication
- Bcrypt password hashing
- Input validation via Pydantic schemas
- SQL injection prevention via SQLAlchemy ORM
- CORS configuration
- File upload restrictions

### Additional Security Recommendations
- **Input Sanitization**: XSS prevention
- **Rate Limiting**: API abuse prevention
- **Session Management**: Secure token handling
- **Audit Logging**: Track sensitive operations
- **Data Encryption**: Encrypt sensitive data at rest
- **Security Headers**: Implement security HTTP headers
- **Vulnerability Scanning**: Regular security assessments

## 📚 Development Guidelines

### Code Organization
- **Modular Structure**: Separate concerns into modules
- **Type Hints**: Use Python type annotations
- **Error Handling**: Comprehensive exception management
- **Documentation**: Inline comments and docstrings
- **Testing**: Unit and integration test coverage

### API Design Principles
- **RESTful Endpoints**: Follow REST conventions
- **Consistent Response Format**: Standardized API responses
- **Version Control**: API versioning strategy
- **Error Codes**: Meaningful HTTP status codes
- **Pagination**: Handle large data sets efficiently

### Database Best Practices
- **Normalization**: Proper relational design
- **Indexing**: Optimize query performance
- **Constraints**: Data integrity enforcement
- **Migrations**: Version-controlled schema changes
- **Backup Strategy**: Regular data backups

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

### Code Standards
- **Python**: Follow PEP 8 style guide
- **JavaScript**: Use modern ES6+ syntax
- **HTML/CSS**: Semantic markup and responsive design
- **Git**: Descriptive commit messages

---

*This documentation provides a comprehensive overview of the Casino Royale SaaS platform. For specific implementation details, refer to the source code and inline documentation.*