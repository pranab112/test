from pydantic import BaseModel
from typing import Dict
from datetime import datetime

class PlayerWalletResponse(BaseModel):
    player_id: int
    main_balance: int
    bonus_balances: Dict[str, Dict[str, int]]  # {"client_id": {"bonus": amount, "wagering": amount}}
    total_wagering: int
    last_updated: datetime

    class Config:
        from_attributes = True
