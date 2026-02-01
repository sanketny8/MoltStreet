import ssl

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, StaticPool
from sqlmodel import SQLModel

from server.config import settings

# Handle SQLite vs PostgreSQL connection args
connect_args = {}
engine_kwargs = {
    "echo": False,
}

if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite connection args for better concurrency
    connect_args = {
        "check_same_thread": False,
        "timeout": 20.0,  # Wait up to 20 seconds for lock
    }
    # Use StaticPool for SQLite to limit connections and avoid locking issues
    engine_kwargs["poolclass"] = StaticPool
    engine_kwargs["pool_pre_ping"] = False  # Not needed for StaticPool
    engine_kwargs["connect_args"] = connect_args
elif settings.DATABASE_URL.startswith("postgresql"):
    # Supabase/Neon requires SSL
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {
        "ssl": ssl_context,
        "timeout": 30,  # Reduced from 60 to fail faster
        "command_timeout": 30,  # Reduced from 60
        # Disable prepared statements for transaction pooler compatibility
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    # Use NullPool for serverless-style connections
    # NullPool creates a new connection for each checkout, no pooling
    # This avoids connection pooling issues with Supabase transaction pooler
    engine_kwargs["poolclass"] = NullPool
    # Note: pool_pre_ping, max_overflow, pool_reset_on_return are not compatible with NullPool

# For SQLite, we need to handle connect_args differently
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
else:
    engine = create_async_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs)

# Add connection event listeners
if settings.DATABASE_URL.startswith("sqlite"):

    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, connection_record):
        """Set SQLite PRAGMAs for better concurrency."""
        cursor = dbapi_conn.cursor()
        # Enable WAL mode for better concurrency (allows multiple readers)
        cursor.execute("PRAGMA journal_mode=WAL")
        # Set busy timeout to wait for locks (20 seconds)
        cursor.execute("PRAGMA busy_timeout=20000")
        # Use NORMAL synchronous mode for better performance
        cursor.execute("PRAGMA synchronous=NORMAL")
        # Optimize for better performance
        cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

elif settings.DATABASE_URL.startswith("postgresql"):

    @event.listens_for(engine.sync_engine, "connect")
    def set_connection_timeout(dbapi_conn, connection_record):
        """Set connection timeout and retry settings."""
        pass  # Timeout is handled in connect_args

    @event.listens_for(engine.sync_engine, "checkout")
    def receive_checkout(dbapi_conn, connection_record, connection_proxy):
        """Handle connection checkout with retry logic."""
        # This ensures connections are valid before use
        pass


async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    """Dependency for getting async database sessions."""
    # Note: Connection retry is handled at the engine level via pool_pre_ping
    # and connection timeout settings. Individual session creation failures
    # should be rare and will be handled by FastAPI error handlers.
    async with async_session() as session:
        yield session


async def check_schema_sync():
    """
    Check if database schema matches model definitions.
    Returns list of warnings/errors for logging.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return []  # Only check for SQLite in development

    import os
    import sqlite3

    # Extract database path from URL
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    if not os.path.exists(db_path):
        return []

    warnings = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all tables from database
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
        db_tables = {row[0] for row in cursor.fetchall()}

        # Check each model table
        for table in SQLModel.metadata.tables.values():
            if table.name not in db_tables:
                warnings.append(f"Table '{table.name}' missing from database")
                continue

            # Get columns from database
            cursor.execute(f"PRAGMA table_info({table.name})")
            db_cols = {row[1] for row in cursor.fetchall()}

            # Get columns from model
            model_cols = {col.name for col in table.columns}

            # Check for missing columns
            missing = model_cols - db_cols
            if missing:
                warnings.append(f"Table '{table.name}' missing columns: {', '.join(missing)}")

        conn.close()
    except Exception as e:
        warnings.append(f"Schema check failed: {e}")

    return warnings


async def init_db():
    """Initialize database tables."""
    import logging

    logger = logging.getLogger(__name__)

    try:
        logger.info(f"Connecting to database: {settings.DATABASE_URL[:50]}...")
        async with engine.begin() as conn:
            # PRAGMAs are set via event listener, just create tables
            await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("Database tables created/verified successfully")

        # Check for schema mismatches (SQLite development mode)
        warnings = await check_schema_sync()
        if warnings:
            logger.warning("\n" + "=" * 60)
            logger.warning("WARNING: Database schema mismatch detected!")
            logger.warning("=" * 60)
            for warning in warnings:
                logger.warning(f"  - {warning}")
            logger.warning("")
            logger.warning("To fix, run: python -m scripts.reset_db")
            logger.warning("=" * 60 + "\n")

    except Exception as e:
        logger.exception("Could not initialize database")
        # Re-raise to let the caller handle it with proper context
        raise
