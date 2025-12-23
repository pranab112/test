from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=False)
    icon_url = Column(String, nullable=True)
    category = Column(String, nullable=True)  # e.g., 'sweepstakes', 'slots', 'table', 'fish'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client_selections = relationship("ClientGame", back_populates="game", cascade="all, delete-orphan")


class ClientGame(Base):
    __tablename__ = "client_games"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    client = relationship("User", backref="available_games")
    game = relationship("Game", back_populates="client_selections")

    # Unique constraint - one entry per client per game
    __table_args__ = (
        UniqueConstraint('client_id', 'game_id', name='unique_client_game'),
    )


class GameCredentials(Base):
    __tablename__ = "game_credentials"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    game_username = Column(String, nullable=False)  # Keep for backward compatibility
    game_password = Column(String, nullable=False)  # Keep for backward compatibility
    game_username_encrypted = Column(Text, nullable=True)  # New encrypted column
    game_password_encrypted = Column(Text, nullable=True)  # New encrypted column
    created_by_client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    player = relationship("User", foreign_keys=[player_id], backref="game_credentials")
    game = relationship("Game", backref="player_credentials")
    created_by_client = relationship("User", foreign_keys=[created_by_client_id])

    # Unique constraint - one credential per player per game
    __table_args__ = (
        UniqueConstraint('player_id', 'game_id', name='unique_player_game_credential'),
    )
