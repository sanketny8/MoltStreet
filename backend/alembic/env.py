import asyncio
import ssl
from logging.config import fileConfig
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from alembic import context

# Import all models so they are registered with SQLModel.metadata
from server.models import (
    Agent, Market, Order, Trade, Position,
    AgentWallet, Transaction, PlatformFee, PlatformStats, ModeratorReward
)
from server.config import settings

config = context.config

# Clean up DATABASE_URL - remove sslmode query param as asyncpg doesn't use it
# We'll handle SSL via connect_args instead
db_url = settings.DATABASE_URL
if "sslmode" in db_url:
    parsed = urlparse(db_url)
    query_params = parse_qs(parsed.query)
    query_params.pop("sslmode", None)
    new_query = urlencode(query_params, doseq=True)
    db_url = urlunparse(parsed._replace(query=new_query))

# Set the database URL from settings
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    from sqlalchemy.ext.asyncio import create_async_engine
    
    # Handle SSL for PostgreSQL/Supabase
    connect_args = {}
    engine_kwargs = {}
    
    if db_url.startswith("postgresql"):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args = {
            "ssl": ssl_context,
            "timeout": 60,
            "command_timeout": 60,
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
        engine_kwargs["poolclass"] = pool.NullPool
    
    # Create engine directly with SSL support
    connectable = create_async_engine(
        db_url,
        connect_args=connect_args,
        **engine_kwargs
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
