from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.models.agent import Agent
from server.models.market import Market
from server.models.order import Order, OrderStatus, OrderType, Side
from server.models.platform import FeeType, PlatformFee, PlatformStats
from server.models.position import Position
from server.models.trade import Trade


async def match_order(session: AsyncSession, order: Order) -> list[Trade]:
    """
    Match an incoming order against the order book.

    Matching logic (Priority order):
    1. Same-side opposite-type: BUY YES with SELL YES, BUY NO with SELL NO
       - Direct share transfer between agents
    2. Complementary-side same-type: BUY YES with BUY NO, SELL YES with SELL NO
       - YES @ 0.60 matches with NO @ 0.40 (prices sum to 1.0)
       - Orders match if: order.price + opposite_order.price >= 1.0
    """
    trades = []

    # Strategy 1: Try same-side opposite-type matching first (direct share transfer)
    opposite_type = OrderType.SELL if order.order_type == OrderType.BUY else OrderType.BUY

    # For same-side matches:
    # - BUY orders want lowest SELL price
    # - SELL orders want highest BUY price
    if order.order_type == OrderType.BUY:
        # BUY order: Match with SELL orders at or below our price
        same_side_query = (
            select(Order)
            .where(Order.market_id == order.market_id)
            .where(Order.side == order.side)  # SAME side
            .where(Order.order_type == opposite_type)  # OPPOSITE type
            .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
            .where(Order.price <= order.price)  # Seller asking <= buyer offering
            .where(Order.agent_id != order.agent_id)
            .order_by(Order.price.asc(), Order.created_at.asc())  # Lowest price first
            .with_for_update()
        )
    else:  # SELL order
        # SELL order: Match with BUY orders at or above our price
        same_side_query = (
            select(Order)
            .where(Order.market_id == order.market_id)
            .where(Order.side == order.side)  # SAME side
            .where(Order.order_type == opposite_type)  # OPPOSITE type
            .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
            .where(Order.price >= order.price)  # Buyer offering >= seller asking
            .where(Order.agent_id != order.agent_id)
            .order_by(Order.price.desc(), Order.created_at.asc())  # Highest price first
            .with_for_update()
        )

    result = await session.execute(same_side_query)
    matching_orders = list(result.scalars().all())

    # Strategy 2: If still not filled, try complementary-side matching (existing logic)
    if order.filled < order.size:
        opposite_side = Side.NO if order.side == Side.YES else Side.YES
        min_opposite_price = Decimal("1.00") - order.price

        complementary_query = (
            select(Order)
            .where(Order.market_id == order.market_id)
            .where(Order.side == opposite_side)  # OPPOSITE side
            .where(Order.order_type == order.order_type)  # SAME type
            .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
            .where(Order.price >= min_opposite_price)
            .where(Order.agent_id != order.agent_id)
            .order_by(Order.price.desc(), Order.created_at.asc())
            .with_for_update()
        )

        result = await session.execute(complementary_query)
        matching_orders.extend(result.scalars().all())

    for match in matching_orders:
        if order.filled >= order.size:
            break

        # Calculate trade size
        order_remaining = order.size - order.filled
        match_remaining = match.size - match.filled
        trade_size = min(order_remaining, match_remaining)

        if trade_size <= 0:
            continue

        # Determine if this is same-side or complementary matching
        is_same_side = order.side == match.side

        # Determine buyer, seller, and trade details based on match type
        if is_same_side:
            # SAME-SIDE MATCH: Direct share transfer (BUY YES + SELL YES)
            # Buyer = OrderType.BUY, Seller = OrderType.SELL
            if order.order_type == OrderType.BUY:
                buyer_id = order.agent_id
                seller_id = match.agent_id
                buy_order = order
                sell_order = match
                trade_price = match.price  # Maker (SELL order) sets price
            else:
                buyer_id = match.agent_id
                seller_id = order.agent_id
                buy_order = match
                sell_order = order
                trade_price = order.price  # Maker (SELL order) sets price

            trade_side = order.side  # Both same side

            # Update positions: BUY increases, SELL decreases
            await update_position(
                session, buyer_id, order.market_id, trade_side, trade_size, trade_price, is_buy=True
            )
            await update_position(
                session,
                seller_id,
                order.market_id,
                trade_side,
                -trade_size,
                trade_price,
                is_buy=False,
            )

        else:
            # COMPLEMENTARY MATCH: Create shares (BUY YES + BUY NO)
            # Both are BUY orders on opposite sides
            if order.side == Side.YES:
                buyer_id = order.agent_id  # Buys YES
                seller_id = match.agent_id  # Buys NO
                buy_order = order
                sell_order = match
                trade_price = order.price
            else:
                buyer_id = match.agent_id  # Buys YES
                seller_id = order.agent_id  # Buys NO
                buy_order = match
                sell_order = order
                trade_price = match.price

            trade_side = Side.YES  # Recorded from YES perspective

            # Update positions: Both increase (creating new shares)
            await update_position(
                session, buyer_id, order.market_id, Side.YES, trade_size, trade_price, is_buy=True
            )
            await update_position(
                session,
                seller_id,
                order.market_id,
                Side.NO,
                trade_size,
                Decimal("1.00") - trade_price,
                is_buy=True,
            )

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
            side=trade_side,
            price=trade_price,
            size=trade_size,
            buyer_fee=buyer_fee,
            seller_fee=seller_fee,
            total_fee=total_fee,
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

        # Settle balance: transfer from locked to permanent deduction (includes fees)
        await settle_trade(
            session, buyer_id, seller_id, trade_price, trade_size, buyer_fee, seller_fee
        )

        # Record platform fees
        await record_trading_fee(
            session, trade, buyer_id, seller_id, buyer_fee, seller_fee, order.market_id
        )

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
    price: Decimal,
    is_buy: bool = True,
):
    """
    Update or create position for an agent in a market.

    Args:
        shares: Can be positive (buy) or negative (sell)
        is_buy: True for BUY orders (increase shares), False for SELL orders (decrease shares)

    Note: Average price only updates on BUY, not SELL (preserves cost basis for P&L)
    """
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
        if is_buy and shares > 0:
            # BUY: Increase shares and update average price
            if position.yes_shares > 0 and position.avg_yes_price:
                total_cost = position.avg_yes_price * position.yes_shares + price * shares
                position.avg_yes_price = total_cost / (position.yes_shares + shares)
            else:
                position.avg_yes_price = price
            position.yes_shares += shares
        else:
            # SELL: Decrease shares, keep average price unchanged
            position.yes_shares += shares  # shares is negative for sells
            # Don't update avg_yes_price on sell (preserve cost basis)
    elif is_buy and shares > 0:
        # BUY: Increase shares and update average price
        if position.no_shares > 0 and position.avg_no_price:
            total_cost = position.avg_no_price * position.no_shares + price * shares
            position.avg_no_price = total_cost / (position.no_shares + shares)
        else:
            position.avg_no_price = price
        position.no_shares += shares
    else:
        # SELL: Decrease shares, keep average price unchanged
        position.no_shares += shares  # shares is negative for sells
        # Don't update avg_no_price on sell (preserve cost basis)


async def settle_trade(
    session: AsyncSession,
    buyer_id: UUID,
    seller_id: UUID,
    price: Decimal,
    size: int,
    buyer_fee: Decimal = Decimal("0.00"),
    seller_fee: Decimal = Decimal("0.00"),
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
    buyer.balance -= buyer_cost + buyer_fee

    seller.locked_balance -= seller_cost
    seller.balance -= seller_cost + seller_fee


async def record_trading_fee(
    session: AsyncSession,
    trade: Trade,
    buyer_id: UUID,
    seller_id: UUID,
    buyer_fee: Decimal,
    seller_fee: Decimal,
    market_id: UUID,
):
    """Record trading fees in platform ledger."""
    if buyer_fee > 0:
        buyer_fee_record = PlatformFee(
            fee_type=FeeType.TRADING,
            amount=buyer_fee,
            agent_id=buyer_id,
            market_id=market_id,
            trade_id=trade.id,
            description=f"Trading fee (buyer) on {trade.size} shares @ {trade.price}",
        )
        session.add(buyer_fee_record)

    if seller_fee > 0:
        seller_fee_record = PlatformFee(
            fee_type=FeeType.TRADING,
            amount=seller_fee,
            agent_id=seller_id,
            market_id=market_id,
            trade_id=trade.id,
            description=f"Trading fee (seller) on {trade.size} shares @ {1 - float(trade.price):.2f}",
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
    markets_resolved: int = 0,
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
    stats.updated_at = datetime.utcnow()


async def update_market_price(session: AsyncSession, market_id: UUID, last_price: Decimal):
    """Update market prices based on last trade."""
    result = await session.execute(select(Market).where(Market.id == market_id).with_for_update())
    market = result.scalar_one()

    market.yes_price = last_price
    market.no_price = Decimal("1.00") - last_price


async def lock_balance_for_order(
    session: AsyncSession, agent_id: UUID, price: Decimal, size: int
) -> bool:
    """
    Lock balance for a new order.
    Returns True if successful, False if insufficient balance.
    """
    cost = price * size

    result = await session.execute(select(Agent).where(Agent.id == agent_id).with_for_update())
    agent = result.scalar_one_or_none()

    if not agent:
        return False

    available = agent.balance - agent.locked_balance
    if available < cost:
        return False

    agent.locked_balance += cost
    return True


async def unlock_balance_for_cancelled_order(
    session: AsyncSession, agent_id: UUID, price: Decimal, unfilled: int
) -> Decimal:
    """Unlock balance when order is cancelled. Returns refund amount."""
    refund = price * unfilled

    result = await session.execute(select(Agent).where(Agent.id == agent_id).with_for_update())
    agent = result.scalar_one()

    agent.locked_balance -= refund
    return refund
