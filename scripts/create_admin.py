#!/usr/bin/env python3
"""
Script to create an admin user in the database.

Usage:
    python scripts/create_admin.py

Or set environment variables:
    ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 python scripts/create_admin.py
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.models.enums import UserType
from app.auth import get_password_hash

def generate_user_id(username: str, user_type: str) -> str:
    """Generate a unique user ID based on username and timestamp"""
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    prefix = user_type[0].upper()  # A for admin, C for client, P for player
    return f"{prefix}-{username}-{timestamp}"

def create_admin_user(
    username: str = "admin",
    password: str = "admin123",
    email: str = "admin@goldenace.com",
    full_name: str = "System Administrator"
):
    """Create an admin user in the database"""

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create database session
    db: Session = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.username == username).first()
        if existing_admin:
            print(f"⚠️  Admin user '{username}' already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   User ID: {existing_admin.user_id}")
            print(f"   Created: {existing_admin.created_at}")
            return False

        # Generate unique user_id
        user_id = generate_user_id(username, "admin")

        # Hash the password
        hashed_password = get_password_hash(password)

        # Create admin user
        admin_user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=hashed_password,
            user_type=UserType.ADMIN,
            user_id=user_id,
            is_active=True,
            is_approved=True,  # Admin is pre-approved
            is_email_verified=True,  # Admin email is pre-verified
            created_at=datetime.utcnow()
        )

        # Add to database
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("✅ Admin user created successfully!")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   User ID: {admin_user.user_id}")
        print(f"   Password: {password}")
        print(f"   User Type: {admin_user.user_type.value}")
        print(f"\n🔐 Please change the password after first login!")

        return True

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        return False

    finally:
        db.close()

def main():
    """Main function"""
    print("=" * 60)
    print("Golden Ace - Admin User Creation Script")
    print("=" * 60)
    print()

    # Get credentials from environment or use defaults
    username = os.getenv('ADMIN_USERNAME', 'admin')
    password = os.getenv('ADMIN_PASSWORD', 'admin123')
    email = os.getenv('ADMIN_EMAIL', 'admin@goldenace.com')
    full_name = os.getenv('ADMIN_FULLNAME', 'System Administrator')

    print(f"Creating admin user with:")
    print(f"  Username: {username}")
    print(f"  Email: {email}")
    print(f"  Full Name: {full_name}")
    print()

    # Create the admin user
    success = create_admin_user(
        username=username,
        password=password,
        email=email,
        full_name=full_name
    )

    if success:
        print()
        print("=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("1. Start the application server")
        print(f"2. Navigate to the admin login page")
        print(f"3. Login with username '{username}' and password '{password}'")
        print("4. Change the password immediately in settings")
        print()
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
