#!/bin/bash
# Railway Startup Script for Casino Royal
# This script ensures proper startup sequence

set -e  # Exit on error

echo "=========================================="
echo "Casino Royal - Starting on Railway"
echo "=========================================="

# Check required environment variables
echo "Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    echo "Please add PostgreSQL database in Railway dashboard"
    exit 1
fi

if [ -z "$SECRET_KEY" ]; then
    echo "ERROR: SECRET_KEY is not set!"
    echo "Please set SECRET_KEY in Railway environment variables"
    exit 1
fi

if [ -z "$CREDENTIAL_ENCRYPTION_KEY" ]; then
    echo "WARNING: CREDENTIAL_ENCRYPTION_KEY is not set!"
    echo "Game credentials feature will not work"
fi

echo "✓ Required environment variables found"

# Fix postgres:// to postgresql:// (Railway compatibility)
if [[ $DATABASE_URL == postgres://* ]]; then
    export DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
    echo "✓ Fixed DATABASE_URL format for SQLAlchemy"
fi

echo "=========================================="
echo "Creating database tables..."
echo "=========================================="

# Create tables using SQLAlchemy models first
# This ensures all base tables exist before migrations run
python -c "from app.database import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine); print('✓ Database tables created')"

echo "=========================================="
echo "Running database migrations..."
echo "=========================================="

# Run migrations with retry logic
MAX_RETRIES=5
RETRY_COUNT=0

until python -m alembic upgrade head || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo "Migration failed. Retry $RETRY_COUNT/$MAX_RETRIES..."
    sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Database migrations failed after $MAX_RETRIES attempts"
    echo "Please check:"
    echo "1. PostgreSQL database is running"
    echo "2. DATABASE_URL is correct"
    echo "3. Database is accessible from Railway"
    exit 1
fi

echo "✓ Database migrations completed successfully"

echo "=========================================="
echo "Starting application..."
echo "=========================================="

# Start uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
