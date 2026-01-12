"""Add bet_transactions table for audit logging

Revision ID: h3c4d5e6f7g8
Revises: 5b6360d01660
Create Date: 2026-01-07 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h3c4d5e6f7g8'
down_revision: Union[str, Sequence[str], None] = '5b6360d01660'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add bet_transactions table."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)

    # Get existing tables
    existing_tables = inspector.get_table_names()

    # Create the bet_transactions table if it doesn't exist
    if 'bet_transactions' not in existing_tables:
        op.create_table('bet_transactions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('game_type', sa.String(length=50), nullable=False),
            sa.Column('bet_amount', sa.Integer(), nullable=False),
            sa.Column('win_amount', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('result', sa.String(length=20), nullable=False),
            sa.Column('balance_before', sa.Integer(), nullable=False),
            sa.Column('balance_after', sa.Integer(), nullable=False),
            sa.Column('game_data', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

        # Create indexes for better query performance
        op.create_index(op.f('ix_bet_transactions_id'), 'bet_transactions', ['id'], unique=False)
        op.create_index(op.f('ix_bet_transactions_user_id'), 'bet_transactions', ['user_id'], unique=False)
        op.create_index(op.f('ix_bet_transactions_game_type'), 'bet_transactions', ['game_type'], unique=False)
        op.create_index(op.f('ix_bet_transactions_result'), 'bet_transactions', ['result'], unique=False)
        op.create_index(op.f('ix_bet_transactions_created_at'), 'bet_transactions', ['created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema - remove bet_transactions table."""
    # Drop indexes
    op.drop_index(op.f('ix_bet_transactions_created_at'), table_name='bet_transactions')
    op.drop_index(op.f('ix_bet_transactions_result'), table_name='bet_transactions')
    op.drop_index(op.f('ix_bet_transactions_game_type'), table_name='bet_transactions')
    op.drop_index(op.f('ix_bet_transactions_user_id'), table_name='bet_transactions')
    op.drop_index(op.f('ix_bet_transactions_id'), table_name='bet_transactions')

    # Drop table
    op.drop_table('bet_transactions')
