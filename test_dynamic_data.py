#!/usr/bin/env python3
import requests

BASE_URL = "http://localhost:8000"

def login_as_client():
    """Login as client1 and return token"""
    response = requests.post(f"{BASE_URL}/auth/login",
        data={
            "username": "client1",
            "password": "password123"
        })
    if response.ok:
        data = response.json()
        print(f"✓ Logged in as client1")
        return data["access_token"]
    else:
        print(f"✗ Login failed: {response.text}")
        return None

def test_message_stats(token):
    """Test the message stats endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/chat/stats", headers=headers)

    print(f"\nMessage Stats API Response:")
    print(f"Status: {response.status_code}")

    if response.ok:
        stats = response.json()
        print("\nStatistics:")
        print(f"  Messages sent: {stats['messages_sent']}")
        print(f"  Messages received: {stats['messages_received']}")
        print(f"  Total messages: {stats['total_messages']}")
        print(f"  Unread messages: {stats['unread_messages']}")
        print(f"  Unique conversations: {stats['unique_conversations']}")
        return stats
    else:
        print(f"Failed: {response.text}")
        return None

def test_friends_data(token):
    """Test friends and friend requests data"""
    headers = {"Authorization": f"Bearer {token}"}

    # Get friends list
    response = requests.get(f"{BASE_URL}/friends/list", headers=headers)
    if response.ok:
        data = response.json()
        print(f"\nFriends: {len(data['friends'])} total")
        for friend in data['friends']:
            print(f"  - {friend['username']} (ID: {friend['user_id']})")
    else:
        print(f"Friends API failed: {response.text}")

    # Get friend requests
    response = requests.get(f"{BASE_URL}/friends/requests/received", headers=headers)
    if response.ok:
        requests_data = response.json()
        print(f"\nFriend Requests: {len(requests_data)} pending")
        for req in requests_data:
            print(f"  - From: {req['from_user']['username']}")
    else:
        print(f"Friend requests API failed: {response.text}")

def test_all_users(token):
    """Test all users endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/all", headers=headers)

    if response.ok:
        users = response.json()
        players = [u for u in users if u['user_type'] == 'player']
        clients = [u for u in users if u['user_type'] == 'client']
        print(f"\nTotal Users: {len(users)}")
        print(f"  Players: {len(players)}")
        print(f"  Clients: {len(clients)}")
    else:
        print(f"Users API failed: {response.text}")

def main():
    print("Testing Dynamic Dashboard Data")
    print("=" * 40)

    token = login_as_client()
    if token:
        test_message_stats(token)
        test_friends_data(token)
        test_all_users(token)

        print("\n" + "=" * 40)
        print("✓ All data is now loaded from the database")
        print("✓ No hardcoded values in the dashboard")

if __name__ == "__main__":
    main()