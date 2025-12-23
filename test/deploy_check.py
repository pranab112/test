#!/usr/bin/env python3
"""
Casino Royal - Deployment Readiness Check
This script checks if your app is ready for Render.com deployment
"""

import os
import sys
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a required file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} - MISSING")
        return False

def check_requirements():
    """Check if requirements.txt has required dependencies"""
    required_deps = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'psycopg2-binary',
        'alembic',
        'python-jose',
        'passlib',
        'python-multipart'
    ]

    try:
        with open('requirements.txt', 'r') as f:
            content = f.read().lower()

        missing_deps = []
        for dep in required_deps:
            if dep not in content:
                missing_deps.append(dep)

        if not missing_deps:
            print("✅ requirements.txt has all required dependencies")
            return True
        else:
            print(f"❌ requirements.txt missing: {', '.join(missing_deps)}")
            return False
    except FileNotFoundError:
        print("❌ requirements.txt not found")
        return False

def check_environment_template():
    """Check if environment variables are documented"""
    required_env_vars = [
        'DATABASE_URL',
        'SECRET_KEY',
        'ALGORITHM',
        'ACCESS_TOKEN_EXPIRE_MINUTES'
    ]

    print("\n📋 Required Environment Variables for Render:")
    for var in required_env_vars:
        print(f"   • {var}")

    return True

def main():
    """Run all deployment checks"""
    print("🚀 Casino Royal - Deployment Readiness Check\n")

    checks_passed = 0
    total_checks = 0

    # Check essential files
    files_to_check = [
        ('requirements.txt', 'Requirements file'),
        ('app/main.py', 'Main FastAPI application'),
        ('Procfile', 'Heroku/Render process file'),
        ('render.yaml', 'Render configuration'),
        ('alembic.ini', 'Alembic configuration'),
        ('app/models.py', 'Database models'),
        ('player-dashboard.html', 'Player dashboard'),
        ('client-dashboard.html', 'Client dashboard'),
    ]

    for filepath, description in files_to_check:
        if check_file_exists(filepath, description):
            checks_passed += 1
        total_checks += 1

    # Check requirements.txt content
    if check_requirements():
        checks_passed += 1
    total_checks += 1

    # Environment variables info
    check_environment_template()

    # Summary
    print(f"\n📊 Deployment Readiness: {checks_passed}/{total_checks} checks passed")

    if checks_passed == total_checks:
        print("🎉 Your app is ready for deployment!")
        print("\nNext steps:")
        print("1. Go to https://render.com")
        print("2. Create account and connect GitHub")
        print("3. Follow the RENDER_DEPLOYMENT_GUIDE.md")
        print("4. Your repository: https://github.com/pranab112/test")
    else:
        print("⚠️  Some issues need to be fixed before deployment")

    return checks_passed == total_checks

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)