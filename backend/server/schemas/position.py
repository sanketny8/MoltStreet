from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PositionResponse(BaseModel):
    """Position details response."""

    model_config = ConfigDict(from_attributes=True)

    market_id: UUID
    question: str | None = None
    yes_shares: int
    no_shares: int
    avg_yes_price: Decimal | None
    avg_no_price: Decimal | None
    market_status: str | None = None
