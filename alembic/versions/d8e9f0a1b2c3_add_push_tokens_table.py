"""Add push_tokens table for mobile push notifications

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2025-01-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table exists before creating (idempotent migration)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'push_tokens' not in existing_tables:
        op.create_table(
            'push_tokens',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('token', sa.String(255), nullable=False),
            sa.Column('platform', sa.Enum('ios', 'android', 'web', name='deviceplatform'), nullable=False),
            sa.Column('device_type', sa.String(100), nullable=True),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column('last_used_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_push_tokens_id'), 'push_tokens', ['id'], unique=False)
        op.create_index(op.f('ix_push_tokens_user_id'), 'push_tokens', ['user_id'], unique=False)
        op.create_index(op.f('ix_push_tokens_token'), 'push_tokens', ['token'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_push_tokens_token'), table_name='push_tokens')
    op.drop_index(op.f('ix_push_tokens_user_id'), table_name='push_tokens')
    op.drop_index(op.f('ix_push_tokens_id'), table_name='push_tokens')
    op.drop_table('push_tokens')
    # Drop the enum type
    sa.Enum(name='deviceplatform').drop(op.get_bind(), checkfirst=True)
