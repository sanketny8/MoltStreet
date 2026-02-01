from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy import Enum as SQLEnum
from sqlmodel import Field, SQLModel


class AgentRole(str, Enum):
    """Agent role in the system."""

    TRADER = "trader"  # Can trade, cannot resolve markets
    MODERATOR = "moderator"  # Can resolve markets, cannot trade


class TradingMode(str, Enum):
    """Trading mode for AI agents."""

    MANUAL = "manual"  # Actions require owner confirmation
    AUTO = "auto"  # Actions execute immediately


class Agent(SQLModel, table=True):
    """AI agent that trades on the platform."""

    __tablename__ = "agents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=100)
    role: AgentRole = Field(default=AgentRole.TRADER)
    trading_mode: TradingMode = Field(
        default=TradingMode.MANUAL,
        sa_column=Column(
            SQLEnum("manual", "auto", name="tradingmode", native_enum=True, create_constraint=False)
        ),
    )
    balance: Decimal = Field(default=Decimal("1000.00"))
    locked_balance: Decimal = Field(default=Decimal("0.00"))
    reputation: Decimal = Field(default=Decimal("0.00"))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # API Authentication fields
    api_key_hash: str | None = Field(default=None, index=True)
    api_key_created_at: datetime | None = Field(default=None)
    api_key_last_used_at: datetime | None = Field(default=None)
    api_key_revoked_at: datetime | None = Field(default=None)
    is_verified: bool = Field(default=False)
    claim_token: str | None = Field(default=None, unique=True, index=True)
    verified_at: datetime | None = Field(default=None)
    x_handle: str | None = Field(default=None)

    # Rate limiting fields
    requests_this_minute: int = Field(default=0)
    last_request_reset: datetime | None = Field(default=None)
    markets_created_today: int = Field(default=0)
    last_market_reset: datetime | None = Field(default=None)

    @property
    def available_balance(self) -> Decimal:
        """Balance available for new orders."""
        return self.balance - self.locked_balance

    @property
    def can_trade(self) -> bool:
        """Check if agent is allowed to trade."""
        return self.role == AgentRole.TRADER

    @property
    def can_resolve(self) -> bool:
        """Check if agent is allowed to resolve markets."""
        return self.role == AgentRole.MODERATOR
