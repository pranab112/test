"""Add OTP fields for email verification

Revision ID: 3363b800be94
Revises: 102b55859106
Create Date: 2025-11-22 19:57:58.912889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3363b800be94'
down_revision: Union[str, Sequence[str], None] = '102b55859106'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add OTP fields to users table
    op.add_column('users', sa.Column('email_otp', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('email_otp_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove OTP fields from users table
    op.drop_column('users', 'email_otp_expires_at')
    op.drop_column('users', 'email_otp')
