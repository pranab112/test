from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app import models, schemas, auth
from app.database import get_db
from app.models.enums import TicketStatus, TicketPriority, TicketCategory, UserType

router = APIRouter(prefix="/tickets", tags=["support-tickets"])


def generate_ticket_number() -> str:
    """Generate a unique ticket number like TKT-XXXXXXXX"""
    return f"TKT-{uuid.uuid4().hex[:8].upper()}"


def get_admin_user(
    current_user: models.User = Depends(auth.get_current_active_user)
) -> models.User:
    """Dependency to ensure user is admin"""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    return current_user


def format_ticket_response(ticket: models.Ticket, db: Session, include_messages: bool = False) -> dict:
    """Format ticket for response"""
    message_count = db.query(models.TicketMessage).filter(
        models.TicketMessage.ticket_id == ticket.id
    ).count()

    response = {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "user_id": ticket.user_id,
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "assigned_admin_id": ticket.assigned_admin_id,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "resolved_at": ticket.resolved_at,
        "closed_at": ticket.closed_at,
        "user": {
            "id": ticket.user.id,
            "username": ticket.user.username,
            "full_name": ticket.user.full_name,
            "user_type": ticket.user.user_type.value,
            "profile_picture": ticket.user.profile_picture
        } if ticket.user else None,
        "assigned_admin": {
            "id": ticket.assigned_admin.id,
            "username": ticket.assigned_admin.username,
            "full_name": ticket.assigned_admin.full_name,
            "user_type": ticket.assigned_admin.user_type.value,
            "profile_picture": ticket.assigned_admin.profile_picture
        } if ticket.assigned_admin else None,
        "message_count": message_count
    }

    if include_messages:
        messages = []
        for msg in ticket.messages:
            # Don't show internal notes to non-admin users
            messages.append({
                "id": msg.id,
                "ticket_id": msg.ticket_id,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "file_url": msg.file_url,
                "file_name": msg.file_name,
                "is_internal_note": bool(msg.is_internal_note),
                "created_at": msg.created_at,
                "sender": {
                    "id": msg.sender.id,
                    "username": msg.sender.username,
                    "full_name": msg.sender.full_name,
                    "user_type": msg.sender.user_type.value,
                    "profile_picture": msg.sender.profile_picture
                } if msg.sender else None
            })
        response["messages"] = messages

    return response


# ============== USER ENDPOINTS ==============

@router.post("/", response_model=schemas.TicketDetailResponse)
async def create_ticket(
    ticket_data: schemas.TicketCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket (Players and Clients only)"""

    # Admins don't create tickets - they respond to them
    if current_user.user_type == UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot create support tickets"
        )

    # Create the ticket
    ticket = models.Ticket(
        ticket_number=generate_ticket_number(),
        user_id=current_user.id,
        subject=ticket_data.subject,
        category=ticket_data.category,
        priority=ticket_data.priority,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.flush()  # Get the ticket ID

    # Add the initial message
    initial_message = models.TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=ticket_data.message
    )
    db.add(initial_message)
    db.commit()
    db.refresh(ticket)

    return format_ticket_response(ticket, db, include_messages=True)


@router.get("/my-tickets", response_model=schemas.TicketListResponse)
async def get_my_tickets(
    status_filter: Optional[TicketStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's tickets"""

    query = db.query(models.Ticket).filter(models.Ticket.user_id == current_user.id)

    if status_filter:
        query = query.filter(models.Ticket.status == status_filter)

    total_count = query.count()
    open_count = db.query(models.Ticket).filter(
        models.Ticket.user_id == current_user.id,
        models.Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER])
    ).count()
    resolved_count = db.query(models.Ticket).filter(
        models.Ticket.user_id == current_user.id,
        models.Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()

    tickets = query.order_by(models.Ticket.updated_at.desc()).offset(skip).limit(limit).all()

    return {
        "tickets": [format_ticket_response(t, db) for t in tickets],
        "total_count": total_count,
        "open_count": open_count,
        "resolved_count": resolved_count
    }


@router.get("/{ticket_id}", response_model=schemas.TicketDetailResponse)
async def get_ticket(
    ticket_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific ticket with all messages"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Check access - user can only see their own tickets, admin can see all
    if current_user.user_type != UserType.ADMIN and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    response = format_ticket_response(ticket, db, include_messages=True)

    # Filter out internal notes for non-admin users
    if current_user.user_type != UserType.ADMIN:
        response["messages"] = [m for m in response["messages"] if not m["is_internal_note"]]

    return response


@router.post("/{ticket_id}/messages", response_model=schemas.TicketMessageResponse)
async def add_ticket_message(
    ticket_id: int,
    message_data: schemas.TicketMessageCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a message to a ticket"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Check access
    is_admin = current_user.user_type == UserType.ADMIN
    if not is_admin and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Only admin can add internal notes
    if message_data.is_internal_note and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can add internal notes")

    # Check if ticket is closed
    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Cannot add messages to a closed ticket")

    # Create message
    message = models.TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=message_data.content,
        is_internal_note=1 if message_data.is_internal_note else 0
    )
    db.add(message)

    # Update ticket status based on who replied
    if is_admin:
        if ticket.status == TicketStatus.OPEN:
            ticket.status = TicketStatus.IN_PROGRESS
        elif ticket.status == TicketStatus.IN_PROGRESS:
            ticket.status = TicketStatus.WAITING_USER
        # Assign admin if not assigned
        if not ticket.assigned_admin_id:
            ticket.assigned_admin_id = current_user.id
    else:
        # User replied - change from waiting_user back to in_progress
        if ticket.status == TicketStatus.WAITING_USER:
            ticket.status = TicketStatus.IN_PROGRESS

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "ticket_id": message.ticket_id,
        "sender_id": message.sender_id,
        "content": message.content,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "is_internal_note": bool(message.is_internal_note),
        "created_at": message.created_at,
        "sender": {
            "id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "user_type": current_user.user_type.value,
            "profile_picture": current_user.profile_picture
        }
    }


@router.post("/{ticket_id}/close")
async def close_ticket_by_user(
    ticket_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """User closes their own ticket (marks as resolved)"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only close your own tickets")

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Ticket is already closed")

    ticket.status = TicketStatus.CLOSED
    ticket.closed_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Ticket closed successfully", "ticket_number": ticket.ticket_number}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all", response_model=schemas.TicketListResponse)
async def get_all_tickets(
    status_filter: Optional[TicketStatus] = None,
    priority_filter: Optional[TicketPriority] = None,
    category_filter: Optional[TicketCategory] = None,
    assigned_to_me: bool = False,
    unassigned: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all tickets (admin only)"""

    query = db.query(models.Ticket)

    if status_filter:
        query = query.filter(models.Ticket.status == status_filter)
    if priority_filter:
        query = query.filter(models.Ticket.priority == priority_filter)
    if category_filter:
        query = query.filter(models.Ticket.category == category_filter)
    if assigned_to_me:
        query = query.filter(models.Ticket.assigned_admin_id == current_user.id)
    if unassigned:
        query = query.filter(models.Ticket.assigned_admin_id == None)

    total_count = query.count()
    open_count = db.query(models.Ticket).filter(
        models.Ticket.status.in_([TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_USER])
    ).count()
    resolved_count = db.query(models.Ticket).filter(
        models.Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()

    # Order by priority (urgent first) then by creation date
    tickets = query.order_by(
        models.Ticket.priority.desc(),
        models.Ticket.created_at.asc()
    ).offset(skip).limit(limit).all()

    return {
        "tickets": [format_ticket_response(t, db) for t in tickets],
        "total_count": total_count,
        "open_count": open_count,
        "resolved_count": resolved_count
    }


@router.put("/admin/{ticket_id}", response_model=schemas.TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update ticket status, priority, or assignment (admin only)"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket_update.status:
        ticket.status = ticket_update.status
        if ticket_update.status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.now(timezone.utc)
        elif ticket_update.status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.now(timezone.utc)

    if ticket_update.priority:
        ticket.priority = ticket_update.priority

    if ticket_update.assigned_admin_id is not None:
        # Verify the assigned user is an admin
        assigned_admin = db.query(models.User).filter(
            models.User.id == ticket_update.assigned_admin_id,
            models.User.user_type == UserType.ADMIN
        ).first()
        if not assigned_admin:
            raise HTTPException(status_code=400, detail="Invalid admin ID")
        ticket.assigned_admin_id = ticket_update.assigned_admin_id

    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    return format_ticket_response(ticket, db)


@router.post("/admin/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: int,
    admin_id: Optional[int] = None,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Assign a ticket to an admin (or self if no admin_id provided)"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    target_admin_id = admin_id if admin_id else current_user.id

    # Verify the target is an admin
    target_admin = db.query(models.User).filter(
        models.User.id == target_admin_id,
        models.User.user_type == UserType.ADMIN
    ).first()
    if not target_admin:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    ticket.assigned_admin_id = target_admin_id
    ticket.updated_at = datetime.now(timezone.utc)

    if ticket.status == TicketStatus.OPEN:
        ticket.status = TicketStatus.IN_PROGRESS

    db.commit()

    return {
        "message": f"Ticket assigned to {target_admin.username}",
        "ticket_number": ticket.ticket_number,
        "assigned_to": target_admin.username
    }


@router.post("/admin/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: int,
    resolution_message: Optional[str] = None,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Mark a ticket as resolved (admin only)"""

    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status == TicketStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Ticket is already closed")

    # Add resolution message if provided
    if resolution_message:
        message = models.TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            content=resolution_message
        )
        db.add(message)

    ticket.status = TicketStatus.RESOLVED
    ticket.resolved_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)

    if not ticket.assigned_admin_id:
        ticket.assigned_admin_id = current_user.id

    db.commit()

    return {"message": "Ticket resolved", "ticket_number": ticket.ticket_number}


@router.get("/admin/stats", response_model=schemas.TicketStatsResponse)
async def get_ticket_stats(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get ticket statistics (admin only)"""

    total = db.query(models.Ticket).count()
    open_tickets = db.query(models.Ticket).filter(models.Ticket.status == TicketStatus.OPEN).count()
    in_progress = db.query(models.Ticket).filter(models.Ticket.status == TicketStatus.IN_PROGRESS).count()
    waiting_user = db.query(models.Ticket).filter(models.Ticket.status == TicketStatus.WAITING_USER).count()
    resolved_stat = db.query(models.Ticket).filter(models.Ticket.status == TicketStatus.RESOLVED).count()
    closed = db.query(models.Ticket).filter(models.Ticket.status == TicketStatus.CLOSED).count()

    urgent = db.query(models.Ticket).filter(
        models.Ticket.priority == TicketPriority.URGENT,
        models.Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()
    high = db.query(models.Ticket).filter(
        models.Ticket.priority == TicketPriority.HIGH,
        models.Ticket.status.notin_([TicketStatus.RESOLVED, TicketStatus.CLOSED])
    ).count()

    # Category breakdown
    by_category = {}
    for cat in TicketCategory:
        count = db.query(models.Ticket).filter(models.Ticket.category == cat).count()
        by_category[cat.value] = count

    # Average resolution time (for resolved tickets)
    resolved_tickets = db.query(models.Ticket).filter(
        models.Ticket.status.in_([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
        models.Ticket.resolved_at != None
    ).all()

    avg_resolution_time = None
    if resolved_tickets:
        total_hours = 0
        for t in resolved_tickets:
            if t.resolved_at and t.created_at:
                # Handle timezone-naive datetimes
                created_dt = t.created_at.replace(tzinfo=None) if t.created_at.tzinfo else t.created_at
                resolved_dt = t.resolved_at.replace(tzinfo=None) if t.resolved_at.tzinfo else t.resolved_at
                delta = resolved_dt - created_dt
                total_hours += delta.total_seconds() / 3600
        avg_resolution_time = total_hours / len(resolved_tickets)

    return {
        "total_tickets": total,
        "open_tickets": open_tickets,
        "in_progress_tickets": in_progress,
        "waiting_user_tickets": waiting_user,
        "resolved_tickets": resolved_stat,
        "closed_tickets": closed,
        "urgent_tickets": urgent,
        "high_priority_tickets": high,
        "by_category": by_category,
        "avg_resolution_time": avg_resolution_time
    }
