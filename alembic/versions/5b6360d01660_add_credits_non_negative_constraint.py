"""add_credits_non_negative_constraint

Revision ID: 5b6360d01660
Revises: g2b3c4d5e6f7
Create Date: 2026-01-07 12:13:46.087662

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b6360d01660'
down_revision: Union[str, Sequence[str], None] = 'g2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CHECK constraint to ensure credits cannot be negative."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if constraint already exists (for SQLite batch mode)
    existing_constraints = [c['name'] for c in inspector.get_check_constraints('users')]

    if 'check_credits_non_negative' not in existing_constraints:
        # Use batch mode for SQLite compatibility
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.create_check_constraint(
                'check_credits_non_negative',
                'credits >= 0'
            )
            batch_op.alter_column('credits',
                                existing_type=sa.Integer(),
                                nullable=False,
                                server_default='1000')


def downgrade() -> None:
    """Remove CHECK constraint."""
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('check_credits_non_negative', type_='check')
