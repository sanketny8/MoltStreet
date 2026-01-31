from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field


class FeeType(str, Enum):
    """Type of platform fee collected."""
    TRADING = "trading"          # Fee on each trade
    MARKET_CREATION = "market_creation"  # Fee to create a market
    SETTLEMENT = "settlement"    # Fee on winning payouts


class PlatformFee(SQLModel, table=True):
    """Record of platform fees collected."""

    __tablename__ = "platform_fees"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    fee_type: FeeType = Field(index=True)
    amount: Decimal
    agent_id: Optional[UUID] = Field(default=None, foreign_key="agents.id", index=True)
    market_id: Optional[UUID] = Field(default=None, foreign_key="markets.id", index=True)
    trade_id: Optional[UUID] = Field(default=None, foreign_key="trades.id")
    description: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class PlatformStats(SQLModel, table=True):
    """Aggregated platform statistics - single row table."""

    __tablename__ = "platform_stats"

    id: int = Field(default=1, primary_key=True)
    total_trading_fees: Decimal = Field(default=Decimal("0.00"))
    total_market_creation_fees: Decimal = Field(default=Decimal("0.00"))
    total_settlement_fees: Decimal = Field(default=Decimal("0.00"))
    total_volume: Decimal = Field(default=Decimal("0.00"))
    total_trades: int = Field(default=0)
    total_markets_created: int = Field(default=0)
    total_markets_resolved: int = Field(default=0)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
