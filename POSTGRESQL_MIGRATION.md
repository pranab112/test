# Casino Royal PostgreSQL Migration Guide

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)
```bash
# 1. Setup PostgreSQL with Docker
./setup_postgres.sh

# 2. Migrate data from SQLite to PostgreSQL
./migrate_to_postgres.sh

# 3. Run application with PostgreSQL
python run_with_postgres.py
```

### Option 2: Using Local PostgreSQL
```bash
# 1. Install PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# 2. Create database
createdb casino_royal

# 3. Update .env file
DATABASE_URL=postgresql://yourusername@localhost:5432/casino_royal

# 4. Migrate data
./migrate_to_postgres.sh

# 5. Run application
python run_with_postgres.py
```

### Option 3: Direct Render Deployment
```bash
# 1. Commit all changes
git add .
git commit -m "Add PostgreSQL support"
git push origin main

# 2. Deploy to Render
# - Go to render.com
# - Create new Web Service
# - Connect GitHub repo
# - Render will auto-detect PostgreSQL needs
```

## 📁 File Structure

```
casino_royal/
├── migration/
│   ├── export_data.py          # Export from SQLite
│   ├── import_to_postgres.py   # Import to PostgreSQL
│   └── data/                   # Exported JSON files
├── alembic/
│   ├── env.py                  # Alembic configuration
│   └── versions/               # Migration files
├── app/
│   ├── database.py            # Updated for PostgreSQL
│   └── database_postgres.py   # PostgreSQL-specific config
├── docker-compose.yml         # PostgreSQL Docker setup
├── setup_postgres.sh          # Setup script
├── migrate_to_postgres.sh     # Migration script
└── run_with_postgres.py       # Run app with PostgreSQL
```

## 🔄 Migration Process

### 1. Data Export (Automatic)
- Users (5 records)
- Friend requests (2 records)
- Friends relationships (4 records)
- Messages (4 records)
- All other tables

### 2. Schema Creation
- Tables created with proper foreign keys
- Indexes for performance
- Enum types for PostgreSQL

### 3. Data Import
- Preserves all relationships
- Maintains IDs
- Converts datetime formats

## 🔧 Configuration

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### PostgreSQL Optimizations
- Connection pooling (20 connections)
- SSL for production
- Proper indexes on foreign keys
- JSONB for flexible data

## 🐛 Troubleshooting

### Docker Not Running
```bash
open -a Docker
# Wait for Docker to start
docker-compose up -d postgres
```

### Port Already in Use
```bash
# Check what's using port 5432
lsof -i :5432
# Kill the process or change port in docker-compose.yml
```

### Migration Errors
```bash
# Reset and try again
docker-compose down -v
docker-compose up -d postgres
./migrate_to_postgres.sh
```

### Connection Refused
```bash
# Check PostgreSQL is running
docker ps
# Or if using local PostgreSQL
brew services list
```

## 🚀 Deployment to Production

### Render Deployment
1. Push code to GitHub
2. Create Render account
3. New Web Service → Connect repo
4. Render auto-detects PostgreSQL need
5. Environment variables auto-configured
6. Deploy!

### Manual Production Setup
```bash
# On production server
export DATABASE_URL=postgresql://prod_user:prod_pass@prod_host:5432/casino_royal
python migration/import_to_postgres.py
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## ✅ Verification

### Check Data Migration
```sql
-- Connect to PostgreSQL
psql casino_royal

-- Check record counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM friend_requests;

-- Verify relationships
SELECT u1.username, u2.username
FROM friends f
JOIN users u1 ON f.user_id = u1.id
JOIN users u2 ON f.friend_id = u2.id;
```

### Test Application
```bash
# Login with existing users
Username: client1, Password: client123
Username: player1, Password: player123
Username: admin1, Password: admin123

# Test friends work
# Test messaging works
```

## 🎯 Benefits of PostgreSQL

1. **Better Performance**: Handles concurrent users better
2. **ACID Compliance**: Data integrity guaranteed
3. **Advanced Features**: JSONB, full-text search, arrays
4. **Scalability**: Can handle millions of records
5. **Production Ready**: Used by major companies
6. **Better Indexing**: Faster queries
7. **Replication**: Built-in backup support

## 📝 Notes

- All existing users and data preserved
- Passwords remain the same
- Friend relationships maintained
- Message history preserved
- Application automatically detects database type
- Can switch between SQLite and PostgreSQL via DATABASE_URL

## 🆘 Support

If you encounter issues:
1. Check Docker is running
2. Verify PostgreSQL is accessible
3. Check .env file has correct DATABASE_URL
4. Review migration logs
5. Ensure all Python dependencies installed

---
Migration completed successfully! Your Casino Royal system is now running on PostgreSQL.