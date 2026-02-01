"""
Market resolution and settlement tests.

Tests the complete lifecycle of market resolution including:
- Resolving markets with YES/NO outcomes (only moderators can resolve)
- Paying out winners
- Refunding open orders
- Reputation updates
- Role-based access control
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


def get_future_deadline(days: int = 1) -> str:
    """Get a valid ISO format deadline string."""
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


# =============================================================================
# MODERATOR ROLE TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_only_moderator_can_resolve(client: AsyncClient):
    """Test that only moderator agents can resolve markets."""
    # Create a trader agent (default role)
    trader_response = await client.post("/agents", json={"name": "trader-cannot-resolve"})
    trader_id = trader_response.json()["id"]
    assert trader_response.json()["role"] == "trader"
    assert trader_response.json()["can_resolve"] is False

    # Create a moderator agent
    moderator_response = await client.post(
        "/agents", json={"name": "moderator-can-resolve", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]
    assert moderator_response.json()["role"] == "moderator"
    assert moderator_response.json()["can_resolve"] is True

    # Create market (trader can create markets)
    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Who can resolve this market?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Trader tries to resolve - should fail
    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": trader_id, "outcome": "YES"}
    )
    assert response.status_code == 403
    assert "moderator" in response.json()["detail"].lower()

    # Moderator resolves - should succeed
    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_moderator_cannot_trade(client: AsyncClient):
    """Test that moderator agents cannot place orders."""
    # Create a trader to make a market
    trader_response = await client.post("/agents", json={"name": "market-maker-trader"})
    trader_id = trader_response.json()["id"]

    # Create a moderator
    moderator_response = await client.post(
        "/agents", json={"name": "moderator-no-trade", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]
    assert moderator_response.json()["can_trade"] is False

    # Create market
    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": trader_id, "question": "Can moderators trade?", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Moderator tries to place order - should fail
    response = await client.post(
        "/orders",
        json={
            "agent_id": moderator_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )
    assert response.status_code == 403
    assert "moderator" in response.json()["detail"].lower()

    # Trader can place order - should succeed
    response = await client.post(
        "/orders",
        json={
            "agent_id": trader_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )
    assert response.status_code == 200


# =============================================================================
# MARKET RESOLUTION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_resolve_market_yes(client: AsyncClient):
    """Test resolving a market with YES outcome."""
    # Create trader and moderator
    trader_response = await client.post("/agents", json={"name": "trader-yes"})
    trader_id = trader_response.json()["id"]

    moderator_response = await client.post(
        "/agents", json={"name": "moderator-yes", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    # Create market
    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Will this resolve to YES?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Resolve market
    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["outcome"] == "YES"
    assert data["resolved_by"] == moderator_id
    assert "resolved_at" in data

    # Verify market status
    market = await client.get(f"/markets/{market_id}")
    assert market.json()["status"] == "resolved"
    assert market.json()["outcome"] == "YES"
    assert market.json()["resolved_by"] == moderator_id


@pytest.mark.asyncio
async def test_resolve_market_no(client: AsyncClient):
    """Test resolving a market with NO outcome."""
    trader_response = await client.post("/agents", json={"name": "trader-no"})
    trader_id = trader_response.json()["id"]

    moderator_response = await client.post(
        "/agents", json={"name": "moderator-no", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Will this resolve to NO?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "NO"}
    )

    assert response.status_code == 200
    assert response.json()["outcome"] == "NO"


@pytest.mark.asyncio
async def test_resolve_with_evidence(client: AsyncClient):
    """Test resolving a market with evidence/reasoning."""
    trader_response = await client.post("/agents", json={"name": "trader-evidence"})
    trader_id = trader_response.json()["id"]

    moderator_response = await client.post(
        "/agents", json={"name": "moderator-evidence", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Testing evidence storage",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    evidence_text = "Based on official announcement from source X on 2024-01-15"
    response = await client.post(
        f"/markets/{market_id}/resolve",
        json={"moderator_id": moderator_id, "outcome": "YES", "evidence": evidence_text},
    )

    assert response.status_code == 200
    assert response.json()["evidence"] == evidence_text

    # Verify evidence stored in market
    market = await client.get(f"/markets/{market_id}")
    assert market.json()["resolution_evidence"] == evidence_text


@pytest.mark.asyncio
async def test_resolve_already_resolved_market(client: AsyncClient):
    """Test that resolving an already resolved market fails."""
    trader_response = await client.post("/agents", json={"name": "trader-double"})
    trader_id = trader_response.json()["id"]

    moderator_response = await client.post(
        "/agents", json={"name": "moderator-double", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Can this be resolved twice?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # First resolution
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Second resolution should fail
    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "NO"}
    )

    assert response.status_code == 400
    assert "already resolved" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_resolve_nonexistent_market(client: AsyncClient):
    """Test resolving a non-existent market fails."""
    moderator_response = await client.post(
        "/agents", json={"name": "moderator-ghost", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    response = await client.post(
        "/markets/00000000-0000-0000-0000-000000000000/resolve",
        json={"moderator_id": moderator_id, "outcome": "YES"},
    )

    assert response.status_code == 400  # Market not found in resolve_market


@pytest.mark.asyncio
async def test_resolve_with_nonexistent_moderator(client: AsyncClient):
    """Test resolving with non-existent moderator fails."""
    trader_response = await client.post("/agents", json={"name": "market-creator-no-mod"})
    trader_id = trader_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Who will resolve this market?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    response = await client.post(
        f"/markets/{market_id}/resolve",
        json={"moderator_id": "00000000-0000-0000-0000-000000000000", "outcome": "YES"},
    )

    assert response.status_code == 404
    assert "moderator" in response.json()["detail"].lower()


# =============================================================================
# PAYOUT TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_yes_winners_get_payout(client: AsyncClient):
    """Test YES position holders get paid when market resolves YES."""
    # Create agents
    moderator_response = await client.post(
        "/agents", json={"name": "payout-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    buyer_response = await client.post("/agents", json={"name": "yes-winner"})
    buyer_id = buyer_response.json()["id"]

    seller_response = await client.post("/agents", json={"name": "yes-loser"})
    seller_id = seller_response.json()["id"]

    # Create market (using buyer as creator since moderator can't have positions)
    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": buyer_id, "question": "Will YES holders win?", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Trade: buyer gets 10 YES shares at 0.60
    await client.post(
        "/orders",
        json={
            "agent_id": buyer_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": seller_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Get buyer balance before resolution
    buyer_before = await client.get(f"/agents/{buyer_id}")
    balance_before = float(buyer_before.json()["balance"])

    # Resolve YES
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Check buyer got payout (10 shares * 1.0 = 10.0, minus settlement fee on profit)
    buyer_after = await client.get(f"/agents/{buyer_id}")
    balance_after = float(buyer_after.json()["balance"])

    # Buyer should have gained approximately 10.0 (payout minus small settlement fee on profit)
    # Profit = 10 * (1.0 - 0.60) = 4.0, Settlement fee = 4.0 * 0.02 = 0.08
    # Net payout = 10.0 - 0.08 = 9.92
    assert balance_after > balance_before  # Winner got paid
    assert balance_after >= balance_before + 9.5  # Got most of payout


@pytest.mark.asyncio
async def test_no_winners_get_payout(client: AsyncClient):
    """Test NO position holders get paid when market resolves NO."""
    moderator_response = await client.post(
        "/agents", json={"name": "no-payout-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    buyer_response = await client.post("/agents", json={"name": "no-winner"})
    buyer_id = buyer_response.json()["id"]

    seller_response = await client.post("/agents", json={"name": "no-loser"})
    seller_id = seller_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": buyer_id, "question": "Will NO holders win?", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Trade: buyer gets YES, seller gets NO
    await client.post(
        "/orders",
        json={
            "agent_id": buyer_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": seller_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Get seller balance before resolution
    seller_before = await client.get(f"/agents/{seller_id}")
    balance_before = float(seller_before.json()["balance"])

    # Resolve NO
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "NO"}
    )

    # Check seller got payout (10 NO shares * 1.0 = 10.0, minus settlement fee on profit)
    seller_after = await client.get(f"/agents/{seller_id}")
    balance_after = float(seller_after.json()["balance"])

    # Seller should have gained approximately 10.0 (payout minus small settlement fee on profit)
    # Profit = 10 * (1.0 - 0.40) = 6.0, Settlement fee = 6.0 * 0.02 = 0.12
    # Net payout = 10.0 - 0.12 = 9.88
    assert balance_after > balance_before  # Winner got paid
    assert balance_after >= balance_before + 9.5  # Got most of payout


@pytest.mark.asyncio
async def test_losers_get_nothing(client: AsyncClient):
    """Test losing position holders get no payout."""
    moderator_response = await client.post(
        "/agents", json={"name": "loser-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    winner_response = await client.post("/agents", json={"name": "actual-winner"})
    winner_id = winner_response.json()["id"]

    loser_response = await client.post("/agents", json={"name": "actual-loser"})
    loser_id = loser_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": winner_id, "question": "Testing loser payouts", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Trade
    await client.post(
        "/orders",
        json={
            "agent_id": winner_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 10,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": loser_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 10,
        },
    )

    # Get loser balance before
    loser_before = await client.get(f"/agents/{loser_id}")
    balance_before = float(loser_before.json()["balance"])

    # Resolve YES (loser has NO)
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Loser balance should be unchanged (no payout for NO shares when YES wins)
    loser_after = await client.get(f"/agents/{loser_id}")
    balance_after = float(loser_after.json()["balance"])

    assert balance_after == balance_before


# =============================================================================
# OPEN ORDER REFUND TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_open_orders_refunded_on_resolution(client: AsyncClient):
    """Test that open orders are cancelled and refunded when market resolves."""
    moderator_response = await client.post(
        "/agents", json={"name": "refund-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    trader_response = await client.post("/agents", json={"name": "refund-trader"})
    trader_id = trader_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Will open orders be refunded?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Place order that won't match (no counterparty)
    await client.post(
        "/orders",
        json={
            "agent_id": trader_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 20,
        },
    )

    # Check locked balance
    trader_mid = await client.get(f"/agents/{trader_id}")
    assert float(trader_mid.json()["locked_balance"]) == 10.0  # 20 * 0.50

    # Resolve market
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Locked balance should be 0 (refunded)
    trader_after = await client.get(f"/agents/{trader_id}")
    assert float(trader_after.json()["locked_balance"]) == 0.0


@pytest.mark.asyncio
async def test_partial_orders_refunded_on_resolution(client: AsyncClient):
    """Test that partially filled orders are refunded for unfilled portion."""
    moderator_response = await client.post(
        "/agents", json={"name": "partial-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    buyer_response = await client.post("/agents", json={"name": "partial-buyer"})
    buyer_id = buyer_response.json()["id"]

    seller_response = await client.post("/agents", json={"name": "partial-seller"})
    seller_id = seller_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": buyer_id,
            "question": "Partial order refund test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Buyer places large order
    await client.post(
        "/orders",
        json={
            "agent_id": buyer_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 100,
        },
    )

    # Seller partially fills
    await client.post(
        "/orders",
        json={
            "agent_id": seller_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.40,
            "size": 30,
        },
    )

    # Buyer should have 70 * 0.60 = 42.0 still locked
    buyer_mid = await client.get(f"/agents/{buyer_id}")
    assert float(buyer_mid.json()["locked_balance"]) == 42.0

    # Resolve
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Locked should be 0
    buyer_after = await client.get(f"/agents/{buyer_id}")
    assert float(buyer_after.json()["locked_balance"]) == 0.0


# =============================================================================
# TRADING AFTER RESOLUTION TESTS
# =============================================================================


@pytest.mark.asyncio
async def test_cannot_trade_on_resolved_market(client: AsyncClient):
    """Test that trading is not allowed on resolved markets."""
    moderator_response = await client.post(
        "/agents", json={"name": "closed-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    trader_response = await client.post("/agents", json={"name": "late-trader"})
    trader_id = trader_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": trader_id,
            "question": "Can I trade after resolution?",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # Resolve market
    await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    # Try to place order
    response = await client.post(
        "/orders",
        json={
            "agent_id": trader_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.50,
            "size": 10,
        },
    )

    assert response.status_code == 400
    assert "closed" in response.json()["detail"].lower()


# =============================================================================
# COMPLEX SETTLEMENT SCENARIOS
# =============================================================================


@pytest.mark.asyncio
async def test_multiple_traders_settlement(client: AsyncClient):
    """Test settlement with multiple traders on both sides."""
    moderator_response = await client.post(
        "/agents", json={"name": "multi-settle-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    # Create 3 YES buyers
    yes_buyers = []
    for i in range(3):
        resp = await client.post("/agents", json={"name": f"yes-buyer-{i}"})
        yes_buyers.append(resp.json()["id"])

    # Create 2 NO buyers
    no_buyers = []
    for i in range(2):
        resp = await client.post("/agents", json={"name": f"no-buyer-{i}"})
        no_buyers.append(resp.json()["id"])

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={
            "creator_id": yes_buyers[0],
            "question": "Complex multi-trader settlement test",
            "deadline": deadline,
        },
    )
    market_id = market_response.json()["id"]

    # YES buyers place orders
    for buyer_id in yes_buyers:
        await client.post(
            "/orders",
            json={
                "agent_id": buyer_id,
                "market_id": market_id,
                "side": "YES",
                "price": 0.60,
                "size": 10,
            },
        )

    # NO buyers match some orders
    for buyer_id in no_buyers:
        await client.post(
            "/orders",
            json={
                "agent_id": buyer_id,
                "market_id": market_id,
                "side": "NO",
                "price": 0.40,
                "size": 15,
            },
        )

    # Get balances before resolution
    yes_balances_before = []
    for buyer_id in yes_buyers:
        resp = await client.get(f"/agents/{buyer_id}")
        yes_balances_before.append(float(resp.json()["balance"]))

    # Resolve YES
    resolution = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    assert resolution.status_code == 200
    assert resolution.json()["payouts"]["total_winners"] > 0

    # Verify YES holders got paid
    for i, buyer_id in enumerate(yes_buyers):
        resp = await client.get(f"/agents/{buyer_id}")
        new_balance = float(resp.json()["balance"])
        # Each should have increased (got payout for their YES shares)
        assert new_balance >= yes_balances_before[i]


@pytest.mark.asyncio
async def test_resolution_payout_summary(client: AsyncClient):
    """Test resolution returns accurate payout summary."""
    moderator_response = await client.post(
        "/agents", json={"name": "summary-moderator", "role": "moderator"}
    )
    moderator_id = moderator_response.json()["id"]

    buyer_response = await client.post("/agents", json={"name": "summary-buyer"})
    buyer_id = buyer_response.json()["id"]

    seller_response = await client.post("/agents", json={"name": "summary-seller"})
    seller_id = seller_response.json()["id"]

    deadline = get_future_deadline()
    market_response = await client.post(
        "/markets",
        json={"creator_id": buyer_id, "question": "Payout summary test", "deadline": deadline},
    )
    market_id = market_response.json()["id"]

    # Trade 50 shares
    await client.post(
        "/orders",
        json={
            "agent_id": buyer_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.70,
            "size": 50,
        },
    )

    await client.post(
        "/orders",
        json={
            "agent_id": seller_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.30,
            "size": 50,
        },
    )

    # Resolve YES
    response = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )

    data = response.json()
    assert data["payouts"]["total_winners"] == 1  # Only YES holder wins
    # Gross payout = 50 * 1.0 = 50.0, minus settlement fee on profit
    # Profit = 50 * (1.0 - 0.70) = 15.0, Settlement fee = 15.0 * 0.02 = 0.30
    # Net payout = 50.0 - 0.30 = 49.70
    assert data["payouts"]["total_payout"] >= 49.0  # Approximately 50 minus small fee
    assert data["payouts"]["total_payout"] <= 50.0
    assert "total_fees" in data["payouts"]  # Verify fees are tracked
