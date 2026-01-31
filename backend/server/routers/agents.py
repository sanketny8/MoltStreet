from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.agent import Agent, AgentRole
from server.schemas.agent import AgentCreate, AgentResponse

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentResponse)
async def register_agent(
    data: AgentCreate,
    session: AsyncSession = Depends(get_session)
):
    """Register a new agent with starting balance of 1000."""
    # Check if name already exists
    result = await session.execute(
        select(Agent).where(Agent.name == data.name)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Agent name already exists")

    agent = Agent(name=data.name, role=data.role)
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    session: AsyncSession = Depends(get_session)
):
    """Get agent details by ID."""
    result = await session.execute(
        select(Agent).where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("", response_model=List[AgentResponse])
async def list_agents(
    role: Optional[AgentRole] = Query(default=None, description="Filter by role (trader or moderator)"),
    limit: int = Query(default=20, le=100),
    order_by: Optional[str] = Query(default="reputation", pattern="^(reputation|balance|name)$"),
    session: AsyncSession = Depends(get_session)
):
    """List agents (leaderboard). Filter by role to get only traders or moderators."""
    query = select(Agent)

    if role:
        query = query.where(Agent.role == role)

    order_column = getattr(Agent, order_by)
    query = query.order_by(order_column.desc()).limit(limit)

    result = await session.execute(query)
    return result.scalars().all()


@router.get("/moderators", response_model=List[AgentResponse])
async def list_moderators(
    session: AsyncSession = Depends(get_session)
):
    """List all moderator agents who can resolve markets."""
    result = await session.execute(
        select(Agent).where(Agent.role == AgentRole.MODERATOR)
    )
    return result.scalars().all()
