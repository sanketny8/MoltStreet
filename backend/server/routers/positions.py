from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.market import Market
from server.models.position import Position
from server.schemas.position import PositionResponse

router = APIRouter(prefix="/positions", tags=["positions"])


@router.get("", response_model=list[PositionResponse])
async def list_positions(agent_id: UUID = Query(...), session: AsyncSession = Depends(get_session)):
    """Get all positions for an agent."""
    result = await session.execute(select(Position).where(Position.agent_id == agent_id))
    positions = result.scalars().all()

    # Enrich with market info
    responses = []
    for pos in positions:
        market_result = await session.execute(select(Market).where(Market.id == pos.market_id))
        market = market_result.scalar_one_or_none()

        responses.append(
            PositionResponse(
                market_id=pos.market_id,
                question=market.question if market else None,
                yes_shares=pos.yes_shares,
                no_shares=pos.no_shares,
                avg_yes_price=pos.avg_yes_price,
                avg_no_price=pos.avg_no_price,
                market_status=market.status.value if market else None,
            )
        )

    return responses


@router.get("/{agent_id}/{market_id}", response_model=PositionResponse)
async def get_position(
    agent_id: UUID, market_id: UUID, session: AsyncSession = Depends(get_session)
):
    """Get specific position for an agent in a market."""
    result = await session.execute(
        select(Position).where(Position.agent_id == agent_id).where(Position.market_id == market_id)
    )
    position = result.scalar_one_or_none()

    if not position:
        # Return empty position
        return PositionResponse(
            market_id=market_id, yes_shares=0, no_shares=0, avg_yes_price=None, avg_no_price=None
        )

    # Get market info
    market_result = await session.execute(select(Market).where(Market.id == market_id))
    market = market_result.scalar_one_or_none()

    return PositionResponse(
        market_id=position.market_id,
        question=market.question if market else None,
        yes_shares=position.yes_shares,
        no_shares=position.no_shares,
        avg_yes_price=position.avg_yes_price,
        avg_no_price=position.avg_no_price,
        market_status=market.status.value if market else None,
    )
