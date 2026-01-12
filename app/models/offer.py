from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import OfferType, OfferStatus, OfferClaimStatus

class PlatformOffer(Base):
    """Platform-wide offers created by admins that players can claim with any client"""
    __tablename__ = "platform_offers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    offer_type = Column(Enum(OfferType), nullable=False)
    bonus_amount = Column(Integer, nullable=False)  # Bonus amount in dollars/credits

    # Conditions
    requirement_description = Column(String(500), nullable=True)  # e.g., "Add and verify your email address"
    requires_screenshot = Column(Boolean, default=False, nullable=False)  # Whether player must submit screenshot proof
    max_claims = Column(Integer, nullable=True)  # Max total claims (null = unlimited)
    max_claims_per_player = Column(Integer, default=1)  # How many times a player can claim

    # Validity
    status = Column(Enum(OfferStatus), default=OfferStatus.ACTIVE)
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    end_date = Column(DateTime(timezone=True), nullable=True)  # null = no expiry

    # Tracking
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin who created
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="created_offers")
    claims = relationship("OfferClaim", back_populates="offer")


class OfferClaim(Base):
    """Track when players claim offers and with which client"""
    __tablename__ = "offer_claims"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("platform_offers.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Client they claim with (optional)

    status = Column(Enum(OfferClaimStatus), default=OfferClaimStatus.PENDING)
    bonus_amount = Column(Integer, nullable=False)  # Amount at time of claim

    # For verification-based offers
    verification_data = Column(Text, nullable=True)  # e.g., email address that was verified
    screenshot_url = Column(String(500), nullable=True)  # Screenshot proof URL if required by offer

    claimed_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)  # When approved/rejected
    processed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Client who processed

    # Relationships
    offer = relationship("PlatformOffer", back_populates="claims")
    player = relationship("User", foreign_keys=[player_id], backref="offer_claims")
    client = relationship("User", foreign_keys=[client_id], backref="received_claims")
    processor = relationship("User", foreign_keys=[processed_by])

    # Constraints - one claim per offer per player
    __table_args__ = (
        UniqueConstraint('offer_id', 'player_id', name='unique_offer_claim_per_player'),
    )
