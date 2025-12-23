from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

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
