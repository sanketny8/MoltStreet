from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.database import get_session
from server.models.agent import Agent
from server.models.market import Market, MarketCategory, MarketStatus
from server.models.order import Order, OrderStatus, Side
from server.models.platform import PlatformFee, FeeType
from server.schemas.market import (
    MarketCreate,
    MarketResponse,
    MarketResolve,
    OrderBook,
    OrderBookLevel,
)
from server.services.settlement import resolve_market
from server.services.matching import update_platform_stats

router = APIRouter(prefix="/markets", tags=["markets"])


@router.post("", response_model=MarketResponse)
async def create_market(
    data: MarketCreate,
    session: AsyncSession = Depends(get_session)
):
    """Create a new prediction market."""
    creation_fee = settings.MARKET_CREATION_FEE

    # Validate deadline is in the future
    if data.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Deadline must be in the future")

    # Get creator and check balance
    result = await session.execute(
        select(Agent).where(Agent.id == data.creator_id)
    )
    creator = result.scalar_one_or_none()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator agent not found")

    if creator.available_balance < creation_fee:
        raise HTTPException(status_code=400, detail="Insufficient balance for creation fee")

    # Deduct creation fee
    creator.balance -= creation_fee

    # Create market
    market = Market(
        creator_id=data.creator_id,
        question=data.question,
        description=data.description,
        category=data.category,
        deadline=data.deadline
    )
    session.add(market)

    # Record the market creation fee
    fee_record = PlatformFee(
        fee_type=FeeType.MARKET_CREATION,
        amount=creation_fee,
        agent_id=data.creator_id,
        market_id=market.id,
        description=f"Market creation fee for: {data.question[:50]}..."
    )
    session.add(fee_record)

    # Update platform stats
    await update_platform_stats(session, market_creation_fee=creation_fee, markets_created=1)

    await session.commit()
    await session.refresh(market)
    return market


@router.get("", response_model=List[MarketResponse])
async def list_markets(
    status: Optional[MarketStatus] = Query(default=None),
    category: Optional[MarketCategory] = Query(default=None),
    creator_id: Optional[UUID] = Query(default=None),
    trending: bool = Query(default=False, description="Sort by volume (trending)"),
    limit: int = Query(default=20, le=100),
    session: AsyncSession = Depends(get_session)
):
    """List markets with optional filters."""
    query = select(Market)

    if status:
        query = query.where(Market.status == status)
    if category:
        query = query.where(Market.category == category)
    if creator_id:
        query = query.where(Market.creator_id == creator_id)

    # Sort by volume for trending, otherwise by creation date
    if trending:
        query = query.order_by(Market.volume.desc()).limit(limit)
    else:
        query = query.order_by(Market.created_at.desc()).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/categories", response_model=List[str])
async def list_categories():
    """Get all available market categories."""
    return [cat.value for cat in MarketCategory]


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(
    market_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """Get market details by ID."""
    result = await session.execute(
        select(Market).where(Market.id == market_id)
    )
    market = result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market


@router.get("/{market_id}/orderbook", response_model=OrderBook)
async def get_order_book(
    market_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """Get order book for a market."""
    # Verify market exists
    result = await session.execute(
        select(Market).where(Market.id == market_id)
    )
    market = result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # Get open YES orders (bids)
    bids_result = await session.execute(
        select(Order)
        .where(Order.market_id == market_id)
        .where(Order.side == Side.YES)
        .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
        .order_by(Order.price.desc())
    )
    bids_orders = bids_result.scalars().all()

    # Get open NO orders (asks - converted to YES perspective)
    asks_result = await session.execute(
        select(Order)
        .where(Order.market_id == market_id)
        .where(Order.side == Side.NO)
        .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
        .order_by(Order.price.desc())
    )
    asks_orders = asks_result.scalars().all()

    # Aggregate by price level
    bids_by_price = {}
    for order in bids_orders:
        price = order.price
        remaining = order.size - order.filled
        bids_by_price[price] = bids_by_price.get(price, 0) + remaining

    asks_by_price = {}
    for order in asks_orders:
        # Convert NO price to YES perspective (1 - price)
        yes_price = Decimal("1.00") - order.price
        remaining = order.size - order.filled
        asks_by_price[yes_price] = asks_by_price.get(yes_price, 0) + remaining

    bids = [OrderBookLevel(price=p, size=s) for p, s in sorted(bids_by_price.items(), reverse=True)]
    asks = [OrderBookLevel(price=p, size=s) for p, s in sorted(asks_by_price.items())]

    # Calculate spread information
    best_bid = bids[0].price if bids else None
    best_ask = asks[0].price if asks else None

    spread = None
    mid_price = None
    if best_bid is not None and best_ask is not None:
        spread = best_ask - best_bid
        mid_price = (best_bid + best_ask) / 2

    return OrderBook(
        market_id=market_id,
        bids=bids,
        asks=asks,
        best_bid=best_bid,
        best_ask=best_ask,
        spread=spread,
        mid_price=mid_price
    )


@router.post("/{market_id}/resolve")
async def resolve_market_endpoint(
    market_id: UUID,
    data: MarketResolve,
    session: AsyncSession = Depends(get_session)
):
    """
    Resolve a market with final outcome.

    Only MODERATOR agents can resolve markets.
    This enforces separation between trading and resolution to prevent manipulation.
    """
    # Validate moderator exists
    result = await session.execute(
        select(Agent).where(Agent.id == data.moderator_id)
    )
    moderator = result.scalar_one_or_none()
    if not moderator:
        raise HTTPException(status_code=404, detail="Moderator agent not found")

    # Only moderators can resolve markets
    if not moderator.can_resolve:
        raise HTTPException(
            status_code=403,
            detail="Only moderator agents can resolve markets. Traders cannot resolve to prevent manipulation."
        )

    try:
        resolution = await resolve_market(
            session,
            market_id,
            data.outcome,
            data.moderator_id,
            data.evidence
        )
        await session.commit()
        return resolution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
