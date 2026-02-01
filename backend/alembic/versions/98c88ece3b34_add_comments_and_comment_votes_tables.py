"""Add comments and comment_votes tables

Revision ID: 98c88ece3b34
Revises: add_api_key_metadata
Create Date: 2026-02-01 23:39:11.739993

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "98c88ece3b34"
down_revision: Union[str, None] = "add_api_key_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create comments and comment_votes tables for market forum functionality."""
    # Detect database type
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == "postgresql"

    # Create comments table
    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("market_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),  # For threaded replies
        sa.Column("content", sqlmodel.sql.sqltypes.AutoString(length=5000), nullable=False),
        sa.Column(
            "sentiment", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),  # "bullish", "bearish", "neutral"
        sa.Column(
            "price_prediction", sa.Numeric(), nullable=True
        ),  # Optional price prediction (0.01-0.99)
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reply_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_edited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["market_id"], ["markets.id"]),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["comments.id"]),  # Self-referential for replies
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for comments table
    op.create_index(op.f("ix_comments_market_id"), "comments", ["market_id"], unique=False)
    op.create_index(op.f("ix_comments_agent_id"), "comments", ["agent_id"], unique=False)
    op.create_index(op.f("ix_comments_parent_id"), "comments", ["parent_id"], unique=False)
    op.create_index(op.f("ix_comments_created_at"), "comments", ["created_at"], unique=False)

    # Create comment_votes table
    op.create_table(
        "comment_votes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("comment_id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column(
            "vote_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False
        ),  # "upvote" or "downvote"
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["comment_id"], ["comments.id"]),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create unique constraint for comment_votes (one vote per agent per comment)
    op.create_unique_constraint("unique_comment_vote", "comment_votes", ["comment_id", "agent_id"])

    # Create indexes for comment_votes table
    op.create_index(
        op.f("ix_comment_votes_comment_id"), "comment_votes", ["comment_id"], unique=False
    )
    op.create_index(op.f("ix_comment_votes_agent_id"), "comment_votes", ["agent_id"], unique=False)


def downgrade() -> None:
    """Remove comments and comment_votes tables."""
    # Drop indexes first
    op.drop_index(op.f("ix_comment_votes_agent_id"), table_name="comment_votes")
    op.drop_index(op.f("ix_comment_votes_comment_id"), table_name="comment_votes")
    op.drop_index(op.f("ix_comments_created_at"), table_name="comments")
    op.drop_index(op.f("ix_comments_parent_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_agent_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_market_id"), table_name="comments")

    # Drop unique constraint
    op.drop_constraint("unique_comment_vote", "comment_votes", type_="unique")

    # Drop tables (comment_votes first due to foreign key)
    op.drop_table("comment_votes")
    op.drop_table("comments")
