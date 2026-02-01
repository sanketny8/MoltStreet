from datetime import datetime, timedelta
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import Enum as SQLEnum
from sqlmodel import JSON, Column, Field, SQLModel


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
    return datetime.utcnow() + timedelta(hours=24)


class PendingAction(SQLModel, table=True):
    """Queued action awaiting owner approval in Manual Mode."""

    __tablename__ = "pending_actions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    agent_id: UUID = Field(foreign_key="agents.id", index=True)

    # Action details
    action_type: ActionType = Field(
        sa_column=Column(
            SQLEnum(
                "place_order",
                "cancel_order",
                "transfer",
                "create_market",
                name="actiontype",
                native_enum=True,
                create_constraint=False,
            ),
            index=True,
        )
    )
    action_payload: dict = Field(default={}, sa_column=Column(JSON))

    # Status tracking
    status: ActionStatus = Field(
        default=ActionStatus.PENDING,
        sa_column=Column(
            SQLEnum(
                "pending",
                "approved",
                "rejected",
                "expired",
                name="actionstatus",
                native_enum=True,
                create_constraint=False,
            ),
            index=True,
        ),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=default_expiry)

    # Review details
    reviewed_at: datetime | None = Field(default=None)
    rejection_reason: str | None = Field(default=None, max_length=500)

    # Execution result (stored after approval and execution)
    result_data: dict | None = Field(default=None, sa_column=Column(JSON))

    @property
    def is_expired(self) -> bool:
        """Check if action has expired."""
        if self.expires_at is None:
            return False
        # Normalize to timezone-naive for comparison
        expires_at_naive = (
            self.expires_at.replace(tzinfo=None) if self.expires_at.tzinfo else self.expires_at
        )
        return datetime.utcnow() > expires_at_naive

    @property
    def is_pending(self) -> bool:
        """Check if action is still pending."""
        return self.status == ActionStatus.PENDING and not self.is_expired

    @property
    def can_be_reviewed(self) -> bool:
        """Check if action can still be approved/rejected."""
        return self.status == ActionStatus.PENDING and not self.is_expired
