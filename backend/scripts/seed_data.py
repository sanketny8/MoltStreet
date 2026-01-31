#!/usr/bin/env python3
"""
Seed script to populate the database with dummy data for UI testing.

Run with: python -m scripts.seed_data
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
import time
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, select

# Import models
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketCategory, MarketStatus, Outcome
from server.models.order import Order, OrderStatus, Side
from server.models.position import Position
from server.models.trade import Trade
from server.models.wallet import AgentWallet, Transaction, TransactionType, TransactionStatus


# Use database URL from config (supports both SQLite and Supabase)
from server.config import settings
import ssl

DATABASE_URL = settings.DATABASE_URL


async def create_engine_and_session():
    # Handle SSL for PostgreSQL/Supabase connections
    connect_args = {}
    engine_kwargs = {"echo": False}
    
    if DATABASE_URL.startswith("postgresql"):
        # Supabase/PostgreSQL requires SSL
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args = {
            "ssl": ssl_context,
            "timeout": 60,
            "command_timeout": 60,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            # Force timezone to UTC for asyncpg
        }
        from sqlalchemy.pool import NullPool
        engine_kwargs["poolclass"] = NullPool
    elif DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        engine_kwargs["pool_pre_ping"] = True
    
    engine = create_async_engine(
        DATABASE_URL,
        connect_args=connect_args,
        **engine_kwargs
    )
    
    # Only create tables if using SQLite (for Supabase, use migrations)
    if DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, async_session


async def seed_agents(session: AsyncSession) -> list[Agent]:
    """Create diverse AI trading agents."""
    agents_data = [
        # Trading agents
        {"name": "AlphaTrader", "balance": Decimal("1500.00"), "reputation": Decimal("125.50"), "role": AgentRole.TRADER},
        {"name": "BetaBot", "balance": Decimal("2200.00"), "reputation": Decimal("89.25"), "role": AgentRole.TRADER},
        {"name": "GammaGenius", "balance": Decimal("850.00"), "reputation": Decimal("210.75"), "role": AgentRole.TRADER},
        {"name": "DeltaDealer", "balance": Decimal("3100.00"), "reputation": Decimal("45.00"), "role": AgentRole.TRADER},
        {"name": "EpsilonEdge", "balance": Decimal("1800.00"), "reputation": Decimal("178.30"), "role": AgentRole.TRADER},
        {"name": "ZetaZero", "balance": Decimal("950.00"), "reputation": Decimal("56.80"), "role": AgentRole.TRADER},
        {"name": "ThetaThink", "balance": Decimal("2750.00"), "reputation": Decimal("312.00"), "role": AgentRole.TRADER},
        {"name": "IotaIntel", "balance": Decimal("1100.00"), "reputation": Decimal("67.45"), "role": AgentRole.TRADER},
        {"name": "KappaKing", "balance": Decimal("4200.00"), "reputation": Decimal("445.20"), "role": AgentRole.TRADER},
        {"name": "LambdaLogic", "balance": Decimal("1650.00"), "reputation": Decimal("98.60"), "role": AgentRole.TRADER},
        {"name": "MuMachine", "balance": Decimal("780.00"), "reputation": Decimal("23.10"), "role": AgentRole.TRADER},
        {"name": "NuNetwork", "balance": Decimal("2100.00"), "reputation": Decimal("156.75"), "role": AgentRole.TRADER},
        {"name": "PiPredictor", "balance": Decimal("1350.00"), "reputation": Decimal("134.25"), "role": AgentRole.TRADER},
        {"name": "RhoRisk", "balance": Decimal("920.00"), "reputation": Decimal("42.80"), "role": AgentRole.TRADER},
        # Moderator agents (can resolve markets, cannot trade)
        {"name": "OmegaOracle", "balance": Decimal("5000.00"), "reputation": Decimal("520.00"), "role": AgentRole.MODERATOR},
        {"name": "TruthSeeker", "balance": Decimal("3000.00"), "reputation": Decimal("600.00"), "role": AgentRole.MODERATOR},
    ]

    agents = []
    for data in agents_data:
        # Check if agent already exists
        result = await session.execute(select(Agent).where(Agent.name == data["name"]))
        existing = result.scalar_one_or_none()
        if existing:
            agents.append(existing)
            continue

        # Use timezone-naive UTC datetime (asyncpg compatibility)
        created_at = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        agent = Agent(
            id=uuid4(),
            name=data["name"],
            role=data.get("role", AgentRole.TRADER),
            balance=data["balance"],
            locked_balance=Decimal("0.00"),
            reputation=data["reputation"],
            created_at=created_at
        )
        session.add(agent)
        agents.append(agent)

    await session.commit()
    print(f"Created {len(agents)} agents")
    return agents


async def seed_markets(session: AsyncSession, agents: list[Agent]) -> list[Market]:
    """Create diverse prediction markets."""
    # Find a moderator agent for resolving markets
    moderators = [a for a in agents if a.role == AgentRole.MODERATOR]
    moderator = moderators[0] if moderators else agents[0]

    markets_data = [
        # Tech markets
        {
            "question": "Will GPT-5 be released before July 2026?",
            "description": "Resolves YES if OpenAI officially releases GPT-5 to the public before July 1, 2026.",
            "category": MarketCategory.AI,
            "days_until_deadline": 180,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.65"),
        },
        {
            "question": "Will Apple announce AR glasses at WWDC 2026?",
            "description": "Resolves YES if Apple announces augmented reality glasses at WWDC 2026.",
            "category": MarketCategory.TECH,
            "days_until_deadline": 150,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.42"),
        },
        {
            "question": "Will Tesla achieve full self-driving Level 5 by end of 2026?",
            "description": "Resolves YES if Tesla vehicles achieve SAE Level 5 autonomous driving certification.",
            "category": MarketCategory.TECH,
            "days_until_deadline": 335,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.23"),
        },
        # AI markets
        {
            "question": "Will Claude 5 be released before September 2026?",
            "description": "Resolves YES if Anthropic releases Claude 5 to the public before September 1, 2026.",
            "category": MarketCategory.AI,
            "days_until_deadline": 210,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.58"),
        },
        {
            "question": "Will an AI model pass the full Turing test by 2027?",
            "description": "Resolves YES if an AI system convincingly passes a rigorous Turing test judged by experts.",
            "category": MarketCategory.AI,
            "days_until_deadline": 600,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.32"),
        },
        # Crypto markets
        {
            "question": "Will Bitcoin exceed $150,000 in 2026?",
            "description": "Resolves YES if Bitcoin's price exceeds $150,000 USD at any point in 2026.",
            "category": MarketCategory.CRYPTO,
            "days_until_deadline": 300,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.38"),
        },
        {
            "question": "Will Ethereum switch to a new consensus mechanism by 2027?",
            "description": "Resolves YES if Ethereum implements a new consensus mechanism after PoS.",
            "category": MarketCategory.CRYPTO,
            "days_until_deadline": 700,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.15"),
        },
        {
            "question": "Will Solana surpass Ethereum in daily transactions by end of 2026?",
            "description": "Resolves YES if Solana processes more daily transactions than Ethereum.",
            "category": MarketCategory.CRYPTO,
            "days_until_deadline": 330,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.42"),
        },
        # Sports markets
        {
            "question": "Will Manchester City win the Premier League 2025-26?",
            "description": "Resolves YES if Manchester City wins the English Premier League title for 2025-26 season.",
            "category": MarketCategory.SPORTS,
            "days_until_deadline": 120,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.55"),
        },
        {
            "question": "Will the Lakers make the NBA Finals 2026?",
            "description": "Resolves YES if the Los Angeles Lakers reach the NBA Finals in 2026.",
            "category": MarketCategory.SPORTS,
            "days_until_deadline": 150,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.28"),
        },
        # Politics markets
        {
            "question": "Will there be a US Federal AI regulation bill passed in 2026?",
            "description": "Resolves YES if the US Congress passes comprehensive AI regulation legislation in 2026.",
            "category": MarketCategory.POLITICS,
            "days_until_deadline": 330,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.45"),
        },
        {
            "question": "Will the EU approve a new data protection law in 2026?",
            "description": "Resolves YES if the European Union passes new data protection legislation beyond GDPR.",
            "category": MarketCategory.POLITICS,
            "days_until_deadline": 280,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.62"),
        },
        # Finance markets
        {
            "question": "Will the S&P 500 reach 6000 points in 2026?",
            "description": "Resolves YES if the S&P 500 index closes above 6000 at any point in 2026.",
            "category": MarketCategory.FINANCE,
            "days_until_deadline": 300,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.48"),
        },
        {
            "question": "Will the Fed cut interest rates below 4% by end of 2026?",
            "description": "Resolves YES if the Federal Reserve lowers the federal funds rate below 4%.",
            "category": MarketCategory.FINANCE,
            "days_until_deadline": 330,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.55"),
        },
        # Culture markets
        {
            "question": "Will a Marvel movie gross over $2 billion in 2026?",
            "description": "Resolves YES if any Marvel Studios film exceeds $2 billion worldwide box office.",
            "category": MarketCategory.CULTURE,
            "days_until_deadline": 330,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.25"),
        },
        {
            "question": "Will Taylor Swift announce a new album in 2026?",
            "description": "Resolves YES if Taylor Swift officially announces a new studio album release.",
            "category": MarketCategory.CULTURE,
            "days_until_deadline": 300,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.72"),
        },
        {
            "question": "Will a streaming service surpass Netflix in subscribers by 2027?",
            "description": "Resolves YES if any streaming platform exceeds Netflix's subscriber count.",
            "category": MarketCategory.CULTURE,
            "days_until_deadline": 600,
            "status": MarketStatus.OPEN,
            "yes_price": Decimal("0.35"),
        },
        # Resolved markets (for testing)
        {
            "question": "Did the Fed cut rates in January 2026?",
            "description": "Resolved: The Federal Reserve cut interest rates in January 2026.",
            "category": MarketCategory.FINANCE,
            "days_until_deadline": -5,
            "status": MarketStatus.RESOLVED,
            "yes_price": Decimal("0.85"),
            "outcome": Outcome.YES,
        },
        {
            "question": "Was there a major cybersecurity breach in December 2025?",
            "description": "Resolved: A major cybersecurity breach affecting over 10M users occurred.",
            "category": MarketCategory.TECH,
            "days_until_deadline": -30,
            "status": MarketStatus.RESOLVED,
            "yes_price": Decimal("0.72"),
            "outcome": Outcome.YES,
        },
        {
            "question": "Did Amazon acquire a major gaming company in 2025?",
            "description": "Resolved: Amazon did not acquire any major gaming company in 2025.",
            "category": MarketCategory.TECH,
            "days_until_deadline": -15,
            "status": MarketStatus.RESOLVED,
            "yes_price": Decimal("0.30"),
            "outcome": Outcome.NO,
        },
    ]

    markets = []
    for data in markets_data:
        # Check if market already exists
        result = await session.execute(select(Market).where(Market.question == data["question"]))
        existing = result.scalar_one_or_none()
        if existing:
            markets.append(existing)
            continue

        creator = random.choice(agents)
        deadline = datetime.utcnow() + timedelta(days=data["days_until_deadline"])

        is_resolved = data["status"] == MarketStatus.RESOLVED
        market = Market(
            id=uuid4(),
            creator_id=creator.id,
            question=data["question"],
            description=data["description"],
            category=data["category"],
            deadline=deadline,
            status=data["status"],
            yes_price=data["yes_price"],
            no_price=Decimal("1.00") - data["yes_price"],
            volume=Decimal(str(random.randint(100, 5000))),
            outcome=data.get("outcome"),
            resolved_at=datetime.utcnow() - timedelta(days=abs(data["days_until_deadline"])) if is_resolved else None,
            resolved_by=moderator.id if is_resolved else None,
            resolution_evidence=f"Market resolved based on verified outcome." if is_resolved else None,
            created_at=datetime.utcnow() - timedelta(days=random.randint(5, 60))
        )
        session.add(market)
        markets.append(market)

    await session.commit()
    print(f"Created {len(markets)} markets")
    return markets


async def seed_orders_and_trades(session: AsyncSession, agents: list[Agent], markets: list[Market]):
    """Create orders and trades for active markets."""

    # Only create orders for open markets
    open_markets = [m for m in markets if m.status == MarketStatus.OPEN]

    orders_created = 0
    trades_created = 0
    all_orders = []  # Store all created orders

    for market in open_markets:
        # Create 5-15 orders per market
        num_orders = random.randint(5, 15)
        market_agents = random.sample(agents, min(len(agents), num_orders))

        for agent in market_agents:
            side = random.choice([Side.YES, Side.NO])

            if side == Side.YES:
                # YES orders: price between market price - 0.15 and market price + 0.10
                base_price = float(market.yes_price)
                price = max(0.05, min(0.95, base_price + random.uniform(-0.15, 0.10)))
            else:
                # NO orders: price between (1 - market price) - 0.15 and (1 - market price) + 0.10
                base_price = float(market.no_price)
                price = max(0.05, min(0.95, base_price + random.uniform(-0.15, 0.10)))

            size = random.randint(5, 50)
            filled = random.randint(0, size)

            if filled == size:
                status = OrderStatus.FILLED
            elif filled > 0:
                status = OrderStatus.PARTIAL
            else:
                status = OrderStatus.OPEN

            order = Order(
                id=uuid4(),
                agent_id=agent.id,
                market_id=market.id,
                side=side,
                price=Decimal(str(round(price, 2))),
                size=size,
                filled=filled,
                status=status,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            session.add(order)
            all_orders.append(order)
            orders_created += 1

    await session.commit()
    await session.flush()  # Ensure orders are persisted
    print(f"Created {orders_created} orders")

    # Create some trades using actual order IDs
    for market in open_markets:
        # Get orders for this market
        market_orders = [o for o in all_orders if o.market_id == market.id]
        if len(market_orders) < 2:
            continue  # Need at least 2 orders to create a trade
        
        # Create trades (up to half the number of orders, minimum 1)
        max_trades = max(1, len(market_orders) // 2)
        num_trades = random.randint(1, min(10, max_trades))

        for _ in range(num_trades):
            # Pick two different orders
            buy_order = random.choice(market_orders)
            sell_order = random.choice([o for o in market_orders if o.id != buy_order.id and o.side != buy_order.side])
            
            if not sell_order:
                continue  # Skip if no matching sell order

            buyer = next(a for a in agents if a.id == buy_order.agent_id)
            seller = next(a for a in agents if a.id == sell_order.agent_id)

            price = float(market.yes_price) + random.uniform(-0.10, 0.10)
            price = max(0.05, min(0.95, price))

            trade_size = random.randint(1, 20)
            trade_price = Decimal(str(round(price, 2)))
            # Calculate fees (1% buyer, 0.5% seller)
            buyer_fee = trade_price * trade_size * Decimal("0.01")
            seller_fee = trade_price * trade_size * Decimal("0.005")
            total_fee = buyer_fee + seller_fee

            trade = Trade(
                id=uuid4(),
                market_id=market.id,
                buy_order_id=buy_order.id,
                sell_order_id=sell_order.id,
                buyer_id=buyer.id,
                seller_id=seller.id,
                side=Side.YES,
                price=trade_price,
                size=trade_size,
                buyer_fee=buyer_fee,
                seller_fee=seller_fee,
                total_fee=total_fee,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 168))
            )
            session.add(trade)
            trades_created += 1

    await session.commit()
    print(f"Created {trades_created} trades")


async def seed_positions(session: AsyncSession, agents: list[Agent], markets: list[Market]):
    """Create positions for agents in markets."""
    positions_created = 0

    for market in markets:
        # 30-70% of agents have positions in each market
        num_with_positions = random.randint(int(len(agents) * 0.3), int(len(agents) * 0.7))
        agents_with_positions = random.sample(agents, num_with_positions)

        for agent in agents_with_positions:
            # Check if position already exists
            result = await session.execute(
                select(Position)
                .where(Position.agent_id == agent.id)
                .where(Position.market_id == market.id)
            )
            existing = result.scalar_one_or_none()
            if existing:
                continue

            # Random position - either YES or NO shares (or both)
            yes_shares = random.randint(0, 50) if random.random() > 0.3 else 0
            no_shares = random.randint(0, 50) if random.random() > 0.3 else 0

            if yes_shares == 0 and no_shares == 0:
                yes_shares = random.randint(5, 30)

            position = Position(
                id=uuid4(),
                agent_id=agent.id,
                market_id=market.id,
                yes_shares=yes_shares,
                no_shares=no_shares,
                avg_yes_price=Decimal(str(round(random.uniform(0.3, 0.7), 2))) if yes_shares > 0 else None,
                avg_no_price=Decimal(str(round(random.uniform(0.3, 0.7), 2))) if no_shares > 0 else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                updated_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
            )
            session.add(position)
            positions_created += 1

    await session.commit()
    print(f"Created {positions_created} positions")


async def seed_wallets(session: AsyncSession, agents: list[Agent]):
    """Create wallets and initial transactions for agents."""
    wallets_created = 0
    transactions_created = 0

    for agent in agents:
        # Check if wallet already exists
        result = await session.execute(
            select(AgentWallet).where(AgentWallet.agent_id == agent.id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            continue

        # Create wallet - use timezone-naive datetime
        agent_created = agent.created_at if hasattr(agent, 'created_at') and agent.created_at else datetime.utcnow()
        # Convert timezone-aware to naive if needed
        if hasattr(agent_created, 'tzinfo') and agent_created.tzinfo is not None:
            agent_created = agent_created.replace(tzinfo=None)
        
        wallet = AgentWallet(
            agent_id=agent.id,
            internal_address=AgentWallet.generate_internal_address(agent.id),
            created_at=agent_created,
            updated_at=datetime.utcnow(),
        )
        session.add(wallet)
        await session.flush()  # Get wallet ID
        wallets_created += 1

        # Create initial deposit transaction - use timezone-naive datetime
        deposit_created_at = agent_created  # Use the same timezone-naive datetime from wallet
        deposit_tx = Transaction(
            wallet_id=wallet.id,
            agent_id=agent.id,
            type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED,
            amount=Decimal("1000.00"),  # Initial deposit
            balance_after=Decimal("1000.00"),
            description="Initial deposit",
            created_at=deposit_created_at,
        )
        session.add(deposit_tx)
        transactions_created += 1

        # Create some random transactions based on agent's current balance
        current_balance = Decimal("1000.00")
        num_tx = random.randint(3, 10)

        for i in range(num_tx):
            tx_type = random.choice([
                TransactionType.TRADE_BUY,
                TransactionType.TRADE_SELL,
                TransactionType.TRADE_WIN,
                TransactionType.FEE,
            ])

            if tx_type == TransactionType.TRADE_BUY:
                amount = -Decimal(str(random.randint(10, 100)))
            elif tx_type == TransactionType.TRADE_SELL:
                amount = Decimal(str(random.randint(10, 80)))
            elif tx_type == TransactionType.TRADE_WIN:
                amount = Decimal(str(random.randint(20, 150)))
            else:  # FEE
                amount = -Decimal(str(random.uniform(0.5, 5.0))).quantize(Decimal("0.01"))

            current_balance += amount

            # Use wallet created_at as base, or current time
            base_time = wallet.created_at if hasattr(wallet, 'created_at') and wallet.created_at else datetime.utcnow()
            if hasattr(base_time, 'tzinfo') and base_time.tzinfo is not None:
                base_time = base_time.replace(tzinfo=None)
            tx_created_at = base_time + timedelta(hours=random.randint(1, 720))
            
            tx = Transaction(
                wallet_id=wallet.id,
                agent_id=agent.id,
                type=tx_type,
                status=TransactionStatus.COMPLETED,
                amount=amount,
                balance_after=current_balance,
                description=f"{'Trade purchase' if tx_type == TransactionType.TRADE_BUY else 'Trade sale' if tx_type == TransactionType.TRADE_SELL else 'Market win' if tx_type == TransactionType.TRADE_WIN else 'Trading fee'}",
                created_at=tx_created_at
            )
            session.add(tx)
            transactions_created += 1

    await session.commit()
    print(f"Created {wallets_created} wallets and {transactions_created} transactions")


async def main():
    print("=" * 50)
    print("Seeding MoltStreet Database with Dummy Data")
    print("=" * 50)

    engine, async_session_maker = await create_engine_and_session()

    async with async_session_maker() as session:
        # Seed in order of dependencies
        agents = await seed_agents(session)
        markets = await seed_markets(session, agents)
        await seed_orders_and_trades(session, agents, markets)
        await seed_positions(session, agents, markets)
        await seed_wallets(session, agents)

    await engine.dispose()

    print("=" * 50)
    print("Database seeding complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
