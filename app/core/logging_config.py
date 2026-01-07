"""
Logging Configuration
Sets up structured logging for the entire application
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from datetime import datetime

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Log file paths
APP_LOG_FILE = LOGS_DIR / "app.log"
ERROR_LOG_FILE = LOGS_DIR / "error.log"
GAME_LOG_FILE = LOGS_DIR / "games.log"

# Log format - structured and informative
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

def setup_logging(log_level: str = "INFO"):
    """
    Configure logging for the application

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []

    # Console Handler - for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # File Handler - all logs
    # Rotating file handler: max 10MB per file, keep 5 backups
    file_handler = RotatingFileHandler(
        APP_LOG_FILE,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)  # Capture all logs to file
    file_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # Error File Handler - only errors and above
    error_handler = RotatingFileHandler(
        ERROR_LOG_FILE,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
    error_handler.setFormatter(error_formatter)
    root_logger.addHandler(error_handler)

    # Suppress overly verbose external libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logging.info(f"Logging configured - Level: {log_level}, Logs directory: {LOGS_DIR.absolute()}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module

    Args:
        name: Module name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)


# Game-specific logger
def get_game_logger() -> logging.Logger:
    """
    Get logger specifically for game operations
    Logs to both app.log and games.log
    """
    logger = logging.getLogger("games")

    # Add game-specific file handler if not already added
    if not any(isinstance(h, RotatingFileHandler) and h.baseFilename == str(GAME_LOG_FILE.absolute()) for h in logger.handlers):
        game_handler = RotatingFileHandler(
            GAME_LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10  # Keep more backups for game logs
        )
        game_handler.setLevel(logging.INFO)
        game_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
        game_handler.setFormatter(game_formatter)
        logger.addHandler(game_handler)

    return logger


def log_error_with_context(logger: logging.Logger, error: Exception, context: dict = None):
    """
    Log an error with additional context information

    Args:
        logger: Logger instance
        error: Exception object
        context: Additional context (user_id, request_data, etc.)
    """
    error_msg = f"Error: {str(error)}"
    if context:
        context_str = ", ".join(f"{k}={v}" for k, v in context.items())
        error_msg += f" | Context: {context_str}"

    logger.error(error_msg, exc_info=True)


def log_game_transaction(
    logger: logging.Logger,
    game_type: str,
    user_id: int,
    bet_amount: int,
    result: str,
    win_amount: int,
    balance_after: int
):
    """
    Log a game transaction with structured information

    Args:
        logger: Logger instance
        game_type: Type of game (dice, slots)
        user_id: User ID
        bet_amount: Amount bet
        result: Game result (win, lose, jackpot)
        win_amount: Amount won
        balance_after: User balance after bet
    """
    logger.info(
        f"GAME_TRANSACTION | "
        f"game={game_type} | "
        f"user_id={user_id} | "
        f"bet={bet_amount} | "
        f"result={result} | "
        f"win={win_amount} | "
        f"balance={balance_after}"
    )
