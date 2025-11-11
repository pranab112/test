"""
PostgreSQL-compatible database configuration
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

# Use PostgreSQL URL from environment or config
SQLALCHEMY_DATABASE_URL = os.getenv('DATABASE_URL', settings.DATABASE_URL)

# Fix for Render's postgres:// URLs (convert to postgresql://)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# PostgreSQL-specific engine configuration
engine_args = {
    "pool_size": 20,
    "max_overflow": 40,
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}

# Add SSL requirement for production
if "localhost" not in SQLALCHEMY_DATABASE_URL and "127.0.0.1" not in SQLALCHEMY_DATABASE_URL:
    engine_args["connect_args"] = {
        "sslmode": "require"
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    **engine_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()