"""Add requires_screenshot to promotions and screenshot_url to promotion_claims

Revision ID: 199db8896a50
Revises: c4a5301db1d6
Create Date: 2026-01-09 23:49:06.698082

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '199db8896a50'
down_revision: Union[str, Sequence[str], None] = 'c4a5301db1d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add screenshot_url column to promotion_claims for proof submissions
    op.add_column('promotion_claims', sa.Column('screenshot_url', sa.String(length=500), nullable=True))
    # Add requires_screenshot column to promotions to indicate if screenshot proof is needed
    op.add_column('promotions', sa.Column('requires_screenshot', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('promotions', 'requires_screenshot')
    op.drop_column('promotion_claims', 'screenshot_url')
