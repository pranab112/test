from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import UserType

# Friends association table
friends_association = Table(
    'friends',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('friend_id', Integer, ForeignKey('users.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)  # Nullable for client-created players
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=True)  # Default True for backward compatibility
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # User ID for searching (unique identifier)
    user_id = Column(String, unique=True, index=True, nullable=False)

    # Relationships for friend requests
    sent_friend_requests = relationship(
        "FriendRequest",
        foreign_keys="FriendRequest.sender_id",
        back_populates="sender",
        cascade="all, delete-orphan"
    )

    received_friend_requests = relationship(
        "FriendRequest",
        foreign_keys="FriendRequest.receiver_id",
        back_populates="receiver",
        cascade="all, delete-orphan"
    )

    # Many-to-many relationship for friends
    friends = relationship(
        "User",
        secondary=friends_association,
        primaryjoin=id == friends_association.c.user_id,
        secondaryjoin=id == friends_association.c.friend_id,
        backref="friend_of"
    )

    # Client-specific fields
    company_name = Column(String, nullable=True)

    # Player-specific fields
    player_level = Column(Integer, default=1)
    credits = Column(Integer, default=1000)

    # Profile picture
    profile_picture = Column(String, nullable=True)

    # Online status tracking
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())

    # Email verification
    secondary_email = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)

    # OTP-based email verification
    email_otp = Column(String(6), nullable=True)
    email_otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Two-Factor Authentication (2FA)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String, nullable=True)
    two_factor_backup_codes = Column(String, nullable=True)  # JSON array of backup codes

    # Track which client created this player
    created_by_client_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Moderation tracking
    malicious_reports_count = Column(Integer, default=0)  # Count of false/malicious reports made by this user
    is_trusted_reviewer = Column(Boolean, default=True)  # Can be set to False if user makes fake reviews
    is_suspended = Column(Boolean, default=False)  # Account suspension status
    suspension_reason = Column(String(500), nullable=True)
    suspended_until = Column(DateTime(timezone=True), nullable=True)

    # Referral system
    referral_code = Column(String(12), unique=True, index=True, nullable=True)  # Unique code for referring others
