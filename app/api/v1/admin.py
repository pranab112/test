from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import secrets
import string
import os
import uuid
import shutil
import asyncio
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, ReferralStatus, REFERRAL_BONUS_CREDITS
from app.services import send_referral_bonus_email
from app.s3_storage import s3_storage
from app.websocket import send_credit_update
from app.services.push_notification_service import send_credit_notification
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

def get_admin_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Ensure the current user is an admin"""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/dashboard-stats")
def get_dashboard_stats(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get overall platform statistics for admin dashboard"""

    # User statistics
    total_users = db.query(models.User).count()
    total_clients = db.query(models.User).filter(models.User.user_type == UserType.CLIENT).count()
    total_players = db.query(models.User).filter(models.User.user_type == UserType.PLAYER).count()
    active_users = db.query(models.User).filter(models.User.is_active == True).count()
    online_users = db.query(models.User).filter(models.User.is_online == True).count()
    pending_approvals = db.query(models.User).filter(
        models.User.is_approved == False,
        models.User.user_type == UserType.CLIENT
    ).count()

    # Recent registrations (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_registrations = db.query(models.User).filter(
        models.User.created_at >= seven_days_ago
    ).count()

    # Message statistics
    total_messages = db.query(models.Message).count()
    today_messages = db.query(models.Message).filter(
        func.date(models.Message.created_at) == func.date(datetime.utcnow())
    ).count()

    # Promotion statistics
    active_promotions = db.query(models.Promotion).filter(
        models.Promotion.status == models.PromotionStatus.ACTIVE
    ).count()
    total_claims = db.query(models.PromotionClaim).count()

    # Review statistics
    total_reviews = db.query(models.Review).count()
    avg_rating = db.query(func.avg(models.Review.rating)).scalar() or 0

    # Report statistics
    pending_reports = db.query(models.Report).filter(
        models.Report.status == models.ReportStatus.PENDING
    ).count()

    return {
        "users": {
            "total": total_users,
            "clients": total_clients,
            "players": total_players,
            "active": active_users,
            "online": online_users,
            "recent_registrations": recent_registrations,
            "pending_approvals": pending_approvals
        },
        "messages": {
            "total": total_messages,
            "today": today_messages
        },
        "promotions": {
            "active": active_promotions,
            "total_claims": total_claims
        },
        "reviews": {
            "total": total_reviews,
            "average_rating": round(avg_rating, 2)
        },
        "reports": {
            "pending": pending_reports
        }
    }

@router.get("/s3-diagnostics")
def get_s3_diagnostics(
    admin: models.User = Depends(get_admin_user)
):
    """
    Get S3 storage configuration and connection status.
    Use this endpoint to diagnose S3 upload issues.
    """
    # Get basic bucket info
    bucket_info = s3_storage.get_bucket_info()

    # Test connection if S3 is enabled
    if s3_storage.enabled:
        success, message = s3_storage.test_connection()
        bucket_info['connection_test'] = {
            'success': success,
            'message': message
        }

    # Add environment info (without exposing secrets)
    bucket_info['environment'] = os.getenv('ENVIRONMENT', 'development')
    bucket_info['aws_region_configured'] = os.getenv('AWS_REGION', 'us-east-1')

    return {
        "status": "ok" if bucket_info.get('bucket_accessible', False) else "warning",
        "s3_storage": bucket_info,
        "recommendations": _get_s3_recommendations(bucket_info)
    }


def _get_s3_recommendations(bucket_info: dict) -> list:
    """Generate recommendations based on S3 configuration status"""
    recommendations = []

    if not bucket_info.get('enabled'):
        recommendations.append({
            "level": "warning",
            "message": "S3 storage is disabled. Files are stored locally and will be lost on deployment.",
            "action": "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME environment variables."
        })

    if bucket_info.get('enabled') and not bucket_info.get('bucket_accessible'):
        recommendations.append({
            "level": "error",
            "message": f"Cannot access S3 bucket: {bucket_info.get('bucket_error', 'Unknown error')}",
            "action": "Check bucket name, region, and IAM permissions."
        })

    if bucket_info.get('acl_supported') is False:
        recommendations.append({
            "level": "info",
            "message": "S3 bucket has ACLs disabled (Object Ownership = Bucket owner enforced).",
            "action": "This is fine. Files are uploaded without ACL. Ensure bucket policy allows public read if needed."
        })

    if bucket_info.get('environment') == 'production' and not bucket_info.get('enabled'):
        recommendations.append({
            "level": "critical",
            "message": "S3 is disabled in production! Files will be lost on each deployment.",
            "action": "Configure S3 storage immediately for production use."
        })

    if not recommendations:
        recommendations.append({
            "level": "success",
            "message": "S3 storage is properly configured and accessible.",
            "action": None
        })

    return recommendations

@router.get("/users")
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    user_type: Optional[UserType] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_approved: Optional[bool] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users with filtering options"""
    query = db.query(models.User)

    if user_type:
        query = query.filter(models.User.user_type == user_type)

    if search:
        query = query.filter(
            or_(
                models.User.username.contains(search),
                models.User.email.contains(search),
                models.User.full_name.contains(search),
                models.User.user_id.contains(search)
            )
        )

    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)

    if is_approved is not None:
        query = query.filter(models.User.is_approved == is_approved)

    users = query.offset(skip).limit(limit).all()
    total = query.count()

    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


# Schema for creating client by admin
class AdminCreateClientRequest(BaseModel):
    email: str
    username: str
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    initial_credits: Optional[int] = 0


@router.post("/users/create-client")
def create_client(
    client_data: AdminCreateClientRequest,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new client account (admin only). Client is auto-approved."""
    import random
    import string

    # Check if email exists
    existing_user = db.query(models.User).filter(models.User.email == client_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username exists
    existing_user = db.query(models.User).filter(models.User.username == client_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate unique user_id
    def generate_user_id():
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

    user_id = generate_user_id()
    while db.query(models.User).filter(models.User.user_id == user_id).first():
        user_id = generate_user_id()

    # Hash the password
    hashed_password = auth.get_password_hash(client_data.password)

    # Create new client (auto-approved since created by admin)
    new_client = models.User(
        email=client_data.email,
        username=client_data.username,
        hashed_password=hashed_password,
        full_name=client_data.full_name,
        user_type=UserType.CLIENT,
        user_id=user_id,
        is_approved=True,  # Auto-approve when created by admin
        is_active=True,
        company_name=client_data.company_name,
        credits=client_data.initial_credits or 0
    )

    db.add(new_client)
    db.commit()
    db.refresh(new_client)

    logger.info(f"Admin {admin.username} created new client: {new_client.username}")

    return {
        "message": f"Client '{new_client.username}' created successfully",
        "user": {
            "id": new_client.id,
            "username": new_client.username,
            "email": new_client.email,
            "full_name": new_client.full_name,
            "user_type": new_client.user_type,
            "company_name": new_client.company_name,
            "credits": new_client.credits,
            "is_approved": new_client.is_approved,
            "is_active": new_client.is_active,
            "created_at": new_client.created_at
        }
    }


@router.patch("/users/{user_id}/approve")
def approve_user(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Approve a user (mainly for clients waiting for approval)"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        raise HTTPException(
            status_code=400,
            detail="User is already approved"
        )

    user.is_approved = True

    # Process referral bonus if this user was referred
    referral_bonus_credited = False
    referral = db.query(models.Referral).filter(
        models.Referral.referred_id == user.id,
        models.Referral.status == ReferralStatus.PENDING
    ).first()

    if referral:
        # Get the referrer and credit their bonus
        referrer = db.query(models.User).filter(
            models.User.id == referral.referrer_id
        ).first()

        if referrer:
            referrer.credits = (referrer.credits or 0) + referral.bonus_amount
            referral.status = ReferralStatus.COMPLETED
            referral.completed_at = func.now()
            referral_bonus_credited = True

            # Send email notification to referrer about bonus
            try:
                if referrer.email:
                    send_referral_bonus_email(
                        to_email=referrer.email,
                        username=referrer.username,
                        referred_username=user.username,
                        bonus_amount=referral.bonus_amount
                    )
            except Exception as e:
                logger.error(f"Failed to send referral bonus email: {e}")

    db.commit()
    db.refresh(user)

    message = f"User {user.username} approved successfully"
    if referral_bonus_credited:
        message += f". Referral bonus of {REFERRAL_BONUS_CREDITS} credits credited to referrer."

    return {
        "message": message,
        "user": user
    }

@router.patch("/users/{user_id}/reject")
def reject_user(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Reject/revoke approval for a user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_approved:
        raise HTTPException(
            status_code=400,
            detail="User is already not approved"
        )

    # Prevent rejecting admin accounts
    if user.user_type == UserType.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Cannot reject admin accounts"
        )

    user.is_approved = False
    db.commit()
    db.refresh(user)

    return {
        "message": f"User {user.username} approval revoked",
        "user": user
    }

@router.get("/pending-approvals")
def get_pending_approvals(
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users pending approval"""
    pending_users = db.query(models.User).filter(
        models.User.is_approved == False,
        models.User.user_type == UserType.CLIENT
    ).order_by(models.User.created_at.desc()).all()

    return {
        "pending_users": pending_users,
        "total": len(pending_users)
    }

@router.patch("/users/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Toggle user active/inactive status"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own admin account"
        )

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return {
        "message": f"User {'activated' if user.is_active else 'deactivated'} successfully",
        "user": user
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user account and all related data"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deleting themselves
    if user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own admin account"
        )

    # Prevent deleting other admins
    if user.user_type == UserType.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete other admin accounts"
        )

    username = user.username

    try:
        # Delete related records in order to avoid foreign key constraint violations

        # Delete messages (sent and received)
        db.query(models.Message).filter(
            or_(models.Message.sender_id == user_id, models.Message.receiver_id == user_id)
        ).delete(synchronize_session=False)

        # Delete friend requests (sent and received)
        db.query(models.FriendRequest).filter(
            or_(models.FriendRequest.sender_id == user_id, models.FriendRequest.receiver_id == user_id)
        ).delete(synchronize_session=False)

        # Delete reports (reported by or reported user)
        db.query(models.Report).filter(
            or_(models.Report.reporter_id == user_id, models.Report.reported_user_id == user_id)
        ).delete(synchronize_session=False)

        # Delete reviews
        if hasattr(models, 'Review'):
            db.query(models.Review).filter(
                or_(models.Review.reviewer_id == user_id, models.Review.reviewed_user_id == user_id)
            ).delete(synchronize_session=False)

        # Delete tickets and ticket messages
        if hasattr(models, 'TicketMessage'):
            db.query(models.TicketMessage).filter(models.TicketMessage.sender_id == user_id).delete(synchronize_session=False)
        if hasattr(models, 'Ticket'):
            db.query(models.Ticket).filter(models.Ticket.user_id == user_id).delete(synchronize_session=False)

        # Delete bet transactions
        if hasattr(models, 'BetTransaction'):
            db.query(models.BetTransaction).filter(models.BetTransaction.user_id == user_id).delete(synchronize_session=False)

        # Delete game credentials (both as client and player)
        if hasattr(models, 'GameCredentials'):
            db.query(models.GameCredentials).filter(
                or_(models.GameCredentials.client_id == user_id, models.GameCredentials.player_id == user_id)
            ).delete(synchronize_session=False)

        # Delete client games
        if hasattr(models, 'ClientGame'):
            db.query(models.ClientGame).filter(models.ClientGame.client_id == user_id).delete(synchronize_session=False)

        # Delete promotion claims
        if hasattr(models, 'PromotionClaim'):
            db.query(models.PromotionClaim).filter(models.PromotionClaim.player_id == user_id).delete(synchronize_session=False)

        # Delete promotions (if client)
        if hasattr(models, 'Promotion'):
            db.query(models.Promotion).filter(models.Promotion.client_id == user_id).delete(synchronize_session=False)

        # Delete offer claims
        if hasattr(models, 'OfferClaim'):
            db.query(models.OfferClaim).filter(models.OfferClaim.player_id == user_id).delete(synchronize_session=False)

        # Delete notifications
        if hasattr(models, 'Notification'):
            db.query(models.Notification).filter(models.Notification.user_id == user_id).delete(synchronize_session=False)

        # Delete referrals (as referrer or referred)
        if hasattr(models, 'Referral'):
            db.query(models.Referral).filter(
                or_(models.Referral.referrer_id == user_id, models.Referral.referred_id == user_id)
            ).delete(synchronize_session=False)

        # Finally delete the user
        db.delete(user)
        db.commit()

        return {"message": f"User {username} and all related data deleted successfully"}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.get("/messages")
def get_all_messages(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all messages in the system"""
    from sqlalchemy.orm import joinedload

    messages = db.query(models.Message)\
        .options(joinedload(models.Message.sender), joinedload(models.Message.receiver))\
        .order_by(models.Message.created_at.desc())\
        .offset(skip).limit(limit).all()

    total = db.query(models.Message).count()

    # Format messages with sender and receiver info
    formatted_messages = []
    for msg in messages:
        formatted_messages.append({
            "id": msg.id,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "sender": {
                "id": msg.sender.id,
                "username": msg.sender.username,
                "full_name": msg.sender.full_name,
                "user_type": msg.sender.user_type
            } if msg.sender else None,
            "receiver": {
                "id": msg.receiver.id,
                "username": msg.receiver.username,
                "full_name": msg.receiver.full_name,
                "user_type": msg.receiver.user_type
            } if msg.receiver else None
        })

    return {
        "messages": formatted_messages,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/promotions")
def get_all_promotions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[models.PromotionStatus] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all promotions in the system"""
    query = db.query(models.Promotion)

    if status:
        query = query.filter(models.Promotion.status == status)

    promotions = query.order_by(models.Promotion.created_at.desc())\
        .offset(skip).limit(limit).all()

    total = query.count()

    # Get claim statistics for each promotion
    for promo in promotions:
        promo.total_claims = db.query(models.PromotionClaim)\
            .filter(models.PromotionClaim.promotion_id == promo.id).count()

    return {
        "promotions": promotions,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.patch("/promotions/{promotion_id}/cancel")
def cancel_promotion(
    promotion_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Cancel an active promotion"""
    promotion = db.query(models.Promotion)\
        .filter(models.Promotion.id == promotion_id).first()

    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")

    if promotion.status != models.PromotionStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail="Can only cancel active promotions"
        )

    promotion.status = models.PromotionStatus.CANCELLED
    db.commit()

    return {"message": "Promotion cancelled successfully", "promotion": promotion}

@router.get("/reports")
def get_all_reports(
    status: Optional[models.ReportStatus] = None,
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all user reports"""
    query = db.query(models.Report)

    if status:
        query = query.filter(models.Report.status == status)

    reports = query.order_by(models.Report.created_at.desc())\
        .offset(skip).limit(limit).all()

    total = query.count()

    return {
        "reports": reports,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.patch("/reports/{report_id}/status")
def update_report_status(
    report_id: int,
    status: models.ReportStatus,
    admin_notes: Optional[str] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update the status of a report"""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = status
    if admin_notes:
        report.admin_notes = admin_notes
    report.reviewed_by = admin.id
    report.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    return {"message": "Report status updated", "report": report}

@router.get("/reviews")
def get_all_reviews(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all reviews in the system"""
    reviews = db.query(models.Review)\
        .order_by(models.Review.created_at.desc())\
        .offset(skip).limit(limit).all()

    total = db.query(models.Review).count()

    return {
        "reviews": reviews,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.delete("/reviews/{review_id}")
def delete_review(
    review_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a review (for inappropriate content)"""
    review = db.query(models.Review).filter(models.Review.id == review_id).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()

    return {"message": "Review deleted successfully"}

def generate_random_password(length: int = 12) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/users/{user_id}/reset-password", response_model=schemas.PasswordResetResponse)
def reset_user_password(
    user_id: int,
    request: schemas.AdminResetPasswordRequest,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Reset a user's password (admin only). Can specify a new password or generate a random one."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent resetting admin passwords
    if user.user_type == UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reset admin passwords"
        )

    # Generate or use provided password
    if request.generate_random:
        new_password = generate_random_password()
    elif request.new_password:
        new_password = request.new_password
    else:
        raise HTTPException(
            status_code=400,
            detail="Either provide a new_password or set generate_random to true"
        )

    # Hash and save the new password
    user.hashed_password = auth.get_password_hash(new_password)
    db.commit()

    return schemas.PasswordResetResponse(
        message=f"Password reset successfully for user {user.username}",
        temp_password=new_password if request.generate_random else None
    )

@router.post("/users/{user_id}/add-credits")
def add_credits_to_user(
    user_id: int,
    amount: int,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Add or subtract credits from a user account (admin only).
    Use positive amount to add credits, negative to subtract.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot modify admin credits
    if user.user_type == UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify admin credits"
        )

    # Calculate new balance
    current_credits = user.credits or 0
    new_credits = current_credits + amount

    # Prevent negative balance
    if new_credits < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot set negative credits. Current balance: {current_credits}, trying to subtract: {abs(amount)}"
        )

    # Update credits
    user.credits = new_credits

    # Send notification message to user
    action = "added to" if amount > 0 else "deducted from"
    abs_amount = abs(amount)
    dollar_value = abs_amount / 100  # 100 credits = $1

    message_content = f"💰 Credit Update\n\n{abs_amount} credits (${dollar_value:.2f}) have been {action} your account by admin."
    if reason:
        message_content += f"\n\nReason: {reason}"
    message_content += f"\n\nYour new balance: {new_credits} credits (${new_credits/100:.2f})"

    notification = models.Message(
        sender_id=admin.id,
        receiver_id=user.id,
        message_type=models.MessageType.TEXT,
        content=message_content,
        is_read=False
    )
    db.add(notification)

    db.commit()
    db.refresh(user)

    # Send real-time credit update via WebSocket
    target_user_id = user.id
    final_balance = new_credits

    def send_ws_update():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(send_credit_update(target_user_id, final_balance, amount, "admin_adjustment"))
        finally:
            loop.close()

    background_tasks.add_task(send_ws_update)

    # Send push notification for credit change
    background_tasks.add_task(
        send_credit_notification,
        db,
        user.id,
        amount,
        reason or "admin adjustment",
        "Admin",
    )

    return {
        "message": f"Successfully {'added' if amount > 0 else 'deducted'} {abs_amount} credits {'to' if amount > 0 else 'from'} {user.username}",
        "user_id": user.id,
        "username": user.username,
        "previous_balance": current_credits,
        "amount_changed": amount,
        "new_balance": new_credits,
        "reason": reason
    }


class BroadcastRequest(BaseModel):
    message: str
    user_type: Optional[UserType] = None

@router.post("/broadcast-message")
def broadcast_message(
    request: BroadcastRequest,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Send a broadcast message to all users or specific user type"""
    query = db.query(models.User).filter(models.User.id != admin.id)

    if request.user_type:
        query = query.filter(models.User.user_type == request.user_type)

    users = query.all()

    # Create messages for all selected users
    for user in users:
        new_message = models.Message(
            sender_id=admin.id,
            receiver_id=user.id,
            message_type=models.MessageType.TEXT,
            content=f"[ADMIN BROADCAST] {request.message}",
            is_read=False
        )
        db.add(new_message)

    db.commit()

    return {
        "message": f"Broadcast sent to {len(users)} users",
        "recipients": len(users)
    }

# ===== ADMIN GAMES ENDPOINTS =====

@router.get("/games")
def get_all_games(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all games"""
    games = db.query(models.Game).order_by(models.Game.created_at.desc()).offset(skip).limit(limit).all()
    return games

@router.post("/games")
async def create_game(
    request: Request,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new game"""
    # Parse form data
    form_data = await request.form()
    name = form_data.get("name")
    display_name = form_data.get("display_name")
    icon_url = form_data.get("icon_url")
    category = form_data.get("category")
    is_active = form_data.get("is_active", "true").lower() == "true"

    if not name or not display_name:
        raise HTTPException(
            status_code=400,
            detail="Name and display_name are required"
        )

    # Check if game name already exists
    existing_game = db.query(models.Game).filter(models.Game.name == name).first()
    if existing_game:
        raise HTTPException(
            status_code=400,
            detail=f"Game with name '{name}' already exists"
        )

    db_game = models.Game(
        name=name,
        display_name=display_name,
        icon_url=icon_url,
        category=category,
        is_active=is_active
    )

    db.add(db_game)
    db.commit()
    db.refresh(db_game)

    return db_game

@router.patch("/games/{game_id}")
async def update_game(
    game_id: int,
    request: Request,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update an existing game"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Parse form data
    form_data = await request.form()
    name = form_data.get("name")
    display_name = form_data.get("display_name")
    icon_url = form_data.get("icon_url")
    category = form_data.get("category")
    is_active_str = form_data.get("is_active")

    if name is not None:
        db_game.name = name
    if display_name is not None:
        db_game.display_name = display_name
    if icon_url is not None:
        db_game.icon_url = icon_url
    if category is not None:
        db_game.category = category
    if is_active_str is not None:
        new_is_active = is_active_str.lower() == "true"

        # If game is being deactivated, also deactivate it for all clients
        if db_game.is_active and not new_is_active:
            # Deactivate all client game selections for this game
            db.query(models.ClientGame).filter(
                models.ClientGame.game_id == game_id
            ).update({"is_active": False})

        db_game.is_active = new_is_active

    db.commit()
    db.refresh(db_game)

    return db_game

@router.delete("/games/{game_id}")
def delete_game(
    game_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a game and all associated client game selections"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check if game is currently active and being used by clients
    active_client_games = db.query(models.ClientGame).filter(
        models.ClientGame.game_id == game_id,
        models.ClientGame.is_active == True
    ).count()

    if active_client_games > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete game. It is currently active for {active_client_games} client(s). Deactivate it first before deleting."
        )

    game_name = db_game.display_name

    # Delete all client game selections for this game (inactive ones)
    db.query(models.ClientGame).filter(models.ClientGame.game_id == game_id).delete()

    # Delete any game credentials associated with this game
    db.query(models.GameCredentials).filter(models.GameCredentials.game_id == game_id).delete()

    # Delete the game
    db.delete(db_game)
    db.commit()

    return {"message": f"Game '{game_name}' deleted successfully"}


@router.post("/games/{game_id}/image")
async def upload_game_image(
    game_id: int,
    image: UploadFile = File(...),
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Upload an image for a game"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Read file content
    content = await image.read()

    # Validate file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Generate unique filename
    file_ext = os.path.splitext(image.filename)[1].lower() if image.filename else ".png"
    if file_ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        file_ext = ".png"
    unique_filename = f"{uuid.uuid4()}{file_ext}"

    icon_url = None

    if s3_storage.enabled:
        # Upload to S3
        try:
            from io import BytesIO
            file_obj = BytesIO(content)
            icon_url = s3_storage.upload_file(
                file_obj,
                unique_filename,
                folder="uploads/games",
                content_type=image.content_type
            )
            if icon_url:
                logger.info(f"Game image uploaded to S3: {icon_url}")
            else:
                raise Exception("S3 upload returned None")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}, falling back to local storage")
            # Fallback to local storage
            upload_dir = "uploads/games"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            icon_url = f"/uploads/games/{unique_filename}"
    else:
        # Local storage (development/fallback)
        upload_dir = "uploads/games"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            icon_url = f"/uploads/games/{unique_filename}"
            logger.warning(f"Game image saved locally (ephemeral): {icon_url}")
        except Exception as e:
            logger.error(f"Failed to save game image: {e}")
            raise HTTPException(status_code=500, detail="Failed to save image")

    # Update game icon_url
    db_game.icon_url = icon_url
    db.commit()

    return {"icon_url": icon_url, "message": "Game image uploaded successfully"}

