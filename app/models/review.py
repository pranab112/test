from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, CheckConstraint, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import ReviewStatus


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

    # Moderation fields
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING, nullable=False)
    moderated_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who moderated
    moderated_at = Column(DateTime(timezone=True), nullable=True)
    admin_notes = Column(Text, nullable=True)  # Reason for rejection or notes
    appeal_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Link to appeal ticket

    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewer_id], backref="given_reviews")
    reviewee = relationship("User", foreign_keys=[reviewee_id], backref="received_reviews")
    moderator = relationship("User", foreign_keys=[moderated_by], backref="moderated_reviews")
    appeal_ticket = relationship("Ticket", backref="review_appeals")

    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range'),
        UniqueConstraint('reviewer_id', 'reviewee_id', name='unique_review_per_pair'),
    )
