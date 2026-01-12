# Import settings from settings.py
from app.config.settings import settings, Settings

# Import game configuration
from app.config.game_config import (
    MIN_BET_AMOUNT,
    MAX_BET_AMOUNT,
    BET_COOLDOWN_MS,
    DICE_MULTIPLIERS,
    SLOTS_SYMBOL_MULTIPLIERS,
    SLOTS_TWO_MATCH_MULTIPLIER,
    SLOTS_SYMBOLS,
    DICE_MIN_PREDICTION,
    DICE_MAX_PREDICTION,
    get_frontend_config
)

__all__ = [
    # Settings
    "settings",
    "Settings",
    # Game Configuration
    "MIN_BET_AMOUNT",
    "MAX_BET_AMOUNT",
    "BET_COOLDOWN_MS",
    "DICE_MULTIPLIERS",
    "SLOTS_SYMBOL_MULTIPLIERS",
    "SLOTS_TWO_MATCH_MULTIPLIER",
    "SLOTS_SYMBOLS",
    "DICE_MIN_PREDICTION",
    "DICE_MAX_PREDICTION",
    "get_frontend_config"
]
