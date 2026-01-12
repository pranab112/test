"""Add referral system - referrals table and referral_code column to users

Revision ID: f1a2b3c4d5e6
Revises: ed2a99bae37f
Create Date: 2026-01-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'ed2a99bae37f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add referral system."""
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)

    # Get existing columns in users table
    user_columns = [col['name'] for col in inspector.get_columns('users')]

    # Get existing tables
    existing_tables = inspector.get_table_names()

    # Add referral_code column to users table if it doesn't exist
    if 'referral_code' not in user_columns:
        op.add_column('users', sa.Column('referral_code', sa.String(length=12), nullable=True))

    # Create index on referral_code if column was just added or index doesn't exist
    user_indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_referral_code' not in user_indexes:
        op.create_index(op.f('ix_users_referral_code'), 'users', ['referral_code'], unique=True)

    # Create the referrals table if it doesn't exist
    if 'referrals' not in existing_tables:
        op.create_table('referrals',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('referrer_id', sa.Integer(), nullable=False),
            sa.Column('referred_id', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('bonus_amount', sa.Integer(), nullable=False, server_default='500'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['referred_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['referrer_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_referrals_id'), 'referrals', ['id'], unique=False)
        op.create_index(op.f('ix_referrals_referrer_id'), 'referrals', ['referrer_id'], unique=False)
        op.create_index(op.f('ix_referrals_referred_id'), 'referrals', ['referred_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema - remove referral system."""
    # Drop the referrals table
    op.drop_index(op.f('ix_referrals_referred_id'), table_name='referrals')
    op.drop_index(op.f('ix_referrals_referrer_id'), table_name='referrals')
    op.drop_index(op.f('ix_referrals_id'), table_name='referrals')
    op.drop_table('referrals')

    # Remove referral_code column from users
    op.drop_index(op.f('ix_users_referral_code'), table_name='users')
    op.drop_column('users', 'referral_code')

    # Drop the enum
    sa.Enum(name='referralstatus').drop(op.get_bind(), checkfirst=True)
