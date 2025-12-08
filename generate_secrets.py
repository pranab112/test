#!/usr/bin/env python3
"""
Generate required secrets for Railway deployment
Run this script to generate all necessary secret keys
"""

import secrets
from cryptography.fernet import Fernet

def generate_jwt_secret():
    """Generate a secure JWT secret key (64 characters hex)"""
    return secrets.token_hex(32)

def generate_fernet_key():
    """Generate a Fernet encryption key for credential encryption"""
    return Fernet.generate_key().decode()

def main():
    print("=" * 70)
    print("CASINO ROYAL - SECRET KEYS GENERATOR")
    print("=" * 70)
    print()

    jwt_secret = generate_jwt_secret()
    fernet_key = generate_fernet_key()

    print("[KEY] GENERATED SECRETS - SAVE THESE SECURELY!")
    print("=" * 70)
    print()

    print("1. JWT SECRET KEY (for app/auth.py)")
    print("-" * 70)
    print(f"SECRET_KEY={jwt_secret}")
    print()

    print("2. CREDENTIAL ENCRYPTION KEY (for game credentials)")
    print("-" * 70)
    print(f"CREDENTIAL_ENCRYPTION_KEY={fernet_key}")
    print()

    print("=" * 70)
    print("[WARNING] SECURITY WARNINGS:")
    print("=" * 70)
    print("1. NEVER commit these keys to version control")
    print("2. NEVER share these keys publicly")
    print("3. Use different keys for development/staging/production")
    print("4. Save these in a password manager or secure vault")
    print("5. Add these to Railway environment variables")
    print()

    print("=" * 70)
    print("[TODO] NEXT STEPS:")
    print("=" * 70)
    print("1. Copy the SECRET_KEY above")
    print("2. Copy the CREDENTIAL_ENCRYPTION_KEY above")
    print("3. Add them to Railway dashboard: Settings -> Environment Variables")
    print("4. Or use the deploy_to_railway.bat script to set them automatically")
    print()

    # Save to a file for reference (with warning)
    with open(".secrets.txt", "w", encoding="utf-8") as f:
        f.write("# GENERATED SECRETS - DELETE THIS FILE AFTER COPYING TO RAILWAY!\n")
        f.write("# DO NOT COMMIT THIS FILE TO GIT!\n\n")
        f.write(f"SECRET_KEY={jwt_secret}\n")
        f.write(f"CREDENTIAL_ENCRYPTION_KEY={fernet_key}\n")

    print("[SUCCESS] Secrets also saved to .secrets.txt (DELETE after copying to Railway!)")
    print()

if __name__ == "__main__":
    main()
