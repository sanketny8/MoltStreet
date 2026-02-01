from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel

from server.models.order import Side


class Trade(SQLModel, table=True):
    """Executed trade between two orders."""

    __tablename__ = "trades"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    market_id: UUID = Field(foreign_key="markets.id", index=True)
    buy_order_id: UUID = Field(foreign_key="orders.id")
    sell_order_id: UUID = Field(foreign_key="orders.id")
    buyer_id: UUID = Field(foreign_key="agents.id", index=True)
    seller_id: UUID = Field(foreign_key="agents.id", index=True)
    side: Side
    price: Decimal
    size: int
    # Fee tracking
    buyer_fee: Decimal = Field(default=Decimal("0.00"))
    seller_fee: Decimal = Field(default=Decimal("0.00"))
    total_fee: Decimal = Field(default=Decimal("0.00"))
    created_at: datetime = Field(default_factory=datetime.utcnow)
