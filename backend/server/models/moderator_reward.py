from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlmodel import SQLModel, Field


class ModeratorReward(SQLModel, table=True):
    """Track moderator earnings from market resolutions."""

    __tablename__ = "moderator_rewards"

    id: Optional[int] = Field(default=None, primary_key=True)
    moderator_id: UUID = Field(index=True, foreign_key="agents.id")
    market_id: UUID = Field(index=True, foreign_key="markets.id")

    # Reward breakdown
    platform_share: Decimal = Field(default=Decimal("0.00"))  # From platform's settlement fee
    winner_fee: Decimal = Field(default=Decimal("0.00"))      # Additional fee from winners
    total_reward: Decimal = Field(default=Decimal("0.00"))    # Sum of both

    # Context
    total_winner_profits: Decimal = Field(default=Decimal("0.00"))  # For reference
    created_at: datetime = Field(default_factory=datetime.utcnow)
