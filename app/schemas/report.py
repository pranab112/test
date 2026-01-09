from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from app.models.enums import ReportStatus


class ReportStatusEnum(str, Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    WARNING = "warning"  # 4-day grace period
    RESOLVED = "resolved"  # User resolved within grace period
    VALID = "valid"
    INVALID = "invalid"
    MALICIOUS = "malicious"


class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str = Field(..., min_length=10, max_length=2000)
    evidence: Optional[str] = Field(None, max_length=5000, description="Additional evidence or details")


class ReportUpdate(BaseModel):
    reason: str


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reporter_name: str
    reporter_username: str
    reported_user_name: str
    reported_user_username: str
    reason: str
    evidence: Optional[str]
    status: ReportStatus
    admin_notes: Optional[str] = None
    action_taken: Optional[str] = None
    appeal_ticket_id: Optional[int] = None
    warning_sent_at: Optional[datetime] = None
    warning_deadline: Optional[datetime] = None
    resolution_amount: Optional[float] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportDetailResponse(BaseModel):
    """Detailed report response for admin investigation"""
    id: int
    reporter_id: int
    reported_user_id: int
    reporter_name: str
    reporter_username: str
    reported_user_name: str
    reported_user_username: str
    reason: str
    evidence: Optional[str]
    status: ReportStatus
    admin_notes: Optional[str]
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    action_taken: Optional[str]
    appeal_ticket_id: Optional[int]
    # Warning/Grace period fields
    warning_sent_at: Optional[datetime]
    warning_deadline: Optional[datetime]
    resolution_amount: Optional[float]
    resolution_notes: Optional[str]
    resolved_at: Optional[datetime]
    resolution_proof: Optional[str]
    auto_validated: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports_made: List[ReportResponse]
    reports_received: List[ReportResponse]


class ReportInvestigationListResponse(BaseModel):
    """List response for admin report investigation"""
    reports: List[ReportDetailResponse]
    total_count: int
    pending_count: int
    investigating_count: int
    warning_count: int
    resolved_count: int
    valid_count: int
    invalid_count: int
    malicious_count: int


# Admin investigation schemas
class ReportInvestigateRequest(BaseModel):
    """Request to investigate/close a report"""
    action: str = Field(..., description="Action: 'investigating', 'warning', 'valid', 'invalid', 'malicious'")
    admin_notes: Optional[str] = Field(None, max_length=2000)
    action_taken: Optional[str] = Field(None, max_length=500, description="Action taken against reported user (if valid)")
    # Warning-specific fields (required when action='warning')
    resolution_amount: Optional[float] = Field(None, description="Amount to pay/refund (if applicable)")
    resolution_notes: Optional[str] = Field(None, max_length=1000, description="What the user needs to do to resolve")


class ReportInvestigationResponse(BaseModel):
    """Response after investigation action"""
    message: str
    report_id: int
    new_status: str
    admin_notes: Optional[str]
    action_taken: Optional[str]


# Appeal schemas
class ReportAppealCreate(BaseModel):
    """Create an appeal for a report against you"""
    report_id: int
    reason: str = Field(..., min_length=10, max_length=2000, description="Reason for appeal")


# Resolution schemas (for reported users to resolve during warning period)
class ReportResolutionRequest(BaseModel):
    """Request to mark a report as resolved (by the reported user)"""
    resolution_proof: str = Field(..., min_length=5, max_length=2000, description="Proof of resolution (transaction ID, screenshot URL, etc.)")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes about the resolution")


class ReportResolutionResponse(BaseModel):
    """Response after resolution submission"""
    message: str
    report_id: int
    new_status: str
    resolved_at: datetime
    days_remaining: int  # Days that were remaining when resolved


class ReportWarningResponse(BaseModel):
    """Response with warning details for the reported user"""
    report_id: int
    status: str
    reason: str
    warning_sent_at: datetime
    warning_deadline: datetime
    resolution_amount: Optional[float]
    resolution_notes: Optional[str]
    days_remaining: int
    hours_remaining: int
