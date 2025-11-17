"""
Pagination utilities for API endpoints
Provides both offset-based and cursor-based pagination
"""
from typing import Generic, TypeVar, List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Query
from fastapi import Query as FastAPIQuery
import math

T = TypeVar('T')


class PaginationParams(BaseModel):
    """Parameters for pagination"""
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=50, ge=1, le=100, description="Items per page")

    @property
    def offset(self) -> int:
        """Calculate offset for database query"""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """Get limit for database query"""
        return self.page_size

    class Config:
        schema_extra = {
            "example": {
                "page": 1,
                "page_size": 50
            }
        }


class PagedResponse(BaseModel, Generic[T]):
    """Paginated response model"""
    items: List[T] = Field(description="List of items for current page")
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Items per page")
    total_pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_previous: bool = Field(description="Whether there is a previous page")

    class Config:
        schema_extra = {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "page_size": 50,
                "total_pages": 2,
                "has_next": True,
                "has_previous": False
            }
        }

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ) -> "PagedResponse[T]":
        """
        Factory method to create a PagedResponse

        Args:
            items: List of items for current page
            total: Total count of items
            page: Current page number
            page_size: Items per page

        Returns:
            PagedResponse instance
        """
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0

        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )


def paginate_query(
    query: Query,
    page: int = 1,
    page_size: int = 50
) -> tuple[List, int]:
    """
    Apply pagination to a SQLAlchemy query

    Args:
        query: SQLAlchemy query object
        page: Page number (1-indexed)
        page_size: Items per page

    Returns:
        Tuple of (items, total_count)
    """
    # Validate inputs
    page = max(1, page)
    page_size = min(max(1, page_size), 100)  # Cap at 100 items

    # Get total count
    total = query.count()

    # Calculate offset
    offset = (page - 1) * page_size

    # Apply pagination
    items = query.offset(offset).limit(page_size).all()

    return items, total


class CursorPaginationParams(BaseModel):
    """Parameters for cursor-based pagination (for real-time data)"""
    cursor: Optional[str] = Field(None, description="Cursor for next page")
    limit: int = Field(default=50, ge=1, le=100, description="Items per page")
    direction: str = Field(default="next", pattern="^(next|prev)$", description="Pagination direction")

    class Config:
        schema_extra = {
            "example": {
                "cursor": "eyJpZCI6IDEyMzR9",
                "limit": 50,
                "direction": "next"
            }
        }


class CursorPagedResponse(BaseModel, Generic[T]):
    """Cursor-based paginated response"""
    items: List[T] = Field(description="List of items")
    next_cursor: Optional[str] = Field(None, description="Cursor for next page")
    prev_cursor: Optional[str] = Field(None, description="Cursor for previous page")
    has_next: bool = Field(description="Whether there are more items")
    has_previous: bool = Field(description="Whether there are previous items")

    class Config:
        schema_extra = {
            "example": {
                "items": [],
                "next_cursor": "eyJpZCI6IDEyMzR9",
                "prev_cursor": None,
                "has_next": True,
                "has_previous": False
            }
        }


def encode_cursor(data: Dict[str, Any]) -> str:
    """
    Encode cursor data to string

    Args:
        data: Dictionary containing cursor data

    Returns:
        Base64 encoded cursor string
    """
    import json
    import base64

    json_str = json.dumps(data, sort_keys=True)
    encoded = base64.urlsafe_b64encode(json_str.encode()).decode()
    return encoded


def decode_cursor(cursor: str) -> Dict[str, Any]:
    """
    Decode cursor string to data

    Args:
        cursor: Base64 encoded cursor string

    Returns:
        Dictionary containing cursor data
    """
    import json
    import base64

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        data = json.loads(decoded)
        return data
    except Exception:
        return {}


def paginate_cursor_query(
    query: Query,
    cursor: Optional[str] = None,
    limit: int = 50,
    order_column=None,
    direction: str = "next"
) -> tuple[List, Optional[str], Optional[str], bool, bool]:
    """
    Apply cursor-based pagination to a SQLAlchemy query

    Args:
        query: SQLAlchemy query object
        cursor: Cursor string for current position
        limit: Items per page
        order_column: Column to order by (must be unique and sortable)
        direction: Pagination direction ("next" or "prev")

    Returns:
        Tuple of (items, next_cursor, prev_cursor, has_next, has_prev)
    """
    # Validate limit
    limit = min(max(1, limit), 100)

    # Decode cursor if provided
    cursor_data = decode_cursor(cursor) if cursor else {}

    # Apply cursor filter if provided
    if cursor_data and order_column:
        cursor_value = cursor_data.get("value")
        if cursor_value:
            if direction == "next":
                query = query.filter(order_column > cursor_value)
            else:
                query = query.filter(order_column < cursor_value)

    # Order by the column
    if order_column:
        if direction == "next":
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())

    # Fetch one extra item to check if there are more
    items = query.limit(limit + 1).all()

    # Check if there are more items
    has_more = len(items) > limit
    if has_more:
        items = items[:-1]  # Remove the extra item

    # Generate cursors
    next_cursor = None
    prev_cursor = None

    if items and order_column:
        # Next cursor based on last item
        if has_more:
            last_item = items[-1]
            last_value = getattr(last_item, order_column.name)
            next_cursor = encode_cursor({"value": last_value})

        # Previous cursor based on first item
        if cursor:  # Only if we're not on the first page
            first_item = items[0]
            first_value = getattr(first_item, order_column.name)
            prev_cursor = encode_cursor({"value": first_value})

    return items, next_cursor, prev_cursor, has_more, bool(cursor)


# Dependency for FastAPI endpoints
def get_pagination_params(
    page: int = FastAPIQuery(1, ge=1, description="Page number"),
    page_size: int = FastAPIQuery(50, ge=1, le=100, description="Items per page")
) -> PaginationParams:
    """
    FastAPI dependency to get pagination parameters from query string

    Usage:
        @router.get("/items")
        def get_items(pagination: PaginationParams = Depends(get_pagination_params)):
            ...
    """
    return PaginationParams(page=page, page_size=page_size)


def get_cursor_pagination_params(
    cursor: Optional[str] = FastAPIQuery(None, description="Pagination cursor"),
    limit: int = FastAPIQuery(50, ge=1, le=100, description="Items per page"),
    direction: str = FastAPIQuery("next", pattern="^(next|prev)$", description="Pagination direction")
) -> CursorPaginationParams:
    """
    FastAPI dependency to get cursor pagination parameters from query string

    Usage:
        @router.get("/messages")
        def get_messages(pagination: CursorPaginationParams = Depends(get_cursor_pagination_params)):
            ...
    """
    return CursorPaginationParams(cursor=cursor, limit=limit, direction=direction)