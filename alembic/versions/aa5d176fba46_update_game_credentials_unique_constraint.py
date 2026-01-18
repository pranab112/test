"""update game credentials unique constraint to include client_id

Revision ID: aa5d176fba46
Revises: f9a21eee9f41
Create Date: 2026-01-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa5d176fba46'
down_revision: Union[str, None] = 'f9a21eee9f41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old unique constraint
    op.drop_constraint('unique_player_game_credential', 'game_credentials', type_='unique')

    # Create new unique constraint that includes client_id
    # This allows different clients to have separate credentials for the same player-game
    op.create_unique_constraint(
        'unique_client_player_game_credential',
        'game_credentials',
        ['player_id', 'game_id', 'created_by_client_id']
    )


def downgrade() -> None:
    # Drop the new constraint
    op.drop_constraint('unique_client_player_game_credential', 'game_credentials', type_='unique')

    # Restore the old constraint
    op.create_unique_constraint(
        'unique_player_game_credential',
        'game_credentials',
        ['player_id', 'game_id']
    )
