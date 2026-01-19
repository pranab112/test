from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db
from app.rate_limit import conditional_rate_limit, RateLimits
from app.models.enums import UserType
from app.services.push_notification_service import (
    send_friend_request_notification,
    send_friend_request_accepted_notification,
)

router = APIRouter(prefix="/friends", tags=["friends"])


def validate_friend_request_permission(sender: models.User, receiver: models.User):
    """
    Validate that the sender can send a friend request to the receiver.
    Rules:
    - Player can only send to Client
    - Client can only send to Player
    - Admin is support - no direct friend requests to/from admin
    """
    sender_type = sender.user_type
    receiver_type = receiver.user_type

    # Admin cannot send or receive friend requests directly
    if sender_type == UserType.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admins cannot send friend requests. Please use the support channel."
        )

    if receiver_type == UserType.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Cannot send friend requests to admins. Please use the support channel for assistance."
        )

    # Player can only send to Client
    if sender_type == UserType.PLAYER and receiver_type != UserType.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Players can only send friend requests to clients."
        )

    # Client can only send to Player
    if sender_type == UserType.CLIENT and receiver_type != UserType.PLAYER:
        raise HTTPException(
            status_code=403,
            detail="Clients can only send friend requests to players."
        )


@router.get("/requests/pending", response_model=List[schemas.FriendRequestResponse])
async def get_pending_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get pending friend requests received by the current user"""
    requests = db.query(models.FriendRequest).filter(
        models.FriendRequest.receiver_id == current_user.id,
        models.FriendRequest.status == models.FriendRequestStatus.PENDING
    ).all()
    return requests


@router.get("/search", response_model=List[schemas.UserResponse])
async def search_users_for_friends(
    q: str = Query(..., min_length=1),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search for users to add as friends (filtered by role permissions)"""
    # Escape SQL wildcards to prevent injection
    escaped_q = q.replace("%", "\\%").replace("_", "\\_")

    # Determine which user types current user can send friend requests to
    # Player → Client, Client → Player, Admin → None (support channel)
    if current_user.user_type == UserType.ADMIN:
        # Admins can't send friend requests, return empty
        return []
    elif current_user.user_type == UserType.PLAYER:
        allowed_types = [UserType.CLIENT]
    elif current_user.user_type == UserType.CLIENT:
        allowed_types = [UserType.PLAYER]
    else:
        allowed_types = []

    # Search by username or full_name, filtered by allowed user types
    users = db.query(models.User).filter(
        models.User.id != current_user.id,
        models.User.user_type.in_(allowed_types),
        or_(
            models.User.username.ilike(f"%{escaped_q}%"),
            models.User.full_name.ilike(f"%{escaped_q}%")
        )
    ).limit(20).all()

    # Filter out existing friends
    friend_ids = [f.id for f in current_user.friends]
    users = [u for u in users if u.id not in friend_ids]

    return users


@router.get("/search/unique", response_model=schemas.UserResponse)
async def search_user_by_unique_id(
    user_id: str = Query(..., min_length=1),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search for a user by their unique user_id field"""
    # Determine which user types current user can send friend requests to
    if current_user.user_type == UserType.ADMIN:
        raise HTTPException(status_code=404, detail="User not found")
    elif current_user.user_type == UserType.PLAYER:
        allowed_types = [UserType.CLIENT]
    elif current_user.user_type == UserType.CLIENT:
        allowed_types = [UserType.PLAYER]
    else:
        allowed_types = []

    # Search by exact unique user_id
    user = db.query(models.User).filter(
        models.User.user_id == user_id,
        models.User.id != current_user.id,
        models.User.user_type.in_(allowed_types)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("/send/{user_id}")
@conditional_rate_limit(RateLimits.FRIEND_REQUEST)
async def send_friend_request_by_id(
    request: Request,
    background_tasks: BackgroundTasks,
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Send a friend request to a user by their ID"""
    receiver = db.query(models.User).filter(models.User.id == user_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    # Validate role-based permission (Player→Client, Client→Player, no Admin)
    validate_friend_request_permission(current_user, receiver)

    if receiver in current_user.friends:
        raise HTTPException(status_code=400, detail="Already friends with this user")

    existing_request = db.query(models.FriendRequest).filter(
        ((models.FriendRequest.sender_id == current_user.id) &
         (models.FriendRequest.receiver_id == receiver.id)) |
        ((models.FriendRequest.sender_id == receiver.id) &
         (models.FriendRequest.receiver_id == current_user.id))
    ).filter(models.FriendRequest.status == models.FriendRequestStatus.PENDING).first()

    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already exists")

    friend_request = models.FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id
    )
    db.add(friend_request)
    db.commit()

    # Send push notification to receiver
    background_tasks.add_task(
        send_friend_request_notification,
        receiver_id=receiver.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_username=current_user.username,
        sender_type=current_user.user_type.value,
    )

    return {"message": "Friend request sent successfully"}


@router.post("/accept/{request_id}")
async def accept_friend_request(
    request_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Accept a friend request"""
    friend_request = db.query(models.FriendRequest).filter(
        models.FriendRequest.id == request_id,
        models.FriendRequest.receiver_id == current_user.id
    ).first()

    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friend_request.status != models.FriendRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Friend request already processed")

    friend_request.status = models.FriendRequestStatus.ACCEPTED
    sender = db.query(models.User).filter(models.User.id == friend_request.sender_id).first()
    current_user.friends.append(sender)
    sender.friends.append(current_user)

    db.commit()

    # Send push notification to the original sender that request was accepted
    background_tasks.add_task(
        send_friend_request_accepted_notification,
        sender_id=sender.id,
        accepter_id=current_user.id,
        accepter_name=current_user.full_name,
        accepter_username=current_user.username,
        accepter_type=current_user.user_type.value,
    )

    return {"message": "Friend request accepted"}


@router.post("/reject/{request_id}")
async def reject_friend_request(
    request_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Reject a friend request"""
    friend_request = db.query(models.FriendRequest).filter(
        models.FriendRequest.id == request_id,
        models.FriendRequest.receiver_id == current_user.id
    ).first()

    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friend_request.status != models.FriendRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Friend request already processed")

    friend_request.status = models.FriendRequestStatus.REJECTED
    db.commit()

    return {"message": "Friend request rejected"}


@router.post("/request", response_model=schemas.FriendRequestResponse)
@conditional_rate_limit(RateLimits.FRIEND_REQUEST)
async def send_friend_request(
    http_request: Request,
    background_tasks: BackgroundTasks,
    request: schemas.FriendRequestCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Find receiver by user_id
    receiver = db.query(models.User).filter(models.User.user_id == request.receiver_user_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")

    # Can't send friend request to yourself
    if receiver.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    # Validate role-based permission (Player→Client, Client→Player, no Admin)
    validate_friend_request_permission(current_user, receiver)

    # Check if already friends
    if receiver in current_user.friends:
        raise HTTPException(status_code=400, detail="Already friends with this user")

    # Check if request already exists
    existing_request = db.query(models.FriendRequest).filter(
        ((models.FriendRequest.sender_id == current_user.id) &
         (models.FriendRequest.receiver_id == receiver.id)) |
        ((models.FriendRequest.sender_id == receiver.id) &
         (models.FriendRequest.receiver_id == current_user.id))
    ).filter(models.FriendRequest.status == models.FriendRequestStatus.PENDING).first()

    if existing_request:
        raise HTTPException(status_code=400, detail="Friend request already exists")

    # Create friend request
    friend_request = models.FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id
    )
    db.add(friend_request)
    db.commit()
    db.refresh(friend_request)

    # Send push notification to receiver
    background_tasks.add_task(
        send_friend_request_notification,
        receiver_id=receiver.id,
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        sender_username=current_user.username,
        sender_type=current_user.user_type.value,
    )

    return friend_request

@router.get("/requests/sent")
async def get_sent_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload

    requests = db.query(models.FriendRequest).options(
        joinedload(models.FriendRequest.sender),
        joinedload(models.FriendRequest.receiver)
    ).filter(
        models.FriendRequest.sender_id == current_user.id
    ).all()

    # Format response with requester/receiver naming for frontend compatibility
    formatted = []
    for req in requests:
        formatted.append({
            "id": req.id,
            "requester_id": req.sender_id,
            "receiver_id": req.receiver_id,
            "status": req.status.value,
            "created_at": req.created_at,
            "requester": {
                "id": req.sender.id,
                "username": req.sender.username,
                "full_name": req.sender.full_name,
                "profile_picture": req.sender.profile_picture
            } if req.sender else None,
            "receiver": {
                "id": req.receiver.id,
                "username": req.receiver.username,
                "full_name": req.receiver.full_name,
                "profile_picture": req.receiver.profile_picture
            } if req.receiver else None
        })
    return formatted

@router.get("/requests/received")
async def get_received_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import joinedload

    requests = db.query(models.FriendRequest).options(
        joinedload(models.FriendRequest.sender),
        joinedload(models.FriendRequest.receiver)
    ).filter(
        models.FriendRequest.receiver_id == current_user.id,
        models.FriendRequest.status == models.FriendRequestStatus.PENDING
    ).all()

    # Format response with requester/receiver naming for frontend compatibility
    formatted = []
    for req in requests:
        formatted.append({
            "id": req.id,
            "requester_id": req.sender_id,
            "receiver_id": req.receiver_id,
            "status": req.status.value,
            "created_at": req.created_at,
            "requester": {
                "id": req.sender.id,
                "username": req.sender.username,
                "full_name": req.sender.full_name,
                "profile_picture": req.sender.profile_picture
            } if req.sender else None,
            "receiver": {
                "id": req.receiver.id,
                "username": req.receiver.username,
                "full_name": req.receiver.full_name,
                "profile_picture": req.receiver.profile_picture
            } if req.receiver else None
        })
    return formatted

@router.put("/requests/{request_id}", response_model=schemas.FriendRequestResponse)
async def update_friend_request(
    request_id: int,
    update: schemas.FriendRequestUpdate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    friend_request = db.query(models.FriendRequest).filter(
        models.FriendRequest.id == request_id,
        models.FriendRequest.receiver_id == current_user.id
    ).first()

    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    if friend_request.status != models.FriendRequestStatus.PENDING:
        raise HTTPException(status_code=400, detail="Friend request already processed")

    friend_request.status = update.status

    # If accepted, add as friends
    if update.status == models.FriendRequestStatus.ACCEPTED:
        sender = db.query(models.User).filter(models.User.id == friend_request.sender_id).first()
        current_user.friends.append(sender)
        sender.friends.append(current_user)

        # Send push notification to the original sender that request was accepted
        background_tasks.add_task(
            send_friend_request_accepted_notification,
            sender_id=sender.id,
            accepter_id=current_user.id,
            accepter_name=current_user.full_name,
            accepter_username=current_user.username,
            accepter_type=current_user.user_type.value,
        )

    db.commit()
    db.refresh(friend_request)

    return friend_request

@router.get("/list", response_model=schemas.FriendsListResponse)
async def get_friends_list(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    return {"friends": current_user.friends}

@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    friend = db.query(models.User).filter(models.User.id == friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    if friend not in current_user.friends:
        raise HTTPException(status_code=400, detail="User is not in your friends list")

    current_user.friends.remove(friend)
    friend.friends.remove(current_user)
    db.commit()

    return {"message": "Friend removed successfully"}