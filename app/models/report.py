from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
from app.models.enums import ReportStatus

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is making the report
    reported_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is being reported
    reason = Column(Text, nullable=False)  # Reason for the report
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING)
    admin_notes = Column(Text, nullable=True)  # Admin notes on the report
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who reviewed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)  # When it was reviewed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], backref="reports_made")
    reported_user = relationship("User", foreign_keys=[reported_user_id], backref="reports_received")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reports_reviewed")

    # Constraints - one report per reporter per reported user
    __table_args__ = (
        UniqueConstraint('reporter_id', 'reported_user_id', name='unique_report_per_pair'),
    )
