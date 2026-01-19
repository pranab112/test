from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import enum


class DevicePlatform(enum.Enum):
    IOS = "ios"
    ANDROID = "android"
    WEB = "web"


class PushToken(Base):
    """
    Stores Expo push notification tokens for users.
    Allows sending push notifications to mobile devices even when app is closed.
    """
    __tablename__ = "push_tokens"

    id = Column(Integer, primary_key=True, index=True)

    # User who owns this token
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Expo push token (e.g., ExponentPushToken[...])
    token = Column(String(255), nullable=False, unique=True, index=True)

    # Device info
    platform = Column(SQLAlchemyEnum(DevicePlatform), nullable=False, default=DevicePlatform.ANDROID)
    device_type = Column(String(100), nullable=True)  # Device model name

    # Token status
    is_active = Column(Boolean, default=True)  # Can be deactivated if token becomes invalid

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="push_tokens")
