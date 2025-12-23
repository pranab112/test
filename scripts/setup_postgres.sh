#!/bin/bash

echo "=== Casino Royal PostgreSQL Setup ==="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "Waiting for Docker to start..."
    sleep 10
fi

# Start PostgreSQL with Docker Compose
echo "Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Create .env file for PostgreSQL
echo "Creating .env file for PostgreSQL..."
cat > .env << EOF
DATABASE_URL=postgresql://casino_user:casino_pass@localhost:5432/casino_royal
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

echo "✓ PostgreSQL setup complete!"
echo ""
echo "Database URL: postgresql://casino_user:casino_pass@localhost:5432/casino_royal"
echo "PgAdmin URL: http://localhost:5050"
echo "  Email: admin@casino.com"
echo "  Password: admin"
echo ""
echo "Next steps:"
echo "1. Run: ./migrate_to_postgres.sh"
echo "2. Start app with PostgreSQL: python run_with_postgres.py"