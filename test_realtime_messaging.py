import requests
import time

API_URL = "http://localhost:8000"

# Login as client1
print("Logging in as client1...")
response = requests.post(f"{API_URL}/auth/login", data={
    "username": "client1",
    "password": "password123"
})

if response.status_code == 200:
    client_token = response.json()["access_token"]
    print("✅ Client1 logged in successfully")

    # Send a message to player1
    print("\nSending message from client1 to player1...")
    response = requests.post(
        f"{API_URL}/chat/send/text",
        headers={"Authorization": f"Bearer {client_token}"},
        data={
            "receiver_id": 3,  # player1 ID
            "content": f"Test message at {time.strftime('%H:%M:%S')}"
        }
    )

    if response.status_code == 200:
        print("✅ Message sent successfully")
    else:
        print(f"❌ Failed to send message: {response.status_code}")
        print(response.json())

# Wait a moment
time.sleep(2)

# Login as player1 and check messages
print("\n\nLogging in as player1...")
response = requests.post(f"{API_URL}/auth/login", data={
    "username": "player1",
    "password": "password123"
})

if response.status_code == 200:
    player_token = response.json()["access_token"]
    print("✅ Player1 logged in successfully")

    # Get conversations
    print("\nFetching player1's conversations...")
    response = requests.get(
        f"{API_URL}/chat/conversations",
        headers={"Authorization": f"Bearer {player_token}"}
    )

    if response.status_code == 200:
        conversations = response.json()
        print(f"Found {len(conversations)} conversations")

        for conv in conversations:
            friend = conv['friend']
            last_msg = conv.get('last_message')
            unread = conv.get('unread_count', 0)

            print(f"\n📬 Conversation with {friend['username']}")
            print(f"   Unread messages: {unread}")

            if last_msg:
                print(f"   Last message: {last_msg.get('content', 'Non-text message')}")
                print(f"   Sent at: {last_msg['created_at']}")
    else:
        print(f"Failed to get conversations: {response.status_code}")
else:
    print(f"Failed to login as player1: {response.status_code}")

print("\n\nTest complete! Check the browser dashboards to see if messages appear in real-time.")