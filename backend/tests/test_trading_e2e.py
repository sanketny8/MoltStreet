"""
End-to-end trading tests for MoltStreet prediction market.

Tests complete trading scenarios with multiple agents, order matching,
position tracking, and market resolution.
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


def get_future_deadline(days: int = 1) -> str:
    """Get a valid ISO format deadline string."""
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


# =============================================================================
# AGENT LIFECYCLE TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_agent_initial_balance(client: AsyncClient):
    """Verify new agents start with correct initial balance."""
    response = await client.post("/agents", json={"name": "balance-check-agent"})
    assert response.status_code == 200
    data = response.json()

    assert float(data["balance"]) == 1000.0
    assert float(data["locked_balance"]) == 0.0
    assert float(data["reputation"]) == 0.0


@pytest.mark.asyncio
async def test_agent_balance_after_market_creation(client: AsyncClient):
    """Verify agent balance decreases after creating a market."""
    # Create agent
    agent_response = await client.post("/agents", json={"name": "market-balance-agent"})
    agent_id = agent_response.json()["id"]
    initial_balance = float(agent_response.json()["balance"])

    # Create market (costs 10 tokens)
    deadline = get_future_deadline()
    await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Test market for balance check",
            "deadline": deadline,
        },
    )

    # Check balance decreased
    agent_check = await client.get(f"/agents/{agent_id}")
    new_balance = float(agent_check.json()["balance"])

    assert new_balance == initial_balance - 10.0


@pytest.mark.asyncio
async def test_agent_locked_balance_after_order(client: AsyncClient):
    """Verify agent locked_balance increases after placing an order."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "locked-balance-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Test market for locked balance",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Place order: 10 shares @ 0.50 = 5.0 locked
    await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    # Check locked balance
    agent_check = await client.get(f"/agents/{agent_id}")
    assert float(agent_check.json()["locked_balance"]) == 5.0


# =============================================================================
# MARKET VALIDATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_create_market_past_deadline(client: AsyncClient):
    """Verify market creation fails with past deadline."""
    agent_response = await client.post("/agents", json={"name": "past-deadline-agent"})
    agent_id = agent_response.json()["id"]

    # Use past deadline
    past_deadline = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "This should fail - past deadline",
            "deadline": past_deadline,
        },
    )

    assert response.status_code == 400
    assert "future" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_market_short_question(client: AsyncClient):
    """Verify market creation fails with too short question."""
    agent_response = await client.post("/agents", json={"name": "short-q-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Short?",  # Less than 10 chars
            "deadline": deadline,
        },
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_create_market_nonexistent_creator(client: AsyncClient):
    """Verify market creation fails with non-existent creator."""
    deadline = get_future_deadline()
    response = await client.post(
        "/markets",
        json={
            "creator_id": "00000000-0000-0000-0000-000000000000",
            "question": "This should fail - creator not found",
            "deadline": deadline,
        },
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_markets_with_status_filter(client: AsyncClient):
    """Test listing markets with status filter."""
    # Create agent and market
    agent_response = await client.post("/agents", json={"name": "filter-test-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for status filter test",
            "deadline": deadline,
        },
    )

    # List only open markets
    response = await client.get("/markets?status=open")
    assert response.status_code == 200
    data = response.json()
    assert all(m["status"] == "open" for m in data)


# =============================================================================
# ORDER VALIDATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_order_price_too_low(client: AsyncClient):
    """Verify order fails with price below 0.01."""
    agent_response = await client.post("/agents", json={"name": "low-price-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for low price test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    response = await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.001,  # Too low
            "size": 10,
        },
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_order_price_too_high(client: AsyncClient):
    """Verify order fails with price above 0.99."""
    agent_response = await client.post("/agents", json={"name": "high-price-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for high price test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    response = await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "YES",
            "price": 1.00,  # Too high
            "size": 10,
        },
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_order_on_nonexistent_market(client: AsyncClient):
    """Verify order fails on non-existent market."""
    agent_response = await client.post("/agents", json={"name": "no-market-agent"})
    agent_id = agent_response.json()["id"]

    response = await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": "00000000-0000-0000-0000-000000000000",
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    assert response.status_code == 404
    assert "market" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_order_by_nonexistent_agent(client: AsyncClient):
    """Verify order fails with non-existent agent."""
    # Create a real agent to create market
    agent_response = await client.post("/agents", json={"name": "real-agent-for-order"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for nonexistent agent test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    response = await client.post(
        "/orders",
        json={
            "agent_id": "00000000-0000-0000-0000-000000000000",
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    assert response.status_code == 404
    assert "agent" in response.json()["detail"].lower()


# =============================================================================
# ORDER CANCELLATION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_cancel_order_refunds_balance(client: AsyncClient):
    """Verify cancelling order refunds locked balance."""
    agent_response = await client.post("/agents", json={"name": "cancel-refund-agent"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for cancel refund test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Check balance before order
    agent_before = await client.get(f"/agents/{agent_id}")
    locked_before = float(agent_before.json()["locked_balance"])

    # Place order
    order_response = await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )
    order_id = order_response.json()["order"]["id"]

    # Verify locked increased
    agent_mid = await client.get(f"/agents/{agent_id}")
    assert float(agent_mid.json()["locked_balance"]) == locked_before + 5.0

    # Cancel order
    await client.delete(f"/orders/{order_id}?agent_id={agent_id}")

    # Verify locked returned to original
    agent_after = await client.get(f"/agents/{agent_id}")
    assert float(agent_after.json()["locked_balance"]) == locked_before


@pytest.mark.asyncio
async def test_cancel_order_by_wrong_agent(client: AsyncClient):
    """Verify agent cannot cancel another agent's order."""
    # Create two agents
    agent1_response = await client.post("/agents", json={"name": "order-owner"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "order-thief"})
    agent2_id = agent2_response.json()["id"]

    # Create market and order by agent1
    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for wrong agent cancel test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    order_response = await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )
    order_id = order_response.json()["order"]["id"]

    # Try to cancel with agent2
    response = await client.delete(f"/orders/{order_id}?agent_id={agent2_id}")

    assert response.status_code == 403
    assert "not your" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cancel_nonexistent_order(client: AsyncClient):
    """Verify cancelling non-existent order fails."""
    agent_response = await client.post("/agents", json={"name": "cancel-nothing-agent"})
    agent_id = agent_response.json()["id"]

    response = await client.delete(
        f"/orders/00000000-0000-0000-0000-000000000000?agent_id={agent_id}"
    )

    assert response.status_code == 404


# =============================================================================
# ORDER MATCHING TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_no_self_trading(client: AsyncClient):
    """Verify agent cannot trade with themselves."""
    agent_response = await client.post("/agents", json={"name": "self-trader"})
    agent_id = agent_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent_id,
            "question": "Market for self-trade test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Place YES order
    await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    # Place matching NO order from same agent
    response = await client.post(
        "/orders",
        json={
            "agent_id": agent_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Order should succeed but no trades
    assert response.status_code == 200
    data = response.json()
    assert len(data["trades"]) == 0


@pytest.mark.asyncio
async def test_partial_order_fill(client: AsyncClient):
    """Test partial order filling when sizes don't match."""
    # Create two agents
    agent1_response = await client.post("/agents", json={"name": "big-buyer"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "small-seller"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for partial fill test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Agent1 places large YES order
    order1_response = await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 100,
        },
    )

    # Agent2 places smaller matching NO order
    order2_response = await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 30,
        },
    )

    # Check trade occurred for 30 shares
    assert len(order2_response.json()["trades"]) == 1
    assert order2_response.json()["trades"][0]["size"] == 30

    # Check order1 is partial, order2 is filled
    assert order2_response.json()["order"]["status"] == "filled"

    # Verify agent1's order is partial
    orders = await client.get(f"/orders?agent_id={agent1_id}")
    agent1_order = next(
        o for o in orders.json() if o["id"] == order1_response.json()["order"]["id"]
    )
    assert agent1_order["status"] == "partial"
    assert agent1_order["filled"] == 30


@pytest.mark.asyncio
async def test_multiple_order_matching(client: AsyncClient):
    """Test matching against multiple orders."""
    # Create three agents
    agent1_response = await client.post("/agents", json={"name": "multi-buyer-1"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "multi-buyer-2"})
    agent2_id = agent2_response.json()["id"]

    agent3_response = await client.post("/agents", json={"name": "multi-seller"})
    agent3_id = agent3_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for multi-match test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Two YES orders at same price
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 20,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 20,
        },
    )

    # Large NO order that matches both
    response = await client.post(
        "/orders",
        json={
            "agent_id": agent3_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 40,
        },
    )

    # Should have 2 trades
    assert len(response.json()["trades"]) == 2
    total_traded = sum(t["size"] for t in response.json()["trades"])
    assert total_traded == 40


@pytest.mark.asyncio
async def test_price_priority_matching(client: AsyncClient):
    """Test that better prices get matched first."""
    # Create agents
    agent1_response = await client.post("/agents", json={"name": "low-bidder"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "high-bidder"})
    agent2_id = agent2_response.json()["id"]

    agent3_response = await client.post("/agents", json={"name": "seller-priority"})
    agent3_id = agent3_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for price priority test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Agent1 places YES order at 0.55
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.55,
            "size": 10,
        },
    )

    # Agent2 places YES order at higher price 0.60
    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    # Agent3 places NO order - should match agent2 first (better price)
    response = await client.post(
        "/orders",
        json={
            "agent_id": agent3_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Trade should be at 0.60 (agent2's price)
    assert len(response.json()["trades"]) == 1
    assert float(response.json()["trades"][0]["price"]) == 0.60


# =============================================================================
# POSITION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_position_created_after_trade(client: AsyncClient):
    """Verify positions are created after a trade."""
    agent1_response = await client.post("/agents", json={"name": "pos-buyer"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "pos-seller"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for position creation test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Create matching orders
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Check positions
    pos1 = await client.get(f"/positions/{agent1_id}/{market_id}")
    assert pos1.status_code == 200
    assert pos1.json()["yes_shares"] == 10

    pos2 = await client.get(f"/positions/{agent2_id}/{market_id}")
    assert pos2.status_code == 200
    assert pos2.json()["no_shares"] == 10


@pytest.mark.asyncio
async def test_position_average_price(client: AsyncClient):
    """Verify average price calculation with multiple trades."""
    agent1_response = await client.post("/agents", json={"name": "avg-buyer"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "avg-seller-1"})
    agent2_id = agent2_response.json()["id"]

    agent3_response = await client.post("/agents", json={"name": "avg-seller-2"})
    agent3_id = agent3_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for average price test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Agent1 buys 10 shares at 0.50
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )
    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.50,
            "size": 10,
        },
    )

    # Agent1 buys 10 more shares at 0.60
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )
    await client.post(
        "/orders",
        json={
            "agent_id": agent3_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Check average price: (10 * 0.50 + 10 * 0.60) / 20 = 0.55
    pos = await client.get(f"/positions/{agent1_id}/{market_id}")
    assert pos.json()["yes_shares"] == 20
    assert float(pos.json()["avg_yes_price"]) == 0.55


# =============================================================================
# ORDER BOOK TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_order_book_with_orders(client: AsyncClient):
    """Test order book reflects placed orders."""
    agent1_response = await client.post("/agents", json={"name": "ob-agent-1"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "ob-agent-2"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for order book test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Place YES orders (bids)
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    # Place NO orders (asks, converted to YES perspective)
    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,  # This means 0.60 in YES terms
            "size": 20,
        },
    )

    # Get order book
    ob_response = await client.get(f"/markets/{market_id}/orderbook")
    assert ob_response.status_code == 200
    ob = ob_response.json()

    # Check bids (YES orders)
    assert len(ob["bids"]) == 1
    assert float(ob["bids"][0]["price"]) == 0.50
    assert ob["bids"][0]["size"] == 10

    # Check asks (NO orders converted to YES perspective: 1 - 0.40 = 0.60)
    assert len(ob["asks"]) == 1
    assert float(ob["asks"][0]["price"]) == 0.60
    assert ob["asks"][0]["size"] == 20

    # Check spread information
    assert "best_bid" in ob
    assert "best_ask" in ob
    assert "spread" in ob
    assert "mid_price" in ob
    assert float(ob["best_bid"]) == 0.50
    assert float(ob["best_ask"]) == 0.60
    assert float(ob["spread"]) == 0.10  # 0.60 - 0.50
    assert float(ob["mid_price"]) == 0.55  # (0.50 + 0.60) / 2


@pytest.mark.asyncio
async def test_order_book_aggregates_same_price(client: AsyncClient):
    """Test order book aggregates orders at same price level."""
    agent1_response = await client.post("/agents", json={"name": "agg-agent-1"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "agg-agent-2"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for aggregation test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Multiple orders at same price
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 15,
        },
    )

    # Get order book
    ob_response = await client.get(f"/markets/{market_id}/orderbook")
    ob = ob_response.json()

    # Should be aggregated to one price level
    assert len(ob["bids"]) == 1
    assert float(ob["bids"][0]["price"]) == 0.50
    assert ob["bids"][0]["size"] == 25  # 10 + 15


# =============================================================================
# MARKET PRICE UPDATE TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_market_price_updates_after_trade(client: AsyncClient):
    """Verify market yes_price and no_price update after trades."""
    agent1_response = await client.post("/agents", json={"name": "price-buyer"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "price-seller"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Market for price update test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Initial price is 0.50
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["yes_price"]) == 0.50

    # Trade at 0.70
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.70,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.30,
            "size": 10,
        },
    )

    # Price should now be 0.70
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["yes_price"]) == 0.70
    assert float(market.json()["no_price"]) == 0.30


@pytest.mark.asyncio
async def test_market_volume_increases_after_trade(client: AsyncClient):
    """Verify market volume increases after trades."""
    agent1_response = await client.post("/agents", json={"name": "vol-buyer"})
    agent1_id = agent1_response.json()["id"]

    agent2_response = await client.post("/agents", json={"name": "vol-seller"})
    agent2_id = agent2_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": agent1_id, "question": "Market for volume test", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Initial volume is 0
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["volume"]) == 0.0

    # Trade: 10 shares at 0.60 = 6.0 volume
    await client.post(
        "/orders",
        json={
            "agent_id": agent1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": agent2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Volume should be 6.0 (10 * 0.60)
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["volume"]) == 6.0
