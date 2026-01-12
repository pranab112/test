from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import TicketStatus, TicketPriority, TicketCategory


class Ticket(Base):
    """Support ticket for user-admin communication"""
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_number = Column(String(20), unique=True, index=True, nullable=False)

    # User who created the ticket
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Ticket details
    subject = Column(String(200), nullable=False)
    category = Column(Enum(TicketCategory), default=TicketCategory.OTHER, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False)

    # Admin assigned to ticket (optional)
    assigned_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="tickets_created")
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id], backref="tickets_assigned")
    messages = relationship("TicketMessage", back_populates="ticket", order_by="TicketMessage.created_at")


class TicketMessage(Base):
    """Messages within a support ticket"""
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Message content
    content = Column(Text, nullable=False)

    # Optional file attachment
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)

    # Is this an internal admin note (not visible to user)?
    is_internal_note = Column(Integer, default=0)  # 0 = visible to user, 1 = admin only

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", backref="ticket_messages")
