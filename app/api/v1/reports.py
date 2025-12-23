from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=schemas.ReportResponse)
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
        reason=report.reason
    )

    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return schemas.ReportResponse(
        id=db_report.id,
        reporter_id=db_report.reporter_id,
        reported_user_id=db_report.reported_user_id,
        reporter_name=current_user.full_name or current_user.username,
        reporter_username=current_user.username,
        reported_user_name=reported_user.full_name or reported_user.username,
        reported_user_username=reported_user.username,
        reason=db_report.reason,
        status=db_report.status,
        created_at=db_report.created_at,
        updated_at=db_report.updated_at
    )

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
        reports_made_formatted.append(schemas.ReportResponse(
            id=report.id,
            reporter_id=report.reporter_id,
            reported_user_id=report.reported_user_id,
            reporter_name=current_user.full_name or current_user.username,
            reporter_username=current_user.username,
            reported_user_name=reported_user.full_name or reported_user.username,
            reported_user_username=reported_user.username,
            reason=report.reason,
            status=report.status,
            created_at=report.created_at,
            updated_at=report.updated_at
        ))

    # Format reports received
    reports_received_formatted = []
    for report in reports_received:
        reporter = db.query(models.User).filter(models.User.id == report.reporter_id).first()
        reports_received_formatted.append(schemas.ReportResponse(
            id=report.id,
            reporter_id=report.reporter_id,
            reported_user_id=report.reported_user_id,
            reporter_name=reporter.full_name or reporter.username,
            reporter_username=reporter.username,
            reported_user_name=current_user.full_name or current_user.username,
            reported_user_username=current_user.username,
            reason=report.reason,
            status=report.status,
            created_at=report.created_at,
            updated_at=report.updated_at
        ))

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

    return schemas.ReportResponse(
        id=report.id,
        reporter_id=report.reporter_id,
        reported_user_id=report.reported_user_id,
        reporter_name=current_user.full_name or current_user.username,
        reporter_username=current_user.username,
        reported_user_name=reported_user.full_name or reported_user.username,
        reported_user_username=reported_user.username,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        updated_at=report.updated_at
    )

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