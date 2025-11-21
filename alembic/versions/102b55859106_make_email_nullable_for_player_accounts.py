"""make email nullable for player accounts

Revision ID: 102b55859106
Revises: 93c635b75f3d
Create Date: 2025-11-22 04:04:03.929854

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '102b55859106'
down_revision: Union[str, Sequence[str], None] = '93c635b75f3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make email column nullable for client-created players"""
    # Get database dialect to handle SQLite vs PostgreSQL differences
    connection = op.get_bind()
    dialect = connection.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL can alter column directly
        op.alter_column('users', 'email',
                   existing_type=sa.String(),
                   nullable=True)
    else:
        # SQLite requires recreating the table (handled by batch mode)
        with op.batch_alter_table('users') as batch_op:
            batch_op.alter_column('email',
                           existing_type=sa.String(),
                           nullable=True)


def downgrade() -> None:
    """Revert email column to non-nullable"""
    # Get database dialect to handle SQLite vs PostgreSQL differences
    connection = op.get_bind()
    dialect = connection.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL can alter column directly
        op.alter_column('users', 'email',
                   existing_type=sa.String(),
                   nullable=False)
    else:
        # SQLite requires recreating the table (handled by batch mode)
        with op.batch_alter_table('users') as batch_op:
            batch_op.alter_column('email',
                           existing_type=sa.String(),
                           nullable=False)