#!/bin/bash

echo "=== Casino Royal Local PostgreSQL Setup (No Docker) ==="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed!"
    echo "Please install Homebrew first:"
    echo "/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL via Homebrew..."
    brew install postgresql@15
    brew link postgresql@15 --force
    echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
else
    echo "✓ PostgreSQL is already installed"
fi

# Start PostgreSQL service
echo ""
echo "🚀 Starting PostgreSQL service..."
brew services start postgresql@15

# Wait for PostgreSQL to start
sleep 3

# Create database
echo ""
echo "📊 Creating casino_royal database..."
createdb casino_royal 2>/dev/null || echo "Database might already exist"

# Get current user
DB_USER=$(whoami)

# Create .env file with PostgreSQL settings
echo ""
echo "📝 Creating .env file..."
cat > .env << EOF
DATABASE_URL=postgresql://${DB_USER}@localhost:5432/casino_royal
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
EOF

echo "✓ .env file created with PostgreSQL configuration"

# Show connection info
echo ""
echo "=== PostgreSQL Setup Complete ==="
echo ""
echo "Database URL: postgresql://${DB_USER}@localhost:5432/casino_royal"
echo ""
echo "Next steps:"
echo "1. Run migration: ./migrate_to_postgres.sh"
echo "2. Start application: python run_with_postgres.py"
echo ""
echo "To stop PostgreSQL later: brew services stop postgresql@15"
echo "To restart PostgreSQL: brew services restart postgresql@15"