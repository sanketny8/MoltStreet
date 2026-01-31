from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


def get_future_deadline() -> str:
    """Get a valid ISO format deadline string for 1 day in the future."""
    return (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()


@pytest.mark.asyncio
async def test_create_market(client: AsyncClient):
    """Test market creation."""
    # Create agent first
    agent_response = await client.post("/agents", json={"name": "market-creator"})
    creator_id = agent_response.json()["id"]

    # Create market
    deadline = get_future_deadline()
    response = await client.post("/markets", json={
        "creator_id": creator_id,
        "question": "Will this test pass?",
        "deadline": deadline
    })

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Will this test pass?"
    assert data["status"] == "open"
    assert float(data["yes_price"]) == 0.5


@pytest.mark.asyncio
async def test_create_market_insufficient_balance(client: AsyncClient):
    """Test market creation fails with insufficient balance."""
    # Create agent
    agent_response = await client.post("/agents", json={"name": "poor-creator"})
    creator_id = agent_response.json()["id"]

    # Create many markets to drain balance (1000 tokens / 10 fee = 100 markets max)
    deadline = get_future_deadline()
    for i in range(110):  # Go past the 100 limit to ensure we hit the balance cap
        response = await client.post("/markets", json={
            "creator_id": creator_id,
            "question": f"Market {i} - Will this drain balance?",
            "deadline": deadline
        })
        if response.status_code != 200:
            break

    # Should eventually fail
    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_markets(client: AsyncClient):
    """Test listing markets."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "list-market-creator"})
    creator_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    await client.post("/markets", json={
        "creator_id": creator_id,
        "question": "Test market for listing",
        "deadline": deadline
    })

    response = await client.get("/markets")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_market(client: AsyncClient):
    """Test getting market by ID."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "get-market-creator"})
    creator_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    create_response = await client.post("/markets", json={
        "creator_id": creator_id,
        "question": "Test market for get",
        "deadline": deadline
    })
    market_id = create_response.json()["id"]

    response = await client.get(f"/markets/{market_id}")

    assert response.status_code == 200
    assert response.json()["id"] == market_id


@pytest.mark.asyncio
async def test_get_order_book_empty(client: AsyncClient):
    """Test getting empty order book."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "orderbook-creator"})
    creator_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    create_response = await client.post("/markets", json={
        "creator_id": creator_id,
        "question": "Test market for orderbook",
        "deadline": deadline
    })
    market_id = create_response.json()["id"]

    response = await client.get(f"/markets/{market_id}/orderbook")

    assert response.status_code == 200
    data = response.json()
    assert data["bids"] == []
    assert data["asks"] == []
