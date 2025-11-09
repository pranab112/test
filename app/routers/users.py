from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from app import models, schemas, auth
from app.database import get_db
from app.websocket import manager

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