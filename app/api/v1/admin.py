from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import secrets
import string
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, ReferralStatus, REFERRAL_BONUS_CREDITS
from app.services import send_referral_bonus_email
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
    """Delete a user account"""
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
    db.delete(user)
    db.commit()

    return {"message": f"User {username} deleted successfully"}

@router.get("/messages")
def get_all_messages(
    skip: int = 0,
    limit: int = 100,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all messages in the system"""
    messages = db.query(models.Message)\
        .order_by(models.Message.created_at.desc())\
        .offset(skip).limit(limit).all()

    total = db.query(models.Message).count()

    return {
        "messages": messages,
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

@router.post("/broadcast-message")
def broadcast_message(
    message: str,
    user_type: Optional[UserType] = None,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Send a broadcast message to all users or specific user type"""
    query = db.query(models.User).filter(models.User.id != admin.id)

    if user_type:
        query = query.filter(models.User.user_type == user_type)

    users = query.all()

    # Create messages for all selected users
    for user in users:
        new_message = models.Message(
            sender_id=admin.id,
            receiver_id=user.id,
            message_type=models.MessageType.TEXT,
            content=f"[ADMIN BROADCAST] {message}",
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
        db_game.is_active = is_active_str.lower() == "true"

    db.commit()
    db.refresh(db_game)

    return db_game

@router.delete("/games/{game_id}")
def delete_game(
    game_id: int,
    admin: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a game"""
    db_game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check if game is being used by any clients
    client_games = db.query(models.ClientGame).filter(models.ClientGame.game_id == game_id).count()
    if client_games > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete game. It is currently selected by {client_games} client(s). Deactivate it instead."
        )

    game_name = db_game.display_name
    db.delete(db_game)
    db.commit()

    return {"message": f"Game '{game_name}' deleted successfully"}

