from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, auth
from app.database import get_db
from app.websocket import manager

router = APIRouter(prefix="/online", tags=["online-status"])

@router.get("/friends", response_model=List[schemas.UserResponse])
async def get_online_friends(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get online status of all friends"""
    friends = current_user.friends
    return friends

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user_online_status(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get online status of a specific user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/count")
async def get_online_count(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get count of online users by type"""
    online_clients = db.query(models.User).filter(
        models.User.user_type == models.UserType.CLIENT,
        models.User.is_online == True
    ).count()

    online_players = db.query(models.User).filter(
        models.User.user_type == models.UserType.PLAYER,
        models.User.is_online == True
    ).count()

    return {
        "online_clients": online_clients,
        "online_players": online_players,
        "total_online": online_clients + online_players
    }

@router.get("/clients", response_model=List[schemas.UserResponse])
async def get_online_clients(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all online clients"""
    online_clients = db.query(models.User).filter(
        models.User.user_type == models.UserType.CLIENT,
        models.User.is_online == True
    ).all()
    return online_clients

@router.get("/players", response_model=List[schemas.UserResponse])
async def get_online_players(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all online players"""
    online_players = db.query(models.User).filter(
        models.User.user_type == models.UserType.PLAYER,
        models.User.is_online == True
    ).all()
    return online_players