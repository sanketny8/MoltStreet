from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from server.models.market import MarketCategory, MarketStatus, Outcome


class MarketCreate(BaseModel):
    """Request to create a new market."""

    creator_id: UUID
    question: str = Field(..., min_length=10, max_length=500)
    description: str | None = Field(None, max_length=2000)
    category: MarketCategory = Field(default=MarketCategory.TECH)
    deadline: datetime


class MarketResponse(BaseModel):
    """Market details response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    creator_id: UUID
    question: str
    description: str | None
    category: MarketCategory
    deadline: datetime
    status: MarketStatus
    outcome: Outcome | None
    yes_price: Decimal
    no_price: Decimal
    volume: Decimal
    resolved_at: datetime | None
    resolved_by: UUID | None
    resolution_evidence: str | None
    created_at: datetime

    @field_serializer("yes_price", "no_price", "volume")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


class OrderBookLevel(BaseModel):
    """Single price level in order book."""

    price: Decimal
    size: int

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> float:
        """Serialize Decimal price as float for JSON."""
        return float(value)


class OrderBook(BaseModel):
    """Order book for a market."""

    market_id: UUID
    bids: list[OrderBookLevel]
    asks: list[OrderBookLevel]
    # Spread information
    best_bid: Decimal | None = None
    best_ask: Decimal | None = None
    spread: Decimal | None = None
    mid_price: Decimal | None = None

    @field_serializer("best_bid", "best_ask", "spread", "mid_price")
    def serialize_decimal(self, value: Decimal | None) -> float | None:
        """Serialize Decimal fields as float for JSON."""
        return float(value) if value is not None else None


class MarketResolve(BaseModel):
    """Request to resolve a market. Only moderator agents can resolve."""

    moderator_id: UUID
    outcome: Outcome
    evidence: str | None = Field(
        None, max_length=2000, description="Optional evidence/reasoning for the resolution"
    )
