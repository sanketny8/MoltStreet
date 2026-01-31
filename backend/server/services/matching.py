from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.models.agent import Agent
from server.models.market import Market, MarketStatus
from server.models.order import Order, OrderStatus, Side
from server.models.platform import PlatformFee, PlatformStats, FeeType
from server.models.position import Position
from server.models.trade import Trade


async def match_order(session: AsyncSession, order: Order) -> List[Trade]:
    """
    Match an incoming order against the order book.

    Matching logic:
    - YES @ 0.60 matches with NO @ 0.40 (prices sum to 1.0)
    - Orders match if: order.price + opposite_order.price >= 1.0
    """
    trades = []

    # Get opposite side orders that can match
    opposite_side = Side.NO if order.side == Side.YES else Side.YES
    min_opposite_price = Decimal("1.00") - order.price

    # Find matching orders (price-time priority)
    result = await session.execute(
        select(Order)
        .where(Order.market_id == order.market_id)
        .where(Order.side == opposite_side)
        .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
        .where(Order.price >= min_opposite_price)
        .where(Order.agent_id != order.agent_id)  # Can't self-trade
        .order_by(Order.price.desc(), Order.created_at.asc())
        .with_for_update()  # Lock rows to prevent race conditions
    )
    matching_orders = result.scalars().all()

    for match in matching_orders:
        if order.filled >= order.size:
            break

        # Calculate trade size
        order_remaining = order.size - order.filled
        match_remaining = match.size - match.filled
        trade_size = min(order_remaining, match_remaining)

        if trade_size <= 0:
            continue

        # Determine buyer and seller
        if order.side == Side.YES:
            buyer_id = order.agent_id
            seller_id = match.agent_id
            buy_order = order
            sell_order = match
            trade_price = order.price
        else:
            buyer_id = match.agent_id
            seller_id = order.agent_id
            buy_order = match
            sell_order = order
            trade_price = match.price

        # Calculate fees
        trade_value = trade_price * trade_size
        buyer_fee = trade_value * settings.TRADING_FEE_RATE
        seller_fee = (Decimal("1.00") - trade_price) * trade_size * settings.TRADING_FEE_RATE
        total_fee = buyer_fee + seller_fee

        # Create trade with fee info
        trade = Trade(
            market_id=order.market_id,
            buy_order_id=buy_order.id,
            sell_order_id=sell_order.id,
            buyer_id=buyer_id,
            seller_id=seller_id,
            side=Side.YES,  # Trades are recorded from YES perspective
            price=trade_price,
            size=trade_size,
            buyer_fee=buyer_fee,
            seller_fee=seller_fee,
            total_fee=total_fee
        )
        session.add(trade)
        trades.append(trade)

        # Update order fills
        order.filled += trade_size
        match.filled += trade_size

        # Update order statuses
        if order.filled >= order.size:
            order.status = OrderStatus.FILLED
        else:
            order.status = OrderStatus.PARTIAL

        if match.filled >= match.size:
            match.status = OrderStatus.FILLED
        else:
            match.status = OrderStatus.PARTIAL

        # Update positions
        await update_position(session, buyer_id, order.market_id, Side.YES, trade_size, trade_price)
        await update_position(session, seller_id, order.market_id, Side.NO, trade_size, Decimal("1.00") - trade_price)

        # Settle balance: transfer from locked to permanent deduction (includes fees)
        await settle_trade(session, buyer_id, seller_id, trade_price, trade_size, buyer_fee, seller_fee)

        # Record platform fees
        await record_trading_fee(session, trade, buyer_id, seller_id, buyer_fee, seller_fee, order.market_id)

    # Update market prices if trades occurred
    if trades:
        await update_market_price(session, order.market_id, trades[-1].price)

    return trades


async def update_position(
    session: AsyncSession,
    agent_id: UUID,
    market_id: UUID,
    side: Side,
    shares: int,
    price: Decimal
):
    """Update or create position for an agent in a market."""
    result = await session.execute(
        select(Position)
        .where(Position.agent_id == agent_id)
        .where(Position.market_id == market_id)
        .with_for_update()
    )
    position = result.scalar_one_or_none()

    if not position:
        position = Position(agent_id=agent_id, market_id=market_id)
        session.add(position)

    if side == Side.YES:
        # Update average price
        if position.yes_shares > 0 and position.avg_yes_price:
            total_cost = position.avg_yes_price * position.yes_shares + price * shares
            position.avg_yes_price = total_cost / (position.yes_shares + shares)
        else:
            position.avg_yes_price = price
        position.yes_shares += shares
    else:
        if position.no_shares > 0 and position.avg_no_price:
            total_cost = position.avg_no_price * position.no_shares + price * shares
            position.avg_no_price = total_cost / (position.no_shares + shares)
        else:
            position.avg_no_price = price
        position.no_shares += shares


async def settle_trade(
    session: AsyncSession,
    buyer_id: UUID,
    seller_id: UUID,
    price: Decimal,
    size: int,
    buyer_fee: Decimal = Decimal("0.00"),
    seller_fee: Decimal = Decimal("0.00")
):
    """
    Settle a trade between buyer and seller.

    Buyer pays: price * size + fee (already locked)
    Seller pays: (1 - price) * size + fee (already locked)
    """
    buyer_cost = price * size
    seller_cost = (Decimal("1.00") - price) * size

    # Get agents
    buyer_result = await session.execute(
        select(Agent).where(Agent.id == buyer_id).with_for_update()
    )
    buyer = buyer_result.scalar_one()

    seller_result = await session.execute(
        select(Agent).where(Agent.id == seller_id).with_for_update()
    )
    seller = seller_result.scalar_one()

    # Deduct from locked balance and balance (including fees)
    buyer.locked_balance -= buyer_cost
    buyer.balance -= (buyer_cost + buyer_fee)

    seller.locked_balance -= seller_cost
    seller.balance -= (seller_cost + seller_fee)


async def record_trading_fee(
    session: AsyncSession,
    trade: Trade,
    buyer_id: UUID,
    seller_id: UUID,
    buyer_fee: Decimal,
    seller_fee: Decimal,
    market_id: UUID
):
    """Record trading fees in platform ledger."""
    if buyer_fee > 0:
        buyer_fee_record = PlatformFee(
            fee_type=FeeType.TRADING,
            amount=buyer_fee,
            agent_id=buyer_id,
            market_id=market_id,
            trade_id=trade.id,
            description=f"Trading fee (buyer) on {trade.size} shares @ {trade.price}"
        )
        session.add(buyer_fee_record)

    if seller_fee > 0:
        seller_fee_record = PlatformFee(
            fee_type=FeeType.TRADING,
            amount=seller_fee,
            agent_id=seller_id,
            market_id=market_id,
            trade_id=trade.id,
            description=f"Trading fee (seller) on {trade.size} shares @ {1 - float(trade.price):.2f}"
        )
        session.add(seller_fee_record)

    # Update platform stats
    await update_platform_stats(session, trading_fee=buyer_fee + seller_fee, trade_count=1)


async def update_platform_stats(
    session: AsyncSession,
    trading_fee: Decimal = Decimal("0.00"),
    market_creation_fee: Decimal = Decimal("0.00"),
    settlement_fee: Decimal = Decimal("0.00"),
    volume: Decimal = Decimal("0.00"),
    trade_count: int = 0,
    markets_created: int = 0,
    markets_resolved: int = 0
):
    """Update aggregated platform statistics."""
    result = await session.execute(
        select(PlatformStats).where(PlatformStats.id == 1).with_for_update()
    )
    stats = result.scalar_one_or_none()

    if not stats:
        stats = PlatformStats(id=1)
        session.add(stats)

    stats.total_trading_fees += trading_fee
    stats.total_market_creation_fees += market_creation_fee
    stats.total_settlement_fees += settlement_fee
    stats.total_volume += volume
    stats.total_trades += trade_count
    stats.total_markets_created += markets_created
    stats.total_markets_resolved += markets_resolved
    stats.updated_at = datetime.now(timezone.utc)


async def update_market_price(session: AsyncSession, market_id: UUID, last_price: Decimal):
    """Update market prices based on last trade."""
    result = await session.execute(
        select(Market).where(Market.id == market_id).with_for_update()
    )
    market = result.scalar_one()

    market.yes_price = last_price
    market.no_price = Decimal("1.00") - last_price


async def lock_balance_for_order(
    session: AsyncSession,
    agent_id: UUID,
    price: Decimal,
    size: int
) -> bool:
    """
    Lock balance for a new order.
    Returns True if successful, False if insufficient balance.
    """
    cost = price * size

    result = await session.execute(
        select(Agent).where(Agent.id == agent_id).with_for_update()
    )
    agent = result.scalar_one_or_none()

    if not agent:
        return False

    available = agent.balance - agent.locked_balance
    if available < cost:
        return False

    agent.locked_balance += cost
    return True


async def unlock_balance_for_cancelled_order(
    session: AsyncSession,
    agent_id: UUID,
    price: Decimal,
    unfilled: int
) -> Decimal:
    """Unlock balance when order is cancelled. Returns refund amount."""
    refund = price * unfilled

    result = await session.execute(
        select(Agent).where(Agent.id == agent_id).with_for_update()
    )
    agent = result.scalar_one()

    agent.locked_balance -= refund
    return refund
