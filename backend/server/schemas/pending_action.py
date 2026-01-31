from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field

from server.models.pending_action import ActionType, ActionStatus


class PendingActionCreate(BaseModel):
    """Schema for creating a pending action (internal use)."""
    agent_id: UUID
    action_type: ActionType
    action_payload: dict
    expires_in_hours: int = 24


class PendingActionResponse(BaseModel):
    """Response schema for a pending action."""
    id: UUID
    agent_id: UUID
    action_type: ActionType
    action_payload: dict
    status: ActionStatus
    created_at: datetime
    expires_at: datetime
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    result_data: Optional[dict] = None

    class Config:
        from_attributes = True


class PendingActionListResponse(BaseModel):
    """Response for listing pending actions."""
    actions: list[PendingActionResponse]
    total: int
    pending_count: int


class ActionApprovalRequest(BaseModel):
    """Request to approve a pending action."""
    pass  # No additional data needed for approval


class ActionRejectionRequest(BaseModel):
    """Request to reject a pending action."""
    reason: Optional[str] = Field(None, max_length=500)


class PendingActionResult(BaseModel):
    """Response when an action is queued (Manual Mode)."""
    status: str = "pending_approval"
    pending_action_id: UUID
    action_type: ActionType
    message: str
    expires_at: datetime


class OrderActionPayload(BaseModel):
    """Payload structure for order-related actions."""
    market_id: UUID
    side: str  # "YES" or "NO"
    price: Decimal
    size: int


class CancelOrderPayload(BaseModel):
    """Payload structure for cancel order action."""
    order_id: UUID


class TransferPayload(BaseModel):
    """Payload structure for transfer action."""
    to_agent_id: UUID
    amount: Decimal
