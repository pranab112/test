from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.enums import TicketStatus, TicketPriority, TicketCategory


# --- Ticket Schemas ---

class TicketCreate(BaseModel):
    """Schema for creating a new support ticket"""
    subject: str = Field(..., min_length=5, max_length=200)
    category: TicketCategory = TicketCategory.OTHER
    priority: TicketPriority = TicketPriority.MEDIUM
    message: str = Field(..., min_length=10, max_length=5000, description="Initial message/description")


class TicketUpdate(BaseModel):
    """Schema for updating a ticket (admin only)"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_admin_id: Optional[int] = None


class TicketUserInfo(BaseModel):
    """Brief user info for ticket responses"""
    id: int
    username: str
    full_name: Optional[str] = None
    user_type: str
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class TicketMessageResponse(BaseModel):
    """Response schema for ticket messages"""
    id: int
    ticket_id: int
    sender_id: int
    content: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    is_internal_note: bool = False
    created_at: datetime
    sender: Optional[TicketUserInfo] = None

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    """Response schema for a ticket"""
    id: int
    ticket_number: str
    user_id: int
    subject: str
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    assigned_admin_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Include user info
    user: Optional[TicketUserInfo] = None
    assigned_admin: Optional[TicketUserInfo] = None

    # Message count
    message_count: Optional[int] = None

    class Config:
        from_attributes = True


class TicketDetailResponse(TicketResponse):
    """Detailed ticket response including messages"""
    messages: List[TicketMessageResponse] = []


class TicketListResponse(BaseModel):
    """Response for list of tickets"""
    tickets: List[TicketResponse]
    total_count: int
    open_count: int
    resolved_count: int


# --- Ticket Message Schemas ---

class TicketMessageCreate(BaseModel):
    """Schema for adding a message to a ticket"""
    content: str = Field(..., min_length=1, max_length=5000)
    is_internal_note: bool = False  # Admin only - internal notes not visible to user


class TicketStatsResponse(BaseModel):
    """Statistics about tickets (for admin dashboard)"""
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    waiting_user_tickets: int
    resolved_tickets: int
    closed_tickets: int

    # Priority breakdown
    urgent_tickets: int
    high_priority_tickets: int

    # Category breakdown
    by_category: dict

    # Average resolution time (in hours)
    avg_resolution_time: Optional[float] = None
