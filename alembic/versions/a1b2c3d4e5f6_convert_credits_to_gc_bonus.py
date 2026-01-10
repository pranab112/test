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
    # PostgreSQL has a native enum type, so we need to:
    # 1. Convert the column to TEXT temporarily
    # 2. Update the values
    # 3. Drop the old enum type and create a new one with only GC_BONUS
    # 4. Convert the column back to the enum type

    # Step 1: Alter column to TEXT
    op.execute("ALTER TABLE promotions ALTER COLUMN promotion_type TYPE TEXT")

    # Step 2: Update any CREDITS values to gc_bonus
    op.execute("UPDATE promotions SET promotion_type = 'gc_bonus' WHERE LOWER(promotion_type) = 'credits'")

    # Step 3: Drop old enum type and create new one
    op.execute("DROP TYPE IF EXISTS promotiontype")
    op.execute("CREATE TYPE promotiontype AS ENUM ('gc_bonus')")

    # Step 4: Convert column back to enum
    op.execute("ALTER TABLE promotions ALTER COLUMN promotion_type TYPE promotiontype USING promotion_type::promotiontype")


def downgrade() -> None:
    """No downgrade needed - GC_BONUS is the only valid type now."""
    pass
