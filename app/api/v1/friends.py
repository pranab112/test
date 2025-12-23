from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/friends", tags=["friends"])

@router.post("/request", response_model=schemas.FriendRequestResponse)
async def send_friend_request(
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

    return friend_request

@router.get("/requests/sent", response_model=List[schemas.FriendRequestResponse])
async def get_sent_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    requests = db.query(models.FriendRequest).filter(
        models.FriendRequest.sender_id == current_user.id
    ).all()
    return requests

@router.get("/requests/received", response_model=List[schemas.FriendRequestResponse])
async def get_received_friend_requests(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    requests = db.query(models.FriendRequest).filter(
        models.FriendRequest.receiver_id == current_user.id,
        models.FriendRequest.status == models.FriendRequestStatus.PENDING
    ).all()
    return requests

@router.put("/requests/{request_id}", response_model=schemas.FriendRequestResponse)
async def update_friend_request(
    request_id: int,
    update: schemas.FriendRequestUpdate,
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