from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Enum, UniqueConstraint, String, Float
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
    evidence = Column(Text, nullable=True)  # Evidence/details for the report
    status = Column(Enum(ReportStatus), default=ReportStatus.PENDING)

    # Investigation fields
    admin_notes = Column(Text, nullable=True)  # Admin notes on the report
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin who reviewed
    reviewed_at = Column(DateTime(timezone=True), nullable=True)  # When it was reviewed
    action_taken = Column(String(500), nullable=True)  # What action was taken (warning, suspension, ban, etc.)
    appeal_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)  # Link to appeal ticket

    # Warning/Grace period fields (4 days to resolve before report becomes valid)
    warning_sent_at = Column(DateTime(timezone=True), nullable=True)  # When warning was sent
    warning_deadline = Column(DateTime(timezone=True), nullable=True)  # Deadline to resolve (4 days from warning)
    resolution_amount = Column(Float, nullable=True)  # Amount to pay/refund (if applicable)
    resolution_notes = Column(Text, nullable=True)  # What the reported user needs to do to resolve
    resolved_at = Column(DateTime(timezone=True), nullable=True)  # When user marked as resolved
    resolution_proof = Column(Text, nullable=True)  # Proof of resolution (transaction ID, screenshot, etc.)
    auto_validated = Column(Integer, default=0)  # 1 if auto-validated after deadline expired

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], backref="reports_made")
    reported_user = relationship("User", foreign_keys=[reported_user_id], backref="reports_received")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reports_reviewed")
    appeal_ticket = relationship("Ticket", backref="report_appeals")

    # Constraints - one report per reporter per reported user
    __table_args__ = (
        UniqueConstraint('reporter_id', 'reported_user_id', name='unique_report_per_pair'),
    )
