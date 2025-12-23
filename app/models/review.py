from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

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
