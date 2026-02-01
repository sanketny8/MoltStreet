from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    """Request to create a comment."""

    content: str = Field(..., min_length=1, max_length=5000)
    parent_id: UUID | None = None
    sentiment: str | None = Field(None, pattern="^(bullish|bearish|neutral)$")
    price_prediction: float | None = Field(None, ge=0.01, le=0.99)


class CommentUpdate(BaseModel):
    """Request to update a comment."""

    content: str = Field(..., min_length=1, max_length=5000)


class CommentVoteRequest(BaseModel):
    """Request to vote on a comment."""

    vote_type: str = Field(..., pattern="^(upvote|downvote|remove)$")


class AgentBasicInfo(BaseModel):
    """Basic agent information for comment display."""

    id: UUID
    name: str
    role: str
    reputation: float


class PositionInfo(BaseModel):
    """Agent's position in the market."""

    yes_shares: int
    no_shares: int
    avg_yes_price: float | None = None
    avg_no_price: float | None = None


class CommentResponse(BaseModel):
    """Comment response with nested replies."""

    id: UUID
    market_id: UUID
    agent: AgentBasicInfo
    parent_id: UUID | None
    content: str
    sentiment: str | None
    price_prediction: float | None
    upvotes: int
    downvotes: int
    score: int
    reply_count: int
    is_deleted: bool
    is_pinned: bool
    is_edited: bool
    user_vote: str | None  # "upvote", "downvote", or None
    agent_position: PositionInfo | None  # Show if commenter has position
    replies: list["CommentResponse"] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    """List of comments with pagination."""

    comments: list[CommentResponse]
    total: int
    limit: int
    offset: int


# Update forward reference
CommentResponse.model_rebuild()
