from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.models.agent import Agent
from server.models.market import Market, MarketStatus, Outcome
from server.models.moderator_reward import ModeratorReward
from server.models.order import Order, OrderStatus
from server.models.platform import FeeType, PlatformFee
from server.models.position import Position
from server.services.matching import update_platform_stats


async def resolve_market(
    session: AsyncSession,
    market_id: UUID,
    outcome: Outcome,
    moderator_id: UUID,
    evidence: str | None = None,
) -> dict:
    """
    Resolve a market and payout winners.

    Args:
        session: Database session
        market_id: The market to resolve
        outcome: YES or NO
        moderator_id: The moderator agent resolving the market
        evidence: Optional reasoning/evidence for the resolution

    Returns summary of resolution.
    """
    # Get market
    result = await session.execute(select(Market).where(Market.id == market_id).with_for_update())
    market = result.scalar_one_or_none()

    if not market:
        raise ValueError("Market not found")

    if market.status == MarketStatus.RESOLVED:
        raise ValueError("Market already resolved")

    # Mark market as resolved
    market.status = MarketStatus.RESOLVED
    market.outcome = outcome
    market.resolved_at = datetime.utcnow()
    market.resolved_by = moderator_id
    market.resolution_evidence = evidence

    # Cancel all open orders and refund
    orders_result = await session.execute(
        select(Order)
        .where(Order.market_id == market_id)
        .where(Order.status.in_([OrderStatus.OPEN, OrderStatus.PARTIAL]))
        .with_for_update()
    )
    open_orders = orders_result.scalars().all()

    for order in open_orders:
        unfilled = order.size - order.filled
        if unfilled > 0:
            refund = order.price * unfilled
            # Get agent and refund
            agent_result = await session.execute(
                select(Agent).where(Agent.id == order.agent_id).with_for_update()
            )
            agent = agent_result.scalar_one()
            agent.locked_balance -= refund
        order.status = OrderStatus.CANCELLED

    # Get all positions in this market
    positions_result = await session.execute(
        select(Position).where(Position.market_id == market_id)
    )
    positions = positions_result.scalars().all()

    total_payout = Decimal("0.00")
    total_settlement_fees = Decimal("0.00")
    winners = 0
    settlement_fee_rate = settings.SETTLEMENT_FEE_RATE

    for position in positions:
        # Calculate payout
        if outcome == Outcome.YES:
            gross_payout = Decimal(position.yes_shares) * Decimal("1.00")
            avg_price = position.avg_yes_price
            shares = position.yes_shares
        else:
            gross_payout = Decimal(position.no_shares) * Decimal("1.00")
            avg_price = position.avg_no_price
            shares = position.no_shares

        if gross_payout > 0:
            # Calculate profit and fee (only on profit, not principal)
            if avg_price:
                cost_basis = avg_price * shares
                profit = gross_payout - cost_basis
                # Only charge fee on profit, not losses
                settlement_fee = max(Decimal("0.00"), profit * settlement_fee_rate)
            else:
                settlement_fee = Decimal("0.00")

            net_payout = gross_payout - settlement_fee

            # Credit winner
            agent_result = await session.execute(
                select(Agent).where(Agent.id == position.agent_id).with_for_update()
            )
            agent = agent_result.scalar_one()
            agent.balance += net_payout
            total_payout += net_payout
            total_settlement_fees += settlement_fee
            winners += 1

            # Record settlement fee
            if settlement_fee > 0:
                fee_record = PlatformFee(
                    fee_type=FeeType.SETTLEMENT,
                    amount=settlement_fee,
                    agent_id=position.agent_id,
                    market_id=market_id,
                    description=f"Settlement fee on {shares} winning shares",
                )
                session.add(fee_record)

            # Update reputation based on profit
            if outcome == Outcome.YES and position.avg_yes_price:
                profit_per_share = Decimal("1.00") - position.avg_yes_price
                agent.reputation += profit_per_share * position.yes_shares
            elif outcome == Outcome.NO and position.avg_no_price:
                profit_per_share = Decimal("1.00") - position.avg_no_price
                agent.reputation += profit_per_share * position.no_shares

    # Calculate moderator rewards
    moderator_platform_share = total_settlement_fees * settings.MODERATOR_PLATFORM_SHARE
    # Winner fee is based on total profits, not just fees
    # We need to calculate total winner profits
    total_winner_profits = Decimal("0.00")
    for position in positions:
        if outcome == Outcome.YES and position.yes_shares > 0:
            if position.avg_yes_price:
                cost_basis = position.avg_yes_price * position.yes_shares
                profit = (Decimal("1.00") * position.yes_shares) - cost_basis
                if profit > 0:
                    total_winner_profits += profit
        elif outcome == Outcome.NO and position.no_shares > 0:
            if position.avg_no_price:
                cost_basis = position.avg_no_price * position.no_shares
                profit = (Decimal("1.00") * position.no_shares) - cost_basis
                if profit > 0:
                    total_winner_profits += profit

    moderator_winner_fee = total_winner_profits * settings.MODERATOR_WINNER_FEE
    total_moderator_reward = moderator_platform_share + moderator_winner_fee

    # Credit moderator
    if total_moderator_reward > 0:
        moderator_result = await session.execute(
            select(Agent).where(Agent.id == moderator_id).with_for_update()
        )
        moderator = moderator_result.scalar_one_or_none()
        if moderator:
            moderator.balance += total_moderator_reward

            # Record moderator reward
            reward_record = ModeratorReward(
                moderator_id=moderator_id,
                market_id=market_id,
                platform_share=moderator_platform_share,
                winner_fee=moderator_winner_fee,
                total_reward=total_moderator_reward,
                total_winner_profits=total_winner_profits,
            )
            session.add(reward_record)

    # Update platform stats (subtract moderator share from platform earnings)
    net_platform_fee = total_settlement_fees - moderator_platform_share
    await update_platform_stats(session, settlement_fee=net_platform_fee, markets_resolved=1)

    return {
        "market_id": str(market_id),
        "outcome": outcome.value,
        "resolved_by": str(moderator_id),
        "evidence": evidence,
        "resolved_at": market.resolved_at.isoformat(),
        "payouts": {
            "total_winners": winners,
            "total_payout": float(total_payout),
            "total_fees": float(total_settlement_fees),
        },
        "moderator_reward": {
            "platform_share": float(moderator_platform_share),
            "winner_fee": float(moderator_winner_fee),
            "total": float(total_moderator_reward),
        },
    }


async def close_expired_markets(session: AsyncSession) -> int:
    """
    Close markets that are past their deadline.
    Returns count of markets closed.
    """
    now = datetime.utcnow()

    result = await session.execute(
        select(Market)
        .where(Market.status == MarketStatus.OPEN)
        .where(Market.deadline <= now)
        .with_for_update()
    )
    expired_markets = result.scalars().all()

    count = 0
    for market in expired_markets:
        market.status = MarketStatus.CLOSED
        count += 1

    return count
