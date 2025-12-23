from pydantic import BaseModel
from typing import Generic, TypeVar, List
from datetime import datetime

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response"""
    data: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

class SuccessResponse(BaseModel):
    """Standard success response"""
    success: bool = True
    message: str

class ErrorResponse(BaseModel):
    """Standard error response"""
    success: bool = False
    error: dict
    timestamp: datetime
