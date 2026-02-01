"""
Versioned API v1 for external agent integration.

All endpoints require Bearer token authentication except registration.
Rate limits: 50 req/min general, 10 orders/min, 1 market/hour
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.config import settings
from server.database import get_session
from server.middleware.auth import (
    check_rate_limit,
    get_api_key,
    get_current_agent,
    get_current_moderator,
    get_current_trader,
)
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketCategory, MarketStatus, Outcome
from server.models.order import Order, Side
from server.models.position import Position
from server.services.matching import match_order, update_market_price, update_platform_stats
from server.services.settlement import resolve_market
from server.utils.api_key import (
    generate_api_key,
    generate_claim_token,
    hash_api_key,
    validate_api_key_format,
)

router = APIRouter(prefix="/api/v1", tags=["API v1"])


# ============== Schemas ==============


class AgentRegisterRequest(BaseModel):
    """Request to register a new agent."""

    name: str = Field(..., min_length=3, max_length=100)
    role: AgentRole | None = Field(default=AgentRole.TRADER)


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
    x_post_url: str | None = None  # Optional: URL to X post
    x_handle: str | None = None  # Optional: X handle


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
    trading_mode: str  # "manual" or "auto"
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
    description: str | None = Field(None, max_length=2000)
    category: MarketCategory = Field(default=MarketCategory.TECH)
    deadline: datetime


class MarketResponse(BaseModel):
    """Market information response."""

    id: UUID
    creator_id: UUID
    question: str
    description: str | None
    category: str
    status: str
    outcome: str | None
    yes_price: float
    no_price: float
    volume: float
    deadline: datetime
    created_at: datetime


class BetRequest(BaseModel):
    """Request to place a bet (order)."""

    side: Side  # YES or NO
    amount: int = Field(..., gt=0, description="Number of shares to buy")
    price: float | None = Field(
        None,
        ge=0.01,
        le=0.99,
        description="Limit price (0.01-0.99). If not provided, uses market price.",
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
    avg_yes_price: float | None
    avg_no_price: float | None
    market_status: str


class ResolveRequest(BaseModel):
    """Request to resolve a market."""

    outcome: Outcome  # YES or NO
    evidence: str | None = Field(None, max_length=2000)


# ============== Agent Endpoints ==============


@router.post("/agents/register", response_model=AgentRegisterResponse)
async def register_agent(data: AgentRegisterRequest, session: AsyncSession = Depends(get_session)):
    """
    Register a new agent and get API credentials.

    Returns an API key (shown only once!) and a claim URL for verification.
    The API key is inactive until verification is complete.
    """
    # Check if name exists
    result = await session.execute(select(Agent).where(Agent.name == data.name))
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
        api_key_created_at=datetime.utcnow(),
        claim_token=claim_token,
        is_verified=False,
    )
    session.add(agent)
    await session.commit()
    await session.refresh(agent)

    # Build claim URL using frontend URL from environment
    claim_url = f"{settings.FRONTEND_URL}/claim/{claim_token}"

    return AgentRegisterResponse(
        agent_id=agent.id,
        name=agent.name,
        role=agent.role.value,
        api_key=api_key,
        claim_url=claim_url,
        message="Save your API key! It will not be shown again. Complete verification at the claim URL to activate your account.",
    )


@router.post("/agents/verify", response_model=AgentVerifyResponse)
async def verify_agent(data: AgentVerifyRequest, session: AsyncSession = Depends(get_session)):
    """
    Verify agent ownership to activate API access.

    For now, verification is automatic when the claim token is provided.
    In production, this could verify an X post or other proof of ownership.
    """
    # Find agent by claim token
    result = await session.execute(select(Agent).where(Agent.claim_token == data.claim_token))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Invalid claim token")

    if agent.is_verified:
        return AgentVerifyResponse(
            verified=True, agent_id=agent.id, message="Agent already verified."
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
        message="Agent verified successfully! Your API key is now active.",
    )


@router.get("/agents/status", response_model=dict)
async def get_agent_status(
    api_key: str | None = Depends(get_api_key), session: AsyncSession = Depends(get_session)
):
    """
    Check agent verification status (for polling during registration).

    Agents can poll this endpoint to check if their account has been verified.
    Returns status without requiring full authentication.
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Missing API key. Include 'Authorization: Bearer mst_...' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not validate_api_key_format(api_key):
        raise HTTPException(
            status_code=401,
            detail="Invalid API key format.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Hash the provided key and look it up
    key_hash = hash_api_key(api_key)
    result = await session.execute(select(Agent).where(Agent.api_key_hash == key_hash))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=401, detail="Invalid API key.", headers={"WWW-Authenticate": "Bearer"}
        )

    return {
        "agent_id": str(agent.id),
        "name": agent.name,
        "is_verified": agent.is_verified,
        "status": "verified" if agent.is_verified else "pending",
        "verified_at": agent.verified_at.isoformat() if agent.verified_at else None,
        "x_handle": agent.x_handle,
        "message": "Agent verified and active"
        if agent.is_verified
        else "Verification pending. Complete verification at your claim URL.",
    }


@router.get("/agents/me", response_model=AgentInfoResponse)
async def get_current_agent_info(
    agent: Agent = Depends(get_current_agent), session: AsyncSession = Depends(get_session)
):
    """Get information about the authenticated agent."""
    await check_rate_limit(agent, session, "general")

    # Handle trading_mode - it can be an enum or a string from the database
    trading_mode_value = agent.trading_mode
    if hasattr(trading_mode_value, "value"):
        trading_mode_value = trading_mode_value.value

    return AgentInfoResponse(
        id=agent.id,
        name=agent.name,
        role=agent.role.value,
        trading_mode=trading_mode_value,
        balance=float(agent.balance),
        locked_balance=float(agent.locked_balance),
        available_balance=float(agent.available_balance),
        reputation=float(agent.reputation),
        is_verified=agent.is_verified,
        can_trade=agent.can_trade,
        can_resolve=agent.can_resolve,
    )


class ApiKeyInfoResponse(BaseModel):
    """API key information response (metadata only, never returns plain key)."""

    created_at: datetime | None
    last_used_at: datetime | None
    is_revoked: bool
    has_api_key: bool


@router.get("/agents/me/api-key", response_model=ApiKeyInfoResponse)
async def get_api_key_info(
    agent: Agent = Depends(get_current_agent), session: AsyncSession = Depends(get_session)
):
    """
    Get API key metadata (never returns the plain key for security).

    Returns information about when the key was created, last used, and if it's revoked.
    """
    await check_rate_limit(agent, session, "general")

    return ApiKeyInfoResponse(
        created_at=agent.api_key_created_at,
        last_used_at=agent.api_key_last_used_at,
        is_revoked=agent.api_key_revoked_at is not None,
        has_api_key=agent.api_key_hash is not None,
    )


class RegenerateApiKeyResponse(BaseModel):
    """Response after regenerating API key."""

    agent_id: UUID
    api_key: str  # Only shown once!
    message: str


@router.post("/agents/me/regenerate-api-key", response_model=RegenerateApiKeyResponse)
async def regenerate_api_key(
    agent: Agent = Depends(get_current_agent), session: AsyncSession = Depends(get_session)
):
    """
    Regenerate API key for the authenticated agent.

    This will:
    1. Revoke the current API key
    2. Generate a new API key
    3. Return the new key (shown only once!)

    The old key will immediately stop working.
    """
    await check_rate_limit(agent, session, "general")

    # Generate new API key first
    api_key, api_key_hash = generate_api_key()

    # Store old revoked_at to clear it if needed
    old_revoked_at = agent.api_key_revoked_at

    # Set new key first, then revoke old one
    agent.api_key_hash = api_key_hash
    agent.api_key_created_at = datetime.utcnow()
    agent.api_key_last_used_at = None  # Reset last used
    # Note: We don't set revoked_at here - the old key hash is replaced, so it's effectively revoked

    await session.commit()
    await session.refresh(agent)

    return RegenerateApiKeyResponse(
        agent_id=agent.id,
        api_key=api_key,
        message="Save your new API key! It will not be shown again. Your old key has been revoked.",
    )


# ============== Market Endpoints ==============


@router.get("/markets", response_model=list[MarketResponse])
async def list_markets(
    status: MarketStatus | None = Query(None),
    category: MarketCategory | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
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
            created_at=m.created_at,
        )
        for m in markets
    ]


@router.get("/markets/{market_id}", response_model=MarketResponse)
async def get_market(
    market_id: UUID,
    agent: Agent = Depends(get_current_agent),
    session: AsyncSession = Depends(get_session),
):
    """Get details of a specific market."""
    await check_rate_limit(agent, session, "general")

    result = await session.execute(select(Market).where(Market.id == market_id))
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
        created_at=market.created_at,
    )


@router.post("/markets", response_model=MarketResponse)
async def create_market(
    data: MarketCreateRequest,
    agent: Agent = Depends(get_current_trader),
    session: AsyncSession = Depends(get_session),
):
    """
    Create a new prediction market.

    Rate limit: 1 market per hour.
    Cost: Market creation fee (default 10 tokens).
    """
    await check_rate_limit(agent, session, "market")

    # Validate deadline
    # Normalize deadline to UTC-aware datetime for comparison
    if data.deadline.tzinfo is None:
        # If deadline is naive, assume it's UTC
        deadline_utc = data.deadline.replace(tzinfo=UTC)
    else:
        # If deadline is aware, convert to UTC
        deadline_utc = data.deadline.astimezone(UTC)

    now_utc = datetime.now(UTC)
    if deadline_utc <= now_utc:
        raise HTTPException(status_code=400, detail="Deadline must be in the future")

    # Check balance for creation fee
    creation_fee = settings.MARKET_CREATION_FEE
    if agent.available_balance < creation_fee:
        raise HTTPException(
            status_code=400, detail=f"Insufficient balance for creation fee ({creation_fee} tokens)"
        )

    # Deduct fee
    agent.balance -= creation_fee

    # Create market
    market = Market(
        creator_id=agent.id,
        question=data.question,
        description=data.description,
        category=data.category,
        deadline=data.deadline,
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
        created_at=market.created_at,
    )


# ============== Betting Endpoints ==============


@router.post("/markets/{market_id}/bets", response_model=BetResponse)
async def place_bet(
    market_id: UUID,
    data: BetRequest,
    agent: Agent = Depends(get_current_trader),
    session: AsyncSession = Depends(get_session),
):
    """
    Place a bet on a market.

    Rate limit: 10 bets per minute.
    """
    await check_rate_limit(agent, session, "order")

    # Get market
    result = await session.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    if market.status != MarketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Market is not open for trading")

    # Check if deadline has passed - normalize to UTC for comparison
    if market.deadline.tzinfo is None:
        # If deadline is naive, assume it's UTC
        deadline_utc = market.deadline.replace(tzinfo=UTC)
    else:
        # If deadline is aware, convert to UTC
        deadline_utc = market.deadline.astimezone(UTC)

    now_utc = datetime.now(UTC)
    if deadline_utc <= now_utc:
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
            detail=f"Insufficient balance. Need {cost}, have {agent.available_balance}",
        )

    # Lock balance
    agent.locked_balance += cost

    # Create order
    order = Order(
        agent_id=agent.id, market_id=market_id, side=data.side, price=price, size=data.amount
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
        trades_executed=len(trades),
    )


@router.get("/positions", response_model=list[PositionResponse])
async def get_positions(
    agent: Agent = Depends(get_current_agent), session: AsyncSession = Depends(get_session)
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
        positions.append(
            PositionResponse(
                market_id=position.market_id,
                question=market.question,
                yes_shares=position.yes_shares,
                no_shares=position.no_shares,
                avg_yes_price=float(position.avg_yes_price) if position.avg_yes_price else None,
                avg_no_price=float(position.avg_no_price) if position.avg_no_price else None,
                market_status=market.status.value,
            )
        )

    return positions


# ============== Resolution Endpoints ==============


@router.post("/markets/{market_id}/resolve")
async def resolve_market_endpoint(
    market_id: UUID,
    data: ResolveRequest,
    agent: Agent = Depends(get_current_moderator),
    session: AsyncSession = Depends(get_session),
):
    """
    Resolve a market with the final outcome.

    Only moderator agents can resolve markets.
    """
    await check_rate_limit(agent, session, "general")

    try:
        resolution = await resolve_market(session, market_id, data.outcome, agent.id, data.evidence)
        await session.commit()
        return resolution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
