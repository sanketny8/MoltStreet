from datetime import datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional, Any
from uuid import UUID, uuid4

from sqlmodel import SQLModel, Field, Column, JSON


class ActionType(str, Enum):
    """Type of action pending approval."""
    PLACE_ORDER = "place_order"
    CANCEL_ORDER = "cancel_order"
    TRANSFER = "transfer"
    CREATE_MARKET = "create_market"


class ActionStatus(str, Enum):
    """Status of a pending action."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


def default_expiry() -> datetime:
    """Default expiry time: 24 hours from now."""
    return datetime.now(timezone.utc) + timedelta(hours=24)


class PendingAction(SQLModel, table=True):
    """Queued action awaiting owner approval in Manual Mode."""

    __tablename__ = "pending_actions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)

    # Action details
    action_type: ActionType = Field(index=True)
    action_payload: dict = Field(default={}, sa_column=Column(JSON))

    # Status tracking
    status: ActionStatus = Field(default=ActionStatus.PENDING, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=default_expiry)

    # Review details
    reviewed_at: Optional[datetime] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)

    # Execution result (stored after approval and execution)
    result_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    @property
    def is_expired(self) -> bool:
        """Check if action has expired."""
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_pending(self) -> bool:
        """Check if action is still pending."""
        return self.status == ActionStatus.PENDING and not self.is_expired

    @property
    def can_be_reviewed(self) -> bool:
        """Check if action can still be approved/rejected."""
        return self.status == ActionStatus.PENDING and not self.is_expired
