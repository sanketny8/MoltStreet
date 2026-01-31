from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.database import get_session
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketStatus
from server.models.order import Order, OrderStatus
from server.models.platform import PlatformFee, PlatformStats, FeeType
from server.models.position import Position
from server.models.trade import Trade
from server.models.wallet import AgentWallet

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin_key(x_admin_key: str = Header(default=None)):
    """Verify admin API key."""
    if not x_admin_key or x_admin_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return True


# =============================================================================
# PLATFORM OVERVIEW
# =============================================================================

@router.get("/stats")
async def get_platform_stats(
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get aggregated platform statistics."""
    # Get platform stats
    result = await session.execute(
        select(PlatformStats).where(PlatformStats.id == 1)
    )
    stats = result.scalar_one_or_none()

    if not stats:
        stats = PlatformStats(id=1)

    # Get live counts
    agents_result = await session.execute(select(func.count(Agent.id)))
    total_agents = agents_result.scalar()

    traders_result = await session.execute(
        select(func.count(Agent.id)).where(Agent.role == AgentRole.TRADER)
    )
    total_traders = traders_result.scalar()

    moderators_result = await session.execute(
        select(func.count(Agent.id)).where(Agent.role == AgentRole.MODERATOR)
    )
    total_moderators = moderators_result.scalar()

    markets_result = await session.execute(select(func.count(Market.id)))
    total_markets = markets_result.scalar()

    open_markets_result = await session.execute(
        select(func.count(Market.id)).where(Market.status == MarketStatus.OPEN)
    )
    open_markets = open_markets_result.scalar()

    resolved_markets_result = await session.execute(
        select(func.count(Market.id)).where(Market.status == MarketStatus.RESOLVED)
    )
    resolved_markets = resolved_markets_result.scalar()

    trades_result = await session.execute(select(func.count(Trade.id)))
    total_trades = trades_result.scalar()

    # Calculate total volume from markets
    volume_result = await session.execute(select(func.sum(Market.volume)))
    total_volume = volume_result.scalar() or Decimal("0.00")

    return {
        "overview": {
            "total_agents": total_agents,
            "total_traders": total_traders,
            "total_moderators": total_moderators,
            "total_markets": total_markets,
            "open_markets": open_markets,
            "resolved_markets": resolved_markets,
            "total_trades": total_trades,
            "total_volume": float(total_volume)
        },
        "revenue": {
            "total_trading_fees": float(stats.total_trading_fees),
            "total_market_creation_fees": float(stats.total_market_creation_fees),
            "total_settlement_fees": float(stats.total_settlement_fees),
            "total_revenue": float(
                stats.total_trading_fees +
                stats.total_market_creation_fees +
                stats.total_settlement_fees
            )
        },
        "fee_rates": {
            "trading_fee_rate": float(settings.TRADING_FEE_RATE),
            "market_creation_fee": float(settings.MARKET_CREATION_FEE),
            "settlement_fee_rate": float(settings.SETTLEMENT_FEE_RATE)
        },
        "updated_at": stats.updated_at.isoformat() if stats.updated_at else None
    }


# =============================================================================
# FEE HISTORY
# =============================================================================

@router.get("/fees")
async def get_fee_history(
    fee_type: Optional[FeeType] = Query(default=None),
    agent_id: Optional[UUID] = Query(default=None),
    market_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get platform fee collection history."""
    query = select(PlatformFee)

    if fee_type:
        query = query.where(PlatformFee.fee_type == fee_type)
    if agent_id:
        query = query.where(PlatformFee.agent_id == agent_id)
    if market_id:
        query = query.where(PlatformFee.market_id == market_id)

    query = query.order_by(PlatformFee.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    fees = result.scalars().all()

    return [
        {
            "id": str(fee.id),
            "fee_type": fee.fee_type.value,
            "amount": float(fee.amount),
            "agent_id": str(fee.agent_id) if fee.agent_id else None,
            "market_id": str(fee.market_id) if fee.market_id else None,
            "trade_id": str(fee.trade_id) if fee.trade_id else None,
            "description": fee.description,
            "created_at": fee.created_at.isoformat()
        }
        for fee in fees
    ]


@router.get("/fees/summary")
async def get_fee_summary(
    days: int = Query(default=30, le=365),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get fee summary by type for the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Get fees by type
    result = await session.execute(
        select(PlatformFee).where(PlatformFee.created_at >= cutoff)
    )
    fees = result.scalars().all()

    trading_fees = sum(f.amount for f in fees if f.fee_type == FeeType.TRADING)
    market_creation_fees = sum(f.amount for f in fees if f.fee_type == FeeType.MARKET_CREATION)
    settlement_fees = sum(f.amount for f in fees if f.fee_type == FeeType.SETTLEMENT)

    return {
        "period_days": days,
        "trading_fees": float(trading_fees),
        "market_creation_fees": float(market_creation_fees),
        "settlement_fees": float(settlement_fees),
        "total": float(trading_fees + market_creation_fees + settlement_fees),
        "fee_count": len(fees)
    }


# =============================================================================
# AGENT MANAGEMENT
# =============================================================================

@router.get("/agents")
async def get_all_agents(
    role: Optional[AgentRole] = Query(default=None),
    order_by: str = Query(default="balance", pattern="^(balance|reputation|name|created_at)$"),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get all agents with full details including wallet addresses."""
    query = select(Agent)

    if role:
        query = query.where(Agent.role == role)

    order_column = getattr(Agent, order_by)
    query = query.order_by(order_column.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    agents = result.scalars().all()

    # Get wallet addresses for all agents
    agent_ids = [agent.id for agent in agents]
    wallets_result = await session.execute(
        select(AgentWallet).where(AgentWallet.agent_id.in_(agent_ids))
    )
    wallets = {w.agent_id: w for w in wallets_result.scalars().all()}

    return [
        {
            "id": str(agent.id),
            "name": agent.name,
            "role": agent.role.value,
            "balance": float(agent.balance),
            "locked_balance": float(agent.locked_balance),
            "available_balance": float(agent.available_balance),
            "reputation": float(agent.reputation),
            "can_trade": agent.can_trade,
            "can_resolve": agent.can_resolve,
            "created_at": agent.created_at.isoformat(),
            "wallet_address": wallets[agent.id].internal_address if agent.id in wallets else None,
        }
        for agent in agents
    ]


@router.get("/agents/{agent_id}/activity")
async def get_agent_activity(
    agent_id: UUID,
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get detailed activity for a specific agent."""
    # Get agent
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get orders
    orders_result = await session.execute(
        select(Order)
        .where(Order.agent_id == agent_id)
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    orders = orders_result.scalars().all()

    # Get trades (as buyer or seller)
    trades_result = await session.execute(
        select(Trade)
        .where((Trade.buyer_id == agent_id) | (Trade.seller_id == agent_id))
        .order_by(Trade.created_at.desc())
        .limit(limit)
    )
    trades = trades_result.scalars().all()

    # Get positions
    positions_result = await session.execute(
        select(Position).where(Position.agent_id == agent_id)
    )
    positions = positions_result.scalars().all()

    # Get fees paid
    fees_result = await session.execute(
        select(PlatformFee)
        .where(PlatformFee.agent_id == agent_id)
        .order_by(PlatformFee.created_at.desc())
        .limit(limit)
    )
    fees = fees_result.scalars().all()

    total_fees_paid = sum(f.amount for f in fees)

    return {
        "agent": {
            "id": str(agent.id),
            "name": agent.name,
            "role": agent.role.value,
            "balance": float(agent.balance),
            "reputation": float(agent.reputation)
        },
        "summary": {
            "total_orders": len(orders),
            "total_trades": len(trades),
            "total_positions": len(positions),
            "total_fees_paid": float(total_fees_paid)
        },
        "recent_orders": [
            {
                "id": str(o.id),
                "market_id": str(o.market_id),
                "side": o.side.value,
                "price": float(o.price),
                "size": o.size,
                "filled": o.filled,
                "status": o.status.value,
                "created_at": o.created_at.isoformat()
            }
            for o in orders[:20]
        ],
        "recent_trades": [
            {
                "id": str(t.id),
                "market_id": str(t.market_id),
                "role": "buyer" if t.buyer_id == agent_id else "seller",
                "price": float(t.price),
                "size": t.size,
                "fee": float(t.buyer_fee if t.buyer_id == agent_id else t.seller_fee),
                "created_at": t.created_at.isoformat()
            }
            for t in trades[:20]
        ],
        "positions": [
            {
                "market_id": str(p.market_id),
                "yes_shares": p.yes_shares,
                "no_shares": p.no_shares,
                "avg_yes_price": float(p.avg_yes_price) if p.avg_yes_price else None,
                "avg_no_price": float(p.avg_no_price) if p.avg_no_price else None
            }
            for p in positions
        ]
    }


# =============================================================================
# MARKET MANAGEMENT
# =============================================================================

@router.get("/markets")
async def get_all_markets(
    status: Optional[MarketStatus] = Query(default=None),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get all markets with admin details."""
    query = select(Market)

    if status:
        query = query.where(Market.status == status)

    query = query.order_by(Market.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    markets = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "creator_id": str(m.creator_id),
            "question": m.question,
            "description": m.description,
            "status": m.status.value,
            "outcome": m.outcome.value if m.outcome else None,
            "yes_price": float(m.yes_price),
            "no_price": float(m.no_price),
            "volume": float(m.volume),
            "deadline": m.deadline.isoformat(),
            "resolved_at": m.resolved_at.isoformat() if m.resolved_at else None,
            "resolved_by": str(m.resolved_by) if m.resolved_by else None,
            "resolution_evidence": m.resolution_evidence,
            "created_at": m.created_at.isoformat()
        }
        for m in markets
    ]


@router.get("/markets/{market_id}/details")
async def get_market_details(
    market_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get comprehensive details for a specific market."""
    # Get market
    result = await session.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # Get orders
    orders_result = await session.execute(
        select(Order).where(Order.market_id == market_id)
    )
    orders = orders_result.scalars().all()

    # Get trades
    trades_result = await session.execute(
        select(Trade).where(Trade.market_id == market_id).order_by(Trade.created_at.desc())
    )
    trades = trades_result.scalars().all()

    # Get positions
    positions_result = await session.execute(
        select(Position).where(Position.market_id == market_id)
    )
    positions = positions_result.scalars().all()

    # Get fees from this market
    fees_result = await session.execute(
        select(PlatformFee).where(PlatformFee.market_id == market_id)
    )
    fees = fees_result.scalars().all()

    total_fees = sum(f.amount for f in fees)

    return {
        "market": {
            "id": str(market.id),
            "creator_id": str(market.creator_id),
            "question": market.question,
            "description": market.description,
            "status": market.status.value,
            "outcome": market.outcome.value if market.outcome else None,
            "yes_price": float(market.yes_price),
            "no_price": float(market.no_price),
            "volume": float(market.volume),
            "deadline": market.deadline.isoformat(),
            "resolved_at": market.resolved_at.isoformat() if market.resolved_at else None,
            "resolved_by": str(market.resolved_by) if market.resolved_by else None,
            "created_at": market.created_at.isoformat()
        },
        "summary": {
            "total_orders": len(orders),
            "open_orders": len([o for o in orders if o.status in [OrderStatus.OPEN, OrderStatus.PARTIAL]]),
            "total_trades": len(trades),
            "unique_traders": len(set(p.agent_id for p in positions)),
            "total_fees_collected": float(total_fees)
        },
        "trades": [
            {
                "id": str(t.id),
                "buyer_id": str(t.buyer_id),
                "seller_id": str(t.seller_id),
                "price": float(t.price),
                "size": t.size,
                "total_fee": float(t.total_fee),
                "created_at": t.created_at.isoformat()
            }
            for t in trades[:50]
        ],
        "positions": [
            {
                "agent_id": str(p.agent_id),
                "yes_shares": p.yes_shares,
                "no_shares": p.no_shares
            }
            for p in positions
        ]
    }


# =============================================================================
# TRADE HISTORY
# =============================================================================

@router.get("/trades")
async def get_all_trades(
    market_id: Optional[UUID] = Query(default=None),
    agent_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Get all trades with filtering."""
    query = select(Trade)

    if market_id:
        query = query.where(Trade.market_id == market_id)
    if agent_id:
        query = query.where((Trade.buyer_id == agent_id) | (Trade.seller_id == agent_id))

    query = query.order_by(Trade.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    trades = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "market_id": str(t.market_id),
            "buyer_id": str(t.buyer_id),
            "seller_id": str(t.seller_id),
            "side": t.side.value,
            "price": float(t.price),
            "size": t.size,
            "buyer_fee": float(t.buyer_fee),
            "seller_fee": float(t.seller_fee),
            "total_fee": float(t.total_fee),
            "created_at": t.created_at.isoformat()
        }
        for t in trades
    ]


# =============================================================================
# SYSTEM HEALTH
# =============================================================================

@router.get("/health")
async def admin_health_check(
    session: AsyncSession = Depends(get_session),
    _: bool = Depends(verify_admin_key)
):
    """Comprehensive health check for admin."""
    try:
        # Test database connection
        await session.execute(select(func.count(Agent.id)))
        db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }
