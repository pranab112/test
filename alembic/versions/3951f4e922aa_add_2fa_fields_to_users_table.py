"""add 2FA fields to users table

Revision ID: 3951f4e922aa
Revises: 4d82886b6e75
Create Date: 2026-01-02 00:09:07.872716

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3951f4e922aa'
down_revision: Union[str, Sequence[str], None] = '4d82886b6e75'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 2FA fields to users table."""
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(), nullable=True))
    op.add_column('users', sa.Column('two_factor_backup_codes', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove 2FA fields from users table."""
    op.drop_column('users', 'two_factor_backup_codes')
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
