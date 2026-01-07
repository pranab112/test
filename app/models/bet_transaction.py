from sqlalchemy import Column, Integer, ForeignKey, DateTime, Enum, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import GameType, BetResult


class BetTransaction(Base):
    """
    Audit log for all betting transactions.
    Tracks every bet placed in mini-games for debugging and analytics.
    """
    __tablename__ = "bet_transactions"

    id = Column(Integer, primary_key=True, index=True)

    # User who placed the bet
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Game information
    game_type = Column(Enum(GameType), nullable=False, index=True)

    # Bet details
    bet_amount = Column(Integer, nullable=False)
    win_amount = Column(Integer, default=0, nullable=False)
    result = Column(Enum(BetResult), nullable=False, index=True)

    # Balance tracking
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)

    # Game-specific data (stored as JSON string for flexibility)
    # For dice: {"prediction": 7, "dice1": 3, "dice2": 4, "total": 7, "multiplier": 5.0}
    # For slots: {"symbols": ["🍒", "🍒", "🍒"], "multiplier": 10.0}
    game_data = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationship
    user = relationship("User", backref="bet_transactions")
