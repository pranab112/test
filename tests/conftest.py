"""
Pytest configuration and fixtures for the test suite
"""
import pytest
import asyncio
import os
import sys
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from faker import Faker

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, get_db
from app.models import User, Game, UserType
from app.auth import get_password_hash
from app.config import settings

# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine with StaticPool for thread safety
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

fake = Faker()


# ============= Core Fixtures =============

@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with the test database"""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ============= User Fixtures =============

@pytest.fixture
def test_password():
    """Standard test password"""
    return "TestPass123!"


@pytest.fixture
def test_player(db, test_password):
    """Create a test player user"""
    user = User(
        email=fake.email(),
        username=f"player_{fake.user_name()}",
        hashed_password=get_password_hash(test_password),
        full_name=fake.name(),
        user_id=fake.unique.bothify(text='????????'),
        user_type=UserType.PLAYER,
        is_active=True,
        is_approved=True,
        player_level=1,
        credits=1000
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_client_user(db, test_password):
    """Create a test client user"""
    user = User(
        email=fake.email(),
        username=f"client_{fake.user_name()}",
        hashed_password=get_password_hash(test_password),
        full_name=fake.company(),
        user_id=fake.unique.bothify(text='????????'),
        user_type=UserType.CLIENT,
        company_name=fake.company(),
        is_active=True,
        is_approved=True  # Pre-approved for testing
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin(db, test_password):
    """Create a test admin user"""
    user = User(
        email="admin@test.com",
        username="test_admin",
        hashed_password=get_password_hash(test_password),
        full_name="Test Admin",
        user_id=fake.unique.bothify(text='????????'),
        user_type=UserType.ADMIN,
        is_active=True,
        is_approved=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def unapproved_client(db, test_password):
    """Create an unapproved client user"""
    user = User(
        email=fake.email(),
        username=f"unapproved_{fake.user_name()}",
        hashed_password=get_password_hash(test_password),
        full_name=fake.company(),
        user_id=fake.unique.bothify(text='????????'),
        user_type=UserType.CLIENT,
        company_name=fake.company(),
        is_active=True,
        is_approved=False  # Not approved
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ============= Authentication Fixtures =============

@pytest.fixture
def auth_headers_player(client, test_player, test_password):
    """Get auth token headers for player"""
    response = client.post("/auth/login", data={
        "username": test_player.username,
        "password": test_password
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_client(client, test_client_user, test_password):
    """Get auth token headers for client"""
    response = client.post("/auth/login", data={
        "username": test_client_user.username,
        "password": test_password
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_admin(client, test_admin, test_password):
    """Get auth token headers for admin"""
    response = client.post("/auth/login", data={
        "username": test_admin.username,
        "password": test_password
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============= Game Fixtures =============

@pytest.fixture
def populate_games(db):
    """Populate games table with test data"""
    games_data = [
        {"name": "juwa", "display_name": "Juwa", "category": "slots", "icon_url": "/static/images/games/juwa.png"},
        {"name": "fire_kirin", "display_name": "Fire Kirin", "category": "fish", "icon_url": "/static/images/games/fire_kirin.png"},
        {"name": "orion_stars", "display_name": "Orion Stars", "category": "slots", "icon_url": "/static/images/games/orion_stars.png"},
        {"name": "river_sweeps", "display_name": "River Sweeps", "category": "sweepstakes", "icon_url": "/static/images/games/river_sweeps.png"},
        {"name": "vegas_x", "display_name": "Vegas X", "category": "casino", "icon_url": "/static/images/games/vegas_x.png"},
    ]

    for game_data in games_data:
        game = Game(**game_data, is_active=True)
        db.add(game)

    db.commit()
    return db.query(Game).all()


# ============= Friendship Fixtures =============

@pytest.fixture
def make_friends(db):
    """Factory fixture to make two users friends"""

    def _make_friends(user1: User, user2: User):
        # Add to friends list (many-to-many)
        user1.friends.append(user2)
        user2.friends.append(user1)
        db.commit()
        return True

    return _make_friends


# ============= Helper Fixtures =============

@pytest.fixture
def create_test_user(db):
    """Factory fixture to create test users"""

    def _create_user(
        username: str = None,
        email: str = None,
        user_type: UserType = UserType.PLAYER,
        is_approved: bool = True,
        **kwargs
    ):
        user = User(
            email=email or fake.email(),
            username=username or f"user_{fake.user_name()}",
            hashed_password=get_password_hash("TestPass123!"),
            full_name=kwargs.get("full_name", fake.name()),
            user_id=fake.unique.bothify(text='????????'),
            user_type=user_type,
            is_active=kwargs.get("is_active", True),
            is_approved=is_approved,
            company_name=kwargs.get("company_name"),
            player_level=kwargs.get("player_level", 1),
            credits=kwargs.get("credits", 1000)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _create_user


@pytest.fixture
def async_client(client):
    """Async test client for WebSocket testing"""
    import httpx

    return httpx.AsyncClient(app=app, base_url="http://testserver")


# ============= Environment Fixtures =============

@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    """Set test environment variables"""
    monkeypatch.setenv("ENVIRONMENT", "testing")
    monkeypatch.setenv("ENABLE_RATE_LIMITING", "false")
    monkeypatch.setenv("CORS_ORIGINS", "*")
    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "test_key_" + "=" * 36)  # Valid Fernet key format
    yield


# ============= Cleanup Fixtures =============

@pytest.fixture(autouse=True)
def cleanup_faker():
    """Reset faker unique values after each test"""
    yield
    fake.unique.clear()


# ============= Async Support =============

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()