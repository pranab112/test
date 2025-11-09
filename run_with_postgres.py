#!/usr/bin/env python3
"""
Run the Casino Royal application with PostgreSQL database
"""

import os
import sys
import uvicorn
from pathlib import Path

# Set PostgreSQL as the database backend
os.environ['USE_POSTGRES'] = '1'

# Check if .env file exists
env_file = Path('.env')
if not env_file.exists():
    print("⚠️  .env file not found!")
    print("Run ./setup_postgres.sh first to set up PostgreSQL")
    sys.exit(1)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Verify PostgreSQL URL
database_url = os.getenv('DATABASE_URL', '')
if 'postgresql://' not in database_url:
    print("⚠️  PostgreSQL DATABASE_URL not configured!")
    print("Run ./setup_postgres.sh to configure PostgreSQL")
    sys.exit(1)

print("=== Starting Casino Royal with PostgreSQL ===")
print(f"Database: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
print("")

# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )