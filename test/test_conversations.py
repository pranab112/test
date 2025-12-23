#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000"

def login_as_player():
    """Login as player1 and return token"""
    response = requests.post(f"{BASE_URL}/auth/login",
        data={
            "username": "player1",
            "password": "password123"
        })
    if response.ok:
        data = response.json()
        print(f"✓ Logged in as player1")
        return data["access_token"]
    else:
        print(f"✗ Login failed: {response.text}")
        return None

def get_conversations(token):
    """Get conversations for the logged-in user"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/chat/conversations", headers=headers)

    print(f"\nConversations API Response:")
    print(f"Status: {response.status_code}")

    if response.ok:
        conversations = response.json()
        print(f"Number of conversations: {len(conversations)}")

        if conversations:
            print("\nConversation details:")
            for i, conv in enumerate(conversations, 1):
                print(f"\n  Conversation {i}:")
                print(f"    Friend: {conv['friend']['username']} (ID: {conv['friend']['id']})")
                print(f"    Unread count: {conv['unread_count']}")
                if conv['last_message']:
                    msg = conv['last_message']
                    print(f"    Last message:")
                    print(f"      Type: {msg['message_type']}")
                    print(f"      Content: {msg.get('content', 'N/A')}")
                    print(f"      From: {msg.get('sender_name', 'Unknown')}")
                else:
                    print(f"    Last message: None")
        else:
            print("No conversations found")

        return conversations
    else:
        print(f"Failed to get conversations: {response.text}")
        return None

def main():
    print("Testing Player Conversations API")
    print("=" * 40)

    token = login_as_player()
    if token:
        conversations = get_conversations(token)

        if conversations is not None:
            print("\n" + "=" * 40)
            print("Raw JSON response:")
            print(json.dumps(conversations, indent=2))

if __name__ == "__main__":
    main()