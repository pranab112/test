from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PostVisibility(str, Enum):
    PLAYERS = "players"
    CLIENTS = "clients"


# Author info for responses
class PostAuthor(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    user_type: str

    class Config:
        from_attributes = True


# Create post request
class CreatePostRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    image_url: Optional[str] = None


# Update post request
class UpdatePostRequest(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=2000)


# Comment schemas
class CreateCommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)


class CommentResponse(BaseModel):
    id: int
    post_id: int
    content: str
    author: PostAuthor
    created_at: datetime

    class Config:
        from_attributes = True


# Post response
class PostResponse(BaseModel):
    id: int
    content: str
    image_url: Optional[str] = None
    visibility: PostVisibility
    author: PostAuthor
    likes_count: int
    comments_count: int
    is_liked: bool = False  # Whether current user has liked this post
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Post with comments
class PostWithCommentsResponse(PostResponse):
    comments: List[CommentResponse] = []


# Paginated posts response
class PaginatedPostsResponse(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    per_page: int
    has_more: bool
