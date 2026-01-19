from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
from app import models, schemas, auth
from app.database import get_db
from app.config import settings
from app.rate_limit import conditional_rate_limit, RateLimits

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login", response_model=schemas.Token)
@conditional_rate_limit(RateLimits.LOGIN)
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        # Account not approved - check why
        user_check = db.query(models.User).filter(models.User.username == form_data.username).first()
        if user_check and not user_check.is_approved:
            # Customize message based on user type
            if user_check.user_type == models.UserType.CLIENT:
                detail = "Your client account is waiting for admin approval. You will be notified when approved."
            elif user_check.user_type == models.UserType.PLAYER:
                detail = "Your player account is waiting for client approval. The client will review your registration request."
            else:
                detail = "Your account is waiting for approval."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )
        # If we get here, password was correct but user is not approved (shouldn't happen)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not approved. Please contact support.",
        )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # LAZY MIGRATION: If old SHA256 hash detected, upgrade to bcrypt
    if user.hashed_password and not user.hashed_password.startswith("$2b$"):
        try:
            # Re-hash the password with bcrypt
            user.hashed_password = auth.get_password_hash(form_data.password)
            db.commit()
            logger.info(f"Upgraded password hash to bcrypt for user {user.id} ({user.username})")
        except Exception as e:
            logger.error(f"Failed to upgrade password hash for user {user.id}: {e}")
            # Continue even if migration fails - user can still log in

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "user_id": user.id, "user_type": user.user_type.value},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_type": user.user_type.value
    }

@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.post("/change-password")
async def change_password(
    request: schemas.ChangePasswordRequest,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password. Requires current password verification."""
    # Verify current password
    if not auth.verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check if new password is same as current
    if auth.verify_password(request.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Hash and save new password
    try:
        current_user.hashed_password = auth.get_password_hash(request.new_password)
        db.commit()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"message": "Password changed successfully"}