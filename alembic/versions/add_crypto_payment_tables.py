"""Add crypto payment tables

Revision ID: a1b2c3d4e5f6
Revises: 2f0c03e22758
Create Date: 2025-01-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '2f0c03e22758'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create admin_crypto_wallets table
    op.create_table(
        'admin_crypto_wallets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(20), nullable=False),
        sa.Column('network', sa.String(20), nullable=False),
        sa.Column('wallet_address', sa.String(255), nullable=False),
        sa.Column('label', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('display_order', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_crypto_wallets_id'), 'admin_crypto_wallets', ['id'], unique=False)

    # Create credit_purchase_requests table
    op.create_table(
        'credit_purchase_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('wallet_id', sa.Integer(), nullable=False),
        sa.Column('credits_amount', sa.Integer(), nullable=False),
        sa.Column('crypto_amount', sa.Numeric(20, 8), nullable=False),
        sa.Column('currency', sa.String(20), nullable=False),
        sa.Column('network', sa.String(20), nullable=False),
        sa.Column('exchange_rate', sa.Numeric(20, 8), nullable=True),
        sa.Column('transaction_hash', sa.String(255), nullable=True),
        sa.Column('proof_screenshot', sa.String(500), nullable=True),
        sa.Column('sender_wallet_address', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['wallet_id'], ['admin_crypto_wallets.id'], ),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_credit_purchase_requests_id'), 'credit_purchase_requests', ['id'], unique=False)
    op.create_index(op.f('ix_credit_purchase_requests_client_id'), 'credit_purchase_requests', ['client_id'], unique=False)
    op.create_index(op.f('ix_credit_purchase_requests_status'), 'credit_purchase_requests', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_credit_purchase_requests_status'), table_name='credit_purchase_requests')
    op.drop_index(op.f('ix_credit_purchase_requests_client_id'), table_name='credit_purchase_requests')
    op.drop_index(op.f('ix_credit_purchase_requests_id'), table_name='credit_purchase_requests')
    op.drop_table('credit_purchase_requests')
    op.drop_index(op.f('ix_admin_crypto_wallets_id'), table_name='admin_crypto_wallets')
    op.drop_table('admin_crypto_wallets')
