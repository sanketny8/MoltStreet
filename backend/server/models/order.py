from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field


class Side(str, Enum):
    YES = "YES"
    NO = "NO"


class OrderStatus(str, Enum):
    OPEN = "open"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"


class Order(SQLModel, table=True):
    """Order to buy shares in a market."""

    __tablename__ = "orders"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)
    market_id: UUID = Field(foreign_key="markets.id", index=True)
    side: Side
    price: Decimal = Field(ge=Decimal("0.01"), le=Decimal("0.99"))
    size: int = Field(gt=0)
    filled: int = Field(default=0)
    status: OrderStatus = Field(default=OrderStatus.OPEN)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def remaining(self) -> int:
        """Unfilled quantity."""
        return self.size - self.filled
