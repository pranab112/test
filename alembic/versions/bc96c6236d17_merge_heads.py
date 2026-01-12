"""Merge heads

Revision ID: bc96c6236d17
Revises: 4ea5706f5198, h3c4d5e6f7g8
Create Date: 2026-01-08 23:15:39.239409

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc96c6236d17'
down_revision: Union[str, Sequence[str], None] = ('4ea5706f5198', 'h3c4d5e6f7g8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
