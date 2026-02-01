from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Side(str, Enum):
    """Outcome being traded (YES or NO)."""

    YES = "YES"
    NO = "NO"


class OrderType(str, Enum):
    """Whether this order is buying or selling shares."""

    BUY = "buy"  # Opening a position / acquiring shares
    SELL = "sell"  # Closing a position / disposing shares


class OrderStatus(str, Enum):
    OPEN = "open"
    PARTIAL = "partial"
    FILLED = "filled"
    CANCELLED = "cancelled"


class Order(SQLModel, table=True):
    """Order to buy or sell shares in a market."""

    __tablename__ = "orders"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)
    market_id: UUID = Field(foreign_key="markets.id", index=True)
    side: Side  # YES or NO
    order_type: OrderType = Field(default=OrderType.BUY)  # BUY or SELL
    price: Decimal = Field(ge=Decimal("0.01"), le=Decimal("0.99"))
    size: int = Field(gt=0)
    filled: int = Field(default=0)
    status: OrderStatus = Field(default=OrderStatus.OPEN)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def remaining(self) -> int:
        """Unfilled quantity."""
        return self.size - self.filled
