"""Add missing report warning and resolution columns

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-01-04 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g2b3c4d5e6f7'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add missing report columns."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)

    # Get existing columns in reports table
    report_columns = [col['name'] for col in inspector.get_columns('reports')]

    # Add warning_sent_at if it doesn't exist
    if 'warning_sent_at' not in report_columns:
        op.add_column('reports', sa.Column('warning_sent_at', sa.DateTime(timezone=True), nullable=True))

    # Add warning_deadline if it doesn't exist
    if 'warning_deadline' not in report_columns:
        op.add_column('reports', sa.Column('warning_deadline', sa.DateTime(timezone=True), nullable=True))

    # Add resolution_amount if it doesn't exist
    if 'resolution_amount' not in report_columns:
        op.add_column('reports', sa.Column('resolution_amount', sa.Float(), nullable=True))

    # Add resolution_notes if it doesn't exist
    if 'resolution_notes' not in report_columns:
        op.add_column('reports', sa.Column('resolution_notes', sa.Text(), nullable=True))

    # Add resolved_at if it doesn't exist
    if 'resolved_at' not in report_columns:
        op.add_column('reports', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))

    # Add resolution_proof if it doesn't exist
    if 'resolution_proof' not in report_columns:
        op.add_column('reports', sa.Column('resolution_proof', sa.Text(), nullable=True))

    # Add auto_validated if it doesn't exist
    if 'auto_validated' not in report_columns:
        op.add_column('reports', sa.Column('auto_validated', sa.Integer(), nullable=True, server_default='0'))

    # Add admin_notes if it doesn't exist (this was in the model but may be missing)
    if 'admin_notes' not in report_columns:
        op.add_column('reports', sa.Column('admin_notes', sa.Text(), nullable=True))

    # Add reviewed_by if it doesn't exist
    if 'reviewed_by' not in report_columns:
        op.add_column('reports', sa.Column('reviewed_by', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_reports_reviewed_by', 'reports', 'users', ['reviewed_by'], ['id'])

    # Add reviewed_at if it doesn't exist
    if 'reviewed_at' not in report_columns:
        op.add_column('reports', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema - remove added report columns."""
    op.drop_column('reports', 'reviewed_at')
    op.drop_constraint('fk_reports_reviewed_by', 'reports', type_='foreignkey')
    op.drop_column('reports', 'reviewed_by')
    op.drop_column('reports', 'admin_notes')
    op.drop_column('reports', 'auto_validated')
    op.drop_column('reports', 'resolution_proof')
    op.drop_column('reports', 'resolved_at')
    op.drop_column('reports', 'resolution_notes')
    op.drop_column('reports', 'resolution_amount')
    op.drop_column('reports', 'warning_deadline')
    op.drop_column('reports', 'warning_sent_at')
