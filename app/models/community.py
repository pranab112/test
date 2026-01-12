from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.models.base import Base


class PostVisibility(str, enum.Enum):
    """Who can see the post"""
    PLAYERS = "players"  # Only players can see
    CLIENTS = "clients"  # Only clients can see


class CommunityPost(Base):
    """Community post model for player-to-player and client-to-client posts"""
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)  # Optional image
    visibility = Column(SQLEnum(PostVisibility), nullable=False)  # players or clients
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    author = relationship("User", back_populates="community_posts")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")

    @property
    def likes_count(self):
        return len(self.likes) if self.likes else 0

    @property
    def comments_count(self):
        return len(self.comments) if self.comments else 0


class PostComment(Base):
    """Comment on a community post"""
    __tablename__ = "post_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", back_populates="post_comments")


class PostLike(Base):
    """Like on a community post"""
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    post = relationship("CommunityPost", back_populates="likes")
    user = relationship("User", back_populates="post_likes")
