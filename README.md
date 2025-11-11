# Casino Royal - Full Stack Casino Platform

A professional casino gaming platform with dual backend systems (Node.js + FastAPI), featuring SaaS capabilities, user authentication, game management, and fortune wheel functionality.

## 🎰 Features

### Frontend
- **Responsive Design**: Modern dark theme with gold accents
- **Interactive Fortune Wheel**: Spin to win credits with real-time updates
- **Game Gallery**: 30+ casino games with direct links to actual gaming sites
- **User Authentication**: Login/registration with JWT tokens
- **Real-time Updates**: Live winners ticker and dynamic content
- **Dual User System**: Separate registration and login for Clients and Players
- **Friend Request System**: Users can search and send friend requests

### Backend
- **Dual Stack**: Express.js (Node.js) + FastAPI (Python)
- **User Management**: Registration, authentication, profile management
- **Game System**: Game tracking, popularity scoring, play statistics
- **Fortune Wheel**: Weighted random results with prize distribution
- **Admin Panel**: User management, game management, system statistics
- **Database**: SQLite (easily switchable to PostgreSQL)
- **Real-time Updates**: Friend requests and lists update in real-time

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Python 3.8+

### Installation

1. **Install Node.js Dependencies**
   ```bash
   npm install
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Setup**
   ```bash
   # The .env file is already configured with defaults
   # Update passwords and secrets for production use
   ```

4. **Initialize Database** (for Node.js backend)
   ```bash
   npm run init-db
   ```

5. **Start the Servers**

   Node.js Server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

   FastAPI Server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Access the Application**
   - Node.js API: `http://localhost:3000`
   - FastAPI: `http://localhost:8000`
   - Client Dashboard: Open `client-dashboard.html`
   - Player Dashboard: Open `player-dashboard.html`

## 📁 Project Structure

```
casino/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables
├── index.html               # Frontend HTML
├── styles.css               # Frontend CSS
├── script.js                # Frontend JavaScript
├── games_data.json          # Game data from Excel
├── models/
│   ├── database.js          # Database connection and setup
│   ├── Game.js              # Game model
│   └── User.js              # User model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── games.js             # Game management routes
│   ├── users.js             # User management routes
│   ├── admin.js             # Admin panel routes
│   └── wheel.js             # Fortune wheel routes
├── middleware/
│   └── auth.js              # Authentication middleware
├── scripts/
│   └── initDatabase.js      # Database initialization
└── casino imade/            # Game images directory
```

## 🎮 Game Integration

All games from your Excel file are automatically integrated:

### Game Features
- **Direct Links**: Click "Play Now" to open the actual game site
- **Demo Mode**: Preview games without tracking
- **Popularity Tracking**: Games gain popularity based on plays
- **Image Integration**: All game images are mapped correctly

### Supported Games
- Firekirin, Orionstar, Juwa, GameVault, CasinoRoyale
- Vegasweep, Milkyway, Ultra Panda, Cash Frenzy
- Pandamaster, vblink, River Sweeps, HighStake
- VegasX, Game Room, Blue Dragon, Para, River Monster
- Moolah, Sirus, Mega Spin, Egames, Loot
- Casino Ignite, Cash Machine, Vegas Roll, Win Star
- Volo, Joker, and more...

## 🎡 Fortune Wheel System

### How It Works
- **Weighted Random**: Different prizes have different probabilities
- **Real Prizes**: Win actual credits added to your balance
- **Rate Limited**: 3 spins per minute to prevent abuse
- **Tracking**: All spins are logged with user and IP tracking

### Prize Distribution
- **500 Credits**: 5% chance
- **300 Credits**: 8% chance
- **200 Credits**: 10% chance
- **100 Credits**: 10% chance
- **Special Win**: 15% chance (100-600 credits)
- **Lose**: 50% chance

## 👤 User System

### Default Accounts
```
Admin Account:
Email: admin@casinoroyal.com
Password: AdminPassword123!

Sample Users:
player1@example.com / Player123!
player2@example.com / Player123!
agent1@example.com / Agent123! (Agent privileges)
```

### User Features
- **Registration**: New users get $100 welcome bonus
- **Authentication**: JWT-based secure authentication
- **Balance Management**: Add/subtract balance, transaction history
- **Game Tracking**: Track games played and session data
- **Profile Management**: Update username, email, password

## 🛠️ API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Game Endpoints
- `GET /api/games` - Get all games
- `GET /api/games/popular` - Get popular games
- `GET /api/games/:id` - Get specific game
- `POST /api/games/:id/play` - Track game play

### Wheel Endpoints
- `POST /api/wheel/spin` - Spin the fortune wheel
- `GET /api/wheel/stats` - Get wheel statistics
- `GET /api/wheel/recent-winners` - Get recent winners

### User Endpoints
- `GET /api/users/balance` - Get user balance
- `POST /api/users/add-balance` - Add balance (demo)
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/leaderboard` - Get leaderboard

### Admin Endpoints
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Manage users
- `PUT /api/admin/users/:id` - Update user
- `POST /api/admin/users/:id/balance` - Adjust user balance

## 🔧 Configuration

### Environment Variables (.env)
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DB_NAME=casino_royal.db
CORS_ORIGIN=http://localhost:3000
ADMIN_EMAIL=admin@casinoroyal.com
ADMIN_PASSWORD=AdminPassword123!
```

### Rate Limiting
- Authentication: 5 attempts per 15 minutes
- Wheel spins: 3 spins per minute
- General API: 100 requests per 15 minutes

## 🎨 Frontend Features

### Responsive Design
- Mobile-friendly layout
- Touch-optimized controls
- Adaptive navigation

### Interactive Elements
- Animated fortune wheel with physics
- Game cards with hover effects
- Modal dialogs for authentication
- Real-time winner updates

### User Experience
- Smooth animations and transitions
- Loading states and error handling
- Persistent login sessions
- Visual feedback for all actions

## 🔐 Security Features

### Backend Security
- Helmet.js for security headers
- Rate limiting on sensitive endpoints
- JWT token authentication
- Password hashing with bcrypt
- SQL injection prevention
- Input validation and sanitization

### Frontend Security
- CORS configuration
- XSS prevention
- Secure token storage
- API error handling

## 📊 Database Schema

### Users Table
- User authentication and profile data
- Balance and transaction tracking
- Admin and agent privileges
- Activity logs

### Games Table
- Game information and URLs
- Image paths and descriptions
- Popularity scoring
- Active/inactive status

### Transactions Table
- All balance changes
- Deposit/withdrawal tracking
- Game winnings/losses
- Admin adjustments

### Wheel Spins Table
- Spin results and prizes
- User and IP tracking
- Timestamp logging

## 🚀 Production Deployment

### Security Checklist
1. Change all default passwords in `.env`
2. Use strong JWT secret
3. Enable HTTPS
4. Configure proper CORS origins
5. Set up proper rate limiting
6. Regular database backups

### Performance Optimization
1. Enable gzip compression
2. Implement caching headers
3. Optimize images
4. Database indexing
5. CDN for static assets

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Reinitialize database
npm run init-db
```

**Games Not Loading**
```bash
# Check if images exist in casino imade/ folder
# Verify Excel data was processed correctly
```

**Authentication Issues**
```bash
# Clear browser localStorage
# Check JWT_SECRET in .env
```

**Port Already in Use**
```bash
# Change PORT in .env file
# Or kill process using port 3000
```

## 📈 Future Enhancements

### Planned Features
- Payment gateway integration
- Live chat support
- Advanced admin analytics
- Game tournament system
- Mobile app development
- Social features and friends
- Achievement system
- Progressive jackpots

### Technical Improvements
- Redis caching
- WebSocket for real-time updates
- Database sharding
- CDN integration
- Docker containerization
- Automated testing suite

## 📞 Support

For technical support or questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check console logs for errors
4. Verify all dependencies are installed

## 📄 License

This project is for educational and demonstration purposes. Please ensure compliance with local gambling laws and regulations before deploying in production.

---

**🎰 Casino Royal - Where Fortune Meets Technology! 🎰**

---

## FastAPI Backend (SaaS Features)

### Friend System Features
- **User Search**: Search users by username or unique ID
- **Unique User IDs**: Each user gets an auto-generated unique ID for easy sharing
- **Dashboard Views**: Separate dashboards for clients and players with different features

### FastAPI Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info

#### Friends
- `POST /friends/request` - Send friend request
- `GET /friends/requests/sent` - Get sent requests
- `GET /friends/requests/received` - Get received requests
- `PUT /friends/requests/{id}` - Accept/reject request
- `GET /friends/list` - Get friends list
- `DELETE /friends/{id}` - Remove friend

#### Users
- `GET /users/search` - Search users
- `GET /users/{user_id}` - Get user by ID

### Usage

#### For Clients
1. Open `client-dashboard.html`
2. Register with company details or login
3. Your unique Client ID will be displayed
4. Search for players or other clients by username or ID
5. Send and manage friend requests
6. View your friends list

#### For Players
1. Open `player-dashboard.html`
2. Register as a player or login
3. Your unique Player ID will be displayed
4. Search for clients or other players
5. Filter search by user type (clients only/players only)
6. Send and manage friend requests
7. View your level and credits
