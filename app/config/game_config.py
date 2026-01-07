"""
Game Configuration
Contains all game-related constants, multipliers, and settings
"""

# Betting Limits
MIN_BET_AMOUNT = 10  # Minimum bet in credits
MAX_BET_AMOUNT = 10000  # Maximum bet in credits

# Debounce Settings
BET_COOLDOWN_MS = 500  # Milliseconds between bets

# Lucky Dice Game Configuration
DICE_MIN_PREDICTION = 2
DICE_MAX_PREDICTION = 12

# Dice multipliers based on probability
# Rarer outcomes have higher multipliers
DICE_MULTIPLIERS = {
    2: 36,    # 1/36 probability - rarest
    3: 18,    # 1/18 probability
    4: 12,    # 1/12 probability
    5: 9,     # 1/9 probability
    6: 7.2,   # 1/7.2 probability
    7: 6,     # 1/6 probability - most common
    8: 7.2,   # 1/7.2 probability
    9: 9,     # 1/9 probability
    10: 12,   # 1/12 probability
    11: 18,   # 1/18 probability
    12: 36,   # 1/36 probability - rarest
}

# Lucky Slots Game Configuration
SLOTS_SYMBOLS = ["cherry", "lemon", "orange", "grape", "star", "seven", "diamond"]

# Slot symbol multipliers for 3-of-a-kind (jackpot)
SLOTS_SYMBOL_MULTIPLIERS = {
    "diamond": 50,  # Highest payout
    "seven": 30,
    "star": 20,
    "grape": 10,
    "orange": 8,
    "lemon": 6,
    "cherry": 5,    # Lowest payout
}

# Slot payout multiplier for 2 matching symbols
SLOTS_TWO_MATCH_MULTIPLIER = 2

# Frontend Configuration Export (JSON-serializable)
def get_frontend_config():
    """Get game configuration for frontend"""
    return {
        "minBet": MIN_BET_AMOUNT,
        "maxBet": MAX_BET_AMOUNT,
        "cooldown": BET_COOLDOWN_MS,
        "dice": {
            "minPrediction": DICE_MIN_PREDICTION,
            "maxPrediction": DICE_MAX_PREDICTION,
            "multipliers": DICE_MULTIPLIERS
        },
        "slots": {
            "symbols": SLOTS_SYMBOLS,
            "multipliers": SLOTS_SYMBOL_MULTIPLIERS,
            "twoMatchMultiplier": SLOTS_TWO_MATCH_MULTIPLIER
        }
    }
