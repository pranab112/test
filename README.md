# Casino Royale SaaS Platform

A SaaS platform with separate login systems for clients and players, featuring friend request functionality and dedicated dashboards.

## Features

- **Dual User System**: Separate registration and login for Clients and Players
- **Friend Request System**: Users can search and send friend requests to both clients and players
- **User Search**: Search users by username or unique ID
- **Unique User IDs**: Each user gets an auto-generated unique ID for easy sharing
- **Dashboard Views**: Separate dashboards for clients and players with different features
- **Real-time Updates**: Friend requests and lists update in real-time

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: SQLite (can be easily switched to PostgreSQL)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: JWT tokens

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the backend server:
```bash
cd /Users/apple/ofiice\ works/caSINOROYAL
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Open the dashboards in your browser:
   - Client Dashboard: Open `client-dashboard.html`
   - Player Dashboard: Open `player-dashboard.html`

## Usage

### For Clients

1. Open `client-dashboard.html`
2. Register with company details or login
3. Your unique Client ID will be displayed
4. Search for players or other clients by username or ID
5. Send and manage friend requests
6. View your friends list

### For Players

1. Open `player-dashboard.html`
2. Register as a player or login
3. Your unique Player ID will be displayed
4. Search for clients or other players
5. Filter search by user type (clients only/players only)
6. Send and manage friend requests
7. View your level and credits

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info

### Friends
- `POST /friends/request` - Send friend request
- `GET /friends/requests/sent` - Get sent requests
- `GET /friends/requests/received` - Get received requests
- `PUT /friends/requests/{id}` - Accept/reject request
- `GET /friends/list` - Get friends list
- `DELETE /friends/{id}` - Remove friend

### Users
- `GET /users/search` - Search users
- `GET /users/{user_id}` - Get user by ID

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- username (Unique)
- user_id (Unique, auto-generated)
- user_type (client/player)
- company_name (for clients)
- player_level (for players)
- credits (for players)

### Friend Requests Table
- sender_id
- receiver_id
- status (pending/accepted/rejected)
- timestamps

### Friends Association Table
- Many-to-many relationship between users

## Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Token expiry set to 30 minutes
- CORS enabled for frontend-backend communication

## Future Enhancements

- WebSocket for real-time notifications
- Email verification
- Password reset functionality
- User profiles with avatars
- Chat system between friends
- Game integration for players
- Analytics dashboard for clients