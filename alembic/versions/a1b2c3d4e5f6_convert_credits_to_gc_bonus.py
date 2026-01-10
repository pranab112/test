"""Convert CREDITS promotion type to GC_BONUS

Revision ID: a1b2c3d4e5f6
Revises: 199db8896a50
Create Date: 2026-01-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '199db8896a50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert all CREDITS promotion types to GC_BONUS."""
    # Update existing promotions with CREDITS type to GC_BONUS
    op.execute("UPDATE promotions SET promotion_type = 'gc_bonus' WHERE promotion_type = 'credits' OR promotion_type = 'CREDITS'")


def downgrade() -> None:
    """No downgrade needed - GC_BONUS is the only valid type now."""
    pass
