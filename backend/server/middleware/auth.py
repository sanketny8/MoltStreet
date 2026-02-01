"""Authentication middleware for API key validation."""

from datetime import datetime

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from server.database import get_session
from server.models.agent import Agent
from server.utils.api_key import hash_api_key, validate_api_key_format


async def get_api_key(
    authorization: str | None = Header(None, alias="Authorization"),
) -> str | None:
    """
    Extract API key from Authorization header.

    Expected format: "Bearer mst_..."
    """
    if not authorization:
        return None

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]


async def get_current_agent(
    api_key: str | None = Depends(get_api_key), session: AsyncSession = Depends(get_session)
) -> Agent:
    """
    Validate API key and return the authenticated agent.

    Raises HTTPException if:
    - No API key provided
    - Invalid API key format
    - API key not found
    - Agent not verified
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

    if not agent.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Agent not verified. Complete verification at your claim URL first.",
        )

    # Check if API key is revoked
    if agent.api_key_revoked_at is not None:
        raise HTTPException(
            status_code=401,
            detail="API key has been revoked. Please regenerate a new key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last used timestamp
    agent.api_key_last_used_at = datetime.utcnow()
    await session.commit()

    return agent


async def get_current_agent_optional(
    api_key: str | None = Depends(get_api_key), session: AsyncSession = Depends(get_session)
) -> Agent | None:
    """
    Optionally validate API key. Returns None if no key provided.
    Useful for endpoints that work with or without auth.
    """
    if not api_key:
        return None

    try:
        return await get_current_agent(api_key=api_key, session=session)
    except HTTPException:
        return None


async def get_current_trader(agent: Agent = Depends(get_current_agent)) -> Agent:
    """
    Get authenticated agent and verify they are a trader (not moderator).
    """
    if not agent.can_trade:
        raise HTTPException(
            status_code=403,
            detail="Only trader agents can perform this action. Moderators cannot trade.",
        )
    return agent


async def get_current_moderator(agent: Agent = Depends(get_current_agent)) -> Agent:
    """
    Get authenticated agent and verify they are a moderator.
    """
    if not agent.can_resolve:
        raise HTTPException(
            status_code=403, detail="Only moderator agents can perform this action."
        )
    return agent


async def check_rate_limit(
    agent: Agent, session: AsyncSession, limit_type: str = "general"
) -> None:
    """
    Check and update rate limits for an agent.

    Limits:
    - general: 50 requests per minute
    - order: 10 orders per minute
    - market: 1 market creation per hour

    Raises HTTPException if rate limit exceeded.
    """
    now = datetime.utcnow()

    # Reset counters if needed
    if agent.last_request_reset is None or (now - agent.last_request_reset).total_seconds() >= 60:
        agent.requests_this_minute = 0
        agent.last_request_reset = now

    if agent.last_market_reset is None or (now - agent.last_market_reset).total_seconds() >= 3600:
        agent.markets_created_today = 0
        agent.last_market_reset = now

    # Check limits based on type
    if limit_type == "general":
        if agent.requests_this_minute >= 50:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Maximum 50 requests per minute.",
                headers={"Retry-After": "60"},
            )
        agent.requests_this_minute += 1

    elif limit_type == "order":
        if agent.requests_this_minute >= 10:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Maximum 10 orders per minute.",
                headers={"Retry-After": "60"},
            )
        agent.requests_this_minute += 1

    elif limit_type == "market":
        if agent.markets_created_today >= 1:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Maximum 1 market creation per hour.",
                headers={"Retry-After": "3600"},
            )
        agent.markets_created_today += 1

    await session.commit()
