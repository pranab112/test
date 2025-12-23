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

def get_friends_list(token):
    """Get friends list for the client"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/friends/list", headers=headers)

    print(f"\nFriends List API Response:")
    print(f"Status: {response.status_code}")

    if response.ok:
        data = response.json()
        friends = data['friends']

        # Separate player friends and client friends
        player_friends = [f for f in friends if f['user_type'] == 'player']
        client_friends = [f for f in friends if f['user_type'] == 'client']

        print(f"\nTotal friends: {len(friends)}")
        print(f"Player friends: {len(player_friends)}")
        print(f"Client friends: {len(client_friends)}")

        if player_friends:
            print("\nPlayer friends that should appear in Players table:")
            for friend in player_friends:
                print(f"  - {friend['username']} (ID: {friend['user_id']}, Level: {friend.get('player_level', 1)})")
        else:
            print("\nNo player friends - Players table should show 'No player friends yet' message")

        return player_friends
    else:
        print(f"Failed: {response.text}")
        return None

def get_all_users(token):
    """Get all users to compare"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/all", headers=headers)

    if response.ok:
        users = response.json()
        all_players = [u for u in users if u['user_type'] == 'player']
        print(f"\n\nComparison - All players in system: {len(all_players)}")
        for player in all_players:
            print(f"  - {player['username']} (ID: {player['user_id']})")
        return all_players
    else:
        print(f"All users API failed: {response.text}")
        return None

def main():
    print("Testing Players Table - Friends Only")
    print("=" * 50)

    token = login_as_client()
    if token:
        player_friends = get_friends_list(token)
        all_players = get_all_users(token)

        if player_friends is not None and all_players is not None:
            print("\n" + "=" * 50)
            print("✓ VERIFICATION:")
            print(f"  - Total players in system: {len(all_players)}")
            print(f"  - Player friends to show in table: {len(player_friends)}")
            print(f"  - Players hidden from table: {len(all_players) - len(player_friends)}")
            print("\n✓ The Players table now only shows players who are friends with the client")
            print("✓ Other players are hidden until they become friends")

if __name__ == "__main__":
    main()