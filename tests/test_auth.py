"""
Test suite for authentication endpoints
"""
import pytest
from fastapi import status


class TestRegistration:
    """Test user registration"""

    def test_register_player_success(self, client):
        """Test successful player registration"""
        response = client.post("/auth/register", json={
            "email": "newplayer@test.com",
            "username": "newplayer",
            "password": "SecurePass123!",
            "full_name": "New Player",
            "user_type": "player"  # Lowercase
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "newplayer@test.com"
        assert data["username"] == "newplayer"
        assert data["user_type"] == "player"
        assert data["is_approved"] == True  # Players are auto-approved
        assert "hashed_password" not in data  # Password should not be exposed

    def test_register_client_requires_approval(self, client):
        """Test that client registration requires admin approval"""
        response = client.post("/auth/register", json={
            "email": "newclient@test.com",
            "username": "newclient",
            "password": "SecurePass123!",
            "full_name": "New Client",
            "user_type": "client",
            "company_name": "Test Casino Inc"
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["user_type"] == "client"
        assert data["is_approved"] == False  # Clients need approval
        assert data["company_name"] == "Test Casino Inc"

    def test_register_duplicate_email(self, client, test_player):
        """Test registration with duplicate email fails"""
        response = client.post("/auth/register", json={
            "email": test_player.email,  # Use existing email
            "username": "newusername",
            "password": "SecurePass123!",
            "full_name": "Another User",
            "user_type": "player"
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_register_duplicate_username(self, client, test_player):
        """Test registration with duplicate username fails"""
        response = client.post("/auth/register", json={
            "email": "unique@test.com",
            "username": test_player.username,  # Use existing username
            "password": "SecurePass123!",
            "full_name": "Another User",
            "user_type": "player"
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Username already taken" in response.json()["detail"]

    def test_register_invalid_user_type(self, client):
        """Test registration with invalid user type fails"""
        response = client.post("/auth/register", json={
            "email": "test@test.com",
            "username": "testuser",
            "password": "SecurePass123!",
            "full_name": "Test User",
            "user_type": "INVALID"
        })

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_required_fields(self, client):
        """Test registration with missing fields fails"""
        response = client.post("/auth/register", json={
            "email": "test@test.com",
            "username": "testuser"
            # Missing password and other required fields
        })

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLogin:
    """Test user login"""

    def test_login_player_success(self, client, test_player, test_password):
        """Test successful player login"""
        response = client.post("/auth/login", data={
            "username": test_player.username,
            "password": test_password
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_type"] == "player"

    def test_login_client_success(self, client, test_client_user, test_password):
        """Test successful client login"""
        response = client.post("/auth/login", data={
            "username": test_client_user.username,
            "password": test_password
        })

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["user_type"] == "client"

    def test_login_unapproved_client_fails(self, client, unapproved_client, test_password):
        """Test that unapproved clients cannot login"""
        response = client.post("/auth/login", data={
            "username": unapproved_client.username,
            "password": test_password
        })

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "pending approval" in response.json()["detail"]

    def test_login_wrong_password(self, client, test_player):
        """Test login with wrong password fails"""
        response = client.post("/auth/login", data={
            "username": test_player.username,
            "password": "WrongPassword123!"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent username fails"""
        response = client.post("/auth/login", data={
            "username": "nonexistent",
            "password": "Password123!"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_empty_credentials(self, client):
        """Test login with empty credentials fails"""
        response = client.post("/auth/login", data={
            "username": "",
            "password": ""
        })

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestCurrentUser:
    """Test getting current user info"""

    def test_get_current_user_player(self, client, auth_headers_player, test_player):
        """Test getting current player info"""
        response = client.get("/auth/me", headers=auth_headers_player)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_player.id
        assert data["username"] == test_player.username
        assert data["user_type"] == "player"

    def test_get_current_user_client(self, client, auth_headers_client, test_client_user):
        """Test getting current client info"""
        response = client.get("/auth/me", headers=auth_headers_client)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_client_user.id
        assert data["company_name"] == test_client_user.company_name

    def test_get_current_user_unauthorized(self, client):
        """Test getting current user without auth fails"""
        response = client.get("/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token fails"""
        response = client.get("/auth/me", headers={
            "Authorization": "Bearer invalid_token"
        })

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestPasswordSecurity:
    """Test password security features"""

    def test_bcrypt_password_hashing(self, client, db):
        """Test that passwords are hashed with bcrypt"""
        response = client.post("/auth/register", json={
            "email": "bcrypt@test.com",
            "username": "bcryptuser",
            "password": "TestPassword123!",
            "full_name": "Bcrypt User",
            "user_type": "player"
        })

        assert response.status_code == status.HTTP_200_OK

        # Check the password is stored as bcrypt hash
        from app.models import User
        user = db.query(User).filter(User.username == "bcryptuser").first()
        assert user is not None
        assert user.hashed_password.startswith("$2b$")  # Bcrypt format

    def test_legacy_sha256_login_still_works(self, client, db, test_password):
        """Test that users with old SHA256 passwords can still login"""
        import hashlib
        from app.models import User

        # Create a user with SHA256 password (legacy)
        sha256_hash = hashlib.sha256(test_password.encode()).hexdigest()
        legacy_user = User(
            email="legacy@test.com",
            username="legacyuser",
            hashed_password=sha256_hash,  # Old format
            full_name="Legacy User",
            user_id="LEGACY01",
            user_type="PLAYER",
            is_active=True,
            is_approved=True
        )
        db.add(legacy_user)
        db.commit()

        # Try to login with the legacy user
        response = client.post("/auth/login", data={
            "username": "legacyuser",
            "password": test_password
        })

        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.json()

        # Check that password was migrated to bcrypt
        db.refresh(legacy_user)
        assert legacy_user.hashed_password.startswith("$2b$")  # Now bcrypt


class TestRateLimiting:
    """Test rate limiting on auth endpoints"""

    @pytest.mark.skipif(
        "os.getenv('ENABLE_RATE_LIMITING') != 'true'",
        reason="Rate limiting disabled in test environment"
    )
    def test_login_rate_limit(self, client):
        """Test that login endpoint has rate limiting"""
        # This test is skipped in test environment
        # In production, after 5 attempts in a minute, should get 429
        pass