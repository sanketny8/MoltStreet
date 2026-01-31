from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from server.database import get_session
from server.models.trade import Trade
from server.schemas.order import TradeResponse

router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("", response_model=List[TradeResponse])
async def list_trades(
    market_id: Optional[UUID] = Query(default=None),
    agent_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=100),
    session: AsyncSession = Depends(get_session)
):
    """List trades with optional filters."""
    query = select(Trade)

    if market_id:
        query = query.where(Trade.market_id == market_id)
    if agent_id:
        query = query.where(
            or_(Trade.buyer_id == agent_id, Trade.seller_id == agent_id)
        )

    query = query.order_by(Trade.created_at.desc()).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()
