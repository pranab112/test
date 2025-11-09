from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/games", tags=["games"])

@router.get("/", response_model=List[schemas.GameResponse])
async def get_available_games(
    db: Session = Depends(get_db)
):
    """Get all available games"""
    games = db.query(models.Game).filter(models.Game.is_active == True).all()
    return games

@router.get("/my-games", response_model=schemas.ClientGamesResponse)
async def get_my_games(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get client's selected games"""
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can provide games")

    client_games = db.query(models.ClientGame).join(
        models.Game
    ).filter(
        and_(
            models.ClientGame.client_id == current_user.id,
            models.ClientGame.is_active == True,
            models.Game.is_active == True
        )
    ).all()

    return {
        "available_games": [cg.game for cg in client_games]
    }

@router.post("/update-games", response_model=schemas.ClientGamesResponse)
async def update_my_games(
    games: schemas.ClientGameUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update client's available games"""
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can provide games")

    # Validate all game IDs exist
    valid_games = db.query(models.Game).filter(
        and_(
            models.Game.id.in_(games.game_ids),
            models.Game.is_active == True
        )
    ).all()

    valid_game_ids = {g.id for g in valid_games}
    invalid_ids = set(games.game_ids) - valid_game_ids

    if invalid_ids:
        raise HTTPException(status_code=400, detail=f"Invalid game IDs: {invalid_ids}")

    # Deactivate all existing selections
    db.query(models.ClientGame).filter(
        models.ClientGame.client_id == current_user.id
    ).update({"is_active": False})

    # Add or update the selected games
    for game_id in games.game_ids:
        existing = db.query(models.ClientGame).filter(
            and_(
                models.ClientGame.client_id == current_user.id,
                models.ClientGame.game_id == game_id
            )
        ).first()

        if existing:
            existing.is_active = True
        else:
            new_selection = models.ClientGame(
                client_id=current_user.id,
                game_id=game_id,
                is_active=True
            )
            db.add(new_selection)

    db.commit()

    # Return updated list
    client_games = db.query(models.ClientGame).join(
        models.Game
    ).filter(
        and_(
            models.ClientGame.client_id == current_user.id,
            models.ClientGame.is_active == True,
            models.Game.is_active == True
        )
    ).all()

    return {
        "available_games": [cg.game for cg in client_games]
    }

@router.get("/client/{client_id}/games", response_model=List[schemas.GameResponse])
async def get_client_games(
    client_id: int,
    db: Session = Depends(get_db)
):
    """Get games provided by a specific client"""
    # Check if client exists
    client = db.query(models.User).filter(
        and_(
            models.User.id == client_id,
            models.User.user_type == models.UserType.CLIENT
        )
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_games = db.query(models.ClientGame).join(
        models.Game
    ).filter(
        and_(
            models.ClientGame.client_id == client_id,
            models.ClientGame.is_active == True,
            models.Game.is_active == True
        )
    ).all()

    return [cg.game for cg in client_games]