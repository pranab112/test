from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db
from app.models import UserType
import random
import string

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

    return {
        "total_players": total_players,
        "online_players": online_players,
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
        models.User.created_at >= datetime.now() - timedelta(days=7)
    ).join(
        models.ClientPlayer,
        models.ClientPlayer.player_id == models.User.id
    ).filter(
        models.ClientPlayer.client_id == current_user.id
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