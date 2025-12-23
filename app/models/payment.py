from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

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
