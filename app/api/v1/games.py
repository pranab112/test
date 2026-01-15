import random
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List
from app import models, schemas, auth
from app.database import get_db
from app.models.enums import GameType, BetResult
from app.config import (
    MIN_BET_AMOUNT,
    MAX_BET_AMOUNT,
    DICE_MULTIPLIERS,
    DICE_MIN_PREDICTION,
    DICE_MAX_PREDICTION,
    SLOTS_SYMBOLS,
    SLOTS_SYMBOL_MULTIPLIERS,
    SLOTS_TWO_MATCH_MULTIPLIER
)
from app.core import get_logger, get_game_logger, log_error_with_context, log_game_transaction

# Set up logger for this module
logger = get_logger(__name__)
game_logger = get_game_logger()

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

@router.get("/my-games-details", response_model=schemas.ClientGamesWithDetailsResponse)
async def get_my_games_with_details(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get client's selected games with custom links and images"""
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can access this")

    # Only return active client games (games the client has selected)
    client_games = db.query(models.ClientGame).join(
        models.Game
    ).filter(
        and_(
            models.ClientGame.client_id == current_user.id,
            models.ClientGame.is_active == True
        )
    ).all()

    return {
        "games": client_games
    }

@router.patch("/my-games/{client_game_id}", response_model=schemas.ClientGameWithDetailsResponse)
async def update_client_game(
    client_game_id: int,
    update_data: schemas.ClientGameUpdateSingle,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a specific client game with link, image, or active status"""
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can update games")

    client_game = db.query(models.ClientGame).filter(
        and_(
            models.ClientGame.id == client_game_id,
            models.ClientGame.client_id == current_user.id
        )
    ).first()

    if not client_game:
        raise HTTPException(status_code=404, detail="Game not found")

    if update_data.game_link is not None:
        client_game.game_link = update_data.game_link
    if update_data.custom_image_url is not None:
        client_game.custom_image_url = update_data.custom_image_url
    if update_data.is_active is not None:
        client_game.is_active = update_data.is_active

    db.commit()
    db.refresh(client_game)

    return client_game

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
        raise HTTPException(status_code=400, detail=f"Invalid game IDs: {list(invalid_ids)}. These games may have been removed or deactivated.")

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

@router.post("/mini-game/bet", response_model=schemas.MiniGameBetResponse)
async def place_mini_game_bet(
    bet_request: schemas.MiniGameBetRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Place a bet on a mini game (dice or slots).
    Players can bet credits and win/lose based on the game outcome.
    Uses row-level locking to prevent race conditions with concurrent bets.
    """
    logger.info(
        f"Bet request received | user_id={current_user.id} | "
        f"game={bet_request.game_type} | bet={bet_request.bet_amount}"
    )

    if current_user.user_type != models.UserType.PLAYER:
        logger.warning(f"Non-player attempted to play game | user_id={current_user.id} | type={current_user.user_type}")
        raise HTTPException(status_code=403, detail="Only players can play mini games")

    # Validate bet amount
    if bet_request.bet_amount < MIN_BET_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum bet amount is {MIN_BET_AMOUNT} credits"
        )

    if bet_request.bet_amount > MAX_BET_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum bet amount is {MAX_BET_AMOUNT} credits"
        )

    # Get user with row-level lock to prevent concurrent bet race conditions
    # This ensures that if two requests come in at the same time, they execute sequentially
    locked_user = db.query(models.User).filter(
        models.User.id == current_user.id
    ).with_for_update().first()

    if not locked_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate bet amount against locked user's current credits
    if bet_request.bet_amount > locked_user.credits:
        raise HTTPException(status_code=400, detail="Insufficient credits")

    # Process based on game type (passing locked user)
    if bet_request.game_type == "dice":
        return process_dice_game(bet_request, locked_user, db)
    elif bet_request.game_type == "slots":
        return process_slots_game(bet_request, locked_user, db)
    else:
        raise HTTPException(status_code=400, detail="Invalid game type. Use 'dice' or 'slots'")


def process_dice_game(bet_request: schemas.MiniGameBetRequest, user: models.User, db: Session):
    """Process a dice game bet"""
    # Validate prediction for dice
    if bet_request.prediction is None:
        raise HTTPException(
            status_code=400,
            detail=f"Dice game requires a prediction ({DICE_MIN_PREDICTION}-{DICE_MAX_PREDICTION})"
        )

    if bet_request.prediction < DICE_MIN_PREDICTION or bet_request.prediction > DICE_MAX_PREDICTION:
        raise HTTPException(
            status_code=400,
            detail=f"Prediction must be between {DICE_MIN_PREDICTION} and {DICE_MAX_PREDICTION}"
        )

    try:
        # Save balance before bet
        balance_before = user.credits

        # Roll the dice
        dice1 = random.randint(1, 6)
        dice2 = random.randint(1, 6)
        total = dice1 + dice2

        # Deduct bet amount first
        user.credits -= bet_request.bet_amount

        # Calculate winnings
        win_amount = 0
        result = "lose"
        message = f"Rolled {total}. You bet on {bet_request.prediction}. "

        if total == bet_request.prediction:
            # Win! Payout based on probability from config
            multiplier = DICE_MULTIPLIERS.get(bet_request.prediction, 6)
            win_amount = int(bet_request.bet_amount * multiplier)
            user.credits += win_amount
            result = "win"
            message += f"You won {win_amount} credits!"
        else:
            message += "Better luck next time!"

        # Commit transaction
        db.commit()
        db.refresh(user)

        # Create audit log entry (non-critical - don't fail bet if logging fails)
        try:
            bet_transaction = models.BetTransaction(
                user_id=user.id,
                game_type=GameType.LUCKY_DICE,
                bet_amount=bet_request.bet_amount,
                win_amount=win_amount,
                result=BetResult.WIN if result == "win" else BetResult.LOSE,
                balance_before=balance_before,
                balance_after=user.credits,
                game_data=json.dumps({
                    "prediction": bet_request.prediction,
                    "dice1": dice1,
                    "dice2": dice2,
                    "total": total,
                    "multiplier": multiplier
                })
            )
            db.add(bet_transaction)
            db.commit()
        except Exception as log_error:
            # Log the error but don't fail the bet
            logger.warning(f"Failed to log bet transaction | user_id={user.id} | error={str(log_error)}")
            db.rollback()  # Rollback only the failed transaction log

        # Log successful game transaction
        log_game_transaction(
            game_logger,
            game_type="dice",
            user_id=user.id,
            bet_amount=bet_request.bet_amount,
            result=result,
            win_amount=win_amount,
            balance_after=user.credits
        )

        return {
            "success": True,
            "game_type": "dice",
            "bet_amount": bet_request.bet_amount,
            "win_amount": win_amount,
            "result": result,
            "details": {
                "dice1": dice1,
                "dice2": dice2,
                "total": total,
                "prediction": bet_request.prediction
            },
            "new_balance": user.credits,
            "message": message
        }
    except HTTPException:
        # Re-raise HTTP exceptions without rollback (validation errors)
        raise
    except Exception as e:
        # Rollback transaction on any error
        db.rollback()
        log_error_with_context(
            logger,
            e,
            {"user_id": user.id, "game": "dice", "bet_amount": bet_request.bet_amount}
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process dice game: {str(e)}"
        )


def process_slots_game(bet_request: schemas.MiniGameBetRequest, user: models.User, db: Session):
    """Process a slots game bet"""
    try:
        # Save balance before bet
        balance_before = user.credits

        # Spin the reels
        reel1 = random.choice(SLOTS_SYMBOLS)
        reel2 = random.choice(SLOTS_SYMBOLS)
        reel3 = random.choice(SLOTS_SYMBOLS)

        # Deduct bet amount first
        user.credits -= bet_request.bet_amount

        # Calculate winnings
        win_amount = 0
        result = "lose"
        message = ""
        multiplier = 0

        if reel1 == reel2 == reel3:
            # Jackpot! All three match
            multiplier = SLOTS_SYMBOL_MULTIPLIERS.get(reel1, 10)
            win_amount = bet_request.bet_amount * multiplier
            user.credits += win_amount
            result = "jackpot"
            message = f"JACKPOT! Three {reel1}s! You won {win_amount} credits!"
        elif reel1 == reel2 or reel2 == reel3 or reel1 == reel3:
            # Two matching symbols
            multiplier = SLOTS_TWO_MATCH_MULTIPLIER
            win_amount = bet_request.bet_amount * multiplier
            user.credits += win_amount
            result = "win"
            message = f"Two matching symbols! You won {win_amount} credits!"
        else:
            message = "No match. Try again!"

        # Commit transaction
        db.commit()
        db.refresh(user)

        # Create audit log entry (non-critical - don't fail bet if logging fails)
        try:
            bet_result = BetResult.JACKPOT if result == "jackpot" else (BetResult.WIN if result == "win" else BetResult.LOSE)
            bet_transaction = models.BetTransaction(
                user_id=user.id,
                game_type=GameType.LUCKY_SLOTS,
                bet_amount=bet_request.bet_amount,
                win_amount=win_amount,
                result=bet_result,
                balance_before=balance_before,
                balance_after=user.credits,
                game_data=json.dumps({
                    "symbols": [reel1, reel2, reel3],
                    "multiplier": multiplier
                })
            )
            db.add(bet_transaction)
            db.commit()
        except Exception as log_error:
            # Log the error but don't fail the bet
            logger.warning(f"Failed to log bet transaction | user_id={user.id} | error={str(log_error)}")
            db.rollback()  # Rollback only the failed transaction log

        # Log successful game transaction
        log_game_transaction(
            game_logger,
            game_type="slots",
            user_id=user.id,
            bet_amount=bet_request.bet_amount,
            result=result,
            win_amount=win_amount,
            balance_after=user.credits
        )

        return {
            "success": True,
            "game_type": "slots",
            "bet_amount": bet_request.bet_amount,
            "win_amount": win_amount,
            "result": result,
            "details": {
                "reels": [reel1, reel2, reel3]
            },
            "new_balance": user.credits,
            "message": message
        }
    except HTTPException:
        # Re-raise HTTP exceptions without rollback (validation errors)
        raise
    except Exception as e:
        # Rollback transaction on any error
        db.rollback()
        log_error_with_context(
            logger,
            e,
            {"user_id": user.id, "game": "slots", "bet_amount": bet_request.bet_amount}
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process slots game: {str(e)}"
        )
