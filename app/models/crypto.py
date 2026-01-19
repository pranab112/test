from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base


class AdminCryptoWallet(Base):
    """Admin's crypto wallet addresses for receiving payments"""
    __tablename__ = "admin_crypto_wallets"

    id = Column(Integer, primary_key=True, index=True)
    currency = Column(String(20), nullable=False)  # USDT, BTC, ETH, etc.
    network = Column(String(20), nullable=False)  # TRC20, ERC20, Bitcoin, etc.
    wallet_address = Column(String(255), nullable=False)
    label = Column(String(100), nullable=True)  # Optional label like "Main USDT Wallet"
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)  # For ordering in UI
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to purchase requests
    purchase_requests = relationship("CreditPurchaseRequest", back_populates="wallet")


class CreditPurchaseRequest(Base):
    """Client's request to purchase credits via crypto payment"""
    __tablename__ = "credit_purchase_requests"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wallet_id = Column(Integer, ForeignKey("admin_crypto_wallets.id"), nullable=False)

    # Amount details
    credits_amount = Column(Integer, nullable=False)  # Credits to be added
    crypto_amount = Column(Numeric(20, 8), nullable=False)  # Amount in crypto (e.g., 50.00000000 USDT)
    currency = Column(String(20), nullable=False)  # USDT, BTC, etc.
    network = Column(String(20), nullable=False)  # TRC20, ERC20, Bitcoin, etc.

    # Exchange rate at time of request (for reference)
    exchange_rate = Column(Numeric(20, 8), nullable=True)  # e.g., 100 credits = 1 USDT

    # Payment proof
    transaction_hash = Column(String(255), nullable=True)  # Blockchain transaction hash
    proof_screenshot = Column(String(500), nullable=True)  # URL to uploaded screenshot
    sender_wallet_address = Column(String(255), nullable=True)  # Client's wallet they sent from

    # Status
    status = Column(String(20), default="pending")  # pending, approved, rejected, cancelled

    # Admin response
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who processed
    admin_notes = Column(Text, nullable=True)  # Admin's notes (visible to client)
    rejection_reason = Column(Text, nullable=True)  # If rejected

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)  # When approved/rejected

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="credit_purchase_requests")
    admin = relationship("User", foreign_keys=[admin_id])
    wallet = relationship("AdminCryptoWallet", back_populates="purchase_requests")


# Credit rates per currency (can be adjusted by admin)
DEFAULT_CREDIT_RATES = {
    "USDT": 100,  # 100 credits = 1 USDT
    "BTC": 5000000,  # 100 credits = 0.00002 BTC (approx at $50k/BTC)
}
