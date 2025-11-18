#!/usr/bin/env python3
"""
Deployment Diagnostic Script
=============================
This script helps diagnose and fix deployment issues, especially:
1. Missing environment variables (like CREDENTIAL_ENCRYPTION_KEY)
2. Database migration status
3. Table existence verification
"""

import os
import sys
import logging
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, inspect
from cryptography.fernet import Fernet
import json

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def check_environment_variables():
    """Check if all required environment variables are set"""
    print("\n" + "="*60)
    print("CHECKING ENVIRONMENT VARIABLES")
    print("="*60)

    required_vars = {
        'DATABASE_URL': 'Database connection string',
        'SECRET_KEY': 'JWT authentication secret key',
        'CREDENTIAL_ENCRYPTION_KEY': 'Fernet key for credential encryption'
    }

    optional_vars = {
        'ENVIRONMENT': 'Environment (development/staging/production)',
        'CORS_ORIGINS': 'Allowed CORS origins',
        'ENABLE_RATE_LIMITING': 'Rate limiting flag'
    }

    missing_required = []

    print("\n✓ Required Environment Variables:")
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if value:
            if var == 'DATABASE_URL':
                # Hide password in database URL
                if '@' in value:
                    parts = value.split('@')
                    sanitized = parts[0].rsplit(':', 1)[0] + ':****@' + parts[1]
                    print(f"  • {var}: {sanitized}")
                else:
                    print(f"  • {var}: {value[:30]}...")
            elif var == 'SECRET_KEY' or var == 'CREDENTIAL_ENCRYPTION_KEY':
                print(f"  • {var}: {'*' * 8} (set)")
            else:
                print(f"  • {var}: {value}")
        else:
            print(f"  ✗ {var}: NOT SET - {desc}")
            missing_required.append(var)

    print("\n✓ Optional Environment Variables:")
    for var, desc in optional_vars.items():
        value = os.getenv(var, 'NOT SET')
        print(f"  • {var}: {value}")

    # Generate encryption key if missing
    if 'CREDENTIAL_ENCRYPTION_KEY' in missing_required:
        print("\n" + "!"*60)
        print("WARNING: CREDENTIAL_ENCRYPTION_KEY is not set!")
        print("!"*60)
        print("\nGenerating a new encryption key...")
        new_key = Fernet.generate_key().decode()
        print(f"\nAdd this to your Render environment variables:")
        print(f"\nCREDENTIAL_ENCRYPTION_KEY={new_key}")
        print("\n⚠️  IMPORTANT: Keep this key secure! If lost, encrypted data cannot be recovered.")

    return len(missing_required) == 0

def check_database_connection():
    """Verify database connection and type"""
    print("\n" + "="*60)
    print("CHECKING DATABASE CONNECTION")
    print("="*60)

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("✗ Cannot check database - DATABASE_URL not set")
        return False

    try:
        # Handle postgres:// vs postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        engine = create_engine(database_url)

        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✓ Database connection successful")

            # Check database type
            if 'postgresql' in database_url:
                result = conn.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"✓ PostgreSQL detected: {version.split(',')[0]}")
            elif 'sqlite' in database_url:
                print("✓ SQLite database detected")
            else:
                print("? Unknown database type")

        return True

    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False

def check_database_schema():
    """Check if all required tables exist"""
    print("\n" + "="*60)
    print("CHECKING DATABASE SCHEMA")
    print("="*60)

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("✗ Cannot check schema - DATABASE_URL not set")
        return False

    try:
        # Handle postgres:// vs postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        engine = create_engine(database_url)
        inspector = inspect(engine)

        # Get all table names
        existing_tables = inspector.get_table_names()
        print(f"\n✓ Found {len(existing_tables)} tables in database")

        # Check required tables
        required_tables = [
            'users', 'friends', 'friend_requests', 'messages',
            'reviews', 'promotions', 'promotion_claims', 'player_wallets',
            'games', 'client_games', 'game_credentials',
            'payment_methods', 'client_payment_methods', 'reports'
        ]

        missing_tables = []
        for table in required_tables:
            if table in existing_tables:
                print(f"  ✓ {table}")
            else:
                print(f"  ✗ {table} - MISSING")
                missing_tables.append(table)

        # Check for encryption columns in game_credentials
        if 'game_credentials' in existing_tables:
            columns = inspector.get_columns('game_credentials')
            column_names = [col['name'] for col in columns]

            print("\n✓ Checking game_credentials columns:")
            encryption_cols = ['game_username_encrypted', 'game_password_encrypted']
            for col in encryption_cols:
                if col in column_names:
                    print(f"  ✓ {col} exists")
                else:
                    print(f"  ✗ {col} - MISSING (migration needed)")
                    missing_tables.append('encryption_columns')

        if missing_tables:
            print("\n" + "!"*60)
            print("ACTION REQUIRED: Database schema issues detected!")
            print("!"*60)

            if 'encryption_columns' in missing_tables:
                print("\n1. Run database migrations on Render:")
                print("   In Render Shell or Build Command:")
                print("   $ alembic upgrade head")

            if len(missing_tables) > 1 or 'encryption_columns' not in missing_tables:
                print("\n2. If tables are missing, initialize the database:")
                print("   $ python -c \"from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)\"")

        return len(missing_tables) == 0

    except Exception as e:
        print(f"✗ Schema check failed: {e}")
        return False

def check_alembic_version():
    """Check current Alembic migration version"""
    print("\n" + "="*60)
    print("CHECKING MIGRATION STATUS")
    print("="*60)

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("✗ Cannot check migrations - DATABASE_URL not set")
        return False

    try:
        # Handle postgres:// vs postgresql://
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)

        engine = create_engine(database_url)

        with engine.connect() as conn:
            # Check if alembic_version table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'alembic_version'
                )
            """))

            if not result.scalar():
                print("✗ No alembic_version table found - migrations never run")
                print("\n  Run: alembic upgrade head")
                return False

            # Get current version
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.scalar()

            if version:
                print(f"✓ Current migration version: {version}")

                # Check if it's the latest
                expected_latest = "93c635b75f3d"  # Latest migration from your repo
                if version == expected_latest:
                    print("✓ Database is up to date with latest migration")
                else:
                    print(f"⚠️  Database may need migration")
                    print(f"   Current: {version}")
                    print(f"   Latest:  {expected_latest}")
                    print("\n  Run: alembic upgrade head")
            else:
                print("✗ No migration version found")
                print("\n  Run: alembic upgrade head")
                return False

        return True

    except Exception as e:
        print(f"✗ Migration check failed: {e}")
        return False

def test_credential_encryption():
    """Test if credential encryption is working"""
    print("\n" + "="*60)
    print("TESTING CREDENTIAL ENCRYPTION")
    print("="*60)

    key = os.getenv('CREDENTIAL_ENCRYPTION_KEY')
    if not key:
        print("✗ CREDENTIAL_ENCRYPTION_KEY not set - encryption disabled")
        print("  Credentials will be stored in plaintext (not recommended)")
        return False

    try:
        # Test if key is valid
        cipher = Fernet(key.encode() if isinstance(key, str) else key)

        # Test encryption/decryption
        test_string = "test_password_123"
        encrypted = cipher.encrypt(test_string.encode()).decode()
        decrypted = cipher.decrypt(encrypted.encode()).decode()

        if decrypted == test_string:
            print("✓ Encryption key is valid and working")
            print(f"  • Test string: {test_string}")
            print(f"  • Encrypted: {encrypted[:30]}...")
            print(f"  • Decrypted: {decrypted}")
            return True
        else:
            print("✗ Encryption/decryption mismatch")
            return False

    except Exception as e:
        print(f"✗ Encryption test failed: {e}")
        print("  The CREDENTIAL_ENCRYPTION_KEY may be invalid")
        return False

def main():
    """Run all diagnostic checks"""
    print("\n" + "#"*60)
    print("#" + " "*20 + "DEPLOYMENT DIAGNOSTICS" + " "*16 + "#")
    print("#"*60)

    results = {
        'Environment Variables': check_environment_variables(),
        'Database Connection': check_database_connection(),
        'Database Schema': check_database_schema(),
        'Migration Status': check_alembic_version(),
        'Credential Encryption': test_credential_encryption()
    }

    print("\n" + "="*60)
    print("DIAGNOSTIC SUMMARY")
    print("="*60)

    all_passed = True
    for check, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"  {check}: {status}")
        if not passed:
            all_passed = False

    if not all_passed:
        print("\n" + "!"*60)
        print("DEPLOYMENT ISSUES DETECTED!")
        print("!"*60)
        print("\nRECOMMENDED ACTIONS:")
        print("\n1. Set missing environment variables in Render dashboard")
        print("2. Run database migrations: alembic upgrade head")
        print("3. Restart your Render service after making changes")
        print("\nFor Render.com:")
        print("  - Go to your service dashboard")
        print("  - Click on 'Environment' tab")
        print("  - Add missing environment variables")
        print("  - Click 'Save Changes' (this will redeploy)")
    else:
        print("\n" + "✓"*60)
        print("ALL CHECKS PASSED - Your deployment should be working!")
        print("✓"*60)

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())