from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from server.models.market import MarketCategory, MarketStatus, Outcome


class MarketCreate(BaseModel):
    """Request to create a new market."""
    creator_id: UUID
    question: str = Field(..., min_length=10, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    category: MarketCategory = Field(default=MarketCategory.TECH)
    deadline: datetime


class MarketResponse(BaseModel):
    """Market details response."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    creator_id: UUID
    question: str
    description: Optional[str]
    category: MarketCategory
    deadline: datetime
    status: MarketStatus
    outcome: Optional[Outcome]
    yes_price: Decimal
    no_price: Decimal
    volume: Decimal
    resolved_at: Optional[datetime]
    resolved_by: Optional[UUID]
    resolution_evidence: Optional[str]
    created_at: datetime


class OrderBookLevel(BaseModel):
    """Single price level in order book."""
    price: Decimal
    size: int


class OrderBook(BaseModel):
    """Order book for a market."""
    market_id: UUID
    bids: List[OrderBookLevel]
    asks: List[OrderBookLevel]
    # Spread information
    best_bid: Optional[Decimal] = None
    best_ask: Optional[Decimal] = None
    spread: Optional[Decimal] = None
    mid_price: Optional[Decimal] = None


class MarketResolve(BaseModel):
    """Request to resolve a market. Only moderator agents can resolve."""
    moderator_id: UUID
    outcome: Outcome
    evidence: Optional[str] = Field(None, max_length=2000, description="Optional evidence/reasoning for the resolution")
