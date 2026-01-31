from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field


class Position(SQLModel, table=True):
    """Agent's position in a market."""

    __tablename__ = "positions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)
    market_id: UUID = Field(foreign_key="markets.id", index=True)
    yes_shares: int = Field(default=0)
    no_shares: int = Field(default=0)
    avg_yes_price: Optional[Decimal] = Field(default=None)
    avg_no_price: Optional[Decimal] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        # Unique constraint on agent_id + market_id
        pass
