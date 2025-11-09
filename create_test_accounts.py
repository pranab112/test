import requests
import json

API_URL = "http://localhost:8000"

# Test accounts data
test_accounts = [
    {
        "email": "client1@casino.com",
        "username": "client1",
        "password": "password123",
        "full_name": "John Client",
        "user_type": "client",
        "company_name": "Royal Gaming Corp"
    },
    {
        "email": "client2@casino.com",
        "username": "client2",
        "password": "password123",
        "full_name": "Sarah Business",
        "user_type": "client",
        "company_name": "Elite Casino Solutions"
    },
    {
        "email": "player1@casino.com",
        "username": "player1",
        "password": "password123",
        "full_name": "Mike Player",
        "user_type": "player"
    },
    {
        "email": "player2@casino.com",
        "username": "player2",
        "password": "password123",
        "full_name": "Lisa Gamer",
        "user_type": "player"
    },
    {
        "email": "player3@casino.com",
        "username": "player3",
        "password": "password123",
        "full_name": "Alex Champion",
        "user_type": "player"
    }
]

print("Creating test accounts...")
print("=" * 50)

created_accounts = []

for account in test_accounts:
    try:
        response = requests.post(f"{API_URL}/auth/register", json=account)

        if response.status_code == 200:
            user_data = response.json()
            created_accounts.append(user_data)
            print(f"✅ Created {account['user_type']}: {account['username']}")
            print(f"   User ID: {user_data['user_id']}")
            print(f"   Email: {user_data['email']}")
            print(f"   Password: {account['password']}")
            print()
        else:
            print(f"❌ Failed to create {account['username']}: {response.json()}")

    except Exception as e:
        print(f"❌ Error creating {account['username']}: {str(e)}")

print("=" * 50)
print("SUMMARY - Login Credentials:")
print("=" * 50)

for i, account in enumerate(test_accounts, 1):
    print(f"{i}. Username: {account['username']}")
    print(f"   Password: {account['password']}")
    print(f"   Type: {account['user_type']}")
    print(f"   Email: {account['email']}")
    print()

print("Use these credentials to login to:")
print("- Client Dashboard: open client-dashboard.html")
print("- Player Dashboard: open player-dashboard.html")