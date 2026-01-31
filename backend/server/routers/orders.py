from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.agent import Agent
from server.models.market import Market, MarketStatus
from server.models.order import Order, OrderStatus, Side
from server.schemas.order import (
    OrderCreate,
    OrderResponse,
    PlaceOrderResponse,
    CancelOrderResponse,
    TradeResponse,
)
from server.services.matching import (
    match_order,
    lock_balance_for_order,
    unlock_balance_for_cancelled_order,
)
from server.websocket import broadcast_order, broadcast_trade, broadcast_market_update

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=PlaceOrderResponse)
async def place_order(
    data: OrderCreate,
    session: AsyncSession = Depends(get_session)
):
    """Place a new order in a market."""
    # Validate agent exists
    agent_result = await session.execute(
        select(Agent).where(Agent.id == data.agent_id)
    )
    agent = agent_result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Moderators cannot trade - separation of concerns
    if not agent.can_trade:
        raise HTTPException(
            status_code=403,
            detail="Moderator agents cannot trade. This ensures fair market resolution."
        )

    # Validate market exists and is open
    market_result = await session.execute(
        select(Market).where(Market.id == data.market_id)
    )
    market = market_result.scalar_one_or_none()
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    if market.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is closed")

    # Lock balance for order
    can_lock = await lock_balance_for_order(
        session, data.agent_id, data.price, data.size
    )
    if not can_lock:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Create order
    order = Order(
        agent_id=data.agent_id,
        market_id=data.market_id,
        side=data.side,
        price=data.price,
        size=data.size
    )
    session.add(order)

    # Match against order book
    trades = await match_order(session, order)

    # Update market volume
    for trade in trades:
        market.volume += trade.price * trade.size

    await session.commit()
    await session.refresh(order)

    # Convert trades to response
    trade_responses = []
    for trade in trades:
        await session.refresh(trade)
        trade_responses.append(TradeResponse(
            id=trade.id,
            market_id=trade.market_id,
            buyer_id=trade.buyer_id,
            seller_id=trade.seller_id,
            side=trade.side,
            price=trade.price,
            size=trade.size,
            created_at=trade.created_at
        ))

    # Broadcast updates via WebSocket
    market_id_str = str(data.market_id)

    # Broadcast new order
    await broadcast_order(market_id_str, {
        "id": str(order.id),
        "side": order.side.value,
        "price": float(order.price),
        "size": order.size - order.filled
    })

    # Broadcast trades
    for trade_resp in trade_responses:
        await broadcast_trade(market_id_str, {
            "id": str(trade_resp.id),
            "price": float(trade_resp.price),
            "size": trade_resp.size
        })

    # Broadcast market price update if trades occurred
    if trades:
        await session.refresh(market)
        await broadcast_market_update(market_id_str, {
            "yes_price": float(market.yes_price),
            "no_price": float(market.no_price),
            "volume": float(market.volume)
        })

    return PlaceOrderResponse(
        order=OrderResponse.model_validate(order),
        trades=trade_responses
    )


@router.delete("/{order_id}", response_model=CancelOrderResponse)
async def cancel_order(
    order_id: UUID,
    agent_id: UUID = Query(...),
    session: AsyncSession = Depends(get_session)
):
    """Cancel an open order."""
    # Get order
    result = await session.execute(
        select(Order).where(Order.id == order_id).with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify ownership
    if order.agent_id != agent_id:
        raise HTTPException(status_code=403, detail="Not your order")

    # Check if cancellable
    if order.status not in [OrderStatus.OPEN, OrderStatus.PARTIAL]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")

    # Calculate refund for unfilled portion
    unfilled = order.size - order.filled
    refund = await unlock_balance_for_cancelled_order(
        session, agent_id, order.price, unfilled
    )

    # Update order status
    order.status = OrderStatus.CANCELLED

    await session.commit()

    return CancelOrderResponse(
        order_id=order_id,
        status="cancelled",
        refunded=refund
    )


@router.get("", response_model=List[OrderResponse])
async def list_orders(
    agent_id: UUID = Query(...),
    status: Optional[OrderStatus] = Query(default=None),
    market_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=50, le=100),
    session: AsyncSession = Depends(get_session)
):
    """List orders for an agent."""
    query = select(Order).where(Order.agent_id == agent_id)

    if status:
        query = query.where(Order.status == status)
    if market_id:
        query = query.where(Order.market_id == market_id)

    query = query.order_by(Order.created_at.desc()).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()
