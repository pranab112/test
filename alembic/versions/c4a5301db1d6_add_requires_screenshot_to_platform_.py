"""Add requires_screenshot to platform_offers and screenshot_url to offer_claims

Revision ID: c4a5301db1d6
Revises: bc96c6236d17
Create Date: 2026-01-09 23:39:07.989021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a5301db1d6'
down_revision: Union[str, Sequence[str], None] = 'bc96c6236d17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add screenshot_url column to offer_claims for proof submissions
    op.add_column('offer_claims', sa.Column('screenshot_url', sa.String(length=500), nullable=True))
    # Add requires_screenshot column to platform_offers to indicate if screenshot proof is needed
    # Using server_default for SQLite compatibility (it will remain on the column but that's fine)
    op.add_column('platform_offers', sa.Column('requires_screenshot', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('platform_offers', 'requires_screenshot')
    op.drop_column('offer_claims', 'screenshot_url')
