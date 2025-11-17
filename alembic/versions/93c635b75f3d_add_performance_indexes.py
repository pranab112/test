"""add_performance_indexes

Revision ID: 93c635b75f3d
Revises: 2d2dd514c898
Create Date: 2025-11-16 17:46:55.227654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93c635b75f3d'
down_revision: Union[str, Sequence[str], None] = '2d2dd514c898'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes to improve query speed"""

    # ========== USER TABLE INDEXES ==========
    # Authentication lookups
    op.create_index('idx_users_username', 'users', ['username'])
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_user_id', 'users', ['user_id'])

    # Filtering by user type (for admin queries)
    op.create_index('idx_users_user_type', 'users', ['user_type'])

    # Status filters
    op.create_index('idx_users_is_active', 'users', ['is_active'])
    op.create_index('idx_users_is_approved', 'users', ['is_approved'])
    op.create_index('idx_users_is_online', 'users', ['is_online'])

    # Client-player relationships
    op.create_index('idx_users_created_by_client_id', 'users', ['created_by_client_id'])

    # ========== MESSAGE TABLE INDEXES ==========
    # Most common query: get messages between two users
    op.create_index('idx_messages_sender_receiver', 'messages', ['sender_id', 'receiver_id'])
    op.create_index('idx_messages_receiver_sender', 'messages', ['receiver_id', 'sender_id'])

    # For sorting by time
    op.create_index('idx_messages_created_at', 'messages', ['created_at'])

    # For unread message counts
    op.create_index('idx_messages_receiver_unread', 'messages', ['receiver_id', 'is_read'])

    # ========== FRIEND REQUEST TABLE INDEXES ==========
    op.create_index('idx_friend_requests_sender_id', 'friend_requests', ['sender_id'])
    op.create_index('idx_friend_requests_receiver_id', 'friend_requests', ['receiver_id'])
    op.create_index('idx_friend_requests_status', 'friend_requests', ['status'])

    # Composite for checking existing requests
    op.create_index('idx_friend_requests_sender_receiver', 'friend_requests', ['sender_id', 'receiver_id'])

    # ========== FRIENDS TABLE INDEXES ==========
    # For friend lookups
    op.create_index('idx_friends_user_id', 'friends', ['user_id'])
    op.create_index('idx_friends_friend_id', 'friends', ['friend_id'])

    # ========== REVIEW TABLE INDEXES ==========
    op.create_index('idx_reviews_reviewee_id', 'reviews', ['reviewee_id'])
    op.create_index('idx_reviews_reviewer_id', 'reviews', ['reviewer_id'])
    op.create_index('idx_reviews_rating', 'reviews', ['rating'])
    op.create_index('idx_reviews_created_at', 'reviews', ['created_at'])

    # ========== REPORT TABLE INDEXES ==========
    op.create_index('idx_reports_reported_user_id', 'reports', ['reported_user_id'])
    op.create_index('idx_reports_reporter_id', 'reports', ['reporter_id'])
    op.create_index('idx_reports_status', 'reports', ['status'])

    # ========== PROMOTION TABLE INDEXES ==========
    op.create_index('idx_promotions_client_id', 'promotions', ['client_id'])
    op.create_index('idx_promotions_status', 'promotions', ['status'])
    op.create_index('idx_promotions_promotion_type', 'promotions', ['promotion_type'])

    # Date range queries
    op.create_index('idx_promotions_start_end', 'promotions', ['start_date', 'end_date'])

    # ========== PROMOTION CLAIMS TABLE INDEXES ==========
    op.create_index('idx_promotion_claims_promotion_id', 'promotion_claims', ['promotion_id'])
    op.create_index('idx_promotion_claims_player_id', 'promotion_claims', ['player_id'])
    op.create_index('idx_promotion_claims_client_id', 'promotion_claims', ['client_id'])
    op.create_index('idx_promotion_claims_status', 'promotion_claims', ['status'])

    # ========== GAME CREDENTIALS TABLE INDEXES ==========
    op.create_index('idx_game_credentials_player_id', 'game_credentials', ['player_id'])
    op.create_index('idx_game_credentials_game_id', 'game_credentials', ['game_id'])
    op.create_index('idx_game_credentials_created_by_client_id', 'game_credentials', ['created_by_client_id'])

    # ========== CLIENT GAMES TABLE INDEXES ==========
    op.create_index('idx_client_games_client_id', 'client_games', ['client_id'])
    op.create_index('idx_client_games_game_id', 'client_games', ['game_id'])

    # ========== CLIENT PAYMENT METHODS TABLE INDEXES ==========
    op.create_index('idx_client_payment_methods_client_id', 'client_payment_methods', ['client_id'])
    op.create_index('idx_client_payment_methods_payment_method_id', 'client_payment_methods', ['payment_method_id'])

    # ========== PLAYER WALLETS TABLE INDEXES ==========
    op.create_index('idx_player_wallets_player_id', 'player_wallets', ['player_id'])

    print("✅ All performance indexes created successfully")


def downgrade() -> None:
    """Remove all performance indexes"""

    # Drop indexes in reverse order
    op.drop_index('idx_player_wallets_player_id', 'player_wallets')

    op.drop_index('idx_client_payment_methods_payment_method_id', 'client_payment_methods')
    op.drop_index('idx_client_payment_methods_client_id', 'client_payment_methods')

    op.drop_index('idx_client_games_game_id', 'client_games')
    op.drop_index('idx_client_games_client_id', 'client_games')

    op.drop_index('idx_game_credentials_created_by_client_id', 'game_credentials')
    op.drop_index('idx_game_credentials_game_id', 'game_credentials')
    op.drop_index('idx_game_credentials_player_id', 'game_credentials')

    op.drop_index('idx_promotion_claims_status', 'promotion_claims')
    op.drop_index('idx_promotion_claims_client_id', 'promotion_claims')
    op.drop_index('idx_promotion_claims_player_id', 'promotion_claims')
    op.drop_index('idx_promotion_claims_promotion_id', 'promotion_claims')

    op.drop_index('idx_promotions_start_end', 'promotions')
    op.drop_index('idx_promotions_promotion_type', 'promotions')
    op.drop_index('idx_promotions_status', 'promotions')
    op.drop_index('idx_promotions_client_id', 'promotions')

    op.drop_index('idx_reports_status', 'reports')
    op.drop_index('idx_reports_reporter_id', 'reports')
    op.drop_index('idx_reports_reported_user_id', 'reports')

    op.drop_index('idx_reviews_created_at', 'reviews')
    op.drop_index('idx_reviews_rating', 'reviews')
    op.drop_index('idx_reviews_reviewer_id', 'reviews')
    op.drop_index('idx_reviews_reviewee_id', 'reviews')

    op.drop_index('idx_friends_friend_id', 'friends')
    op.drop_index('idx_friends_user_id', 'friends')

    op.drop_index('idx_friend_requests_sender_receiver', 'friend_requests')
    op.drop_index('idx_friend_requests_status', 'friend_requests')
    op.drop_index('idx_friend_requests_receiver_id', 'friend_requests')
    op.drop_index('idx_friend_requests_sender_id', 'friend_requests')

    op.drop_index('idx_messages_receiver_unread', 'messages')
    op.drop_index('idx_messages_created_at', 'messages')
    op.drop_index('idx_messages_receiver_sender', 'messages')
    op.drop_index('idx_messages_sender_receiver', 'messages')

    op.drop_index('idx_users_created_by_client_id', 'users')
    op.drop_index('idx_users_is_online', 'users')
    op.drop_index('idx_users_is_approved', 'users')
    op.drop_index('idx_users_is_active', 'users')
    op.drop_index('idx_users_user_type', 'users')
    op.drop_index('idx_users_user_id', 'users')
    op.drop_index('idx_users_email', 'users')
    op.drop_index('idx_users_username', 'users')

    print("✅ All performance indexes removed")