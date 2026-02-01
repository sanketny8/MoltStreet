"""
Position validation services for trading operations.

Validates if an agent has sufficient shares to sell before allowing sell orders.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.models.order import Side
from server.models.position import Position


async def can_sell_shares(
    session: AsyncSession, agent_id: UUID, market_id: UUID, side: Side, quantity: int
) -> tuple[bool, str]:
    """
    Check if agent has enough shares to sell.

    Args:
        session: Database session
        agent_id: Agent attempting to sell
        market_id: Market to sell shares in
        side: YES or NO shares
        quantity: Number of shares to sell

    Returns:
        Tuple of (can_sell: bool, error_message: str)
        - If can_sell is True, error_message is empty
        - If can_sell is False, error_message contains reason

    Examples:
        >>> can_sell, error = await can_sell_shares(session, agent_id, market_id, Side.YES, 100)
        >>> if not can_sell:
        >>>     raise HTTPException(status_code=400, detail=error)
    """
    # Get agent's position in this market
    result = await session.execute(
        select(Position).where(Position.agent_id == agent_id).where(Position.market_id == market_id)
    )
    position = result.scalar_one_or_none()

    # Check if agent has any position
    if not position:
        return False, "You don't own any shares in this market"

    # Check shares for the specific side
    if side == Side.YES:
        available_shares = position.yes_shares
        if available_shares == 0:
            return False, "You don't own any YES shares in this market"
        if available_shares < quantity:
            return (
                False,
                f"Insufficient YES shares. You have {available_shares}, trying to sell {quantity}",
            )
    else:  # Side.NO
        available_shares = position.no_shares
        if available_shares == 0:
            return False, "You don't own any NO shares in this market"
        if available_shares < quantity:
            return (
                False,
                f"Insufficient NO shares. You have {available_shares}, trying to sell {quantity}",
            )

    # All checks passed
    return True, ""


async def get_available_shares(
    session: AsyncSession, agent_id: UUID, market_id: UUID, side: Side
) -> int:
    """
    Get number of shares available to sell for a specific side.

    Args:
        session: Database session
        agent_id: Agent ID
        market_id: Market ID
        side: YES or NO

    Returns:
        Number of shares available (0 if no position)
    """
    result = await session.execute(
        select(Position).where(Position.agent_id == agent_id).where(Position.market_id == market_id)
    )
    position = result.scalar_one_or_none()

    if not position:
        return 0

    return position.yes_shares if side == Side.YES else position.no_shares
