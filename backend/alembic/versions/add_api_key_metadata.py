"""Add API key metadata fields

Revision ID: add_api_key_metadata
Revises: add_trading_mode_and_pending_actions
Create Date: 2025-02-01 12:00:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_api_key_metadata"
down_revision: Union[str, None] = "b2c3d4e5f6g7"  # add_order_type_to_orders
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add API key metadata fields
    op.add_column(
        "agents", sa.Column("api_key_created_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "agents", sa.Column("api_key_last_used_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "agents", sa.Column("api_key_revoked_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    # Remove API key metadata fields
    op.drop_column("agents", "api_key_revoked_at")
    op.drop_column("agents", "api_key_last_used_at")
    op.drop_column("agents", "api_key_created_at")
