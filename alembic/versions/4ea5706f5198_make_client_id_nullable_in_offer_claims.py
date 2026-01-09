"""Make client_id nullable in offer_claims

Revision ID: 4ea5706f5198
Revises: ed2a99bae37f
Create Date: 2026-01-08 23:10:25.161567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4ea5706f5198'
down_revision: Union[str, Sequence[str], None] = 'ed2a99bae37f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - make client_id nullable in offer_claims.

    SQLite doesn't support ALTER COLUMN, so we need to use batch mode
    to recreate the table with the new schema.
    """
    with op.batch_alter_table('offer_claims', schema=None) as batch_op:
        batch_op.alter_column('client_id',
                              existing_type=sa.INTEGER(),
                              nullable=True)


def downgrade() -> None:
    """Downgrade schema - make client_id required again."""
    with op.batch_alter_table('offer_claims', schema=None) as batch_op:
        batch_op.alter_column('client_id',
                              existing_type=sa.INTEGER(),
                              nullable=False)
