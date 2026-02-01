"""
Pending Actions Router - Manage actions queued for owner approval in Manual Mode.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models import ActionStatus, ActionType, Agent, PendingAction
from server.schemas.pending_action import (
    ActionRejectionRequest,
    PendingActionListResponse,
    PendingActionResponse,
)
from server.services.pending_actions import execute_pending_action

router = APIRouter(prefix="/pending-actions", tags=["pending-actions"])


def normalize_datetime(dt: datetime) -> datetime:
    """Normalize datetime to timezone-naive UTC for comparison."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        # Convert timezone-aware to timezone-naive UTC
        return dt.replace(tzinfo=None)
    return dt


@router.get("", response_model=PendingActionListResponse)
async def list_pending_actions(
    agent_id: UUID = Query(..., description="Agent ID to list actions for"),
    status: ActionStatus | None = Query(None, description="Filter by status"),
    action_type: ActionType | None = Query(None, description="Filter by action type"),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
):
    """List pending actions for an agent."""
    # Verify agent exists
    agent = await session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Build query
    query = select(PendingAction).where(PendingAction.agent_id == agent_id)

    if status:
        query = query.where(PendingAction.status == status)
    if action_type:
        query = query.where(PendingAction.action_type == action_type)

    query = query.order_by(PendingAction.created_at.desc()).limit(limit)

    result = await session.execute(query)
    actions = result.scalars().all()

    # Mark expired actions
    now = datetime.utcnow()
    for action in actions:
        # Normalize expires_at to timezone-naive for comparison
        expires_at_naive = normalize_datetime(action.expires_at)
        if action.status == ActionStatus.PENDING and expires_at_naive and expires_at_naive < now:
            action.status = ActionStatus.EXPIRED
            session.add(action)

    await session.commit()

    # Count pending
    pending_count = sum(1 for a in actions if a.status == ActionStatus.PENDING)

    return PendingActionListResponse(
        actions=[PendingActionResponse.model_validate(a) for a in actions],
        total=len(actions),
        pending_count=pending_count,
    )


@router.get("/{action_id}", response_model=PendingActionResponse)
async def get_pending_action(
    action_id: UUID,
    agent_id: UUID = Query(..., description="Agent ID for ownership verification"),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific pending action."""
    action = await session.get(PendingAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")

    # Verify ownership
    if action.agent_id != agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this action")

    # Check and update expiry
    now = datetime.utcnow()
    expires_at_naive = normalize_datetime(action.expires_at)
    if action.status == ActionStatus.PENDING and expires_at_naive and expires_at_naive < now:
        action.status = ActionStatus.EXPIRED
        session.add(action)
        await session.commit()

    return PendingActionResponse.model_validate(action)


@router.post("/{action_id}/approve", response_model=PendingActionResponse)
async def approve_pending_action(
    action_id: UUID,
    agent_id: UUID = Query(..., description="Agent ID for ownership verification"),
    session: AsyncSession = Depends(get_session),
):
    """Approve a pending action and execute it."""
    action = await session.get(PendingAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")

    # Verify ownership
    if action.agent_id != agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this action")

    # Check if can be reviewed
    now = datetime.utcnow()
    if action.status != ActionStatus.PENDING:
        raise HTTPException(
            status_code=400, detail=f"Action cannot be approved. Current status: {action.status}"
        )

    expires_at_naive = normalize_datetime(action.expires_at)
    if expires_at_naive and expires_at_naive < now:
        action.status = ActionStatus.EXPIRED
        session.add(action)
        await session.commit()
        raise HTTPException(status_code=400, detail="Action has expired")

    # Execute the action
    try:
        result = await execute_pending_action(session, action)
        action.status = ActionStatus.APPROVED
        action.reviewed_at = now
        action.result_data = result
        session.add(action)
        await session.commit()
        await session.refresh(action)
    except Exception as e:
        # If execution fails, keep as pending but return error
        raise HTTPException(status_code=400, detail=f"Failed to execute action: {e!s}") from e

    return PendingActionResponse.model_validate(action)


@router.post("/{action_id}/reject", response_model=PendingActionResponse)
async def reject_pending_action(
    action_id: UUID,
    data: ActionRejectionRequest,
    agent_id: UUID = Query(..., description="Agent ID for ownership verification"),
    session: AsyncSession = Depends(get_session),
):
    """Reject a pending action."""
    action = await session.get(PendingAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")

    # Verify ownership
    if action.agent_id != agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this action")

    # Check if can be reviewed
    now = datetime.utcnow()
    if action.status != ActionStatus.PENDING:
        raise HTTPException(
            status_code=400, detail=f"Action cannot be rejected. Current status: {action.status}"
        )

    expires_at_naive = normalize_datetime(action.expires_at)
    if expires_at_naive and expires_at_naive < now:
        action.status = ActionStatus.EXPIRED
        session.add(action)
        await session.commit()
        raise HTTPException(status_code=400, detail="Action has expired")

    # Reject the action
    action.status = ActionStatus.REJECTED
    action.reviewed_at = now
    action.rejection_reason = data.reason
    session.add(action)
    await session.commit()
    await session.refresh(action)

    return PendingActionResponse.model_validate(action)


@router.delete("/{action_id}")
async def delete_pending_action(
    action_id: UUID,
    agent_id: UUID = Query(..., description="Agent ID for ownership verification"),
    session: AsyncSession = Depends(get_session),
):
    """Delete a pending action (only if still pending)."""
    action = await session.get(PendingAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found")

    # Verify ownership
    if action.agent_id != agent_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this action")

    # Only allow deleting pending actions
    if action.status != ActionStatus.PENDING:
        raise HTTPException(
            status_code=400, detail=f"Cannot delete action with status: {action.status}"
        )

    await session.delete(action)
    await session.commit()

    return {"message": "Pending action deleted"}
