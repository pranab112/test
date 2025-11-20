"""
Test suite for game credentials router endpoints
"""
import pytest
from fastapi import status
from app.models import GameCredentials, Game, Message, MessageType, UserType


class TestCreateGameCredential:
    """Test creating game credentials"""

    def test_create_credential_success(self, client, auth_headers_client, test_client_user, test_player, populate_games, db):
        """Test successfully creating game credentials"""
        games = populate_games
        game = games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "player_game_user",
                "game_password": "player_game_pass"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["player_id"] == test_player.id
        assert data["game_id"] == game.id
        assert data["game_username"] == "player_game_user"
        assert data["game_password"] == "player_game_pass"
        assert data["created_by_client_id"] == test_client_user.id

        # Verify in database
        credential = db.query(GameCredentials).filter(
            GameCredentials.player_id == test_player.id,
            GameCredentials.game_id == game.id
        ).first()
        assert credential is not None

    def test_create_credential_sends_notification(self, client, auth_headers_client, test_player, populate_games, db):
        """Test that creating credentials sends notification to player"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "notify_user",
                "game_password": "notify_pass"
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Check notification message was sent
        notification = db.query(Message).filter(
            Message.receiver_id == test_player.id,
            Message.message_type == MessageType.TEXT
        ).first()

        assert notification is not None
        assert game.display_name in notification.content
        assert "notify_user" in notification.content
        assert "notify_pass" in notification.content

    def test_create_credential_only_client(self, client, auth_headers_player, test_player, populate_games):
        """Test only clients can create credentials"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_player,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "test_user",
                "game_password": "test_pass"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only clients" in response.json()["detail"]

    def test_create_credential_player_not_found(self, client, auth_headers_client, populate_games):
        """Test creating credential for non-existent player fails"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": 99999,
                "game_id": game.id,
                "game_username": "test_user",
                "game_password": "test_pass"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Player not found" in response.json()["detail"]

    def test_create_credential_game_not_found(self, client, auth_headers_client, test_player):
        """Test creating credential for non-existent game fails"""
        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": 99999,
                "game_username": "test_user",
                "game_password": "test_pass"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Game not found" in response.json()["detail"]

    def test_create_credential_duplicate(self, client, auth_headers_client, test_player, populate_games):
        """Test cannot create duplicate credentials"""
        game = populate_games[0]

        # Create first credential
        client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "user1",
                "game_password": "pass1"
            }
        )

        # Try to create duplicate
        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "user2",
                "game_password": "pass2"
            }
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exist" in response.json()["detail"]

    def test_create_credential_requires_auth(self, client, test_player, populate_games):
        """Test authentication is required"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "test",
                "game_password": "test"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_credential_for_client_not_player(self, client, auth_headers_client, test_client_user, populate_games):
        """Test cannot create credentials for a client user"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_client_user.id,
                "game_id": game.id,
                "game_username": "test",
                "game_password": "test"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Player not found" in response.json()["detail"]


class TestGetPlayerCredentials:
    """Test getting player credentials"""

    def test_get_player_credentials_by_client(self, client, auth_headers_client, test_player, populate_games, db):
        """Test client can get player credentials"""
        game = populate_games[0]

        # Create credential
        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test_user",
            game_password="test_pass"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "credentials" in data
        assert len(data["credentials"]) >= 1
        assert data["credentials"][0]["game_username"] == "test_user"

    def test_get_player_credentials_by_player_self(self, client, auth_headers_player, test_player, populate_games, db):
        """Test player can view their own credentials"""
        game = populate_games[0]

        # Create credential
        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="my_user",
            game_password="my_pass"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["credentials"]) >= 1

    def test_get_player_credentials_player_cannot_view_others(self, client, auth_headers_player, create_test_user, populate_games, db):
        """Test player cannot view other player's credentials"""
        other_player = create_test_user(username="other_player", user_type=UserType.PLAYER)
        game = populate_games[0]

        # Create credential for other player
        credential = GameCredentials(
            player_id=other_player.id,
            game_id=game.id,
            game_username="other_user",
            game_password="other_pass"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            f"/game-credentials/player/{other_player.id}",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "only view their own credentials" in response.json()["detail"]

    def test_get_player_credentials_not_found(self, client, auth_headers_client):
        """Test getting credentials for non-existent player"""
        response = client.get(
            "/game-credentials/player/99999",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_player_credentials_empty(self, client, auth_headers_client, test_player):
        """Test getting credentials when player has none"""
        response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "credentials" in data
        assert isinstance(data["credentials"], list)

    def test_get_player_credentials_includes_game_info(self, client, auth_headers_client, test_player, populate_games, db):
        """Test credentials include game information"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        cred = data["credentials"][0]
        assert "game_name" in cred
        assert "game_display_name" in cred
        assert cred["game_name"] == game.name


class TestUpdateGameCredential:
    """Test updating game credentials"""

    def test_update_credential_success(self, client, auth_headers_client, test_player, populate_games, db):
        """Test successfully updating credentials"""
        game = populate_games[0]

        # Create credential
        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="old_user",
            game_password="old_pass"
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)

        # Update credential
        response = client.put(
            f"/game-credentials/{credential.id}",
            headers=auth_headers_client,
            json={
                "game_username": "new_user",
                "game_password": "new_pass"
            }
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["game_username"] == "new_user"
        assert data["game_password"] == "new_pass"

    def test_update_credential_sends_notification(self, client, auth_headers_client, test_player, populate_games, db):
        """Test updating credentials sends notification"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="old",
            game_password="old"
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)

        # Clear existing messages
        db.query(Message).delete()
        db.commit()

        # Update
        client.put(
            f"/game-credentials/{credential.id}",
            headers=auth_headers_client,
            json={
                "game_username": "updated",
                "game_password": "updated"
            }
        )

        # Check notification
        notification = db.query(Message).filter(
            Message.receiver_id == test_player.id
        ).first()

        assert notification is not None
        assert "updated" in notification.content.lower()

    def test_update_credential_only_client(self, client, auth_headers_player, test_player, populate_games, db):
        """Test only clients can update credentials"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)

        response = client.put(
            f"/game-credentials/{credential.id}",
            headers=auth_headers_player,
            json={
                "game_username": "new",
                "game_password": "new"
            }
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_credential_not_found(self, client, auth_headers_client):
        """Test updating non-existent credential fails"""
        response = client.put(
            "/game-credentials/99999",
            headers=auth_headers_client,
            json={
                "game_username": "new",
                "game_password": "new"
            }
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_credential_requires_auth(self, client, test_player, populate_games, db):
        """Test authentication is required"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()

        response = client.put(
            f"/game-credentials/{credential.id}",
            json={
                "game_username": "new",
                "game_password": "new"
            }
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestDeleteGameCredential:
    """Test deleting game credentials"""

    def test_delete_credential_success(self, client, auth_headers_client, test_player, populate_games, db):
        """Test successfully deleting credentials"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="delete_me",
            game_password="delete_me"
        )
        db.add(credential)
        db.commit()
        credential_id = credential.id

        response = client.delete(
            f"/game-credentials/{credential_id}",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify deleted
        deleted = db.query(GameCredentials).filter(GameCredentials.id == credential_id).first()
        assert deleted is None

    def test_delete_credential_sends_notification(self, client, auth_headers_client, test_player, populate_games, db):
        """Test deleting credentials sends notification"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="delete",
            game_password="delete"
        )
        db.add(credential)
        db.commit()
        credential_id = credential.id

        # Clear messages
        db.query(Message).delete()
        db.commit()

        # Delete
        client.delete(
            f"/game-credentials/{credential_id}",
            headers=auth_headers_client
        )

        # Check notification
        notification = db.query(Message).filter(
            Message.receiver_id == test_player.id
        ).first()

        assert notification is not None
        assert "removed" in notification.content

    def test_delete_credential_only_client(self, client, auth_headers_player, test_player, populate_games, db):
        """Test only clients can delete credentials"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()

        response = client.delete(
            f"/game-credentials/{credential.id}",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_credential_not_found(self, client, auth_headers_client):
        """Test deleting non-existent credential fails"""
        response = client.delete(
            "/game-credentials/99999",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_credential_requires_auth(self, client, test_player, populate_games, db):
        """Test authentication is required"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()

        response = client.delete(f"/game-credentials/{credential.id}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetMyCredentials:
    """Test player getting their own credentials"""

    def test_get_my_credentials_success(self, client, auth_headers_player, test_player, populate_games, db):
        """Test player can get their own credentials"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="my_cred",
            game_password="my_pass"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            "/game-credentials/my-credentials",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "credentials" in data
        assert len(data["credentials"]) >= 1
        assert data["credentials"][0]["game_username"] == "my_cred"

    def test_get_my_credentials_only_player(self, client, auth_headers_client):
        """Test only players can use this endpoint"""
        response = client.get(
            "/game-credentials/my-credentials",
            headers=auth_headers_client
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Only players" in response.json()["detail"]

    def test_get_my_credentials_empty(self, client, auth_headers_player):
        """Test getting credentials when player has none"""
        response = client.get(
            "/game-credentials/my-credentials",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "credentials" in data
        assert isinstance(data["credentials"], list)

    def test_get_my_credentials_requires_auth(self, client):
        """Test authentication is required"""
        response = client.get("/game-credentials/my-credentials")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_my_credentials_includes_game_info(self, client, auth_headers_player, test_player, populate_games, db):
        """Test my credentials include game info"""
        game = populate_games[0]

        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="test",
            game_password="test"
        )
        db.add(credential)
        db.commit()

        response = client.get(
            "/game-credentials/my-credentials",
            headers=auth_headers_player
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        cred = data["credentials"][0]
        assert cred["game_name"] == game.name
        assert cred["game_display_name"] == game.display_name


class TestCredentialEncryption:
    """Test credential encryption features"""

    def test_credentials_are_stored(self, client, auth_headers_client, test_player, populate_games, db):
        """Test that credentials are properly stored in database"""
        game = populate_games[0]

        response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "encrypt_user",
                "game_password": "encrypt_pass"
            }
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify stored in database
        credential = db.query(GameCredentials).filter(
            GameCredentials.player_id == test_player.id,
            GameCredentials.game_id == game.id
        ).first()

        assert credential is not None
        # Plaintext should be stored (dual-write pattern)
        assert credential.game_username == "encrypt_user"
        assert credential.game_password == "encrypt_pass"

    def test_credentials_readable_after_create(self, client, auth_headers_client, test_player, populate_games):
        """Test credentials can be read back correctly"""
        game = populate_games[0]

        # Create
        create_response = client.post(
            "/game-credentials/",
            headers=auth_headers_client,
            json={
                "player_id": test_player.id,
                "game_id": game.id,
                "game_username": "readable_user",
                "game_password": "readable_pass"
            }
        )

        assert create_response.status_code == status.HTTP_200_OK
        created_data = create_response.json()

        # Read back
        read_response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_client
        )

        assert read_response.status_code == status.HTTP_200_OK
        read_data = read_response.json()
        read_cred = read_data["credentials"][0]

        # Should match what was created
        assert read_cred["game_username"] == created_data["game_username"]
        assert read_cred["game_password"] == created_data["game_password"]

    def test_credentials_readable_after_update(self, client, auth_headers_client, test_player, populate_games, db):
        """Test updated credentials can be read back"""
        game = populate_games[0]

        # Create
        credential = GameCredentials(
            player_id=test_player.id,
            game_id=game.id,
            game_username="original",
            game_password="original"
        )
        db.add(credential)
        db.commit()
        db.refresh(credential)

        # Update
        update_response = client.put(
            f"/game-credentials/{credential.id}",
            headers=auth_headers_client,
            json={
                "game_username": "updated_user",
                "game_password": "updated_pass"
            }
        )

        assert update_response.status_code == status.HTTP_200_OK

        # Read back
        read_response = client.get(
            f"/game-credentials/player/{test_player.id}",
            headers=auth_headers_client
        )

        read_cred = read_response.json()["credentials"][0]
        assert read_cred["game_username"] == "updated_user"
        assert read_cred["game_password"] == "updated_pass"
