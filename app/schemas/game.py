from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class GameResponse(BaseModel):
    id: int
    name: str
    display_name: str
    icon_url: Optional[str] = None
    category: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClientGameUpdate(BaseModel):
    game_ids: List[int]

class ClientGameWithDetailsResponse(BaseModel):
    id: int
    game_id: int
    game: GameResponse
    is_active: bool
    game_link: Optional[str] = None
    custom_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClientGameResponse(BaseModel):
    id: int
    game: GameResponse
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ClientGamesResponse(BaseModel):
    available_games: List[GameResponse]

class ClientGamesWithDetailsResponse(BaseModel):
    games: List[ClientGameWithDetailsResponse]

class ClientGameUpdateSingle(BaseModel):
    game_link: Optional[str] = None
    custom_image_url: Optional[str] = None
    is_active: Optional[bool] = None

class GameCredentialCreate(BaseModel):
    player_id: int
    game_id: int
    game_username: str
    game_password: str

class GameCredentialUpdate(BaseModel):
    game_username: str
    game_password: str

class GameCredentialResponse(BaseModel):
    id: int
    player_id: int
    game_id: int
    game_name: str
    game_display_name: str
    game_username: str
    game_password: str
    created_by_client_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GameCredentialListResponse(BaseModel):
    credentials: List[GameCredentialResponse]
