from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import ReferralStatus

# Referral bonus amount in credits
REFERRAL_BONUS_CREDITS = 500


class Referral(Base):
    """
    Tracks referrals between users.
    When a referred user completes registration and gets approved,
    the referrer receives bonus credits.
    """
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)

    # The user who made the referral (gets the bonus)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # The user who was referred (signed up using referral code)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Status of the referral
    status = Column(Enum(ReferralStatus), default=ReferralStatus.PENDING, nullable=False)

    # Amount of bonus credits awarded (stored for historical record)
    bonus_amount = Column(Integer, default=REFERRAL_BONUS_CREDITS, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)  # When bonus was credited

    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id], backref="referrals_made")
    referred = relationship("User", foreign_keys=[referred_id], backref="referred_by")
