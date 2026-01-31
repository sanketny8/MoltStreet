from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PositionResponse(BaseModel):
    """Position details response."""
    model_config = ConfigDict(from_attributes=True)

    market_id: UUID
    question: Optional[str] = None
    yes_shares: int
    no_shares: int
    avg_yes_price: Optional[Decimal]
    avg_no_price: Optional[Decimal]
    market_status: Optional[str] = None
