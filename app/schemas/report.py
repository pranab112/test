from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enums import ReportStatus

class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str

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
    status: ReportStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class ReportListResponse(BaseModel):
    reports_made: List[ReportResponse]
    reports_received: List[ReportResponse]
