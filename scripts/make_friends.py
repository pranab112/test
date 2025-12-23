import requests

API_URL = "http://localhost:8000"

# Login as player1
print("Logging in as player1...")
response = requests.post(f"{API_URL}/auth/login", data={
    "username": "player1",
    "password": "password123"
})
player1_token = response.json()["access_token"]

# Login as client1
print("Logging in as client1...")
response = requests.post(f"{API_URL}/auth/login", data={
    "username": "client1",
    "password": "password123"
})
client1_token = response.json()["access_token"]

# Get client1's user ID
response = requests.get(f"{API_URL}/auth/me", headers={"Authorization": f"Bearer {client1_token}"})
client1_data = response.json()
client1_id = client1_data["user_id"]

# Player1 sends friend request to client1
print(f"Player1 sending friend request to client1 (ID: {client1_id})...")
response = requests.post(
    f"{API_URL}/friends/request",
    headers={"Authorization": f"Bearer {player1_token}"},
    json={"receiver_user_id": client1_id}
)

if response.status_code == 200:
    request_id = response.json()["id"]
    print(f"Friend request sent! ID: {request_id}")

    # Client1 accepts the friend request
    print("Client1 accepting friend request...")
    response = requests.put(
        f"{API_URL}/friends/requests/{request_id}",
        headers={"Authorization": f"Bearer {client1_token}"},
        json={"status": "accepted"}
    )

    if response.status_code == 200:
        print("✅ Friend request accepted! player1 and client1 are now friends!")
        print("\nYou can now:")
        print("1. Login as player1 (username: player1, password: password123)")
        print("2. Login as client1 (username: client1, password: password123)")
        print("3. They can chat with each other!")
    else:
        print(f"Failed to accept: {response.json()}")
else:
    print(f"Failed to send request: {response.json()}")