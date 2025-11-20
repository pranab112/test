"""
Test suite for client router endpoints
"""
import pytest
from fastapi import status
from app.models import User, UserType


class TestPlayerRegistrationByClient:
    """Test player registration by client"""

    def test_register_player_success(self, client, auth_headers_client, db):
        """Test successful player registration by client"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "newplayer@test.com",
                "username": "newplayer123",
                "full_name": "New Player",
                "password": "PlayerPass123!"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "newplayer@test.com"
        assert data["username"] == "newplayer123"
        assert data["user_type"] == "player"
        assert data["is_active"] == True
        assert data["is_approved"] == True
        assert data["player_level"] == 1
        assert data["credits"] == 1000
        assert "temp_password" not in data  # No temp password when password provided
        assert "hashed_password" not in data

        # Verify password is bcrypt hashed
        player = db.query(User).filter(User.username == "newplayer123").first()
        assert player is not None
        assert player.hashed_password.startswith("$2b$")  # bcrypt format

    def test_register_player_auto_password(self, client, auth_headers_client, db):
        """Test player registration with auto-generated password"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "autoplayer@test.com",
                "username": "autoplayer123",
                "full_name": "Auto Player"
                # No password provided
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "temp_password" in data
        assert len(data["temp_password"]) == 12  # Generated password length

        # Verify password is bcrypt hashed
        player = db.query(User).filter(User.username == "autoplayer123").first()
        assert player is not None
        assert player.hashed_password.startswith("$2b$")  # bcrypt format, not SHA256

    def test_register_player_creates_friendship(self, client, auth_headers_client, test_client_user, db):
        """Test that player registration creates friendship with client"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "friend@test.com",
                "username": "friendplayer",
                "full_name": "Friend Player"
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Check friendship exists
        player = db.query(User).filter(User.username == "friendplayer").first()
        assert test_client_user in player.friends
        assert player in test_client_user.friends

    def test_register_player_duplicate_email(self, client, auth_headers_client, test_player):
        """Test registration with duplicate email fails"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": test_player.email,
                "username": "uniqueusername",
                "full_name": "Test Player"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_register_player_duplicate_username(self, client, auth_headers_client, test_player):
        """Test registration with duplicate username fails"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "unique@test.com",
                "username": test_player.username,
                "full_name": "Test Player"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username already taken" in response.json()["detail"]

    def test_register_player_unique_user_id(self, client, auth_headers_client, db):
        """Test that unique user_id is generated"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "userid@test.com",
                "username": "useridplayer",
                "full_name": "User ID Player"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        user_id = response.json()["user_id"]
        assert len(user_id) == 8
        assert user_id.isalnum()

    def test_register_player_tracks_client(self, client, auth_headers_client, test_client_user, db):
        """Test that created_by_client_id is set correctly"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "tracked@test.com",
                "username": "trackedplayer",
                "full_name": "Tracked Player"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        player = db.query(User).filter(User.username == "trackedplayer").first()
        assert player.created_by_client_id == test_client_user.id

    def test_register_player_requires_client_auth(self, client, auth_headers_player):
        """Test that only clients can register players"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_player,  # Player auth, not client
            json={
                "email": "notallowed@test.com",
                "username": "notallowed",
                "full_name": "Not Allowed"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Client access required" in response.json()["detail"]

    def test_register_player_requires_auth(self, client):
        """Test that auth is required"""
        response = client.post(
            "/client/register-player",
            json={
                "email": "noauth@test.com",
                "username": "noauth",
                "full_name": "No Auth"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_register_player_missing_fields(self, client, auth_headers_client):
        """Test registration with missing required fields fails"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "incomplete@test.com"
                # Missing username and full_name
            }
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestBulkPlayerRegistration:
    """Test bulk player registration"""

    def test_bulk_register_success(self, client, auth_headers_client, test_client_user, db):
        """Test successful bulk registration"""
        players_data = [
            {
                "email": "bulk1@test.com",
                "username": "bulk1",
                "full_name": "Bulk Player 1",
                "password": "Pass123!"
            },
            {
                "email": "bulk2@test.com",
                "username": "bulk2",
                "full_name": "Bulk Player 2"
                # Auto-generated password
            }
        ]

        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_client,
            json=players_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] == 2
        assert data["failed"] == 0
        assert len(data["created_players"]) == 2

        # Check temp password for second player
        assert data["created_players"][0]["temp_password"] is None
        assert data["created_players"][1]["temp_password"] is not None

        # Verify all use bcrypt
        bulk1 = db.query(User).filter(User.username == "bulk1").first()
        bulk2 = db.query(User).filter(User.username == "bulk2").first()
        assert bulk1.hashed_password.startswith("$2b$")
        assert bulk2.hashed_password.startswith("$2b$")

    def test_bulk_register_partial_failure(self, client, auth_headers_client, test_player):
        """Test bulk registration with some failures"""
        players_data = [
            {
                "email": "good@test.com",
                "username": "gooduser",
                "full_name": "Good User"
            },
            {
                "email": test_player.email,  # Duplicate
                "username": "baduser",
                "full_name": "Bad User"
            }
        ]

        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_client,
            json=players_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] == 1
        assert data["failed"] == 1
        assert len(data["failed_players"]) == 1
        assert "Email already exists" in data["failed_players"][0]["reason"]

    def test_bulk_register_duplicate_username(self, client, auth_headers_client, test_player):
        """Test bulk registration fails for duplicate username"""
        players_data = [
            {
                "email": "unique@test.com",
                "username": test_player.username,  # Duplicate
                "full_name": "Duplicate Username"
            }
        ]

        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_client,
            json=players_data
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["failed"] == 1
        assert "Username already exists" in data["failed_players"][0]["reason"]

    def test_bulk_register_requires_client_auth(self, client, auth_headers_player):
        """Test that only clients can bulk register"""
        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_player,
            json=[]
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_register_empty_list(self, client, auth_headers_client):
        """Test bulk registration with empty list"""
        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_client,
            json=[]
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] == 0
        assert data["failed"] == 0


class TestGetMyPlayers:
    """Test getting client's players"""

    def test_get_my_players_direct(self, client, auth_headers_client, test_client_user, db):
        """Test getting players created directly by client"""
        # Create a player via the client
        from app.auth import get_password_hash

        player = User(
            email="direct@test.com",
            username="directplayer",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Direct Player",
            user_id="DIRECT01",
            user_type=UserType.PLAYER,
            is_active=True,
            is_approved=True,
            created_by_client_id=test_client_user.id
        )
        db.add(player)
        db.commit()

        response = client.get("/client/my-players", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        usernames = [p["username"] for p in data]
        assert "directplayer" in usernames

    def test_get_my_players_with_credentials(self, client, auth_headers_client, test_client_user, test_player, db):
        """Test getting players who have credentials from client"""
        from app.models import GameCredentials

        # Create game credential for test_player from test_client_user
        credential = GameCredentials(
            player_id=test_player.id,
            game_id=1,
            username="creduser",
            password="credpass",
            created_by_client_id=test_client_user.id
        )
        db.add(credential)
        db.commit()

        response = client.get("/client/my-players", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        usernames = [p["username"] for p in data]
        assert test_player.username in usernames

    def test_get_my_players_pagination(self, client, auth_headers_client, test_client_user, db):
        """Test pagination works correctly"""
        from app.auth import get_password_hash

        # Create multiple players
        for i in range(5):
            player = User(
                email=f"player{i}@test.com",
                username=f"player{i}",
                hashed_password=get_password_hash("Pass123!"),
                full_name=f"Player {i}",
                user_id=f"PLAY{i:04d}",
                user_type=UserType.PLAYER,
                is_active=True,
                is_approved=True,
                created_by_client_id=test_client_user.id
            )
            db.add(player)
        db.commit()

        # Test skip and limit
        response = client.get("/client/my-players?skip=2&limit=2", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_get_my_players_requires_client_auth(self, client, auth_headers_player):
        """Test that only clients can access this endpoint"""
        response = client.get("/client/my-players", headers=auth_headers_player)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_my_players_empty(self, client, auth_headers_client):
        """Test getting players when client has none"""
        response = client.get("/client/my-players", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)


class TestPlayerStatistics:
    """Test player statistics endpoint"""

    def test_get_player_stats_basic(self, client, auth_headers_client, test_client_user, db):
        """Test basic player statistics"""
        from app.auth import get_password_hash

        # Create 2 players
        for i in range(2):
            player = User(
                email=f"stat{i}@test.com",
                username=f"statplayer{i}",
                hashed_password=get_password_hash("Pass123!"),
                full_name=f"Stat Player {i}",
                user_id=f"STAT{i:04d}",
                user_type=UserType.PLAYER,
                is_active=True,
                is_approved=True,
                is_online=(i == 0),  # First player online
                created_by_client_id=test_client_user.id
            )
            db.add(player)
        db.commit()

        response = client.get("/client/player-stats", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "total_players" in data
        assert "online_players" in data
        assert "new_today" in data
        assert data["total_players"] >= 2
        assert data["online_players"] >= 1
        assert data["new_today"] >= 2

    def test_get_player_stats_online_count(self, client, auth_headers_client, test_client_user, db):
        """Test online player count is accurate"""
        from app.auth import get_password_hash

        # Create online and offline players
        online_player = User(
            email="online@test.com",
            username="onlineplayer",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Online Player",
            user_id="ONLINE01",
            user_type=UserType.PLAYER,
            is_active=True,
            is_approved=True,
            is_online=True,
            created_by_client_id=test_client_user.id
        )
        offline_player = User(
            email="offline@test.com",
            username="offlineplayer",
            hashed_password=get_password_hash("Pass123!"),
            full_name="Offline Player",
            user_id="OFFLINE1",
            user_type=UserType.PLAYER,
            is_active=True,
            is_approved=True,
            is_online=False,
            created_by_client_id=test_client_user.id
        )
        db.add(online_player)
        db.add(offline_player)
        db.commit()

        response = client.get("/client/player-stats", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["online_players"] >= 1

    def test_get_player_stats_requires_client_auth(self, client, auth_headers_player):
        """Test that only clients can access statistics"""
        response = client.get("/client/player-stats", headers=auth_headers_player)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_player_stats_no_players(self, client, auth_headers_client):
        """Test statistics with no players"""
        response = client.get("/client/player-stats", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_players"] == 0
        assert data["online_players"] == 0
        assert data["new_today"] == 0


class TestPasswordSecurity:
    """Test password security for client-created players"""

    def test_client_created_player_uses_bcrypt(self, client, auth_headers_client, db):
        """Test that client-created players use bcrypt, not SHA256"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "bcrypttest@test.com",
                "username": "bcrypttest",
                "full_name": "Bcrypt Test",
                "password": "TestPassword123!"
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify bcrypt format
        player = db.query(User).filter(User.username == "bcrypttest").first()
        assert player is not None
        assert player.hashed_password.startswith("$2b$")
        assert not player.hashed_password.startswith("$2a$")
        # Ensure it's NOT SHA256 (64 hex chars)
        assert len(player.hashed_password) != 64

    def test_bulk_created_players_use_bcrypt(self, client, auth_headers_client, db):
        """Test that bulk-created players use bcrypt"""
        response = client.post(
            "/client/bulk-register-players",
            headers=auth_headers_client,
            json=[
                {
                    "email": "bulk_bcrypt@test.com",
                    "username": "bulk_bcrypt",
                    "full_name": "Bulk Bcrypt",
                    "password": "BulkPass123!"
                }
            ]
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify bcrypt format
        player = db.query(User).filter(User.username == "bulk_bcrypt").first()
        assert player is not None
        assert player.hashed_password.startswith("$2b$")
        assert len(player.hashed_password) != 64  # Not SHA256

    def test_auto_generated_password_uses_bcrypt(self, client, auth_headers_client, db):
        """Test that auto-generated passwords are bcrypt hashed"""
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "autobcrypt@test.com",
                "username": "autobcrypt",
                "full_name": "Auto Bcrypt"
                # No password - will be auto-generated
            }
        )

        assert response.status_code == status.HTTP_200_OK
        assert "temp_password" in response.json()

        # Verify bcrypt format
        player = db.query(User).filter(User.username == "autobcrypt").first()
        assert player is not None
        assert player.hashed_password.startswith("$2b$")

    def test_player_can_login_with_bcrypt_password(self, client, auth_headers_client):
        """Test that player created by client can successfully login"""
        password = "LoginTest123!"

        # Create player
        response = client.post(
            "/client/register-player",
            headers=auth_headers_client,
            json={
                "email": "logintest@test.com",
                "username": "logintest",
                "full_name": "Login Test",
                "password": password
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Try to login
        login_response = client.post("/auth/login", data={
            "username": "logintest",
            "password": password
        })

        assert login_response.status_code == status.HTTP_200_OK
        assert "access_token" in login_response.json()
