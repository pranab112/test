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
    # 3. Rename the old enum type and create a new one with only GC_BONUS
    # 4. Convert the column back to the enum type
    # 5. Drop the old enum type

    # Step 1: Alter column to TEXT (bypasses enum validation)
    op.execute("ALTER TABLE promotions ALTER COLUMN promotion_type TYPE TEXT")

    # Step 2: Update ALL values to gc_bonus (handles CREDITS, BONUS, and any other legacy values)
    op.execute("UPDATE promotions SET promotion_type = 'gc_bonus'")

    # Step 3: Rename old enum type (safer than DROP which may fail if type is in use elsewhere)
    op.execute("ALTER TYPE promotiontype RENAME TO promotiontype_old")

    # Step 4: Create new enum type with only gc_bonus
    op.execute("CREATE TYPE promotiontype AS ENUM ('gc_bonus')")

    # Step 5: Convert column back to enum
    op.execute("ALTER TABLE promotions ALTER COLUMN promotion_type TYPE promotiontype USING promotion_type::promotiontype")

    # Step 6: Drop old enum type
    op.execute("DROP TYPE IF EXISTS promotiontype_old")


def downgrade() -> None:
    """No downgrade needed - GC_BONUS is the only valid type now."""
    pass
