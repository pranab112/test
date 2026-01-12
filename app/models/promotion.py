from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import PromotionType, PromotionStatus, ClaimStatus

class Promotion(Base):
    __tablename__ = "promotions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    promotion_type = Column(Enum(PromotionType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    value = Column(Integer, nullable=False)  # Amount in credits/percentage

    # Limits and conditions
    max_claims_per_player = Column(Integer, default=1)
    total_budget = Column(Integer)  # Total budget for this promotion
    used_budget = Column(Integer, default=0)  # Track used budget
    min_player_level = Column(Integer, default=1)
    requires_screenshot = Column(Boolean, default=False, nullable=False)  # Whether player must submit screenshot proof

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
    status = Column(Enum(ClaimStatus), default=ClaimStatus.PENDING_APPROVAL)
    screenshot_url = Column(String(500), nullable=True)  # Screenshot proof URL if required by promotion

    claimed_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True))
    expired_at = Column(DateTime(timezone=True))

    # Approval tracking
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    approval_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)

    # Track usage
    wagering_completed = Column(Integer, default=0)  # Track wagering progress
    wagering_required = Column(Integer, nullable=False)  # Total wagering required

    # Relationships
    promotion = relationship("Promotion", back_populates="claims")
    player = relationship("User", foreign_keys=[player_id], backref="promotion_claims")
    client = relationship("User", foreign_keys=[client_id])
    approver = relationship("User", foreign_keys=[approved_by_id])
    approval_message = relationship("Message", foreign_keys=[approval_message_id])

    # Unique constraint - one claim per player per promotion
    __table_args__ = (
        UniqueConstraint('promotion_id', 'player_id', name='unique_claim_per_player'),
    )
