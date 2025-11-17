"""add_encrypted_game_credentials

Revision ID: 2d2dd514c898
Revises: 5d108f810415
Create Date: 2025-11-16 17:39:09.784342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d2dd514c898'
down_revision: Union[str, Sequence[str], None] = '5d108f810415'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add encrypted columns for game credentials."""
    # Add NEW columns for encrypted data (keeping old columns for backward compatibility)
    op.add_column('game_credentials',
        sa.Column('game_username_encrypted', sa.Text(), nullable=True))
    op.add_column('game_credentials',
        sa.Column('game_password_encrypted', sa.Text(), nullable=True))

    # Note: We keep the old columns (game_username, game_password) to ensure backward compatibility
    # Data will be migrated gradually using dual-write pattern


def downgrade() -> None:
    """Downgrade schema - remove encrypted columns."""
    op.drop_column('game_credentials', 'game_password_encrypted')
    op.drop_column('game_credentials', 'game_username_encrypted')
