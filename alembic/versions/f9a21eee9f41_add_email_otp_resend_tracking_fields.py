"""add email otp resend tracking fields

Revision ID: f9a21eee9f41
Revises: ed2a99bae37f
Create Date: 2026-01-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9a21eee9f41'
down_revision: Union[str, None] = 'ed2a99bae37f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email OTP resend tracking fields for progressive rate limiting
    op.add_column('users', sa.Column('email_otp_resend_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('email_otp_last_resend_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'email_otp_last_resend_at')
    op.drop_column('users', 'email_otp_resend_count')
