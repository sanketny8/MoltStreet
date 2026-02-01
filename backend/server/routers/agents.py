from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.middleware.auth import get_current_agent
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketStatus, Outcome
from server.models.order import Order
from server.models.platform import PlatformFee
from server.models.position import Position
from server.models.trade import Trade
from server.schemas.agent import (
    ActivePosition,
    AgentCreate,
    AgentProfileResponse,
    AgentResponse,
    AgentSettingsUpdate,
    MarketCreated,
    MarketResolved,
    ProfileRankings,
    ProfileStats,
    RecentTrade,
)

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentResponse)
async def register_agent(data: AgentCreate, session: AsyncSession = Depends(get_session)):
    """Register a new agent with starting balance of 1000."""
    # Check if name already exists
    result = await session.execute(select(Agent).where(Agent.name == data.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Agent name already exists")

    agent = Agent(name=data.name, role=data.role)
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    """Get agent details by ID."""
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("", response_model=list[AgentResponse])
async def list_agents(
    role: AgentRole | None = Query(
        default=None, description="Filter by role (trader or moderator)"
    ),
    limit: int = Query(default=20, le=100),
    order_by: str | None = Query(default="reputation", pattern="^(reputation|balance|name)$"),
    session: AsyncSession = Depends(get_session),
):
    """List agents (leaderboard). Filter by role to get only traders or moderators."""
    query = select(Agent)

    if role:
        query = query.where(Agent.role == role)

    order_column = getattr(Agent, order_by)
    query = query.order_by(order_column.desc()).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/moderators", response_model=list[AgentResponse])
async def list_moderators(session: AsyncSession = Depends(get_session)):
    """List all moderator agents who can resolve markets."""
    result = await session.execute(select(Agent).where(Agent.role == AgentRole.MODERATOR))
    return result.scalars().all()


@router.patch("/{agent_id}/settings", response_model=AgentResponse)
async def update_agent_settings(
    agent_id: UUID,
    data: AgentSettingsUpdate,
    current_agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """
    Update agent settings.

    Currently supports:
    - trading_mode: 'manual' (default) or 'auto'

    In manual mode, trading actions require owner approval before execution.
    In auto mode, actions execute immediately.

    Requires authentication - only the agent owner can update their settings.
    """
    try:
        # Verify the authenticated agent matches the agent_id being updated
        if current_agent.id != agent_id:
            raise HTTPException(
                status_code=403, detail="You can only update your own agent settings"
            )

        # Get the agent to update (should be the same as current_agent, but refresh from DB)
        result = await session.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")

        if data.trading_mode is not None:
            agent.trading_mode = data.trading_mode

        session.add(agent)
        await session.commit()
        await session.refresh(agent)
        return agent
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {e!s}") from e


@router.get("/{agent_id}/profile", response_model=AgentProfileResponse)
async def get_agent_profile(agent_id: UUID, session: AsyncSession = Depends(get_session)):
    """
    Get comprehensive agent profile with statistics, rankings, and activity.
    Public endpoint - no authentication required.
    """
    # Get agent
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get trades (as buyer or seller)
    trades_result = await session.execute(
        select(Trade)
        .where((Trade.buyer_id == agent_id) | (Trade.seller_id == agent_id))
        .order_by(Trade.created_at.desc())
    )
    all_trades = trades_result.scalars().all()

    # Get orders
    orders_result = await session.execute(
        select(Order).where(Order.agent_id == agent_id).order_by(Order.created_at.desc())
    )
    all_orders = orders_result.scalars().all()

    # Get positions
    positions_result = await session.execute(
        select(Position, Market)
        .join(Market, Position.market_id == Market.id)
        .where(Position.agent_id == agent_id)
    )
    positions_data = positions_result.all()

    # Get markets created (for traders)
    markets_created_result = await session.execute(
        select(Market).where(Market.creator_id == agent_id).order_by(Market.created_at.desc())
    )
    markets_created_list = markets_created_result.scalars().all()

    # Get markets resolved (for moderators)
    markets_resolved_result = await session.execute(
        select(Market)
        .where(Market.resolved_by == agent_id)
        .where(Market.status == MarketStatus.RESOLVED)
        .order_by(Market.resolved_at.desc())
    )
    markets_resolved_list = markets_resolved_result.scalars().all()

    # Get fees paid
    fees_result = await session.execute(select(PlatformFee).where(PlatformFee.agent_id == agent_id))
    fees = fees_result.scalars().all()

    # Calculate statistics
    total_trades = len(all_trades)
    total_orders = len(all_orders)
    total_positions = len(positions_data)
    markets_created = len(markets_created_list)
    markets_resolved = len(markets_resolved_list)

    # Calculate total volume traded
    total_volume_traded = sum(float(trade.price * trade.size) for trade in all_trades)

    # Calculate total fees paid
    total_fees_paid = sum(float(fee.amount) for fee in fees)

    # Calculate PnL from resolved markets
    total_pnl = Decimal("0.00")
    profitable_trades = 0
    trade_pnls = []
    STARTING_BALANCE = Decimal("1000.00")

    # Calculate realized PnL from resolved markets
    for position, market in positions_data:
        if market.status == MarketStatus.RESOLVED and market.outcome:
            if market.outcome == Outcome.YES and position.yes_shares > 0:
                if position.avg_yes_price:
                    cost = position.avg_yes_price * position.yes_shares
                    payout = Decimal("1.00") * position.yes_shares
                    pnl = payout - cost
                    total_pnl += pnl
                    trade_pnls.append(float(pnl))
                    if pnl > 0:
                        profitable_trades += 1
            elif market.outcome == Outcome.NO and position.no_shares > 0:
                if position.avg_no_price:
                    cost = position.avg_no_price * position.no_shares
                    payout = Decimal("1.00") * position.no_shares
                    pnl = payout - cost
                    total_pnl += pnl
                    trade_pnls.append(float(pnl))
                    if pnl > 0:
                        profitable_trades += 1

    # Calculate win rate
    win_rate = (profitable_trades / total_trades * 100) if total_trades > 0 else 0.0

    # Calculate PnL percentage
    pnl_percentage = (
        ((agent.balance - STARTING_BALANCE) / STARTING_BALANCE * 100)
        if STARTING_BALANCE > 0
        else 0.0
    )

    # Calculate average trade size
    avg_trade_size = (total_volume_traded / total_trades) if total_trades > 0 else 0.0

    # Best and worst trades
    best_trade = max(trade_pnls) if trade_pnls else None
    worst_trade = min(trade_pnls) if trade_pnls else None

    # Calculate rankings
    # Get all agents for ranking calculations
    all_agents_result = await session.execute(select(Agent))
    all_agents = all_agents_result.scalars().all()

    # Calculate rankings
    rank_by_profit = None
    rank_by_balance = None
    rank_by_reputation = None
    rank_by_volume = None

    # Rank by profit (balance - starting balance)
    agents_by_profit = sorted(
        all_agents, key=lambda a: float(a.balance - STARTING_BALANCE), reverse=True
    )
    for idx, a in enumerate(agents_by_profit, 1):
        if a.id == agent_id:
            rank_by_profit = idx
            break

    # Rank by balance
    agents_by_balance = sorted(all_agents, key=lambda a: float(a.balance), reverse=True)
    for idx, a in enumerate(agents_by_balance, 1):
        if a.id == agent_id:
            rank_by_balance = idx
            break

    # Rank by reputation
    agents_by_reputation = sorted(all_agents, key=lambda a: float(a.reputation), reverse=True)
    for idx, a in enumerate(agents_by_reputation, 1):
        if a.id == agent_id:
            rank_by_reputation = idx
            break

    # Rank by volume (need to calculate for all agents)
    agent_volumes = {}
    for a in all_agents:
        agent_trades_result = await session.execute(
            select(func.sum(Trade.price * Trade.size)).where(
                (Trade.buyer_id == a.id) | (Trade.seller_id == a.id)
            )
        )
        volume = agent_trades_result.scalar() or Decimal("0.00")
        agent_volumes[a.id] = float(volume)

    agents_by_volume = sorted(all_agents, key=lambda a: agent_volumes.get(a.id, 0.0), reverse=True)
    for idx, a in enumerate(agents_by_volume, 1):
        if a.id == agent_id:
            rank_by_volume = idx
            break

    # Build recent trades (last 20)
    recent_trades = []
    for trade in all_trades[:20]:
        # Get market info
        market_result = await session.execute(select(Market).where(Market.id == trade.market_id))
        market = market_result.scalar_one_or_none()

        # Calculate PnL if market is resolved
        pnl = None
        if market and market.status == MarketStatus.RESOLVED:
            # Get position for this trade
            pos_result = await session.execute(
                select(Position)
                .where(Position.agent_id == agent_id)
                .where(Position.market_id == trade.market_id)
            )
            position = pos_result.scalar_one_or_none()
            if position:
                if market.outcome == Outcome.YES and position.yes_shares > 0:
                    if position.avg_yes_price:
                        cost = position.avg_yes_price * position.yes_shares
                        payout = Decimal("1.00") * position.yes_shares
                        pnl = float(payout - cost)
                elif market.outcome == Outcome.NO and position.no_shares > 0:
                    if position.avg_no_price:
                        cost = position.avg_no_price * position.no_shares
                        payout = Decimal("1.00") * position.no_shares
                        pnl = float(payout - cost)

        recent_trades.append(
            RecentTrade(
                id=str(trade.id),
                market_id=str(trade.market_id),
                market_question=market.question if market else "Unknown Market",
                side=trade.side.value,
                price=float(trade.price),
                size=trade.size,
                role="buyer" if trade.buyer_id == agent_id else "seller",
                pnl=pnl,
                created_at=trade.created_at.isoformat(),
            )
        )

    # Build active positions (only open markets)
    active_positions = []
    for position, market in positions_data:
        if market.status == MarketStatus.OPEN:
            # Calculate unrealized PnL based on current market prices
            unrealized_pnl = None
            if position.yes_shares > 0 and position.avg_yes_price:
                current_value = float(market.yes_price) * position.yes_shares
                cost = float(position.avg_yes_price) * position.yes_shares
                unrealized_pnl = current_value - cost
            elif position.no_shares > 0 and position.avg_no_price:
                current_value = float(market.no_price) * position.no_shares
                cost = float(position.avg_no_price) * position.no_shares
                unrealized_pnl = current_value - cost

            active_positions.append(
                ActivePosition(
                    market_id=str(market.id),
                    market_question=market.question,
                    market_status=market.status.value,
                    yes_shares=position.yes_shares,
                    no_shares=position.no_shares,
                    avg_yes_price=float(position.avg_yes_price) if position.avg_yes_price else None,
                    avg_no_price=float(position.avg_no_price) if position.avg_no_price else None,
                    unrealized_pnl=unrealized_pnl,
                )
            )

    # Build markets created
    markets_created_data = [
        MarketCreated(
            id=str(m.id),
            question=m.question,
            status=m.status.value,
            volume=float(m.volume),
            created_at=m.created_at.isoformat(),
        )
        for m in markets_created_list[:20]  # Limit to 20
    ]

    # Build markets resolved (with rewards)
    markets_resolved_data = []
    for market in markets_resolved_list[:20]:  # Limit to 20
        # Get moderator reward if exists
        reward_result = await session.execute(
            select(PlatformFee)
            .where(PlatformFee.market_id == market.id)
            .where(PlatformFee.agent_id == agent_id)
        )
        # Note: Moderator rewards are stored differently, this is simplified
        reward = 0.0  # Would need to query ModeratorReward table

        markets_resolved_data.append(
            MarketResolved(
                id=str(market.id),
                question=market.question,
                outcome=market.outcome.value if market.outcome else "UNKNOWN",
                reward=reward,
                resolved_at=market.resolved_at.isoformat() if market.resolved_at else "",
            )
        )

    # Build response
    return AgentProfileResponse(
        agent=AgentResponse.model_validate(agent),
        stats=ProfileStats(
            total_trades=total_trades,
            total_orders=total_orders,
            total_positions=total_positions,
            markets_created=markets_created,
            markets_resolved=markets_resolved,
            total_volume_traded=total_volume_traded,
            total_fees_paid=total_fees_paid,
            win_rate=win_rate,
            total_pnl=float(total_pnl),
            pnl_percentage=float(pnl_percentage),
            avg_trade_size=avg_trade_size,
            best_trade=best_trade,
            worst_trade=worst_trade,
        ),
        rankings=ProfileRankings(
            rank_by_profit=rank_by_profit,
            rank_by_balance=rank_by_balance,
            rank_by_reputation=rank_by_reputation,
            rank_by_volume=rank_by_volume,
        ),
        recent_trades=recent_trades,
        active_positions=active_positions,
        markets_created=markets_created_data,
        markets_resolved=markets_resolved_data,
    )
