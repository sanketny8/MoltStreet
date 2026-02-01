from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.middleware.auth import get_current_agent, get_current_agent_optional
from server.models.agent import Agent
from server.models.comment import Comment, CommentVote
from server.models.market import Market
from server.models.position import Position
from server.schemas.comment import (
    AgentBasicInfo,
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentUpdate,
    CommentVoteRequest,
    PositionInfo,
)

router = APIRouter(prefix="/markets", tags=["comments"])


async def get_comment_with_agent(
    comment_id: UUID, session: AsyncSession, current_agent_id: UUID | None = None
) -> tuple[Comment, Agent]:
    """Get comment and its author agent."""
    result = await session.execute(
        select(Comment, Agent)
        .join(Agent, Comment.agent_id == Agent.id)
        .where(Comment.id == comment_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment, agent = row
    return comment, agent


async def build_comment_response(
    comment: Comment,
    agent: Agent,
    session: AsyncSession,
    current_agent_id: UUID | None = None,
    include_replies: bool = True,
) -> CommentResponse:
    """Build a CommentResponse with nested replies."""
    # Get user's vote if logged in
    user_vote = None
    if current_agent_id:
        vote_result = await session.execute(
            select(CommentVote)
            .where(CommentVote.comment_id == comment.id)
            .where(CommentVote.agent_id == current_agent_id)
        )
        vote = vote_result.scalar_one_or_none()
        if vote:
            user_vote = vote.vote_type

    # Get agent's position in the market
    agent_position = None
    position_result = await session.execute(
        select(Position)
        .where(Position.market_id == comment.market_id)
        .where(Position.agent_id == comment.agent_id)
    )
    position = position_result.scalar_one_or_none()
    if position and (position.yes_shares > 0 or position.no_shares > 0):
        agent_position = PositionInfo(
            yes_shares=position.yes_shares,
            no_shares=position.no_shares,
            avg_yes_price=float(position.avg_yes_price) if position.avg_yes_price else None,
            avg_no_price=float(position.avg_no_price) if position.avg_no_price else None,
        )

    # Get nested replies if requested
    replies = []
    if include_replies:
        # Use (upvotes - downvotes) for score calculation in query
        replies_result = await session.execute(
            select(Comment, Agent)
            .join(Agent, Comment.agent_id == Agent.id)
            .where(Comment.parent_id == comment.id)
            .where(Comment.is_deleted.is_(False))
            .order_by(
                Comment.is_pinned.desc(),
                (Comment.upvotes - Comment.downvotes).desc(),
                Comment.created_at.asc(),
            )
        )
        for reply_comment, reply_agent in replies_result.all():
            reply_response = await build_comment_response(
                reply_comment, reply_agent, session, current_agent_id, include_replies=False
            )
            replies.append(reply_response)

    return CommentResponse(
        id=comment.id,
        market_id=comment.market_id,
        agent=AgentBasicInfo(
            id=agent.id,
            name=agent.name,
            role=agent.role.value if hasattr(agent.role, "value") else str(agent.role),
            reputation=float(agent.reputation),
        ),
        parent_id=comment.parent_id,
        content=comment.content,
        sentiment=comment.sentiment,
        price_prediction=float(comment.price_prediction) if comment.price_prediction else None,
        upvotes=comment.upvotes,
        downvotes=comment.downvotes,
        score=comment.score,
        reply_count=comment.reply_count,
        is_deleted=comment.is_deleted,
        is_pinned=comment.is_pinned,
        is_edited=comment.is_edited,
        user_vote=user_vote,
        agent_position=agent_position,
        replies=replies,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.post("/{market_id}/comments", response_model=CommentResponse)
async def create_comment(
    market_id: UUID,
    data: CommentCreate,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Create a new comment on a market."""
    # Verify market exists
    market_result = await session.execute(select(Market).where(Market.id == market_id))
    market = market_result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # If replying, verify parent comment exists and is in same market
    if data.parent_id:
        parent_result = await session.execute(select(Comment).where(Comment.id == data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent.market_id != market_id:
            raise HTTPException(status_code=400, detail="Parent comment must be in the same market")
        if parent.is_deleted:
            raise HTTPException(status_code=400, detail="Cannot reply to deleted comment")

    # Create comment
    price_pred = Decimal(str(data.price_prediction)) if data.price_prediction else None
    comment = Comment(
        market_id=market_id,
        agent_id=agent.id,
        parent_id=data.parent_id,
        content=data.content,
        sentiment=data.sentiment,
        price_prediction=price_pred,
    )
    session.add(comment)

    # Update parent's reply count if replying
    if data.parent_id:
        await session.execute(select(Comment).where(Comment.id == data.parent_id))
        parent_result = await session.execute(select(Comment).where(Comment.id == data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if parent:
            parent.reply_count += 1
            session.add(parent)

    await session.commit()
    await session.refresh(comment)

    # Build response
    return await build_comment_response(comment, agent, session, agent.id, include_replies=False)


@router.get("/{market_id}/comments", response_model=CommentListResponse)
async def get_market_comments(
    market_id: UUID,
    sort: str = Query(default="top", pattern="^(newest|top|controversial|oldest)$"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    parent_id: UUID | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    current_agent: Agent | None = Depends(get_current_agent_optional),
):
    """Get comments for a market."""
    # Verify market exists
    market_result = await session.execute(select(Market).where(Market.id == market_id))
    market = market_result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # Build query
    query = (
        select(Comment, Agent)
        .join(Agent, Comment.agent_id == Agent.id)
        .where(Comment.market_id == market_id)
        .where(Comment.is_deleted.is_(False))
    )

    # Filter by parent_id (for replies)
    if parent_id:
        query = query.where(Comment.parent_id == parent_id)
    else:
        # Top-level comments only
        query = query.where(Comment.parent_id.is_(None))

    # Get total count
    count_query = select(func.count(Comment.id)).where(
        Comment.market_id == market_id,
        Comment.is_deleted.is_(False),
        Comment.parent_id == (parent_id if parent_id else None),
    )
    total = (await session.execute(count_query)).scalar_one()

    # Apply sorting
    if sort == "newest":
        query = query.order_by(Comment.is_pinned.desc(), Comment.created_at.desc())
    elif sort == "oldest":
        query = query.order_by(Comment.is_pinned.desc(), Comment.created_at.asc())
    elif sort == "top":
        # Sort by score (upvotes - downvotes) descending
        query = query.order_by(
            Comment.is_pinned.desc(),
            (Comment.upvotes - Comment.downvotes).desc(),
            Comment.created_at.desc(),
        )
    elif sort == "controversial":
        # Controversial = high upvotes AND high downvotes (min of both)
        # Use case statement to get minimum of upvotes and downvotes
        min_votes = case(
            (Comment.upvotes < Comment.downvotes, Comment.upvotes), else_=Comment.downvotes
        )
        query = query.order_by(
            Comment.is_pinned.desc(), min_votes.desc(), Comment.created_at.desc()
        )

    # Apply pagination
    query = query.limit(limit).offset(offset)

    # Execute query
    result = await session.execute(query)
    rows = result.all()

    # Build responses
    current_agent_id = current_agent.id if current_agent else None
    comments = []
    for comment, agent in rows:
        comment_response = await build_comment_response(
            comment, agent, session, current_agent_id, include_replies=(parent_id is None)
        )
        comments.append(comment_response)

    return CommentListResponse(comments=comments, total=total, limit=limit, offset=offset)


@router.get("/comments/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_agent: Agent | None = Depends(get_current_agent_optional),
):
    """Get a single comment with its replies."""
    comment, agent = await get_comment_with_agent(comment_id, session)
    current_agent_id = current_agent.id if current_agent else None
    return await build_comment_response(comment, agent, session, current_agent_id)


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    data: CommentUpdate,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Update a comment (only by author)."""
    comment, comment_agent = await get_comment_with_agent(comment_id, session)

    if comment.agent_id != agent.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot edit deleted comment")

    comment.content = data.content
    comment.is_edited = True
    comment.edited_at = datetime.utcnow()
    comment.updated_at = datetime.utcnow()

    session.add(comment)
    await session.commit()
    await session.refresh(comment)

    return await build_comment_response(comment, comment_agent, session, agent.id)


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Delete a comment (by author or moderator)."""
    comment, _comment_agent = await get_comment_with_agent(comment_id, session)

    # Check permissions
    is_author = comment.agent_id == agent.id
    is_moderator = (
        agent.role.value == "moderator"
        if hasattr(agent.role, "value")
        else agent.role == "moderator"
    )

    if not (is_author or is_moderator):
        raise HTTPException(
            status_code=403, detail="You can only delete your own comments or be a moderator"
        )

    # Soft delete
    comment.is_deleted = True
    comment.content = "[deleted]"
    comment.updated_at = datetime.utcnow()

    # Update parent's reply count if this was a reply
    if comment.parent_id:
        parent_result = await session.execute(
            select(Comment).where(Comment.id == comment.parent_id)
        )
        parent = parent_result.scalar_one_or_none()
        if parent:
            parent.reply_count = max(0, parent.reply_count - 1)
            session.add(parent)

    session.add(comment)
    await session.commit()

    return {"message": "Comment deleted"}


@router.post("/comments/{comment_id}/vote", response_model=dict)
async def vote_on_comment(
    comment_id: UUID,
    data: CommentVoteRequest,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Vote on a comment (upvote, downvote, or remove vote)."""
    comment, _ = await get_comment_with_agent(comment_id, session)

    if comment.is_deleted:
        raise HTTPException(status_code=400, detail="Cannot vote on deleted comment")

    # Check for existing vote
    existing_vote_result = await session.execute(
        select(CommentVote)
        .where(CommentVote.comment_id == comment_id)
        .where(CommentVote.agent_id == agent.id)
    )
    existing_vote = existing_vote_result.scalar_one_or_none()

    if data.vote_type == "remove":
        # Remove existing vote
        if existing_vote:
            # Update comment vote counts
            if existing_vote.vote_type == "upvote":
                comment.upvotes = max(0, comment.upvotes - 1)
            elif existing_vote.vote_type == "downvote":
                comment.downvotes = max(0, comment.downvotes - 1)

            await session.delete(existing_vote)
            session.add(comment)
            await session.commit()
            await session.refresh(comment)

        return {"comment_id": str(comment_id), "new_score": comment.score, "user_vote": None}

    # Add or update vote
    if existing_vote:
        # Change vote type
        old_type = existing_vote.vote_type
        existing_vote.vote_type = data.vote_type

        # Update counts
        if old_type == "upvote":
            comment.upvotes = max(0, comment.upvotes - 1)
        elif old_type == "downvote":
            comment.downvotes = max(0, comment.downvotes - 1)

        if data.vote_type == "upvote":
            comment.upvotes += 1
        elif data.vote_type == "downvote":
            comment.downvotes += 1

        session.add(existing_vote)
    else:
        # New vote
        vote = CommentVote(comment_id=comment_id, agent_id=agent.id, vote_type=data.vote_type)
        session.add(vote)

        if data.vote_type == "upvote":
            comment.upvotes += 1
        elif data.vote_type == "downvote":
            comment.downvotes += 1

    session.add(comment)
    await session.commit()
    await session.refresh(comment)

    return {"comment_id": str(comment_id), "new_score": comment.score, "user_vote": data.vote_type}


@router.post("/comments/{comment_id}/pin", response_model=CommentResponse)
async def pin_comment(
    comment_id: UUID,
    pinned: bool = Query(...),
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Pin or unpin a comment (moderator only)."""
    # Check if moderator
    is_moderator = (
        agent.role.value == "moderator"
        if hasattr(agent.role, "value")
        else agent.role == "moderator"
    )
    if not is_moderator:
        raise HTTPException(status_code=403, detail="Only moderators can pin comments")

    comment, comment_agent = await get_comment_with_agent(comment_id, session)
    comment.is_pinned = pinned
    comment.updated_at = datetime.utcnow()

    session.add(comment)
    await session.commit()
    await session.refresh(comment)

    return await build_comment_response(comment, comment_agent, session, agent.id)
