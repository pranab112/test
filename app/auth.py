from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional as Opt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models, schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Optional OAuth2 scheme for public endpoints
from fastapi import Request

class OptionalHTTPBearer(HTTPBearer):
    async def __call__(self, request: Request) -> Opt[HTTPAuthorizationCredentials]:
        try:
            return await super().__call__(request)
        except:
            return None

oauth2_scheme_optional = OptionalHTTPBearer(auto_error=False)

def verify_password(plain_password, hashed_password):
    return get_password_hash(plain_password) == hashed_password

def get_password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    # Check if client needs approval
    if user.user_type == models.UserType.CLIENT and not user.is_approved:
        return None  # Return None to indicate pending approval
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        user_type: str = payload.get("user_type")
        if username is None or user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username, user_id=user_id, user_type=user_type)
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_user_optional(
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Get current user if token is provided, otherwise return None (for public endpoints)"""
    if not authorization:
        return None

    token = authorization.credentials
    if not token or token == "null" or token == "undefined":
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        user_type: str = payload.get("user_type")
        if username is None or user_id is None:
            return None
        token_data = schemas.TokenData(username=username, user_id=user_id, user_type=user_type)
    except JWTError:
        return None

    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    return user