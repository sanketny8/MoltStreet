from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


def get_future_deadline() -> str:
    """Get a valid ISO format deadline string for 1 day in the future."""
    return (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()


@pytest.mark.asyncio
async def test_place_order(client: AsyncClient):
    """Test placing an order."""
    # Create agent
    agent_response = await client.post("/agents", json={"name": "order-placer"})
    agent_id = agent_response.json()["id"]

    # Create market
    deadline = get_future_deadline()
    market_response = await client.post("/markets", json={
        "creator_id": agent_id,
        "question": "Test market for orders",
        "deadline": deadline
    })
    market_id = market_response.json()["id"]

    # Place order
    response = await client.post("/orders", json={
        "agent_id": agent_id,
        "market_id": market_id,
        "side": "YES",
        "price": 0.55,
        "size": 10
    })

    assert response.status_code == 200
    data = response.json()
    assert data["order"]["side"] == "YES"
    assert float(data["order"]["price"]) == 0.55
    assert data["order"]["size"] == 10
    assert data["order"]["filled"] == 0  # No matching orders


@pytest.mark.asyncio
async def test_order_matching(client: AsyncClient):
    """Test that opposite orders match."""
    # Create two agents
    agent1_response = await client.post("/agents", json={"name": "buyer-agent"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "seller-agent"})
    agent2_id = agent2_response.json()["id"]

    # Create market (by agent1)
    deadline = get_future_deadline()
    market_response = await client.post("/markets", json={
        "creator_id": agent1_id,
        "question": "Test matching market",
        "deadline": deadline
    })
    market_id = market_response.json()["id"]

    # Agent1 places YES order @ 0.60
    await client.post("/orders", json={
        "agent_id": agent1_id,
        "market_id": market_id,
        "side": "YES",
        "price": 0.60,
        "size": 10
    })

    # Agent2 places NO order @ 0.40 (matches because 0.60 + 0.40 = 1.0)
    response = await client.post("/orders", json={
        "agent_id": agent2_id,
        "market_id": market_id,
        "side": "NO",
        "price": 0.40,
        "size": 10
    })

    assert response.status_code == 200
    data = response.json()
    assert len(data["trades"]) == 1
    assert data["trades"][0]["size"] == 10


@pytest.mark.asyncio
async def test_insufficient_balance_order(client: AsyncClient):
    """Test order fails with insufficient balance."""
    # Create agent
    agent_response = await client.post("/agents", json={"name": "poor-trader"})
    agent_id = agent_response.json()["id"]

    # Create market
    deadline = get_future_deadline()
    market_response = await client.post("/markets", json={
        "creator_id": agent_id,
        "question": "Test insufficient balance market",
        "deadline": deadline
    })
    market_id = market_response.json()["id"]

    # Try to place huge order
    response = await client.post("/orders", json={
        "agent_id": agent_id,
        "market_id": market_id,
        "side": "YES",
        "price": 0.99,
        "size": 10000  # Way too big
    })

    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]


@pytest.mark.asyncio
async def test_cancel_order(client: AsyncClient):
    """Test cancelling an order."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "cancel-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post("/markets", json={
        "creator_id": agent_id,
        "question": "Test cancel market",
        "deadline": deadline
    })
    market_id = market_response.json()["id"]

    # Place order
    order_response = await client.post("/orders", json={
        "agent_id": agent_id,
        "market_id": market_id,
        "side": "YES",
        "price": 0.50,
        "size": 10
    })
    order_id = order_response.json()["order"]["id"]

    # Cancel order
    response = await client.delete(f"/orders/{order_id}?agent_id={agent_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cancelled"
    assert float(data["refunded"]) == 5.0  # 0.50 * 10
