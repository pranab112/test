from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Table, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserType(str, enum.Enum):
    CLIENT = "client"
    PLAYER = "player"
    ADMIN = "admin"

class FriendRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class MessageType(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VOICE = "voice"
    PROMOTION = "promotion"

class PromotionType(str, enum.Enum):
    BONUS = "bonus"
    CASHBACK = "cashback"
    FREE_SPINS = "free_spins"
    CREDITS = "credits"
    DEPOSIT_BONUS = "deposit_bonus"

class PromotionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    DEPLETED = "depleted"
    CANCELLED = "cancelled"

class ClaimStatus(str, enum.Enum):
    CLAIMED = "claimed"
    USED = "used"
    EXPIRED = "expired"

class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

friends_association = Table(
    'friends',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('friend_id', Integer, ForeignKey('users.id'), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    user_type = Column(Enum(UserType), nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=True)  # Default True for backward compatibility, new clients will be set to False
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

    # Email verification (for players who want to add additional email)
    secondary_email = Column(String, nullable=True)  # Additional email for verification
    is_email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, nullable=True)
    email_verification_sent_at = Column(DateTime(timezone=True), nullable=True)

    # Track which client created this player (for client-created players)
    created_by_client_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class FriendRequest(Base):
    __tablename__ = "friend_requests"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(FriendRequestStatus), default=FriendRequestStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_friend_requests")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_friend_requests")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_type = Column(Enum(MessageType), nullable=False, default=MessageType.TEXT)
    content = Column(Text, nullable=True)  # For text messages
    file_url = Column(String, nullable=True)  # For image/voice messages
    file_name = Column(String, nullable=True)  # Original filename
    duration = Column(Integer, nullable=True)  # Duration in seconds for voice messages
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], backref="received_messages")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is giving the review
    reviewee_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is being reviewed
    rating = Column(Integer, nullable=False)  # 1-5 star rating
    title = Column(String(200), nullable=False)  # Review title
    comment = Column(Text, nullable=True)  # Optional detailed review
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewer_id], backref="given_reviews")
    reviewee = relationship("User", foreign_keys=[reviewee_id], backref="received_reviews")

    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range'),
        UniqueConstraint('reviewer_id', 'reviewee_id', name='unique_review_per_pair'),
    )


class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    promotion_type = Column(Enum(PromotionType), nullable=False)
    value = Column(Integer, nullable=False)  # Amount in credits/percentage

    # Limits and conditions
    max_claims_per_player = Column(Integer, default=1)
    total_budget = Column(Integer)  # Total budget for this promotion
    used_budget = Column(Integer, default=0)  # Track used budget
    min_player_level = Column(Integer, default=1)

    # Validity
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(PromotionStatus), default=PromotionStatus.ACTIVE)

    # Target audience (null = all players)
    target_player_ids = Column(Text)  # JSON array of player IDs

    # Terms and conditions
    terms = Column(Text)
    wagering_requirement = Column(Integer, default=1)  # Multiplier for wagering

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="created_promotions")
    claims = relationship("PromotionClaim", back_populates="promotion", cascade="all, delete-orphan")


class PromotionClaim(Base):
    __tablename__ = "promotion_claims"

    id = Column(Integer, primary_key=True, index=True)
    promotion_id = Column(Integer, ForeignKey("promotions.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Track which client's promotion

    claimed_value = Column(Integer, nullable=False)  # Actual value claimed
    status = Column(Enum(ClaimStatus), default=ClaimStatus.CLAIMED)

    claimed_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True))
    expired_at = Column(DateTime(timezone=True))

    # Track usage
    wagering_completed = Column(Integer, default=0)  # Track wagering progress
    wagering_required = Column(Integer, nullable=False)  # Total wagering required

    # Relationships
    promotion = relationship("Promotion", back_populates="claims")
    player = relationship("User", foreign_keys=[player_id], backref="promotion_claims")
    client = relationship("User", foreign_keys=[client_id])

    # Unique constraint - one claim per player per promotion
    __table_args__ = (
        UniqueConstraint('promotion_id', 'player_id', name='unique_claim_per_player'),
    )


class PlayerWallet(Base):
    __tablename__ = "player_wallets"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Main balance
    main_balance = Column(Integer, default=0)

    # Bonus balances per client (stored as JSON)
    # Format: {"client_id": {"bonus": amount, "wagering_required": amount}}
    bonus_balances = Column(Text, default='{}')

    # Total wagering completed
    total_wagering = Column(Integer, default=0)

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    player = relationship("User", foreign_keys=[player_id], backref="wallet", uselist=False)


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)  # PayPal, Bitcoin, Bank Transfer, etc.
    display_name = Column(String, nullable=False)  # User-friendly name
    icon_url = Column(String, nullable=True)  # URL to payment method logo
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    client_selections = relationship("ClientPaymentMethod", back_populates="payment_method")


class ClientPaymentMethod(Base):
    __tablename__ = "client_payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("User", backref="accepted_payment_methods")
    payment_method = relationship("PaymentMethod", back_populates="client_selections")

    # Unique constraint - one entry per client per payment method
    __table_args__ = (
        UniqueConstraint('client_id', 'payment_method_id', name='unique_client_payment_method'),
    )


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    icon_url = Column(String, nullable=True)
    category = Column(String, nullable=True)  # e.g., 'sweepstakes', 'slots', 'table', 'fish'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client_selections = relationship("ClientGame", back_populates="game", cascade="all, delete-orphan")


class ClientGame(Base):
    __tablename__ = "client_games"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("User", backref="available_games")
    game = relationship("Game", back_populates="client_selections")

    # Unique constraint - one entry per client per game
    __table_args__ = (
        UniqueConstraint('client_id', 'game_id', name='unique_client_game'),
    )


class GameCredentials(Base):
    __tablename__ = "game_credentials"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    game_username = Column(String, nullable=False)
    game_password = Column(String, nullable=False)
    created_by_client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    player = relationship("User", foreign_keys=[player_id], backref="game_credentials")
    game = relationship("Game", backref="player_credentials")
    created_by_client = relationship("User", foreign_keys=[created_by_client_id])

    # Unique constraint - one credential per player per game
    __table_args__ = (
        UniqueConstraint('player_id', 'game_id', name='unique_player_game_credential'),
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is making the report
    reported_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is being reported
    reason = Column(Text, nullable=False)  # Reason for the report
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING)
    admin_notes = Column(Text, nullable=True)  # Admin notes on the report
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who reviewed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)  # When it was reviewed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], backref="reports_made")
    reported_user = relationship("User", foreign_keys=[reported_user_id], backref="reports_received")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reports_reviewed")

    # Constraints - one report per reporter per reported user
    __table_args__ = (
        UniqueConstraint('reporter_id', 'reported_user_id', name='unique_report_per_pair'),
    )