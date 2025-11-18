from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging
from app import models, schemas, auth
from app.database import get_db
from app.encryption import encrypt_credential, decrypt_credential

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/game-credentials", tags=["game-credentials"])

@router.post("/", response_model=schemas.GameCredentialResponse)
async def create_game_credential(
    credential: schemas.GameCredentialCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create new game credentials for a player"""
    try:
        # Only clients can create game credentials
        if current_user.user_type != models.UserType.CLIENT:
            raise HTTPException(status_code=403, detail="Only clients can create game credentials")

        # Log incoming request
        logger.info(f"Client {current_user.id} creating credentials for player {credential.player_id} game {credential.game_id}")

        # Verify the player exists and is a player
        player = db.query(models.User).filter(
            models.User.id == credential.player_id,
            models.User.user_type == models.UserType.PLAYER
        ).first()
        if not player:
            logger.warning(f"Player {credential.player_id} not found")
            raise HTTPException(status_code=404, detail="Player not found")

        # Verify the game exists
        game = db.query(models.Game).filter(models.Game.id == credential.game_id).first()
        if not game:
            logger.warning(f"Game {credential.game_id} not found")
            raise HTTPException(status_code=404, detail="Game not found")

        # Check if credentials already exist for this player-game combination
        existing = db.query(models.GameCredentials).filter(
            models.GameCredentials.player_id == credential.player_id,
            models.GameCredentials.game_id == credential.game_id
        ).first()
        if existing:
            logger.warning(f"Credentials already exist for player {credential.player_id} and game {credential.game_id}")
            raise HTTPException(status_code=400, detail="Credentials already exist for this player and game")

        # Try to encrypt credentials (returns None if encryption is disabled)
        encrypted_username = None
        encrypted_password = None
        try:
            encrypted_username = encrypt_credential(credential.game_username)
            encrypted_password = encrypt_credential(credential.game_password)
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            # Continue without encryption

        # Create new credentials with DUAL-WRITE pattern
        # Store both plaintext (for backward compatibility) and encrypted versions
        db_credential = models.GameCredentials(
            player_id=credential.player_id,
            game_id=credential.game_id,
            # OLD - keep for rollback safety
            game_username=credential.game_username,
            game_password=credential.game_password,
            # NEW - encrypted versions (can be None)
            game_username_encrypted=encrypted_username,
            game_password_encrypted=encrypted_password,
            created_by_client_id=current_user.id
        )

        # Log if encryption is active
        if db_credential.game_username_encrypted:
            logger.info(f"Created encrypted credentials for player {credential.player_id} game {credential.game_id}")
        else:
            logger.warning(f"Created plaintext credentials for player {credential.player_id} game {credential.game_id} (encryption disabled)")

        db.add(db_credential)
        db.commit()
        db.refresh(db_credential)

        # Send notification message to player
        try:
            notification_message = models.Message(
                sender_id=current_user.id,
                receiver_id=credential.player_id,
                message_type=models.MessageType.TEXT,
                content=f"Your {game.display_name} game credentials have been created:\nUsername: {credential.game_username}\nPassword: {credential.game_password}"
            )
            db.add(notification_message)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to send notification message: {e}")
            # Continue - not critical for credential creation

        # Prepare response with game info (DUAL-READ pattern)
        # Prefer encrypted, fallback to plaintext
        username = None
        password = None

        # Try to decrypt if encrypted versions exist
        if db_credential.game_username_encrypted:
            try:
                username = decrypt_credential(db_credential.game_username_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt username: {e}")

        if db_credential.game_password_encrypted:
            try:
                password = decrypt_credential(db_credential.game_password_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt password: {e}")

        # Fallback to plaintext if decryption failed or not encrypted
        if not username:
            username = db_credential.game_username
        if not password:
            password = db_credential.game_password

        response_data = {
            "id": db_credential.id,
            "player_id": db_credential.player_id,
            "game_id": db_credential.game_id,
            "game_name": game.name,
            "game_display_name": game.display_name,
            "game_username": username,
            "game_password": password,
            "created_by_client_id": db_credential.created_by_client_id,
            "created_at": db_credential.created_at,
            "updated_at": db_credential.updated_at
        }

        return schemas.GameCredentialResponse(**response_data)

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error in create_game_credential: {e}", exc_info=True)
        # Return a generic error message to avoid exposing internals
        raise HTTPException(status_code=500, detail="An error occurred while creating game credentials")

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

    # Format response with DUAL-READ pattern
    formatted_credentials = []
    for credential, game in credentials:
        # Prefer encrypted, fallback to plaintext
        username = None
        password = None

        # Try to decrypt if encrypted versions exist
        if credential.game_username_encrypted:
            try:
                username = decrypt_credential(credential.game_username_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt username for credential {credential.id}: {e}")

        if credential.game_password_encrypted:
            try:
                password = decrypt_credential(credential.game_password_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt password for credential {credential.id}: {e}")

        # Fallback to plaintext if decryption failed or not encrypted
        if not username:
            username = credential.game_username
        if not password:
            password = credential.game_password

        formatted_credentials.append(schemas.GameCredentialResponse(
            id=credential.id,
            player_id=credential.player_id,
            game_id=credential.game_id,
            game_name=game.name,
            game_display_name=game.display_name,
            game_username=username,
            game_password=password,
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

    # Update the credential with DUAL-WRITE pattern
    # Update both plaintext and encrypted versions
    credential.game_username = credential_update.game_username
    credential.game_password = credential_update.game_password

    # Try to encrypt (returns None if encryption disabled)
    try:
        credential.game_username_encrypted = encrypt_credential(credential_update.game_username)
        credential.game_password_encrypted = encrypt_credential(credential_update.game_password)
    except Exception as e:
        logger.error(f"Failed to encrypt updated credentials: {e}")
        credential.game_username_encrypted = None
        credential.game_password_encrypted = None

    # Log encryption status
    if credential.game_username_encrypted:
        logger.info(f"Updated encrypted credentials for credential {credential_id}")
    else:
        logger.warning(f"Updated plaintext credentials for credential {credential_id} (encryption disabled)")

    db.commit()
    db.refresh(credential)

    # Send notification message to player
    try:
        notification_message = models.Message(
            sender_id=current_user.id,
            receiver_id=credential.player_id,
            message_type=models.MessageType.TEXT,
            content=f"Your {game.display_name} game credentials have been updated:\nNew Username: {credential_update.game_username}\nNew Password: {credential_update.game_password}"
        )
        db.add(notification_message)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to send notification message: {e}")
        # Continue - not critical

    # Prepare response with DUAL-READ pattern
    # Prefer encrypted, fallback to plaintext
    username = None
    password = None

    # Try to decrypt if encrypted versions exist
    if credential.game_username_encrypted:
        try:
            username = decrypt_credential(credential.game_username_encrypted)
        except Exception as e:
            logger.error(f"Failed to decrypt username: {e}")

    if credential.game_password_encrypted:
        try:
            password = decrypt_credential(credential.game_password_encrypted)
        except Exception as e:
            logger.error(f"Failed to decrypt password: {e}")

    # Fallback to plaintext if decryption failed or not encrypted
    if not username:
        username = credential.game_username
    if not password:
        password = credential.game_password

    response_data = {
        "id": credential.id,
        "player_id": credential.player_id,
        "game_id": credential.game_id,
        "game_name": game.name,
        "game_display_name": game.display_name,
        "game_username": username,
        "game_password": password,
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

    # Format response with DUAL-READ pattern
    formatted_credentials = []
    for credential, game in credentials:
        # Prefer encrypted, fallback to plaintext
        username = None
        password = None

        # Try to decrypt if encrypted versions exist
        if credential.game_username_encrypted:
            try:
                username = decrypt_credential(credential.game_username_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt username for credential {credential.id}: {e}")

        if credential.game_password_encrypted:
            try:
                password = decrypt_credential(credential.game_password_encrypted)
            except Exception as e:
                logger.error(f"Failed to decrypt password for credential {credential.id}: {e}")

        # Fallback to plaintext if decryption failed or not encrypted
        if not username:
            username = credential.game_username
        if not password:
            password = credential.game_password

        formatted_credentials.append(schemas.GameCredentialResponse(
            id=credential.id,
            player_id=credential.player_id,
            game_id=credential.game_id,
            game_name=game.name,
            game_display_name=game.display_name,
            game_username=username,
            game_password=password,
            created_by_client_id=credential.created_by_client_id,
            created_at=credential.created_at,
            updated_at=credential.updated_at
        ))

    return schemas.GameCredentialListResponse(credentials=formatted_credentials)