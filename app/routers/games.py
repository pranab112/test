from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/games", tags=["games"])

@router.get("/populate")
async def populate_games(db: Session = Depends(get_db)):
    """
    Populate games table with default games
    ADMIN ONLY - Call this once to initialize games
    Access via browser: https://your-domain.com/games/populate
    """
    # List of default games
    games_data = [
        ('bluedragon', 'Blue Dragon', '/static/images/games/bluedragon.png', 'slots'),
        ('cashfrenzy', 'Cash Frenzy', '/static/images/games/cashfrenzy 1.png', 'slots'),
        ('cashmachine', 'Cash Machine', '/static/images/games/cashmachine.png', 'slots'),
        ('casinoignite', 'Casino Ignite', '/static/images/games/casinoignitee.jpg', 'casino'),
        ('casinoroyale', 'Casino Royale', '/static/images/games/casinoroyale.png', 'casino'),
        ('egames', 'E-Games', '/static/images/games/Egames.png', 'multi-game'),
        ('firekirin', 'Fire Kirin', '/static/images/games/firekirin.png', 'fish'),
        ('gameroom', 'Gameroom Online', '/static/images/games/Gameroom online.png', 'multi-game'),
        ('gamevault', 'Game Vault', '/static/images/games/gamevault.png', 'multi-game'),
        ('highstake', 'High Stake', '/static/images/games/Highstake.jpg', 'casino'),
        ('joker777', 'Joker 777', '/static/images/games/joker 777.png', 'slots'),
        ('juwa', 'Juwa Online', '/static/images/games/juwaonline.png', 'multi-game'),
        ('loot', 'Loot', '/static/images/games/loot.jpg', 'slots'),
        ('megaspin', 'Mega Spin', '/static/images/games/Megaspin.jpg', 'slots'),
        ('milkyway', 'Milky Way', '/static/images/games/milkyway 2.png', 'multi-game'),
        ('moolah', 'Moolah', '/static/images/games/moolah.jpg', 'slots'),
        ('orionstars', 'Orion Stars', '/static/images/games/orionstars.jpg', 'multi-game'),
        ('pandamaster', 'Panda Master', '/static/images/games/Panda Master.jpg', 'multi-game'),
        ('paracasino', 'Para Casino', '/static/images/games/Paracasino.jpg', 'casino'),
        ('rivermonster', 'River Monster', '/static/images/games/rivermonster 1.png', 'fish'),
        ('riversweeps1', 'River Sweeps', '/static/images/games/riversweeps 1.png', 'sweepstakes'),
        ('riversweeps2', 'River Sweeps 2', '/static/images/games/riversweeps 2.png', 'sweepstakes'),
        ('riversweeps3', 'River Sweeps 3', '/static/images/games/riversweeps 3.png', 'sweepstakes'),
        ('sirius', 'Sirius', '/static/images/games/sirus.png', 'multi-game'),
        ('ultrapanda', 'Ultra Panda', '/static/images/games/ultrapanda.png', 'multi-game'),
        ('vblink', 'VBlink', '/static/images/games/vblink 2.png', 'multi-game'),
        ('vegasweeps', 'Vega Sweeps', '/static/images/games/Vega Sweeps.png', 'sweepstakes'),
        ('vegasx', 'Vegas X', '/static/images/games/vegas x.png', 'casino'),
        ('vegasroll', 'Vegas Roll', '/static/images/games/vegasroll.png', 'casino'),
        ('winstar', 'Win Star', '/static/images/games/winstar.png', 'casino'),
        ('yolo777', 'Yolo 777', '/static/images/games/yolo777.png', 'slots')
    ]

    # Check if games already exist
    existing_count = db.query(models.Game).count()
    if existing_count > 0:
        return {
            "message": f"Games table already has {existing_count} games",
            "status": "already_populated"
        }

    # Insert games
    inserted = 0
    for name, display_name, icon_url, category in games_data:
        try:
            game = models.Game(
                name=name,
                display_name=display_name,
                icon_url=icon_url,
                category=category,
                is_active=True
            )
            db.add(game)
            inserted += 1
        except Exception as e:
            print(f"Error inserting {name}: {e}")

    db.commit()

    # Verify
    final_count = db.query(models.Game).count()

    return {
        "message": f"Successfully populated {final_count} games",
        "inserted": inserted,
        "total": final_count,
        "status": "success"
    }

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