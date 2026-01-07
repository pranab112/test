from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from app import models, schemas, auth
from app.database import get_db
from app.models.enums import ReportStatus, TicketCategory, TicketStatus, TicketPriority
import uuid

# Warning period in days
WARNING_PERIOD_DAYS = 4

router = APIRouter(prefix="/reports", tags=["reports"])


def get_admin_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Dependency to check if user is admin"""
    if current_user.user_type != models.UserType.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def format_report_response(report, reporter, reported_user, include_evidence=True):
    """Helper to format report response"""
    response = {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reported_user_id": report.reported_user_id,
        "reporter_name": reporter.full_name or reporter.username,
        "reporter_username": reporter.username,
        "reported_user_name": reported_user.full_name or reported_user.username,
        "reported_user_username": reported_user.username,
        "reason": report.reason,
        "evidence": report.evidence if include_evidence else None,
        "status": report.status,
        "created_at": report.created_at,
        "updated_at": report.updated_at
    }
    return response


def format_report_detail(report, reporter, reported_user):
    """Helper to format detailed report response for admin"""
    response = format_report_response(report, reporter, reported_user)
    response.update({
        "admin_notes": report.admin_notes,
        "reviewed_by": report.reviewed_by,
        "reviewed_at": report.reviewed_at,
        "action_taken": report.action_taken,
        "appeal_ticket_id": report.appeal_ticket_id,
        # Warning/Grace period fields
        "warning_sent_at": report.warning_sent_at,
        "warning_deadline": report.warning_deadline,
        "resolution_amount": report.resolution_amount,
        "resolution_notes": report.resolution_notes,
        "resolved_at": report.resolved_at,
        "resolution_proof": report.resolution_proof,
        "auto_validated": report.auto_validated
    })
    return response

@router.post("/")
def create_report(
    report: schemas.ReportCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if user is trying to report themselves
    if current_user.id == report.reported_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself"
        )

    # Check if reported user exists
    reported_user = db.query(models.User).filter(models.User.id == report.reported_user_id).first()
    if not reported_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if report already exists
    existing_report = db.query(models.Report).filter(
        models.Report.reporter_id == current_user.id,
        models.Report.reported_user_id == report.reported_user_id
    ).first()

    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reported this user. You can edit your existing report instead."
        )

    # Create new report
    db_report = models.Report(
        reporter_id=current_user.id,
        reported_user_id=report.reported_user_id,
        reason=report.reason,
        evidence=report.evidence
    )

    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    # Return report data with success message
    report_data = format_report_response(db_report, current_user, reported_user)
    return {
        "message": "Your report has been submitted successfully. Our support team will review it and get back to you soon.",
        "report": report_data
    }

@router.get("/my-reports", response_model=schemas.ReportListResponse)
def get_my_reports(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get reports made by current user
    reports_made = db.query(models.Report).filter(
        models.Report.reporter_id == current_user.id
    ).all()

    # Get reports received by current user
    reports_received = db.query(models.Report).filter(
        models.Report.reported_user_id == current_user.id
    ).all()

    # Format reports made
    reports_made_formatted = []
    for report in reports_made:
        reported_user = db.query(models.User).filter(models.User.id == report.reported_user_id).first()
        reports_made_formatted.append(format_report_response(report, current_user, reported_user))

    # Format reports received
    reports_received_formatted = []
    for report in reports_received:
        reporter = db.query(models.User).filter(models.User.id == report.reporter_id).first()
        reports_received_formatted.append(format_report_response(report, reporter, current_user))

    return schemas.ReportListResponse(
        reports_made=reports_made_formatted,
        reports_received=reports_received_formatted
    )

@router.get("/user/{user_id}")
def get_user_reports(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get reports about a specific user (for viewing on their profile)"""
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get reports received by this user
    reports = db.query(models.Report).filter(
        models.Report.reported_user_id == user_id
    ).all()

    # Get current user's report on this user (if exists)
    my_report = db.query(models.Report).filter(
        models.Report.reporter_id == current_user.id,
        models.Report.reported_user_id == user_id
    ).first()

    my_report_data = None
    if my_report:
        my_report_data = schemas.ReportResponse(
            id=my_report.id,
            reporter_id=my_report.reporter_id,
            reported_user_id=my_report.reported_user_id,
            reporter_name=current_user.full_name or current_user.username,
            reporter_username=current_user.username,
            reported_user_name=user.full_name or user.username,
            reported_user_username=user.username,
            reason=my_report.reason,
            status=my_report.status,
            created_at=my_report.created_at,
            updated_at=my_report.updated_at
        )

    return {
        "total_reports": len(reports),
        "my_report": my_report_data,
        "can_report": my_report is None and current_user.id != user_id
    }

@router.put("/{report_id}", response_model=schemas.ReportResponse)
def update_report(
    report_id: int,
    report_update: schemas.ReportUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get the report
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check if current user owns this report
    if report.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own reports"
        )

    # Update the report
    report.reason = report_update.reason
    db.commit()
    db.refresh(report)

    # Get reported user info
    reported_user = db.query(models.User).filter(models.User.id == report.reported_user_id).first()

    return format_report_response(report, current_user, reported_user)

@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Get the report
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )

    # Check if current user owns this report
    if report.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reports"
        )

    # Delete the report
    db.delete(report)
    db.commit()

    return {"message": "Report deleted successfully"}


# ============== ADMIN INVESTIGATION ENDPOINTS ==============

@router.get("/admin/pending", response_model=schemas.ReportInvestigationListResponse)
def get_pending_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get reports for investigation (admin only)"""

    # Base query
    reports_query = db.query(models.Report)

    # Apply status filter if provided
    if status_filter:
        try:
            report_status = ReportStatus(status_filter)
            reports_query = reports_query.filter(models.Report.status == report_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status_filter}")

    # Order by pending first, then by creation date
    reports_query = reports_query.order_by(
        models.Report.status == ReportStatus.PENDING,
        models.Report.created_at.desc()
    )

    total_count = reports_query.count()
    reports = reports_query.offset(skip).limit(limit).all()

    # Format reports with details
    formatted_reports = []
    for report in reports:
        reporter = db.query(models.User).filter(models.User.id == report.reporter_id).first()
        reported_user = db.query(models.User).filter(models.User.id == report.reported_user_id).first()
        formatted_reports.append(format_report_detail(report, reporter, reported_user))

    # Get counts by status
    pending_count = db.query(models.Report).filter(models.Report.status == ReportStatus.PENDING).count()
    investigating_count = db.query(models.Report).filter(models.Report.status == ReportStatus.INVESTIGATING).count()
    warning_count = db.query(models.Report).filter(models.Report.status == ReportStatus.WARNING).count()
    resolved_count = db.query(models.Report).filter(models.Report.status == ReportStatus.RESOLVED).count()
    valid_count = db.query(models.Report).filter(models.Report.status == ReportStatus.VALID).count()
    invalid_count = db.query(models.Report).filter(models.Report.status == ReportStatus.INVALID).count()
    malicious_count = db.query(models.Report).filter(models.Report.status == ReportStatus.MALICIOUS).count()

    return {
        "reports": formatted_reports,
        "total_count": total_count,
        "pending_count": pending_count,
        "investigating_count": investigating_count,
        "warning_count": warning_count,
        "resolved_count": resolved_count,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "malicious_count": malicious_count
    }


@router.post("/admin/{report_id}/investigate", response_model=schemas.ReportInvestigationResponse)
def investigate_report(
    report_id: int,
    investigation: schemas.ReportInvestigateRequest,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Investigate/close a report (admin only)"""

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    action = investigation.action.lower()
    valid_actions = ["investigating", "warning", "valid", "invalid", "malicious"]
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Action must be one of: {', '.join(valid_actions)}")

    # Update report status
    report.status = ReportStatus(action.upper())
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)
    report.admin_notes = investigation.admin_notes

    # Handle warning action - set up 4-day grace period
    if action == "warning":
        now = datetime.now(timezone.utc)
        report.warning_sent_at = now
        report.warning_deadline = now + timedelta(days=WARNING_PERIOD_DAYS)
        report.resolution_amount = investigation.resolution_amount
        report.resolution_notes = investigation.resolution_notes or "Please resolve this issue within 4 days to avoid penalties."
        report.action_taken = f"Warning issued - {WARNING_PERIOD_DAYS} days to resolve"

    if action == "valid" and investigation.action_taken:
        report.action_taken = investigation.action_taken

    # If report is malicious, increment malicious report count for reporter
    if action == "malicious":
        reporter = db.query(models.User).filter(models.User.id == report.reporter_id).first()
        if reporter:
            reporter.malicious_reports_count = (reporter.malicious_reports_count or 0) + 1
            # Suspend user if they have made too many malicious reports
            if reporter.malicious_reports_count >= 3:
                reporter.is_suspended = True
                reporter.suspension_reason = "Account suspended due to multiple malicious reports"

    db.commit()
    db.refresh(report)

    message = f"Report marked as {action}"
    if action == "warning":
        message = f"Warning sent to user. They have {WARNING_PERIOD_DAYS} days to resolve."

    return {
        "message": message,
        "report_id": report.id,
        "new_status": report.status.value,
        "admin_notes": report.admin_notes,
        "action_taken": report.action_taken
    }


@router.post("/appeal", response_model=dict)
def appeal_report(
    appeal_data: schemas.ReportAppealCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Appeal a report against you (creates a support ticket)"""

    # Get the report
    report = db.query(models.Report).filter(models.Report.id == appeal_data.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Only the reported user can appeal
    if report.reported_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the reported user can appeal this report")

    # Can't appeal if already closed as invalid or malicious
    if report.status in [ReportStatus.INVALID, ReportStatus.MALICIOUS]:
        raise HTTPException(status_code=400, detail="This report has already been dismissed")

    # Check if there's already an appeal ticket
    if report.appeal_ticket_id:
        raise HTTPException(status_code=400, detail="An appeal has already been submitted for this report")

    # Get reporter info for the ticket
    reporter = db.query(models.User).filter(models.User.id == report.reporter_id).first()

    # Create a support ticket for the appeal
    ticket_number = f"TKT-{uuid.uuid4().hex[:8].upper()}"
    ticket = models.Ticket(
        ticket_number=ticket_number,
        user_id=current_user.id,
        subject=f"Report Appeal: Report #{report.id}",
        category=TicketCategory.APPEAL_REPORT,
        priority=TicketPriority.MEDIUM,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.flush()

    # Add the appeal reason as the first message
    message = models.TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        content=f"Appeal Reason:\n\n{appeal_data.reason}\n\n---\nReport Details:\n- Reporter: {reporter.username}\n- Reason: {report.reason}\n- Evidence: {report.evidence or 'N/A'}"
    )
    db.add(message)

    # Link ticket to report
    report.appeal_ticket_id = ticket.id

    db.commit()

    return {
        "message": "Appeal submitted successfully",
        "ticket_number": ticket_number,
        "ticket_id": ticket.id,
        "report_id": report.id
    }


@router.get("/admin/reporter-stats/{user_id}")
def get_reporter_stats(
    user_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get reporting statistics for a user (admin only) - helps identify false reporters"""

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get report counts by status
    total_reports = db.query(models.Report).filter(models.Report.reporter_id == user_id).count()
    valid_reports = db.query(models.Report).filter(
        models.Report.reporter_id == user_id,
        models.Report.status == ReportStatus.VALID
    ).count()
    invalid_reports = db.query(models.Report).filter(
        models.Report.reporter_id == user_id,
        models.Report.status == ReportStatus.INVALID
    ).count()
    malicious_reports = db.query(models.Report).filter(
        models.Report.reporter_id == user_id,
        models.Report.status == ReportStatus.MALICIOUS
    ).count()

    # Calculate trust score (percentage of valid reports)
    trust_score = 100.0
    if total_reports > 0:
        trust_score = (valid_reports / total_reports) * 100

    return {
        "user_id": user_id,
        "username": user.username,
        "total_reports_made": total_reports,
        "valid_reports": valid_reports,
        "invalid_reports": invalid_reports,
        "malicious_reports": malicious_reports,
        "malicious_reports_count": user.malicious_reports_count or 0,
        "trust_score": round(trust_score, 2),
        "is_suspended": user.is_suspended,
        "suspension_reason": user.suspension_reason
    }


# ============== USER WARNING/RESOLUTION ENDPOINTS ==============

@router.get("/my-warnings", response_model=List[schemas.ReportWarningResponse])
def get_my_warnings(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all active warnings against the current user"""

    # Get reports with warning status against current user
    warnings = db.query(models.Report).filter(
        models.Report.reported_user_id == current_user.id,
        models.Report.status == ReportStatus.WARNING
    ).order_by(models.Report.warning_deadline.asc()).all()

    result = []
    now = datetime.now(timezone.utc)

    for report in warnings:
        if report.warning_deadline:
            time_remaining = report.warning_deadline - now
            days_remaining = max(0, time_remaining.days)
            hours_remaining = max(0, int(time_remaining.total_seconds() // 3600) % 24)
        else:
            days_remaining = 0
            hours_remaining = 0

        result.append({
            "report_id": report.id,
            "status": report.status.value,
            "reason": report.reason,
            "warning_sent_at": report.warning_sent_at,
            "warning_deadline": report.warning_deadline,
            "resolution_amount": report.resolution_amount,
            "resolution_notes": report.resolution_notes,
            "days_remaining": days_remaining,
            "hours_remaining": hours_remaining
        })

    return result


@router.post("/{report_id}/resolve", response_model=schemas.ReportResolutionResponse)
def resolve_report(
    report_id: int,
    resolution: schemas.ReportResolutionRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit resolution proof for a report with warning status"""

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Only the reported user can resolve
    if report.reported_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the reported user can resolve this report")

    # Can only resolve reports in warning status
    if report.status != ReportStatus.WARNING:
        raise HTTPException(status_code=400, detail="This report is not in warning status")

    # Check if deadline has passed
    now = datetime.now(timezone.utc)
    if report.warning_deadline and now > report.warning_deadline:
        raise HTTPException(status_code=400, detail="Resolution deadline has passed. The report has been validated.")

    # Calculate days remaining
    days_remaining = 0
    if report.warning_deadline:
        time_remaining = report.warning_deadline - now
        days_remaining = max(0, time_remaining.days)

    # Update report with resolution
    report.status = ReportStatus.RESOLVED
    report.resolved_at = now
    report.resolution_proof = resolution.resolution_proof
    if resolution.notes:
        report.admin_notes = (report.admin_notes or "") + f"\n\nUser resolution notes: {resolution.notes}"

    db.commit()
    db.refresh(report)

    return {
        "message": "Resolution submitted successfully. An admin will verify your resolution.",
        "report_id": report.id,
        "new_status": report.status.value,
        "resolved_at": report.resolved_at,
        "days_remaining": days_remaining
    }


@router.post("/admin/check-expired-warnings")
def check_expired_warnings(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Check and auto-validate reports with expired warning periods (admin only)"""

    now = datetime.now(timezone.utc)

    # Find all warning reports with expired deadlines
    expired_reports = db.query(models.Report).filter(
        models.Report.status == ReportStatus.WARNING,
        models.Report.warning_deadline < now
    ).all()

    validated_count = 0

    for report in expired_reports:
        report.status = ReportStatus.VALID
        report.auto_validated = 1
        report.action_taken = (report.action_taken or "") + " | Auto-validated: User did not resolve within deadline"
        validated_count += 1

    db.commit()

    return {
        "message": f"Processed {validated_count} expired warnings",
        "validated_count": validated_count
    }


@router.post("/admin/{report_id}/verify-resolution")
def verify_resolution(
    report_id: int,
    approve: bool,
    admin_notes: Optional[str] = None,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Verify a user's resolution submission (admin only)"""

    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != ReportStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="This report is not in resolved status")

    if approve:
        # Resolution approved - report is dismissed
        report.status = ReportStatus.INVALID
        report.action_taken = (report.action_taken or "") + " | Resolution verified and approved"
        message = "Resolution approved. Report dismissed."
    else:
        # Resolution rejected - report becomes valid
        report.status = ReportStatus.VALID
        report.action_taken = (report.action_taken or "") + " | Resolution rejected - report validated"
        message = "Resolution rejected. Report marked as valid."

    if admin_notes:
        report.admin_notes = (report.admin_notes or "") + f"\n\nVerification notes: {admin_notes}"

    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "message": message,
        "report_id": report.id,
        "new_status": report.status.value
    }