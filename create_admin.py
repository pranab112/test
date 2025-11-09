#!/usr/bin/env python3
import requests
import json

API_URL = "https://test-xbyp.onrender.com"

# Admin account data
admin_account = {
    "email": "admin1@casino.com",
    "username": "admin1",
    "password": "admin123",
    "full_name": "Admin User",
    "user_type": "admin"
}

print("Creating admin account...")
print("=" * 50)

try:
    response = requests.post(f"{API_URL}/auth/register", json=admin_account)

    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ Created admin: {admin_account['username']}")
        print(f"   User ID: {user_data['user_id']}")
        print(f"   Email: {user_data['email']}")
        print(f"   Password: {admin_account['password']}")
        print()
        print("Admin can now login to: https://test-xbyp.onrender.com/admin")
    else:
        error_data = response.json()
        print(f"❌ Failed to create admin: {error_data}")

except Exception as e:
    print(f"❌ Error creating admin: {str(e)}")