import requests

API_URL = "http://localhost:8000"

# Login as player1 to check messages
print("Logging in as player1...")
response = requests.post(f"{API_URL}/auth/login", data={
    "username": "player1",
    "password": "password123"
})

if response.status_code == 200:
    player1_token = response.json()["access_token"]
    print("✅ Logged in successfully")

    # Get conversations
    print("\nFetching conversations...")
    response = requests.get(
        f"{API_URL}/chat/conversations",
        headers={"Authorization": f"Bearer {player1_token}"}
    )

    if response.status_code == 200:
        conversations = response.json()
        print(f"Found {len(conversations)} conversations")

        for conv in conversations:
            friend = conv['friend']
            last_msg = conv.get('last_message')
            unread = conv.get('unread_count', 0)

            print(f"\n📬 Conversation with {friend['username']} (ID: {friend['id']})")
            print(f"   Unread messages: {unread}")

            if last_msg:
                print(f"   Last message: {last_msg.get('content', 'Non-text message')}")
                print(f"   Type: {last_msg['message_type']}")
                print(f"   From: {'You' if last_msg['sender_id'] == 3 else friend['username']}")

            # Get all messages with this friend
            response2 = requests.get(
                f"{API_URL}/chat/messages/{friend['id']}",
                headers={"Authorization": f"Bearer {player1_token}"}
            )

            if response2.status_code == 200:
                data = response2.json()
                messages = data['messages']
                print(f"   Total messages in chat: {len(messages)}")

                # Show last 3 messages
                if messages:
                    print("   Recent messages:")
                    for msg in messages[-3:]:
                        sender = "You" if msg['sender_id'] == 3 else friend['username']
                        content = msg.get('content', f"[{msg['message_type']}]")
                        print(f"     - {sender}: {content}")
    else:
        print(f"Failed to get conversations: {response.status_code}")
else:
    print(f"Failed to login: {response.status_code}")