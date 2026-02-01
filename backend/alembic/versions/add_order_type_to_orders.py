"""Add order_type to orders table for buy/sell functionality

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-01 12:00:00.000000

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6g7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add order_type column to orders table.

    This enables buy/sell functionality:
    - BUY orders: Opening positions (acquiring shares)
    - SELL orders: Closing positions (disposing shares)

    All existing orders will be set to 'buy' (the current behavior).
    """
    # Detect database type
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    if is_postgresql:
        # PostgreSQL: Create enum type with error handling
        op.execute(
            """
            DO $$
            BEGIN
                CREATE TYPE ordertype AS ENUM ('buy', 'sell');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """
        )

        # Add column with PostgreSQL enum
        op.add_column(
            "orders",
            sa.Column(
                "order_type",
                postgresql.ENUM("buy", "sell", name="ordertype", create_type=False),
                nullable=False,
                server_default="buy",
            ),
        )
    else:
        # SQLite: Use VARCHAR with CHECK constraint
        op.add_column(
            "orders",
            sa.Column("order_type", sa.VARCHAR(length=4), nullable=False, server_default="buy"),
        )

        # Add CHECK constraint for SQLite
        op.create_check_constraint(
            "orders_order_type_check", "orders", "order_type IN ('buy', 'sell')"
        )

    # Remove server default after column is populated
    # Future inserts must explicitly provide order_type
    op.alter_column("orders", "order_type", server_default=None)


def downgrade() -> None:
    """Remove order_type column and enum type."""
    # Detect database type
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    # Drop the column first
    op.drop_column("orders", "order_type")

    # PostgreSQL: Drop the enum type
    if is_postgresql:
        op.execute("DROP TYPE IF EXISTS ordertype")
