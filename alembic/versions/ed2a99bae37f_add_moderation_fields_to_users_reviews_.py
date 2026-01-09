"""Add moderation fields to users reviews and reports

Revision ID: ed2a99bae37f
Revises: 3951f4e922aa
Create Date: 2026-01-04 04:18:11.095786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed2a99bae37f'
down_revision: Union[str, Sequence[str], None] = '3951f4e922aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns to reports table
    op.add_column('reports', sa.Column('evidence', sa.Text(), nullable=True))
    op.add_column('reports', sa.Column('action_taken', sa.String(length=500), nullable=True))
    op.add_column('reports', sa.Column('appeal_ticket_id', sa.Integer(), nullable=True))

    # SQLite doesn't support ALTER COLUMN, so we skip the type change
    # The status column already works with string values

    # Create foreign key for reports -> tickets (SQLite batch mode)
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_reports_appeal_ticket', 'tickets', ['appeal_ticket_id'], ['id'])

    # Add columns to reviews table
    op.add_column('reviews', sa.Column('status', sa.String(length=20), nullable=True, server_default='PENDING'))
    op.add_column('reviews', sa.Column('moderated_by', sa.Integer(), nullable=True))
    op.add_column('reviews', sa.Column('moderated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('reviews', sa.Column('admin_notes', sa.Text(), nullable=True))
    op.add_column('reviews', sa.Column('appeal_ticket_id', sa.Integer(), nullable=True))

    # Create foreign keys for reviews (SQLite batch mode)
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_reviews_appeal_ticket', 'tickets', ['appeal_ticket_id'], ['id'])
        batch_op.create_foreign_key('fk_reviews_moderated_by', 'users', ['moderated_by'], ['id'])

    # Skip tickets category alter_column - SQLite doesn't support it
    # The category column already works with string values

    # Add columns to users table
    op.add_column('users', sa.Column('malicious_reports_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('is_trusted_reviewer', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('is_suspended', sa.Boolean(), nullable=True, server_default='0'))
    op.add_column('users', sa.Column('suspension_reason', sa.String(length=500), nullable=True))
    op.add_column('users', sa.Column('suspended_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'suspended_until')
    op.drop_column('users', 'suspension_reason')
    op.drop_column('users', 'is_suspended')
    op.drop_column('users', 'is_trusted_reviewer')
    op.drop_column('users', 'malicious_reports_count')

    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.drop_constraint('fk_reviews_moderated_by', type_='foreignkey')
        batch_op.drop_constraint('fk_reviews_appeal_ticket', type_='foreignkey')

    op.drop_column('reviews', 'appeal_ticket_id')
    op.drop_column('reviews', 'admin_notes')
    op.drop_column('reviews', 'moderated_at')
    op.drop_column('reviews', 'moderated_by')
    op.drop_column('reviews', 'status')

    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.drop_constraint('fk_reports_appeal_ticket', type_='foreignkey')

    op.drop_column('reports', 'appeal_ticket_id')
    op.drop_column('reports', 'action_taken')
    op.drop_column('reports', 'evidence')
