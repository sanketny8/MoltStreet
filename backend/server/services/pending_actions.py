"""
Pending Actions Service - Execute approved actions.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.models import (
    Agent,
    PendingAction,
    ActionType,
    ActionStatus,
    Order,
    Side,
    OrderStatus,
    Market,
)
from server.services.matching import match_order


async def create_pending_action(
    session: AsyncSession,
    agent_id: UUID,
    action_type: ActionType,
    payload: dict,
    expires_in_hours: int = 24,
) -> PendingAction:
    """Create a new pending action."""
    action = PendingAction(
        agent_id=agent_id,
        action_type=action_type,
        action_payload=payload,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    )
    session.add(action)
    await session.commit()
    await session.refresh(action)
    return action


async def execute_pending_action(
    session: AsyncSession,
    action: PendingAction,
) -> Dict[str, Any]:
    """Execute an approved pending action and return the result."""

    if action.action_type == ActionType.PLACE_ORDER:
        return await _execute_place_order(session, action)
    elif action.action_type == ActionType.CANCEL_ORDER:
        return await _execute_cancel_order(session, action)
    elif action.action_type == ActionType.TRANSFER:
        return await _execute_transfer(session, action)
    else:
        raise ValueError(f"Unknown action type: {action.action_type}")


async def _execute_place_order(
    session: AsyncSession,
    action: PendingAction,
) -> Dict[str, Any]:
    """Execute a place order action."""
    payload = action.action_payload
    agent_id = action.agent_id
    market_id = UUID(payload["market_id"])
    side = Side(payload["side"])
    price = Decimal(str(payload["price"]))
    size = int(payload["size"])

    # Validate agent
    agent = await session.get(Agent, agent_id)
    if not agent:
        raise ValueError("Agent not found")
    if not agent.can_trade:
        raise ValueError("Agent cannot trade (moderator role)")

    # Validate market
    market = await session.get(Market, market_id)
    if not market:
        raise ValueError("Market not found")
    if market.status != "open":
        raise ValueError(f"Market is not open (status: {market.status})")

    # Lock balance
    cost = price * size
    agent = await session.get(Agent, agent_id)
    if agent.available_balance < cost:
        raise ValueError(f"Insufficient balance. Need {cost}, available: {agent.available_balance}")

    # Lock the balance
    agent.locked_balance += cost
    session.add(agent)

    # Create order
    order = Order(
        agent_id=agent_id,
        market_id=market_id,
        side=side,
        price=price,
        size=size,
        filled=0,
        status=OrderStatus.OPEN,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # Match order
    trades = await match_order(session, order)

    return {
        "order_id": str(order.id),
        "status": order.status.value,
        "trades_count": len(trades),
        "filled": order.filled,
    }


async def _execute_cancel_order(
    session: AsyncSession,
    action: PendingAction,
) -> Dict[str, Any]:
    """Execute a cancel order action."""
    payload = action.action_payload
    order_id = UUID(payload["order_id"])
    agent_id = action.agent_id

    # Get order
    order = await session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")
    if order.agent_id != agent_id:
        raise ValueError("Order does not belong to this agent")
    if order.status not in [OrderStatus.OPEN, OrderStatus.PARTIAL]:
        raise ValueError(f"Cannot cancel order with status: {order.status}")

    # Calculate refund
    unfilled = order.size - order.filled
    refund_amount = order.price * unfilled

    # Unlock balance
    agent = await session.get(Agent, agent_id)
    agent.locked_balance -= refund_amount
    session.add(agent)

    # Update order status
    order.status = OrderStatus.CANCELLED
    session.add(order)
    await session.commit()

    return {
        "order_id": str(order.id),
        "refunded": float(refund_amount),
        "shares_cancelled": unfilled,
    }


async def _execute_transfer(
    session: AsyncSession,
    action: PendingAction,
) -> Dict[str, Any]:
    """Execute a token transfer action."""
    payload = action.action_payload
    from_agent_id = action.agent_id
    to_agent_id = UUID(payload["to_agent_id"])
    amount = Decimal(str(payload["amount"]))

    # Get agents
    from_agent = await session.get(Agent, from_agent_id)
    to_agent = await session.get(Agent, to_agent_id)

    if not from_agent:
        raise ValueError("Sender agent not found")
    if not to_agent:
        raise ValueError("Recipient agent not found")

    # Check balance
    if from_agent.available_balance < amount:
        raise ValueError(f"Insufficient balance. Need {amount}, available: {from_agent.available_balance}")

    # Execute transfer
    from_agent.balance -= amount
    to_agent.balance += amount

    session.add(from_agent)
    session.add(to_agent)
    await session.commit()

    return {
        "from_agent": str(from_agent_id),
        "to_agent": str(to_agent_id),
        "amount": float(amount),
    }


async def expire_old_actions(session: AsyncSession) -> int:
    """Mark expired pending actions. Returns count of expired actions."""
    now = datetime.now(timezone.utc)
    query = select(PendingAction).where(
        PendingAction.status == ActionStatus.PENDING,
        PendingAction.expires_at < now,
    )
    result = await session.execute(query)
    actions = result.scalars().all()

    count = 0
    for action in actions:
        action.status = ActionStatus.EXPIRED
        session.add(action)
        count += 1

    if count > 0:
        await session.commit()

    return count
