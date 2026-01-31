from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from server.models.agent import AgentRole


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
    balance: Decimal
    locked_balance: Decimal
    reputation: Decimal
    can_trade: bool
    can_resolve: bool
