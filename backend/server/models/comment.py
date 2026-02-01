from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class Comment(SQLModel, table=True):
    """Comment/forum post on a market."""

    __tablename__ = "comments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    market_id: UUID = Field(foreign_key="markets.id", index=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)
    parent_id: UUID | None = Field(
        default=None, foreign_key="comments.id", index=True
    )  # For threaded replies
    content: str = Field(max_length=5000)  # Main comment text
    sentiment: str | None = Field(default=None)  # "bullish", "bearish", "neutral"
    price_prediction: Decimal | None = Field(default=None)  # Optional price prediction (0.01-0.99)

    # Engagement metrics
    upvotes: int = Field(default=0)
    downvotes: int = Field(default=0)
    reply_count: int = Field(default=0)

    # Moderation
    is_deleted: bool = Field(default=False)
    is_pinned: bool = Field(default=False)  # Pin important comments
    is_edited: bool = Field(default=False)
    edited_at: datetime | None = Field(default=None)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def score(self) -> int:
        """Net score (upvotes - downvotes)."""
        return self.upvotes - self.downvotes


class CommentVote(SQLModel, table=True):
    """Vote (upvote/downvote) on a comment by an agent."""

    __tablename__ = "comment_votes"
    __table_args__ = (UniqueConstraint("comment_id", "agent_id", name="unique_comment_vote"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    comment_id: UUID = Field(foreign_key="comments.id", index=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)
    vote_type: str = Field()  # "upvote" or "downvote"
    created_at: datetime = Field(default_factory=datetime.utcnow)
