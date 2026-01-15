"""add notification_sounds to users

Revision ID: b8c9d0e1f2a3
Revises: 07bfa2137aa7
Create Date: 2026-01-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, None] = '07bfa2137aa7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add notification_sounds column to users table
    op.add_column('users', sa.Column('notification_sounds', sa.Boolean(), nullable=True, server_default='true'))


def downgrade() -> None:
    op.drop_column('users', 'notification_sounds')
