#!/bin/bash

echo "=== Casino Royal Data Migration to PostgreSQL ==="
echo ""

# Activate virtual environment
source venv/bin/activate

# Export data from SQLite
echo "Step 1: Exporting data from SQLite..."
python migration/export_data.py

# Import data to PostgreSQL
echo ""
echo "Step 2: Importing data to PostgreSQL..."
python migration/import_to_postgres.py

# Run Alembic migrations
echo ""
echo "Step 3: Running database migrations..."
alembic upgrade head

echo ""
echo "✓ Migration complete!"
echo ""
echo "To start the application with PostgreSQL:"
echo "  python run_with_postgres.py"