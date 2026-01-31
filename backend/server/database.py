import ssl

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

from server.config import settings

# Handle SQLite vs PostgreSQL connection args
connect_args = {}
engine_kwargs = {
    "echo": False,
}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["pool_pre_ping"] = True
elif settings.DATABASE_URL.startswith("postgresql"):
    # Supabase/Neon requires SSL
    # Use NullPool for serverless-style connections (avoids connection issues)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {
        "ssl": ssl_context,
        "timeout": 60,
        "command_timeout": 60,
        # Disable prepared statements for transaction pooler compatibility
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    # Use NullPool to avoid connection pooling issues with Supabase pooler
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_session():
    """Dependency for getting async database sessions."""
    async with async_session() as session:
        yield session


async def check_schema_sync():
    """
    Check if database schema matches model definitions.
    Returns list of warnings/errors for logging.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return []  # Only check for SQLite in development

    import sqlite3
    import os

    # Extract database path from URL
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    if not os.path.exists(db_path):
        return []

    warnings = []
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all tables from database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        db_tables = set(row[0] for row in cursor.fetchall())

        # Check each model table
        for table in SQLModel.metadata.tables.values():
            if table.name not in db_tables:
                warnings.append(f"Table '{table.name}' missing from database")
                continue

            # Get columns from database
            cursor.execute(f"PRAGMA table_info({table.name})")
            db_cols = set(row[1] for row in cursor.fetchall())

            # Get columns from model
            model_cols = set(col.name for col in table.columns)

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
    try:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        print("Database initialized successfully")

        # Check for schema mismatches (SQLite development mode)
        warnings = await check_schema_sync()
        if warnings:
            print("\n" + "=" * 60)
            print("WARNING: Database schema mismatch detected!")
            print("=" * 60)
            for warning in warnings:
                print(f"  - {warning}")
            print()
            print("To fix, run: python -m scripts.reset_db")
            print("=" * 60 + "\n")

    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")
        print("Server will start but database operations may fail")
