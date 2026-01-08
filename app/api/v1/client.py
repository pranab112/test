from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType, ReferralStatus, REFERRAL_BONUS_CREDITS
from app.services import send_referral_bonus_email
import random
import string
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client", tags=["client"])

def get_client_user(current_user: models.User = Depends(auth.get_current_active_user)):
    """Ensure the current user is a client"""
    if current_user.user_type != UserType.CLIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Client access required"
        )
    return current_user

def generate_user_id():
    """Generate a unique user ID"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_temp_password():
    """Generate a temporary password for player"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=12))

@router.post("/register-player", response_model=schemas.PlayerRegistrationResponse)
def register_player(
    player: schemas.PlayerCreateByClient,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Register a new player account as a client.
    The client can create player accounts for their customers.
    Only requires: username, full_name, password (optional).
    No email required for player accounts.
    Password defaults to username+@135 if not provided.
    """
    # Check if username exists
    existing_user = db.query(models.User).filter(models.User.username == player.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Generate password as username+@135 if not provided
    password = player.password if player.password else f"{player.username}@135"

    # Hash the password using bcrypt (secure with salt)
    hashed_password = auth.get_password_hash(password)

    # Generate unique user_id
    user_id = generate_user_id()
    while db.query(models.User).filter(models.User.user_id == user_id).first():
        user_id = generate_user_id()

    # Create new player (no email required)
    new_player = models.User(
        email=None,  # No email for client-created players
        username=player.username,
        hashed_password=hashed_password,
        full_name=player.full_name,
        user_type=UserType.PLAYER,
        user_id=user_id,
        is_approved=True,  # Players are auto-approved
        is_active=True,
        player_level=1,
        credits=1000,  # Starting credits
        created_by_client_id=client.id  # Track which client created this player
    )

    db.add(new_player)
    db.commit()
    db.refresh(new_player)

    # Automatically create a friend connection between client and player
    # This allows them to communicate
    if client.id not in [f.id for f in new_player.friends]:
        new_player.friends.append(client)
        client.friends.append(new_player)
        db.commit()

    # Create response with temp password if it was generated
    response_dict = {
        "id": new_player.id,
        "email": new_player.email,
        "username": new_player.username,
        "full_name": new_player.full_name,
        "user_type": new_player.user_type,
        "user_id": new_player.user_id,
        "is_active": new_player.is_active,
        "created_at": new_player.created_at,
        "player_level": new_player.player_level,
        "credits": new_player.credits,
        "profile_picture": new_player.profile_picture,
        "is_online": new_player.is_online,
        "last_seen": new_player.last_seen,
        "last_activity": new_player.last_activity,
        "secondary_email": new_player.secondary_email,
        "is_email_verified": new_player.is_email_verified
    }

    # Add temp password only if it was generated
    if not player.password:
        response_dict["temp_password"] = password

    return response_dict

@router.get("/my-players", response_model=List[schemas.UserResponse])
def get_my_players(
    skip: int = 0,
    limit: int = 100,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Get all players associated with this client.
    This includes players created by this client or who have game credentials from this client.
    """
    # Get all players created by this client OR who have game credentials from this client
    from sqlalchemy import or_

    # First get players created directly by this client
    direct_players = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER
    )

    # Also get players who have game credentials from this client
    credential_players = db.query(models.User).join(
        models.GameCredentials,
        models.GameCredentials.player_id == models.User.id
    ).filter(
        models.GameCredentials.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER
    )

    # Union and get unique players
    players = direct_players.union(credential_players).offset(skip).limit(limit).all()

    return players

@router.get("/player-stats")
def get_player_statistics(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get statistics about players associated with this client"""
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()

    # Total players (created by this client OR with credentials from this client)
    direct_count = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER
    ).count()

    credential_count = db.query(models.User).join(
        models.GameCredentials,
        models.GameCredentials.player_id == models.User.id
    ).filter(
        models.GameCredentials.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.created_by_client_id != client.id  # Don't double count
    ).distinct().count()

    total_players = direct_count + credential_count

    # Active players (online) - both directly created and with credentials
    online_direct = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.is_online == True
    ).count()

    online_credential = db.query(models.User).join(
        models.GameCredentials,
        models.GameCredentials.player_id == models.User.id
    ).filter(
        models.GameCredentials.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.is_online == True,
        models.User.created_by_client_id != client.id  # Don't double count
    ).distinct().count()

    online_players = online_direct + online_credential

    # Players registered today (directly created by this client)
    new_today = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        func.date(models.User.created_at) == today
    ).count()

    # Active players (is_active = True)
    active_direct = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.is_active == True
    ).count()

    active_credential = db.query(models.User).join(
        models.GameCredentials,
        models.GameCredentials.player_id == models.User.id
    ).filter(
        models.GameCredentials.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.is_active == True,
        models.User.created_by_client_id != client.id
    ).distinct().count()

    active_players = active_direct + active_credential

    # For now, these are placeholder values since we don't have a credits/level system yet
    total_credits = 0
    avg_credits = 0.0
    avg_level = 1.0

    return {
        "total_players": total_players,
        "active_players": active_players,
        "online_players": online_players,
        "total_credits": total_credits,
        "avg_credits": avg_credits,
        "avg_level": avg_level,
        "new_today": new_today
    }

@router.post("/bulk-register-players")
def bulk_register_players(
    players: List[schemas.PlayerCreateByClient],
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Bulk register multiple players at once.
    Useful for importing existing player databases.
    No email required - only username, full_name, and optional password.
    Password defaults to username+@135 if not provided.
    """
    created_players = []
    failed_players = []

    for player_data in players:
        try:
            # Check if username exists
            if db.query(models.User).filter(models.User.username == player_data.username).first():
                failed_players.append({
                    "username": player_data.username,
                    "reason": "Username already exists"
                })
                continue

            # Generate password as username+@135 if not provided
            password = player_data.password if player_data.password else f"{player_data.username}@135"
            hashed_password = auth.get_password_hash(password)

            # Generate unique user_id
            user_id = generate_user_id()
            while db.query(models.User).filter(models.User.user_id == user_id).first():
                user_id = generate_user_id()

            # Create player (no email required)
            new_player = models.User(
                email=None,  # No email for client-created players
                username=player_data.username,
                hashed_password=hashed_password,
                full_name=player_data.full_name,
                user_type=UserType.PLAYER,
                user_id=user_id,
                is_approved=True,
                is_active=True,
                player_level=1,
                credits=1000,
                created_by_client_id=client.id  # Track which client created this player
            )

            db.add(new_player)
            created_players.append({
                "username": new_player.username,
                "temp_password": password if not player_data.password else None
            })

        except Exception as e:
            failed_players.append({
                "username": player_data.username,
                "reason": str(e)
            })

    db.commit()

    return {
        "success": len(created_players),
        "failed": len(failed_players),
        "created_players": created_players,
        "failed_players": failed_players
    }

@router.get("/analytics", response_model=schemas.AnalyticsResponse)
async def get_analytics(
    current_user: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics data for the client dashboard"""
    from datetime import datetime, timedelta
    from sqlalchemy import or_

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    # --- Total Friends ---
    total_friends = len(current_user.friends) if current_user.friends else 0

    # Friends added in last week vs week before for trend
    # Note: We'll approximate trends based on available data
    friends_trend = {"value": "+0%", "is_positive": True}

    # --- Total Messages ---
    total_messages_sent = db.query(models.Message).filter(
        models.Message.sender_id == current_user.id
    ).count()
    total_messages_received = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id
    ).count()
    total_messages = total_messages_sent + total_messages_received

    # Messages in last week vs week before for trend
    messages_this_week = db.query(models.Message).filter(
        or_(
            models.Message.sender_id == current_user.id,
            models.Message.receiver_id == current_user.id
        ),
        func.date(models.Message.created_at) >= last_week
    ).count()
    messages_last_week = db.query(models.Message).filter(
        or_(
            models.Message.sender_id == current_user.id,
            models.Message.receiver_id == current_user.id
        ),
        func.date(models.Message.created_at) >= two_weeks_ago,
        func.date(models.Message.created_at) < last_week
    ).count()

    if messages_last_week > 0:
        msg_change = ((messages_this_week - messages_last_week) / messages_last_week) * 100
        messages_trend = {
            "value": f"{'+' if msg_change >= 0 else ''}{int(msg_change)}%",
            "is_positive": msg_change >= 0
        }
    else:
        messages_trend = {"value": f"+{messages_this_week}", "is_positive": True}

    # --- Active Players ---
    direct_active = db.query(models.User).filter(
        models.User.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER,
        models.User.is_active == True
    ).count()

    credential_active = db.query(models.User).join(
        models.GameCredentials,
        models.GameCredentials.player_id == models.User.id
    ).filter(
        models.GameCredentials.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER,
        models.User.is_active == True,
        models.User.created_by_client_id != current_user.id
    ).distinct().count()

    active_players = direct_active + credential_active
    players_trend = {"value": "+0%", "is_positive": True}

    # --- New Signups (today) ---
    new_signups = db.query(models.User).filter(
        models.User.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER,
        func.date(models.User.created_at) == today
    ).count()

    signups_yesterday = db.query(models.User).filter(
        models.User.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER,
        func.date(models.User.created_at) == yesterday
    ).count()

    if signups_yesterday > 0:
        signup_change = ((new_signups - signups_yesterday) / signups_yesterday) * 100
        signups_trend = {
            "value": f"{'+' if signup_change >= 0 else ''}{int(signup_change)}%",
            "is_positive": signup_change >= 0
        }
    else:
        signups_trend = {"value": f"+{new_signups}", "is_positive": True}

    # --- Avg Session Time (placeholder - would need session tracking) ---
    avg_session_time = "N/A"
    session_time_trend = {"value": "N/A", "is_positive": True}

    # --- Quick Stats ---
    # Response rate: messages responded to / messages received
    unread_messages = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id,
        models.Message.is_read == False
    ).count()

    if total_messages_received > 0:
        response_rate = ((total_messages_received - unread_messages) / total_messages_received) * 100
    else:
        response_rate = 100.0

    # Player retention: active players / total players
    total_direct = db.query(models.User).filter(
        models.User.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER
    ).count()

    if total_direct > 0:
        player_retention = (direct_active / total_direct) * 100
    else:
        player_retention = 100.0

    # Avg rating from reviews
    avg_rating_result = db.query(func.avg(models.Review.rating)).filter(
        models.Review.reviewee_id == current_user.id
    ).scalar()
    avg_rating = float(avg_rating_result) if avg_rating_result else 5.0

    quick_stats = {
        "response_rate": round(response_rate, 1),
        "player_retention": round(player_retention, 1),
        "avg_rating": round(avg_rating, 1)
    }

    # --- Recent Activity ---
    activities = []

    # Friend requests received
    friend_requests = db.query(models.FriendRequest).filter(
        models.FriendRequest.receiver_id == current_user.id
    ).order_by(models.FriendRequest.created_at.desc()).limit(3).all()

    for fr in friend_requests:
        activities.append({
            "activity_type": "friend_request",
            "description": "sent a friend request",
            "user": fr.sender.username,
            "timestamp": fr.created_at,
            "status": fr.status.value.title()
        })

    # Recent player registrations
    recent_players = db.query(models.User).filter(
        models.User.created_by_client_id == current_user.id,
        models.User.user_type == models.UserType.PLAYER
    ).order_by(models.User.created_at.desc()).limit(3).all()

    for player in recent_players:
        activities.append({
            "activity_type": "signup",
            "description": "signed up",
            "user": player.username,
            "timestamp": player.created_at,
            "status": "Active" if player.is_active else "Inactive"
        })

    # Recent messages
    recent_msgs = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id
    ).order_by(models.Message.created_at.desc()).limit(3).all()

    for msg in recent_msgs:
        activities.append({
            "activity_type": "message",
            "description": "sent you a message",
            "user": msg.sender.username,
            "timestamp": msg.created_at,
            "status": "Unread" if not msg.is_read else "Read"
        })

    # Sort and limit activities
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    activities = activities[:4]

    # --- Top Performing Promotions ---
    top_promotions = []
    promotions = db.query(models.Promotion).filter(
        models.Promotion.client_id == current_user.id,
        models.Promotion.status == models.PromotionStatus.ACTIVE
    ).order_by(models.Promotion.created_at.desc()).limit(3).all()

    for promo in promotions:
        claim_count = db.query(models.PromotionClaim).filter(
            models.PromotionClaim.promotion_id == promo.id
        ).count()

        # Calculate engagement rate based on budget usage
        if promo.total_budget and promo.total_budget > 0:
            rate = (promo.used_budget / promo.total_budget) * 100
        else:
            rate = 0

        top_promotions.append({
            "name": promo.title,
            "claims": claim_count,
            "rate": round(rate, 1)
        })

    return {
        "total_friends": total_friends,
        "total_messages": total_messages,
        "active_players": active_players,
        "new_signups": new_signups,
        "avg_session_time": avg_session_time,
        "friends_trend": friends_trend,
        "messages_trend": messages_trend,
        "players_trend": players_trend,
        "signups_trend": signups_trend,
        "session_time_trend": session_time_trend,
        "quick_stats": quick_stats,
        "recent_activity": activities,
        "top_promotions": top_promotions
    }


@router.get("/recent-activity", response_model=schemas.RecentActivityResponse)
async def get_recent_activity(
    current_user: models.User = Depends(get_client_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get recent activity for the client dashboard"""
    from datetime import datetime, timedelta

    activities = []

    # Get recent friend requests (sent and received)
    friend_requests_sent = db.query(models.FriendRequest).filter(
        models.FriendRequest.sender_id == current_user.id
    ).order_by(models.FriendRequest.created_at.desc()).limit(5).all()

    for fr in friend_requests_sent:
        activities.append(schemas.ActivityItem(
            activity_type="friend_request_sent",
            description="Friend Request Sent",
            user=fr.receiver.username,
            timestamp=fr.created_at,
            status=fr.status.value.title()
        ))

    friend_requests_received = db.query(models.FriendRequest).filter(
        models.FriendRequest.receiver_id == current_user.id
    ).order_by(models.FriendRequest.created_at.desc()).limit(5).all()

    for fr in friend_requests_received:
        activities.append(schemas.ActivityItem(
            activity_type="friend_request_received",
            description="Friend Request Received",
            user=fr.sender.username,
            timestamp=fr.created_at,
            status=fr.status.value.title()
        ))

    # Get recently registered players by this client
    recent_players = db.query(models.User).filter(
        models.User.user_type == UserType.PLAYER,
        models.User.created_by_client_id == current_user.id,
        models.User.created_at >= datetime.now() - timedelta(days=7)
    ).order_by(models.User.created_at.desc()).limit(5).all()

    for player in recent_players:
        activities.append(schemas.ActivityItem(
            activity_type="player_registered",
            description="Player Registered",
            user=player.username,
            timestamp=player.created_at,
            status="Active" if player.is_active else "Inactive"
        ))

    # Get recent messages
    recent_messages = db.query(models.Message).filter(
        models.Message.receiver_id == current_user.id
    ).order_by(models.Message.created_at.desc()).limit(5).all()

    for msg in recent_messages:
        activities.append(schemas.ActivityItem(
            activity_type="message_received",
            description="Message Received",
            user=msg.sender.username,
            timestamp=msg.created_at,
            status="Unread" if not msg.is_read else "Read"
        ))

    # Sort all activities by timestamp and limit
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    activities = activities[:limit]

    return {"activities": activities}


@router.get("/pending-players", response_model=List[schemas.UserResponse])
def get_pending_players(
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Get all players waiting for approval from this client.
    These are players who self-registered and specified this client.
    """
    pending_players = db.query(models.User).filter(
        models.User.created_by_client_id == client.id,
        models.User.user_type == UserType.PLAYER,
        models.User.is_approved == False
    ).order_by(models.User.created_at.desc()).all()

    return pending_players


@router.patch("/approve-player/{player_id}")
def approve_player(
    player_id: int,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Approve a pending player registration.
    The player must have registered under this client.
    Also processes referral bonus if applicable.
    """
    # Find the player
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == UserType.PLAYER
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if this client can approve this player
    if player.created_by_client_id != client.id:
        raise HTTPException(
            status_code=403,
            detail="You can only approve players who registered under your account"
        )

    if player.is_approved:
        raise HTTPException(status_code=400, detail="Player is already approved")

    # Approve the player
    player.is_approved = True

    # Automatically create friend connection between client and player
    if client.id not in [f.id for f in player.friends]:
        player.friends.append(client)
        client.friends.append(player)

    # Process referral bonus if this player was referred
    referral_bonus_credited = False
    referral = db.query(models.Referral).filter(
        models.Referral.referred_id == player.id,
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
                        referred_username=player.username,
                        bonus_amount=referral.bonus_amount
                    )
            except Exception as e:
                logger.error(f"Failed to send referral bonus email: {e}")

    db.commit()
    db.refresh(player)

    message = f"Player {player.username} approved successfully"
    if referral_bonus_credited:
        message += f". Referral bonus of {REFERRAL_BONUS_CREDITS} credits credited to referrer."

    return {
        "message": message,
        "player": player
    }


@router.patch("/reject-player/{player_id}")
def reject_player(
    player_id: int,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Reject a pending player registration.
    This deletes the player account and marks any referral as expired.
    """
    # Find the player
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == UserType.PLAYER
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if this client can reject this player
    if player.created_by_client_id != client.id:
        raise HTTPException(
            status_code=403,
            detail="You can only reject players who registered under your account"
        )

    if player.is_approved:
        raise HTTPException(
            status_code=400,
            detail="Cannot reject an already approved player. Use deactivation instead."
        )

    # Mark any pending referral as expired
    referral = db.query(models.Referral).filter(
        models.Referral.referred_id == player.id,
        models.Referral.status == ReferralStatus.PENDING
    ).first()

    if referral:
        referral.status = ReferralStatus.EXPIRED

    # Delete the player account
    username = player.username
    db.delete(player)
    db.commit()

    return {"message": f"Player registration for {username} has been rejected"}


@router.patch("/block-player/{player_id}")
def block_player(
    player_id: int,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Block/unblock a player. Blocked players cannot access the platform.
    """
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == UserType.PLAYER
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if this client can block this player
    if player.created_by_client_id != client.id:
        raise HTTPException(
            status_code=403,
            detail="You can only block players who are registered under your account"
        )

    # Toggle the is_active status (block/unblock)
    player.is_active = not player.is_active
    action = "unblocked" if player.is_active else "blocked"

    db.commit()
    db.refresh(player)

    return {
        "message": f"Player {player.username} has been {action}",
        "is_active": player.is_active
    }


@router.post("/reset-player-password/{player_id}")
def reset_player_password(
    player_id: int,
    new_password: Optional[str] = None,
    client: models.User = Depends(get_client_user),
    db: Session = Depends(get_db)
):
    """
    Reset a player's password. If no password provided, generates username@135.
    """
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == UserType.PLAYER
    ).first()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Check if this client can reset this player's password
    if player.created_by_client_id != client.id:
        raise HTTPException(
            status_code=403,
            detail="You can only reset passwords for players registered under your account"
        )

    # Generate password as username@135 if not provided
    password = new_password if new_password else f"{player.username}@135"
    player.hashed_password = auth.get_password_hash(password)

    db.commit()

    return {
        "message": f"Password reset for {player.username}",
        "temp_password": password if not new_password else None
    }