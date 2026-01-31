#!/usr/bin/env python3
"""
Development database reset script.

This script:
1. Backs up the existing database (if any)
2. Deletes the database file
3. Recreates the database with the current model schema
4. Seeds it with dummy data

Run with: python -m scripts.reset_db

Use this when:
- Model changes add/remove columns
- Schema is out of sync with models
- You want a fresh database for testing
"""
import asyncio
import os
import shutil
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

# Import all models to register them with SQLModel.metadata
from server.models.agent import Agent, AgentRole
from server.models.market import Market, MarketStatus, Outcome
from server.models.order import Order, OrderStatus, Side
from server.models.position import Position
from server.models.trade import Trade

# Import seed functions
from scripts.seed_data import (
    seed_agents,
    seed_markets,
    seed_orders_and_trades,
    seed_positions,
)

# Database configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "moltstreet.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"


def backup_database():
    """Backup existing database if it exists."""
    if os.path.exists(DB_PATH):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_PATH}.backup_{timestamp}"
        shutil.copy2(DB_PATH, backup_path)
        print(f"Backed up existing database to: {backup_path}")
        return backup_path
    return None


def delete_database():
    """Delete the existing database file."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Deleted existing database: {DB_PATH}")


async def create_database():
    """Create fresh database with current model schema."""
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    print(f"Created new database with current schema: {DB_PATH}")
    return engine


async def seed_database(engine):
    """Seed the database with dummy data."""
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        agents = await seed_agents(session)
        markets = await seed_markets(session, agents)
        await seed_orders_and_trades(session, agents, markets)
        await seed_positions(session, agents, markets)

    await engine.dispose()


async def main():
    print("=" * 60)
    print("MoltStreet Database Reset")
    print("=" * 60)
    print()

    # Step 1: Backup existing database
    backup_database()

    # Step 2: Delete existing database
    delete_database()

    # Step 3: Create new database with current schema
    engine = await create_database()

    # Step 4: Seed with dummy data
    print()
    print("Seeding database with dummy data...")
    await seed_database(engine)

    print()
    print("=" * 60)
    print("Database reset complete!")
    print("=" * 60)
    print()
    print("IMPORTANT: Restart the backend server to use the new database:")
    print("  kill $(lsof -ti :8000)")
    print("  cd backend && ./scripts/start-backend.sh")
    print()


if __name__ == "__main__":
    asyncio.run(main())
