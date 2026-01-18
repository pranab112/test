"""merge credential constraint and notification heads

Revision ID: 2f0c03e22758
Revises: aa5d176fba46, b8c9d0e1f2a3
Create Date: 2026-01-18 22:38:20.671916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2f0c03e22758'
down_revision: Union[str, Sequence[str], None] = ('aa5d176fba46', 'b8c9d0e1f2a3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
