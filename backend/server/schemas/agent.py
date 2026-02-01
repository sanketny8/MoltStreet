from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from server.models.agent import AgentRole, TradingMode


class AgentCreate(BaseModel):
    """Request to register a new agent."""

    name: str = Field(..., min_length=1, max_length=100)
    role: AgentRole = Field(default=AgentRole.TRADER)


class AgentResponse(BaseModel):
    """Agent details response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    role: AgentRole
    trading_mode: TradingMode
    balance: Decimal
    locked_balance: Decimal
    reputation: Decimal
    can_trade: bool
    can_resolve: bool

    @field_serializer("balance", "locked_balance", "reputation")
    def serialize_decimal(self, value: Decimal) -> float:
        """Serialize Decimal fields as float for JSON."""
        return float(value)


class AgentSettingsUpdate(BaseModel):
    """Request to update agent settings."""

    trading_mode: TradingMode | None = None


# Profile-related schemas
class ProfileStats(BaseModel):
    """Trading statistics for agent profile."""

    total_trades: int = 0
    total_orders: int = 0
    total_positions: int = 0
    markets_created: int = 0
    markets_resolved: int = 0
    total_volume_traded: float = 0.0
    total_fees_paid: float = 0.0
    win_rate: float = 0.0  # Percentage
    total_pnl: float = 0.0
    pnl_percentage: float = 0.0
    avg_trade_size: float = 0.0
    best_trade: float | None = None
    worst_trade: float | None = None


class ProfileRankings(BaseModel):
    """Leaderboard rankings for different metrics."""

    rank_by_profit: int | None = None
    rank_by_balance: int | None = None
    rank_by_reputation: int | None = None
    rank_by_volume: int | None = None


class RecentTrade(BaseModel):
    """Recent trade information."""

    id: str
    market_id: str
    market_question: str
    side: str
    price: float
    size: int
    role: str  # "buyer" or "seller"
    pnl: float | None = None  # Calculated if market resolved
    created_at: str


class ActivePosition(BaseModel):
    """Active position in a market."""

    market_id: str
    market_question: str
    market_status: str
    yes_shares: int
    no_shares: int
    avg_yes_price: float | None = None
    avg_no_price: float | None = None
    unrealized_pnl: float | None = None  # Based on current market prices


class MarketCreated(BaseModel):
    """Market created by trader."""

    id: str
    question: str
    status: str
    volume: float
    created_at: str


class MarketResolved(BaseModel):
    """Market resolved by moderator."""

    id: str
    question: str
    outcome: str
    reward: float
    resolved_at: str


class AgentProfileResponse(BaseModel):
    """Complete agent profile response."""

    agent: AgentResponse
    stats: ProfileStats
    rankings: ProfileRankings
    recent_trades: list[RecentTrade]
    active_positions: list[ActivePosition]
    markets_created: list[MarketCreated]
    markets_resolved: list[MarketResolved]
