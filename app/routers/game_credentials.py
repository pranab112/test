from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, auth
from app.database import get_db

router = APIRouter(prefix="/game-credentials", tags=["game-credentials"])

@router.post("/", response_model=schemas.GameCredentialResponse)
async def create_game_credential(
    credential: schemas.GameCredentialCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new game credentials for a player"""
    # Only clients can create game credentials
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can create game credentials")

    # Verify the player exists and is a player
    player = db.query(models.User).filter(
        models.User.id == credential.player_id,
        models.User.user_type == models.UserType.PLAYER
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Verify the game exists
    game = db.query(models.Game).filter(models.Game.id == credential.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check if credentials already exist for this player-game combination
    existing = db.query(models.GameCredentials).filter(
        models.GameCredentials.player_id == credential.player_id,
        models.GameCredentials.game_id == credential.game_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Credentials already exist for this player and game")

    # Create new credentials
    db_credential = models.GameCredentials(
        player_id=credential.player_id,
        game_id=credential.game_id,
        game_username=credential.game_username,
        game_password=credential.game_password,
        created_by_client_id=current_user.id
    )

    db.add(db_credential)
    db.commit()
    db.refresh(db_credential)

    # Send notification message to player
    notification_message = models.Message(
        sender_id=current_user.id,
        receiver_id=credential.player_id,
        message_type=models.MessageType.TEXT,
        content=f"Your {game.display_name} game credentials have been created:\nUsername: {credential.game_username}\nPassword: {credential.game_password}"
    )
    db.add(notification_message)
    db.commit()

    # Prepare response with game info
    response_data = {
        "id": db_credential.id,
        "player_id": db_credential.player_id,
        "game_id": db_credential.game_id,
        "game_name": game.name,
        "game_display_name": game.display_name,
        "game_username": db_credential.game_username,
        "game_password": db_credential.game_password,
        "created_by_client_id": db_credential.created_by_client_id,
        "created_at": db_credential.created_at,
        "updated_at": db_credential.updated_at
    }

    return schemas.GameCredentialResponse(**response_data)

@router.get("/player/{player_id}", response_model=schemas.GameCredentialListResponse)
async def get_player_credentials(
    player_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all game credentials for a specific player"""
    # Players can only view their own credentials, clients can view any
    if current_user.user_type == models.UserType.PLAYER and current_user.id != player_id:
        raise HTTPException(status_code=403, detail="Players can only view their own credentials")

    # Verify the player exists
    player = db.query(models.User).filter(
        models.User.id == player_id,
        models.User.user_type == models.UserType.PLAYER
    ).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Get all credentials for the player with game info
    credentials = db.query(models.GameCredentials, models.Game).join(
        models.Game, models.GameCredentials.game_id == models.Game.id
    ).filter(models.GameCredentials.player_id == player_id).all()

    # Format response
    formatted_credentials = []
    for credential, game in credentials:
        formatted_credentials.append(schemas.GameCredentialResponse(
            id=credential.id,
            player_id=credential.player_id,
            game_id=credential.game_id,
            game_name=game.name,
            game_display_name=game.display_name,
            game_username=credential.game_username,
            game_password=credential.game_password,
            created_by_client_id=credential.created_by_client_id,
            created_at=credential.created_at,
            updated_at=credential.updated_at
        ))

    return schemas.GameCredentialListResponse(credentials=formatted_credentials)

@router.put("/{credential_id}", response_model=schemas.GameCredentialResponse)
async def update_game_credential(
    credential_id: int,
    credential_update: schemas.GameCredentialUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update existing game credentials"""
    # Only clients can update game credentials
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can update game credentials")

    # Get the credential with game info
    credential = db.query(models.GameCredentials).filter(
        models.GameCredentials.id == credential_id
    ).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Game credential not found")

    # Get game info for notification
    game = db.query(models.Game).filter(models.Game.id == credential.game_id).first()

    # Update the credential
    credential.game_username = credential_update.game_username
    credential.game_password = credential_update.game_password

    db.commit()
    db.refresh(credential)

    # Send notification message to player
    notification_message = models.Message(
        sender_id=current_user.id,
        receiver_id=credential.player_id,
        message_type=models.MessageType.TEXT,
        content=f"Your {game.display_name} game credentials have been updated:\nNew Username: {credential_update.game_username}\nNew Password: {credential_update.game_password}"
    )
    db.add(notification_message)
    db.commit()

    # Prepare response
    response_data = {
        "id": credential.id,
        "player_id": credential.player_id,
        "game_id": credential.game_id,
        "game_name": game.name,
        "game_display_name": game.display_name,
        "game_username": credential.game_username,
        "game_password": credential.game_password,
        "created_by_client_id": credential.created_by_client_id,
        "created_at": credential.created_at,
        "updated_at": credential.updated_at
    }

    return schemas.GameCredentialResponse(**response_data)

@router.delete("/{credential_id}")
async def delete_game_credential(
    credential_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete game credentials"""
    # Only clients can delete game credentials
    if current_user.user_type != models.UserType.CLIENT:
        raise HTTPException(status_code=403, detail="Only clients can delete game credentials")

    # Get the credential with game info
    credential = db.query(models.GameCredentials).filter(
        models.GameCredentials.id == credential_id
    ).first()
    if not credential:
        raise HTTPException(status_code=404, detail="Game credential not found")

    # Get game info for notification
    game = db.query(models.Game).filter(models.Game.id == credential.game_id).first()
    player_id = credential.player_id

    # Delete the credential
    db.delete(credential)
    db.commit()

    # Send notification message to player
    notification_message = models.Message(
        sender_id=current_user.id,
        receiver_id=player_id,
        message_type=models.MessageType.TEXT,
        content=f"Your {game.display_name} game credentials have been removed."
    )
    db.add(notification_message)
    db.commit()

    return {"message": "Game credential deleted successfully"}

@router.get("/my-credentials", response_model=schemas.GameCredentialListResponse)
async def get_my_credentials(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's game credentials (for players)"""
    # Only players can use this endpoint
    if current_user.user_type != models.UserType.PLAYER:
        raise HTTPException(status_code=403, detail="Only players can view their credentials")

    # Get all credentials for the current player with game info
    credentials = db.query(models.GameCredentials, models.Game).join(
        models.Game, models.GameCredentials.game_id == models.Game.id
    ).filter(models.GameCredentials.player_id == current_user.id).all()

    # Format response
    formatted_credentials = []
    for credential, game in credentials:
        formatted_credentials.append(schemas.GameCredentialResponse(
            id=credential.id,
            player_id=credential.player_id,
            game_id=credential.game_id,
            game_name=game.name,
            game_display_name=game.display_name,
            game_username=credential.game_username,
            game_password=credential.game_password,
            created_by_client_id=credential.created_by_client_id,
            created_at=credential.created_at,
            updated_at=credential.updated_at
        ))

    return schemas.GameCredentialListResponse(credentials=formatted_credentials)