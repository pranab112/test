from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.enums import UserType

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    user_type: UserType

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # For clients

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: UserType

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    user_type: Optional[UserType] = None
