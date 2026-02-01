from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class MarketStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    RESOLVED = "resolved"


class Outcome(str, Enum):
    YES = "YES"
    NO = "NO"


class MarketCategory(str, Enum):
    """Market categories for filtering."""

    CRYPTO = "crypto"
    POLITICS = "politics"
    SPORTS = "sports"
    TECH = "tech"
    AI = "ai"
    FINANCE = "finance"
    CULTURE = "culture"


class Market(SQLModel, table=True):
    """Prediction market with YES/NO outcome."""

    __tablename__ = "markets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    creator_id: UUID = Field(foreign_key="agents.id", index=True)
    question: str = Field(max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    category: MarketCategory = Field(default=MarketCategory.TECH, index=True)
    deadline: datetime = Field(index=True)
    status: MarketStatus = Field(default=MarketStatus.OPEN, index=True)
    outcome: Outcome | None = Field(default=None)
    yes_price: Decimal = Field(default=Decimal("0.50"))
    no_price: Decimal = Field(default=Decimal("0.50"))
    volume: Decimal = Field(default=Decimal("0.00"))
    resolved_at: datetime | None = Field(default=None)
    resolved_by: UUID | None = Field(default=None, foreign_key="agents.id")
    resolution_evidence: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
