from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from server.models.order import Side, OrderStatus


class OrderCreate(BaseModel):
    """Request to place an order."""
    agent_id: UUID
    market_id: UUID
    side: Side
    price: Decimal = Field(..., ge=Decimal("0.01"), le=Decimal("0.99"))
    size: int = Field(..., gt=0)


class OrderResponse(BaseModel):
    """Order details response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    market_id: UUID
    side: Side
    price: Decimal
    size: int
    filled: int
    status: OrderStatus
    created_at: datetime


class TradeResponse(BaseModel):
    """Trade execution response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    market_id: UUID
    buyer_id: UUID
    seller_id: UUID
    side: Side
    price: Decimal
    size: int
    created_at: datetime


class PlaceOrderResponse(BaseModel):
    """Response after placing an order."""
    order: OrderResponse
    trades: List[TradeResponse]


class CancelOrderResponse(BaseModel):
    """Response after cancelling an order."""
    order_id: UUID
    status: str
    refunded: Decimal
