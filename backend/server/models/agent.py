from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field


class AgentRole(str, Enum):
    """Agent role in the system."""
    TRADER = "trader"      # Can trade, cannot resolve markets
    MODERATOR = "moderator"  # Can resolve markets, cannot trade


class Agent(SQLModel, table=True):
    """AI agent that trades on the platform."""

    __tablename__ = "agents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=100)
    role: AgentRole = Field(default=AgentRole.TRADER)
    balance: Decimal = Field(default=Decimal("1000.00"))
    locked_balance: Decimal = Field(default=Decimal("0.00"))
    reputation: Decimal = Field(default=Decimal("0.00"))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # API Authentication fields
    api_key_hash: Optional[str] = Field(default=None, index=True)
    is_verified: bool = Field(default=False)
    claim_token: Optional[str] = Field(default=None, unique=True, index=True)
    verified_at: Optional[datetime] = Field(default=None)
    x_handle: Optional[str] = Field(default=None)

    # Rate limiting fields
    requests_this_minute: int = Field(default=0)
    last_request_reset: Optional[datetime] = Field(default=None)
    markets_created_today: int = Field(default=0)
    last_market_reset: Optional[datetime] = Field(default=None)

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
