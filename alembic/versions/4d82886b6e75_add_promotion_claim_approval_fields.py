"""Add promotion claim approval fields

Revision ID: 4d82886b6e75
Revises: cb66b4d9f97d
Create Date: 2026-01-01 23:36:58.152174

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d82886b6e75'
down_revision: Union[str, Sequence[str], None] = 'cb66b4d9f97d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to promotion_claims table
    with op.batch_alter_table('promotion_claims', schema=None) as batch_op:
        batch_op.add_column(sa.Column('approval_message_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('approved_by_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('rejection_reason', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_claim_approval_message', 'messages', ['approval_message_id'], ['id'])
        batch_op.create_foreign_key('fk_claim_approved_by', 'users', ['approved_by_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('promotion_claims', schema=None) as batch_op:
        batch_op.drop_constraint('fk_claim_approved_by', type_='foreignkey')
        batch_op.drop_constraint('fk_claim_approval_message', type_='foreignkey')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('approved_by_id')
        batch_op.drop_column('approved_at')
        batch_op.drop_column('approval_message_id')
