"""merge_notification_and_otp_heads

Revision ID: 07bfa2137aa7
Revises: a1b2c3d4e5f6, f9a21eee9f41
Create Date: 2026-01-15 19:57:13.956919

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '07bfa2137aa7'
down_revision: Union[str, Sequence[str], None] = ('a1b2c3d4e5f6', 'f9a21eee9f41')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
