from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 bytes in UTF-8)')
        return v


class AdminResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=6, max_length=72)
    generate_random: bool = False  # If true, generate a random password

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        if v and len(v.encode('utf-8')) > 72:
            raise ValueError('Password is too long (max 72 bytes in UTF-8)')
        return v


class PasswordResetResponse(BaseModel):
    message: str
    temp_password: Optional[str] = None  # Only included when random password is generated
