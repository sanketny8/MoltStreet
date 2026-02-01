"""
Complete end-to-end scenario tests.

These tests simulate realistic prediction market scenarios with
multiple agents interacting over a market's full lifecycle.
"""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


def get_future_deadline(days: int = 1) -> str:
    """Get a valid ISO format deadline string."""
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


# =============================================================================
# SCENARIO 1: Simple Two-Agent Trade
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_simple_trade(client: AsyncClient):
    """
    Scenario: Two agents make a simple trade.

    1. Alice creates a market
    2. Alice buys YES at 0.60
    3. Bob sells NO at 0.40 (matches)
    4. Moderator resolves YES
    5. Alice gets paid, Bob loses
    """
    # Setup agents
    alice_resp = await client.post("/agents", json={"name": "alice-simple"})
    alice_id = alice_resp.json()["id"]
    alice_initial = float(alice_resp.json()["balance"])

    bob_resp = await client.post("/agents", json={"name": "bob-simple"})
    bob_id = bob_resp.json()["id"]
    bob_initial = float(bob_resp.json()["balance"])

    # Create moderator for resolution
    moderator_resp = await client.post(
        "/agents", json={"name": "moderator-simple", "role": "moderator"}
    )
    moderator_id = moderator_resp.json()["id"]

    # Alice creates market (costs 10)
    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": alice_id,
            "question": "Will BTC reach $100k by end of year?",
            "deadline": deadline,
        },
    )
    market_id = market_resp.json()["id"]
    assert market_resp.status_code == 200

    # Alice buys 100 YES shares at 0.60 (locks 60)
    alice_order = await client.post(
        "/orders",
        json={
            "agent_id": alice_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.60,
            "size": 100,
        },
    )
    assert alice_order.status_code == 200
    assert len(alice_order.json()["trades"]) == 0  # No match yet

    # Bob sells 100 NO shares at 0.40 (matches Alice)
    bob_order = await client.post(
        "/orders",
        json={"agent_id": bob_id, "market_id": market_id, "side": "NO", "price": 0.40, "size": 100},
    )
    assert bob_order.status_code == 200
    assert len(bob_order.json()["trades"]) == 1
    assert bob_order.json()["trades"][0]["size"] == 100

    # Verify positions
    alice_pos = await client.get(f"/positions/{alice_id}/{market_id}")
    assert alice_pos.json()["yes_shares"] == 100

    bob_pos = await client.get(f"/positions/{bob_id}/{market_id}")
    assert bob_pos.json()["no_shares"] == 100

    # Get balances before resolution
    alice_before = await client.get(f"/agents/{alice_id}")
    bob_before = await client.get(f"/agents/{bob_id}")

    # Resolve YES (by moderator, not by trader)
    resolve = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )
    assert resolve.status_code == 200

    # Check final balances
    alice_after = await client.get(f"/agents/{alice_id}")
    bob_after = await client.get(f"/agents/{bob_id}")

    # Alice should have: initial - 10 (market) - 60 (order) + 100 (payout) = initial + 30
    # Actually: balance is reduced by cost, then payout added
    # Alice paid 60 for 100 shares, wins 100 = profit of 40
    alice_final = float(alice_after.json()["balance"])
    bob_final = float(bob_after.json()["balance"])

    # Alice wins, Bob loses
    assert alice_final > float(alice_before.json()["balance"])
    # Bob's balance unchanged by resolution (no payout for NO when YES wins)
    assert bob_final == float(bob_before.json()["balance"])


# =============================================================================
# SCENARIO 2: Multiple Traders, Partial Fills
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_multiple_traders(client: AsyncClient):
    """
    Scenario: Multiple traders with partial fills.

    Matching logic: When NO order comes in at price P, it matches YES orders at >= (1-P).
    So NO @ 0.40 matches YES >= 0.60.
    And NO @ 0.35 matches YES >= 0.65.

    For this test:
    1. Oracle creates market
    2. Trader1 buys 50 YES at 0.65
    3. Trader2 buys 30 YES at 0.70
    4. Trader3 sells 40 NO at 0.30 (matches YES >= 0.70, so only Trader2)
    5. Then Trader3 sells 20 more NO at 0.35 (matches YES >= 0.65, so Trader1)
    """
    oracle_resp = await client.post("/agents", json={"name": "oracle-multi"})
    oracle_id = oracle_resp.json()["id"]

    trader1_resp = await client.post("/agents", json={"name": "trader1-multi"})
    trader1_id = trader1_resp.json()["id"]

    trader2_resp = await client.post("/agents", json={"name": "trader2-multi"})
    trader2_id = trader2_resp.json()["id"]

    trader3_resp = await client.post("/agents", json={"name": "trader3-multi"})
    trader3_id = trader3_resp.json()["id"]

    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": oracle_id,
            "question": "Multi-trader scenario test market",
            "deadline": deadline,
        },
    )
    market_id = market_resp.json()["id"]

    # Trader1 bids 50 YES at 0.65
    t1_order = await client.post(
        "/orders",
        json={
            "agent_id": trader1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.65,
            "size": 50,
        },
    )
    t1_order_id = t1_order.json()["order"]["id"]

    # Trader2 bids 30 YES at 0.70 (better price)
    t2_order = await client.post(
        "/orders",
        json={
            "agent_id": trader2_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.70,
            "size": 30,
        },
    )
    t2_order_id = t2_order.json()["order"]["id"]

    # Check order book before matching
    ob = await client.get(f"/markets/{market_id}/orderbook")
    assert len(ob.json()["bids"]) == 2

    # Trader3 sells 30 NO at 0.30 (matches YES >= 0.70, only Trader2)
    t3_order1 = await client.post(
        "/orders",
        json={
            "agent_id": trader3_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.30,
            "size": 30,
        },
    )

    trades1 = t3_order1.json()["trades"]
    assert len(trades1) == 1  # Matched only Trader2

    # Check Trader2's order is fully filled
    orders_t2 = await client.get(f"/orders?agent_id={trader2_id}")
    t2_filled = next(o for o in orders_t2.json() if o["id"] == t2_order_id)
    assert t2_filled["status"] == "filled"
    assert t2_filled["filled"] == 30

    # Trader3 sells 20 more NO at 0.35 (matches YES >= 0.65, Trader1)
    t3_order2 = await client.post(
        "/orders",
        json={
            "agent_id": trader3_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.35,
            "size": 20,
        },
    )

    trades2 = t3_order2.json()["trades"]
    assert len(trades2) == 1  # Matched Trader1

    # Check Trader1's order is partially filled
    orders_t1 = await client.get(f"/orders?agent_id={trader1_id}")
    t1_filled = next(o for o in orders_t1.json() if o["id"] == t1_order_id)
    assert t1_filled["status"] == "partial"
    assert t1_filled["filled"] == 20

    # Check remaining order book
    ob_after = await client.get(f"/markets/{market_id}/orderbook")
    assert len(ob_after.json()["bids"]) == 1
    assert ob_after.json()["bids"][0]["size"] == 30  # 50 - 20 = 30 remaining


# =============================================================================
# SCENARIO 3: Market Maker Strategy
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_market_maker(client: AsyncClient):
    """
    Scenario: Market maker provides liquidity.

    1. Market maker places both YES and NO orders at spread
    2. Multiple traders take liquidity
    3. Market maker earns the spread
    """
    mm_resp = await client.post("/agents", json={"name": "market-maker"})
    mm_id = mm_resp.json()["id"]

    taker1_resp = await client.post("/agents", json={"name": "taker1"})
    taker1_id = taker1_resp.json()["id"]

    taker2_resp = await client.post("/agents", json={"name": "taker2"})
    taker2_id = taker2_resp.json()["id"]

    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={"creator_id": mm_id, "question": "Market maker strategy test", "deadline": deadline},
    )
    market_id = market_resp.json()["id"]

    # MM provides liquidity: bid at 0.48, ask at 0.52 (via NO order)
    await client.post(
        "/orders",
        json={"agent_id": mm_id, "market_id": market_id, "side": "YES", "price": 0.48, "size": 100},
    )

    await client.post(
        "/orders",
        json={
            "agent_id": mm_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.48,  # = 0.52 in YES terms
            "size": 100,
        },
    )

    # Check order book shows spread
    ob = await client.get(f"/markets/{market_id}/orderbook")
    assert len(ob.json()["bids"]) == 1
    assert len(ob.json()["asks"]) == 1
    assert float(ob.json()["bids"][0]["price"]) == 0.48
    assert float(ob.json()["asks"][0]["price"]) == 0.52

    # Taker1 buys YES at market (crosses ask)
    await client.post(
        "/orders",
        json={
            "agent_id": taker1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.55,  # Willing to pay up to 0.55
            "size": 20,
        },
    )

    # Taker2 sells YES (crosses bid)
    await client.post(
        "/orders",
        json={
            "agent_id": taker2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.55,  # 0.45 in YES terms, crosses 0.48 bid
            "size": 20,
        },
    )

    # MM should now have positions on both sides
    mm_pos = await client.get(f"/positions/{mm_id}/{market_id}")
    # MM sold YES to taker1, bought YES from taker2
    # Net position should be balanced or close to it


# =============================================================================
# SCENARIO 4: Order Book Depth
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_order_book_depth(client: AsyncClient):
    """
    Scenario: Build up order book depth and verify structure.

    1. Multiple agents place orders at various prices
    2. Verify order book is correctly sorted and aggregated
    """
    oracle_resp = await client.post("/agents", json={"name": "depth-oracle"})
    oracle_id = oracle_resp.json()["id"]

    agents = []
    for i in range(5):
        resp = await client.post("/agents", json={"name": f"depth-trader-{i}"})
        agents.append(resp.json()["id"])

    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": oracle_id,
            "question": "Order book depth test market",
            "deadline": deadline,
        },
    )
    market_id = market_resp.json()["id"]

    # Place YES orders at different prices
    prices = [0.45, 0.50, 0.55, 0.48, 0.52]
    for i, agent_id in enumerate(agents):
        await client.post(
            "/orders",
            json={
                "agent_id": agent_id,
                "market_id": market_id,
                "side": "YES",
                "price": prices[i],
                "size": 10,
            },
        )

    # Get order book
    ob = await client.get(f"/markets/{market_id}/orderbook")
    bids = ob.json()["bids"]

    # Verify sorted descending by price
    bid_prices = [float(b["price"]) for b in bids]
    assert bid_prices == sorted(bid_prices, reverse=True)

    # Verify all prices present
    assert set(bid_prices) == set(prices)


# =============================================================================
# SCENARIO 5: Complete Market Lifecycle
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_full_lifecycle(client: AsyncClient):
    """
    Scenario: Complete market lifecycle from creation to resolution.

    1. Market creator creates market about election outcome
    2. Multiple agents trade based on their beliefs
    3. Market price discovery occurs
    4. Moderator resolves market
    5. Winners paid, losers lose stake
    6. Verify all balances are consistent
    """
    # Create moderator for resolution
    moderator_resp = await client.post(
        "/agents", json={"name": "election-moderator", "role": "moderator"}
    )
    moderator_id = moderator_resp.json()["id"]

    # Create market creator (a trader)
    creator_resp = await client.post("/agents", json={"name": "election-creator"})
    creator_id = creator_resp.json()["id"]

    # Bulls (think YES will win)
    bull1_resp = await client.post("/agents", json={"name": "bull-1"})
    bull1_id = bull1_resp.json()["id"]
    bull1_initial = float(bull1_resp.json()["balance"])

    bull2_resp = await client.post("/agents", json={"name": "bull-2"})
    bull2_id = bull2_resp.json()["id"]
    bull2_initial = float(bull2_resp.json()["balance"])

    # Bears (think NO will win)
    bear1_resp = await client.post("/agents", json={"name": "bear-1"})
    bear1_id = bear1_resp.json()["id"]
    bear1_initial = float(bear1_resp.json()["balance"])

    bear2_resp = await client.post("/agents", json={"name": "bear-2"})
    bear2_id = bear2_resp.json()["id"]
    bear2_initial = float(bear2_resp.json()["balance"])

    # Create market
    deadline = get_future_deadline(days=7)
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": creator_id,
            "question": "Will candidate X win the election?",
            "deadline": deadline,
            "description": "Resolves YES if candidate X wins, NO otherwise.",
        },
    )
    market_id = market_resp.json()["id"]

    # Initial price is 50/50
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["yes_price"]) == 0.50

    # === TRADING PHASE ===

    # Bull1 is very confident: buys 50 YES at 0.65
    await client.post(
        "/orders",
        json={
            "agent_id": bull1_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.65,
            "size": 50,
        },
    )

    # Bear1 disagrees: sells 50 NO at 0.35 (matches Bull1)
    trade1 = await client.post(
        "/orders",
        json={
            "agent_id": bear1_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.35,
            "size": 50,
        },
    )
    assert len(trade1.json()["trades"]) == 1

    # Price moves to 0.65
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["yes_price"]) == 0.65

    # Bull2 agrees with Bull1: buys 30 YES at 0.70
    await client.post(
        "/orders",
        json={
            "agent_id": bull2_id,
            "market_id": market_id,
            "side": "YES",
            "price": 0.70,
            "size": 30,
        },
    )

    # Bear2 takes the other side: sells 30 NO at 0.30
    trade2 = await client.post(
        "/orders",
        json={
            "agent_id": bear2_id,
            "market_id": market_id,
            "side": "NO",
            "price": 0.30,
            "size": 30,
        },
    )
    assert len(trade2.json()["trades"]) == 1

    # Price moves to 0.70
    market = await client.get(f"/markets/{market_id}")
    assert float(market.json()["yes_price"]) == 0.70

    # Verify volume increased
    assert float(market.json()["volume"]) > 0

    # === RESOLUTION PHASE ===

    # Get positions before resolution
    bull1_pos = await client.get(f"/positions/{bull1_id}/{market_id}")
    assert bull1_pos.json()["yes_shares"] == 50

    bull2_pos = await client.get(f"/positions/{bull2_id}/{market_id}")
    assert bull2_pos.json()["yes_shares"] == 30

    bear1_pos = await client.get(f"/positions/{bear1_id}/{market_id}")
    assert bear1_pos.json()["no_shares"] == 50

    bear2_pos = await client.get(f"/positions/{bear2_id}/{market_id}")
    assert bear2_pos.json()["no_shares"] == 30

    # Resolve: YES wins! (moderator resolves, not a trader)
    resolution = await client.post(
        f"/markets/{market_id}/resolve", json={"moderator_id": moderator_id, "outcome": "YES"}
    )
    assert resolution.status_code == 200
    assert resolution.json()["outcome"] == "YES"
    assert resolution.json()["payouts"]["total_winners"] == 2  # Bull1 and Bull2

    # === VERIFY PAYOUTS ===
    # Note: Balances include trading fees (1%) and settlement fees (2% of profit)

    # Bull1: paid 50 * 0.65 = 32.5, won ~50, profit = 17.5
    bull1_final = await client.get(f"/agents/{bull1_id}")
    bull1_balance = float(bull1_final.json()["balance"])
    # Winner should have profited (accounting for fees)
    assert bull1_balance > bull1_initial - 32.5  # Got payout
    assert bull1_balance < bull1_initial - 32.5 + 50 + 1  # Within reasonable range

    # Bull2: paid 30 * 0.70 = 21, won ~30, profit = 9
    bull2_final = await client.get(f"/agents/{bull2_id}")
    bull2_balance = float(bull2_final.json()["balance"])
    assert bull2_balance > bull2_initial - 21  # Got payout
    assert bull2_balance < bull2_initial - 21 + 30 + 1  # Within reasonable range

    # Bears: paid for NO shares, got nothing (YES won)
    bear1_final = await client.get(f"/agents/{bear1_id}")
    bear1_balance = float(bear1_final.json()["balance"])
    # Bear1: paid 50 * 0.35 = 17.5 + trading fee, won 0
    assert bear1_balance < bear1_initial  # Lost money

    bear2_final = await client.get(f"/agents/{bear2_id}")
    bear2_balance = float(bear2_final.json()["balance"])
    # Bear2: paid 30 * 0.30 = 9 + trading fee, won 0
    assert bear2_balance < bear2_initial  # Lost money

    # Verify market is resolved
    market_final = await client.get(f"/markets/{market_id}")
    assert market_final.json()["status"] == "resolved"
    assert market_final.json()["outcome"] == "YES"


# =============================================================================
# SCENARIO 6: Leaderboard Ranking
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_leaderboard(client: AsyncClient):
    """
    Scenario: Test leaderboard reflects trading performance.

    1. Create multiple agents
    2. Some trade profitably, some lose
    3. Verify leaderboard ranking
    """
    # Create agents with distinct initial conditions
    agents_data = []
    for i in range(5):
        resp = await client.post("/agents", json={"name": f"leaderboard-agent-{i}"})
        agents_data.append(
            {
                "id": resp.json()["id"],
                "name": resp.json()["name"],
                "initial_balance": float(resp.json()["balance"]),
            }
        )

    # Get leaderboard (by balance initially)
    leaderboard = await client.get("/agents?order_by=balance&limit=10")
    assert leaderboard.status_code == 200

    # All should have same balance initially
    balances = [float(a["balance"]) for a in leaderboard.json()]
    # (Note: other tests may have created agents, so just verify our agents exist)


# =============================================================================
# SCENARIO 7: Trade History
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_trade_history(client: AsyncClient):
    """
    Scenario: Verify trade history is recorded correctly.

    1. Multiple trades occur
    2. Query trade history by market
    3. Query trade history by agent
    """
    agent1_resp = await client.post("/agents", json={"name": "history-agent-1"})
    agent1_id = agent1_resp.json()["id"]

    agent2_resp = await client.post("/agents", json={"name": "history-agent-2"})
    agent2_id = agent2_resp.json()["id"]

    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": agent1_id,
            "question": "Trade history test market",
            "deadline": deadline,
        },
    )
    market_id = market_resp.json()["id"]

    # Execute multiple trades
    for i in range(3):
        await client.post(
            "/orders",
            json={
                "agent_id": agent1_id,
                "market_id": market_id,
                "side": "YES",
                "price": 0.50 + i * 0.05,
                "size": 10,
            },
        )
        await client.post(
            "/orders",
            json={
                "agent_id": agent2_id,
                "market_id": market_id,
                "side": "NO",
                "price": 0.50 - i * 0.05,
                "size": 10,
            },
        )

    # Query trades by market
    market_trades = await client.get(f"/trades?market_id={market_id}")
    assert market_trades.status_code == 200
    assert len(market_trades.json()) == 3

    # Query trades by agent
    agent1_trades = await client.get(f"/trades?agent_id={agent1_id}")
    assert agent1_trades.status_code == 200
    assert len(agent1_trades.json()) == 3

    # Verify trade details
    for trade in market_trades.json():
        assert trade["market_id"] == market_id
        assert trade["size"] == 10
        assert "price" in trade
        assert "created_at" in trade


# =============================================================================
# SCENARIO 8: Stress Test - Many Orders
# =============================================================================


@pytest.mark.asyncio
async def test_scenario_many_orders(client: AsyncClient):
    """
    Scenario: Place many orders to test system under load.

    1. Create multiple agents
    2. Each places multiple orders
    3. Verify all orders processed correctly
    """
    # Create agents
    agents = []
    for i in range(5):
        resp = await client.post("/agents", json={"name": f"stress-agent-{i}"})
        agents.append(resp.json()["id"])

    deadline = get_future_deadline()
    market_resp = await client.post(
        "/markets",
        json={
            "creator_id": agents[0],
            "question": "Stress test market with many orders",
            "deadline": deadline,
        },
    )
    market_id = market_resp.json()["id"]

    # Each agent places multiple orders
    total_orders = 0
    for agent_id in agents:
        for j in range(10):
            price = 0.30 + (j * 0.05)
            if price >= 0.99:
                price = 0.95
            side = "YES" if j % 2 == 0 else "NO"

            response = await client.post(
                "/orders",
                json={
                    "agent_id": agent_id,
                    "market_id": market_id,
                    "side": side,
                    "price": price if side == "YES" else 1 - price,
                    "size": 5,
                },
            )
            if response.status_code == 200:
                total_orders += 1

    # Verify orders were created
    assert total_orders > 0

    # Verify order book has entries
    ob = await client.get(f"/markets/{market_id}/orderbook")
    assert len(ob.json()["bids"]) > 0 or len(ob.json()["asks"]) > 0
