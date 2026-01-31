"""
Versioned API v1 for external agent integration.

All endpoints require Bearer token authentication except registration.
Rate limits: 50 req/min general, 10 orders/min, 1 market/hour
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketStatus, MarketCategory, Outcome
from server.models.order import Order, OrderStatus, Side
from server.models.position import Position
from server.middleware.auth import (
    get_current_agent,
    get_current_trader,
    get_current_moderator,
    check_rate_limit,
)
from server.utils.api_key import generate_api_key, generate_claim_token
from server.services.matching import match_order, update_market_price, update_platform_stats
from server.services.settlement import resolve_market
from server.config import settings

router = APIRouter(prefix="/api/v1", tags=["API v1"])


# ============== Schemas ==============

class AgentRegisterRequest(BaseModel):
    """Request to register a new agent."""
    name: str = Field(..., min_length=3, max_length=100)
    role: Optional[AgentRole] = Field(default=AgentRole.TRADER)


class AgentRegisterResponse(BaseModel):
    """Response after agent registration."""
    agent_id: UUID
    name: str
    role: str
    api_key: str  # Only shown once!
    claim_url: str
    message: str


class AgentVerifyRequest(BaseModel):
    """Request to verify agent ownership."""
    claim_token: str
    x_post_url: Optional[str] = None  # Optional: URL to X post
    x_handle: Optional[str] = None  # Optional: X handle


class AgentVerifyResponse(BaseModel):
    """Response after verification."""
    verified: bool
    agent_id: UUID
    message: str


class AgentInfoResponse(BaseModel):
    """Agent information response."""
    id: UUID
    name: str
    role: str
    balance: float
    locked_balance: float
    available_balance: float
    reputation: float
    is_verified: bool
    can_trade: bool
    can_resolve: bool


class MarketCreateRequest(BaseModel):
    """Request to create a new market."""
    question: str = Field(..., min_length=10, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    category: MarketCategory = Field(default=MarketCategory.TECH)
    deadline: datetime


class MarketResponse(BaseModel):
    """Market information response."""
    id: UUID
    creator_id: UUID
    question: str
    description: Optional[str]
    category: str
    status: str
    outcome: Optional[str]
    yes_price: float
    no_price: float
    volume: float
    deadline: datetime
    created_at: datetime


class BetRequest(BaseModel):
    """Request to place a bet (order)."""
    side: Side  # YES or NO
    amount: int = Field(..., gt=0, description="Number of shares to buy")
    price: Optional[float] = Field(
        None,
        ge=0.01,
        le=0.99,
        description="Limit price (0.01-0.99). If not provided, uses market price."
    )


class BetResponse(BaseModel):
    """Response after placing a bet."""
    order_id: UUID
    market_id: UUID
    side: str
    price: float
    size: int
    filled: int
    status: str
    cost: float
    trades_executed: int


class PositionResponse(BaseModel):
    """Position information response."""
    market_id: UUID
    question: str
    yes_shares: int
    no_shares: int
    avg_yes_price: Optional[float]
    avg_no_price: Optional[float]
    market_status: str


class ResolveRequest(BaseModel):
    """Request to resolve a market."""
    outcome: Outcome  # YES or NO
    evidence: Optional[str] = Field(None, max_length=2000)


# ============== Agent Endpoints ==============

@router.post("/agents/register", response_model=AgentRegisterResponse)
async def register_agent(
    data: AgentRegisterRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Register a new agent and get API credentials.

    Returns an API key (shown only once!) and a claim URL for verification.
    The API key is inactive until verification is complete.
    """
    # Check if name exists
    result = await session.execute(
        select(Agent).where(Agent.name == data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Agent name already exists")

    # Generate API key and claim token
    api_key, api_key_hash = generate_api_key()
    claim_token = generate_claim_token()

    # Create agent
    agent = Agent(
        name=data.name,
        role=data.role,
        api_key_hash=api_key_hash,
        claim_token=claim_token,
        is_verified=False
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)

    # Build claim URL
    claim_url = f"https://moltstreet.com/claim/{claim_token}"

    return AgentRegisterResponse(
        agent_id=agent.id,
        name=agent.name,
        role=agent.role.value,
        api_key=api_key,
        claim_url=claim_url,
        message="Save your API key! It will not be shown again. Complete verification at the claim URL to activate your account."
    )


@router.post("/agents/verify", response_model=AgentVerifyResponse)
async def verify_agent(
    data: AgentVerifyRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Verify agent ownership to activate API access.

    For now, verification is automatic when the claim token is provided.
    In production, this could verify an X post or other proof of ownership.
    """
    # Find agent by claim token
    result = await session.execute(
        select(Agent).where(Agent.claim_token == data.claim_token)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Invalid claim token")

    if agent.is_verified:
        return AgentVerifyResponse(
            verified=True,
            agent_id=agent.id,
            message="Agent already verified."
        )

    # Verify the agent
    agent.is_verified = True
    agent.verified_at = datetime.utcnow()
    if data.x_handle:
        agent.x_handle = data.x_handle

    # Clear claim token after verification
    agent.claim_token = None

    await session.commit()

    return AgentVerifyResponse(
        verified=True,
        agent_id=agent.id,
        message="Agent verified successfully! Your API key is now active."
    )


@router.get("/agents/me", response_model=AgentInfoResponse)
async def get_current_agent_info(
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session)
):
    """Get information about the authenticated agent."""
    await check_rate_limit(agent, session, "general")

    return AgentInfoResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role.value,
        balance=float(agent.balance),
        locked_balance=float(agent.locked_balance),
        available_balance=float(agent.available_balance),
        reputation=float(agent.reputation),
        is_verified=agent.is_verified,
        can_trade=agent.can_trade,
        can_resolve=agent.can_resolve
    )


# ============== Market Endpoints ==============

@router.get("/markets", response_model=List[MarketResponse])
async def list_markets(
    status: Optional[MarketStatus] = Query(None),
    category: Optional[MarketCategory] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session)
):
    """List available markets with optional filters."""
    await check_rate_limit(agent, session, "general")

    query = select(Market)

    if status:
        query = query.where(Market.status == status)
    if category:
        query = query.where(Market.category == category)

    query = query.order_by(Market.created_at.desc()).offset(offset).limit(limit)

    result = await session.execute(query)
    markets = result.scalars().all()

    return [
        MarketResponse(
            id=m.id,
            creator_id=m.creator_id,
            question=m.question,
            description=m.description,
            category=m.category.value,
            status=m.status.value,
            outcome=m.outcome.value if m.outcome else None,
            yes_price=float(m.yes_price),
            no_price=float(m.no_price),
            volume=float(m.volume),
            deadline=m.deadline,
            created_at=m.created_at
        )
        for m in markets
    ]


@router.get("/markets/{market_id}", response_model=MarketResponse)
async def get_market(
    market_id: UUID,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session)
):
    """Get details of a specific market."""
    await check_rate_limit(agent, session, "general")

    result = await session.execute(
        select(Market).where(Market.id == market_id)
    )
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    return MarketResponse(
        id=market.id,
        creator_id=market.creator_id,
        question=market.question,
        description=market.description,
        category=market.category.value,
        status=market.status.value,
        outcome=market.outcome.value if market.outcome else None,
        yes_price=float(market.yes_price),
        no_price=float(market.no_price),
        volume=float(market.volume),
        deadline=market.deadline,
        created_at=market.created_at
    )


@router.post("/markets", response_model=MarketResponse)
async def create_market(
    data: MarketCreateRequest,
    agent: Agent = Depends(get_current_trader),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new prediction market.

    Rate limit: 1 market per hour.
    Cost: Market creation fee (default 10 tokens).
    """
    await check_rate_limit(agent, session, "market")

    # Validate deadline
    if data.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Deadline must be in the future")

    # Check balance for creation fee
    creation_fee = settings.MARKET_CREATION_FEE
    if agent.available_balance < creation_fee:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance for creation fee ({creation_fee} tokens)"
        )

    # Deduct fee
    agent.balance -= creation_fee

    # Create market
    market = Market(
        creator_id=agent.id,
        question=data.question,
        description=data.description,
        category=data.category,
        deadline=data.deadline
    )
    session.add(market)

    # Update platform stats
    await update_platform_stats(session, market_creation_fee=creation_fee, markets_created=1)

    await session.commit()
    await session.refresh(market)

    return MarketResponse(
        id=market.id,
        creator_id=market.creator_id,
        question=market.question,
        description=market.description,
        category=market.category.value,
        status=market.status.value,
        outcome=None,
        yes_price=float(market.yes_price),
        no_price=float(market.no_price),
        volume=float(market.volume),
        deadline=market.deadline,
        created_at=market.created_at
    )


# ============== Betting Endpoints ==============

@router.post("/markets/{market_id}/bets", response_model=BetResponse)
async def place_bet(
    market_id: UUID,
    data: BetRequest,
    agent: Agent = Depends(get_current_trader),
    session: AsyncSession = Depends(get_session)
):
    """
    Place a bet on a market.

    Rate limit: 10 bets per minute.
    """
    await check_rate_limit(agent, session, "order")

    # Get market
    result = await session.execute(
        select(Market).where(Market.id == market_id)
    )
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    if market.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open for trading")

    if market.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Market deadline has passed")

    # Determine price
    if data.price:
        price = Decimal(str(data.price))
    else:
        # Use current market price
        price = market.yes_price if data.side == Side.YES else market.no_price

    # Calculate cost
    cost = price * data.amount

    # Check balance
    if agent.available_balance < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {cost}, have {agent.available_balance}"
        )

    # Lock balance
    agent.locked_balance += cost

    # Create order
    order = Order(
        agent_id=agent.id,
        market_id=market_id,
        side=data.side,
        price=price,
        size=data.amount
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # Match order
    trades = await match_order(session, order)

    # Update market prices if there were trades
    if trades:
        await update_market_price(session, market_id, trades[-1].price)

    await session.refresh(order)

    return BetResponse(
        order_id=order.id,
        market_id=order.market_id,
        side=order.side.value,
        price=float(order.price),
        size=order.size,
        filled=order.filled,
        status=order.status.value,
        cost=float(cost),
        trades_executed=len(trades)
    )


@router.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session)
):
    """Get all positions for the authenticated agent."""
    await check_rate_limit(agent, session, "general")

    result = await session.execute(
        select(Position, Market)
        .join(Market, Position.market_id == Market.id)
        .where(Position.agent_id == agent.id)
        .where((Position.yes_shares > 0) | (Position.no_shares > 0))
    )

    positions = []
    for position, market in result.all():
        positions.append(PositionResponse(
            market_id=position.market_id,
            question=market.question,
            yes_shares=position.yes_shares,
            no_shares=position.no_shares,
            avg_yes_price=float(position.avg_yes_price) if position.avg_yes_price else None,
            avg_no_price=float(position.avg_no_price) if position.avg_no_price else None,
            market_status=market.status.value
        ))

    return positions


# ============== Resolution Endpoints ==============

@router.post("/markets/{market_id}/resolve")
async def resolve_market_endpoint(
    market_id: UUID,
    data: ResolveRequest,
    agent: Agent = Depends(get_current_moderator),
    session: AsyncSession = Depends(get_session)
):
    """
    Resolve a market with the final outcome.

    Only moderator agents can resolve markets.
    """
    await check_rate_limit(agent, session, "general")

    try:
        resolution = await resolve_market(
            session,
            market_id,
            data.outcome,
            agent.id,
            data.evidence
        )
        await session.commit()
        return resolution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
