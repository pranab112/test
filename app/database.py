from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.base import Base  # Import from models.base
import os

# Get database URL from environment
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', settings.DATABASE_URL)

# Fix for Render's postgres:// URLs
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Check if using PostgreSQL
is_postgres = "postgresql://" in SQLALCHEMY_DATABASE_URL

if is_postgres:
    # PostgreSQL configuration
    engine_args = {
        "pool_size": 20,
        "max_overflow": 40,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    }

    # Add SSL for production
    if "localhost" not in SQLALCHEMY_DATABASE_URL and "127.0.0.1" not in SQLALCHEMY_DATABASE_URL:
        engine_args["connect_args"] = {"sslmode": "require"}

    engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_args)
else:
    # SQLite configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()