from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from server.database import get_session
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketStatus
from server.models.moderator_reward import ModeratorReward


router = APIRouter(prefix="/moderator", tags=["moderator"])


# Response schemas
class ModeratorStatsResponse(BaseModel):
    total_earnings: float
    markets_resolved: int
    pending_markets: int
    average_reward: float
    platform_share_total: float
    winner_fee_total: float


class PendingMarketResponse(BaseModel):
    id: str
    question: str
    description: Optional[str]
    category: str
    deadline: str
    days_overdue: int
    volume: float
    status: str


class ModeratorRewardResponse(BaseModel):
    id: int
    market_id: str
    market_question: Optional[str]
    platform_share: float
    winner_fee: float
    total_reward: float
    total_winner_profits: float
    created_at: str


class ResolvedMarketResponse(BaseModel):
    id: str
    question: str
    outcome: str
    volume: float
    resolved_at: str
    reward: Optional[ModeratorRewardResponse]


@router.get("/stats/{moderator_id}", response_model=ModeratorStatsResponse)
async def get_moderator_stats(
    moderator_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """Get moderator statistics including total earnings and markets resolved."""
    # Verify agent is a moderator
    agent_result = await session.execute(
        select(Agent).where(Agent.id == moderator_id)
    )
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.role != AgentRole.MODERATOR:
        raise HTTPException(status_code=403, detail="Agent is not a moderator")

    # Get reward stats
    rewards_result = await session.execute(
        select(
            func.sum(ModeratorReward.total_reward),
            func.sum(ModeratorReward.platform_share),
            func.sum(ModeratorReward.winner_fee),
            func.count(ModeratorReward.id)
        ).where(ModeratorReward.moderator_id == moderator_id)
    )
    reward_data = rewards_result.one()
    total_earnings = float(reward_data[0] or 0)
    platform_share_total = float(reward_data[1] or 0)
    winner_fee_total = float(reward_data[2] or 0)
    markets_resolved = reward_data[3] or 0

    # Get pending markets count (closed but not resolved, past deadline)
    now = datetime.now(timezone.utc)
    pending_result = await session.execute(
        select(func.count(Market.id))
        .where(Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED]))
        .where(Market.deadline <= now)
    )
    pending_markets = pending_result.scalar() or 0

    average_reward = total_earnings / markets_resolved if markets_resolved > 0 else 0

    return ModeratorStatsResponse(
        total_earnings=total_earnings,
        markets_resolved=markets_resolved,
        pending_markets=pending_markets,
        average_reward=average_reward,
        platform_share_total=platform_share_total,
        winner_fee_total=winner_fee_total
    )


@router.get("/pending", response_model=List[PendingMarketResponse])
async def get_pending_markets(
    limit: int = Query(default=50, le=100),
    session: AsyncSession = Depends(get_session)
):
    """Get markets that are past their deadline and awaiting resolution."""
    now = datetime.now(timezone.utc)

    result = await session.execute(
        select(Market)
        .where(Market.status.in_([MarketStatus.OPEN, MarketStatus.CLOSED]))
        .where(Market.deadline <= now)
        .order_by(Market.deadline.asc())  # Most overdue first
        .limit(limit)
    )
    markets = result.scalars().all()

    response = []
    for market in markets:
        days_overdue = (now - market.deadline).days
        response.append(PendingMarketResponse(
            id=str(market.id),
            question=market.question,
            description=market.description,
            category=market.category.value,
            deadline=market.deadline.isoformat(),
            days_overdue=max(0, days_overdue),
            volume=float(market.volume),
            status=market.status.value
        ))

    return response


@router.get("/rewards/{moderator_id}", response_model=List[ModeratorRewardResponse])
async def get_moderator_rewards(
    moderator_id: UUID,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session)
):
    """Get moderator's reward history."""
    # Get rewards with market info
    result = await session.execute(
        select(ModeratorReward, Market.question)
        .join(Market, ModeratorReward.market_id == Market.id)
        .where(ModeratorReward.moderator_id == moderator_id)
        .order_by(ModeratorReward.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()

    response = []
    for reward, question in rows:
        response.append(ModeratorRewardResponse(
            id=reward.id,
            market_id=str(reward.market_id),
            market_question=question,
            platform_share=float(reward.platform_share),
            winner_fee=float(reward.winner_fee),
            total_reward=float(reward.total_reward),
            total_winner_profits=float(reward.total_winner_profits),
            created_at=reward.created_at.isoformat()
        ))

    return response


@router.get("/resolved/{moderator_id}", response_model=List[ResolvedMarketResponse])
async def get_resolved_markets(
    moderator_id: UUID,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_session)
):
    """Get markets resolved by this moderator."""
    # Get markets resolved by moderator
    result = await session.execute(
        select(Market)
        .where(Market.resolved_by == moderator_id)
        .where(Market.status == MarketStatus.RESOLVED)
        .order_by(Market.resolved_at.desc())
        .offset(offset)
        .limit(limit)
    )
    markets = result.scalars().all()

    # Get rewards for these markets
    market_ids = [m.id for m in markets]
    rewards_result = await session.execute(
        select(ModeratorReward)
        .where(ModeratorReward.market_id.in_(market_ids))
    )
    rewards_map = {r.market_id: r for r in rewards_result.scalars().all()}

    response = []
    for market in markets:
        reward = rewards_map.get(market.id)
        reward_response = None
        if reward:
            reward_response = ModeratorRewardResponse(
                id=reward.id,
                market_id=str(reward.market_id),
                market_question=market.question,
                platform_share=float(reward.platform_share),
                winner_fee=float(reward.winner_fee),
                total_reward=float(reward.total_reward),
                total_winner_profits=float(reward.total_winner_profits),
                created_at=reward.created_at.isoformat()
            )

        response.append(ResolvedMarketResponse(
            id=str(market.id),
            question=market.question,
            outcome=market.outcome.value if market.outcome else "unknown",
            volume=float(market.volume),
            resolved_at=market.resolved_at.isoformat() if market.resolved_at else "",
            reward=reward_response
        ))

    return response
