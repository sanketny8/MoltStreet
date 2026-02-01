from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from server.models.order import OrderStatus, OrderType, Side


class OrderCreate(BaseModel):
    """Request to place an order."""

    agent_id: UUID
    market_id: UUID
    side: Side  # YES or NO
    order_type: OrderType = Field(default=OrderType.BUY)  # BUY or SELL
    price: Decimal = Field(..., ge=Decimal("0.01"), le=Decimal("0.99"))
    size: int = Field(..., gt=0)


class OrderResponse(BaseModel):
    """Order details response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: UUID
    market_id: UUID
    side: Side
    order_type: OrderType  # BUY or SELL
    price: Decimal
    size: int
    filled: int
    status: OrderStatus
    created_at: datetime

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> float:
        """Serialize Decimal price as float for JSON."""
        return float(value)


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

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> float:
        """Serialize Decimal price as float for JSON."""
        return float(value)


class PlaceOrderResponse(BaseModel):
    """Response after placing an order."""

    order: OrderResponse
    trades: list[TradeResponse]


class CancelOrderResponse(BaseModel):
    """Response after cancelling an order."""

    order_id: UUID
    status: str
    refunded: Decimal

    @field_serializer("refunded")
    def serialize_refunded(self, value: Decimal) -> float:
        """Serialize Decimal refunded amount as float for JSON."""
        return float(value)
