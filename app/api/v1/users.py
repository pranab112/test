from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app import models, schemas, auth
from app.database import get_db
from app.websocket import manager
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=schemas.UserSearchResponse)
async def search_users(
    query: Optional[str] = Query(None, description="Search by username or user_id"),
    user_type: Optional[models.UserType] = Query(None, description="Filter by user type"),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    users_query = db.query(models.User).filter(models.User.id != current_user.id)

    if query:
        users_query = users_query.filter(
            (models.User.username.ilike(f"%{query}%")) |
            (models.User.user_id.ilike(f"%{query}%"))
        )

    if user_type:
        users_query = users_query.filter(models.User.user_type == user_type)

    users = users_query.limit(20).all()
    return {"users": users}

@router.get("/all")
async def get_all_users(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all users in the system"""
    users = db.query(models.User).all()
    return [schemas.UserResponse.from_orm(user) for user in users]

@router.get("/online-status")
async def get_online_users(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get list of online user IDs and their statuses"""
    online_user_ids = manager.get_online_users()

    # Get friends of current user
    friends = [friend.id for friend in current_user.friends]

    # Return online status for friends
    online_friends = [user_id for user_id in online_user_ids if user_id in friends]

    return {
        "online_friends": online_friends,
        "total_online": len(online_user_ids)
    }

@router.get("/{user_id}", response_model=schemas.UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/{user_id}/online")
async def check_user_online(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Check if a specific user is online"""
    return {"user_id": user_id, "is_online": manager.is_user_online(user_id)}


@router.delete("/me")
async def delete_my_account(
    password: str = Body(..., embed=True),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's account and all associated data"""
    # Verify password
    if not auth.verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    # Prevent admins from deleting themselves through this endpoint
    if current_user.user_type == models.UserType.ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Admin accounts cannot be deleted through this endpoint"
        )

    user_id = current_user.id
    username = current_user.username

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
        if hasattr(models, 'GameCredential'):
            db.query(models.GameCredential).filter(
                or_(models.GameCredential.client_id == user_id, models.GameCredential.player_id == user_id)
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

        # Delete referrals (as referrer or referee)
        if hasattr(models, 'Referral'):
            db.query(models.Referral).filter(
                or_(models.Referral.referrer_id == user_id, models.Referral.referee_id == user_id)
            ).delete(synchronize_session=False)

        # Finally delete the user
        db.delete(current_user)
        db.commit()

        logger.info(f"User {username} (ID: {user_id}) deleted their account")
        return {"message": "Your account has been deleted successfully"}

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user account {user_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete account: {str(e)}"
        )