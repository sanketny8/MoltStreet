#!/usr/bin/env python3
"""
Schema validation script.

This script compares the SQLModel definitions with the actual database schema
and reports any mismatches. Run this after model changes to detect issues early.

Run with: python -m scripts.check_schema

Exit codes:
  0 - Schema is in sync
  1 - Schema mismatch detected
  2 - Database doesn't exist
"""
import os
import sqlite3
import sys

from sqlmodel import SQLModel

# Import all models to register them with SQLModel.metadata
from server.models.agent import Agent
from server.models.market import Market
from server.models.order import Order
from server.models.position import Position
from server.models.trade import Trade

# Database path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "moltstreet.db")


def get_model_columns(table_name: str) -> set:
    """Get column names from SQLModel metadata for a table."""
    for table in SQLModel.metadata.tables.values():
        if table.name == table_name:
            return set(col.name for col in table.columns)
    return set()


def get_db_columns(cursor, table_name: str) -> set:
    """Get column names from the actual database table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return set(row[1] for row in cursor.fetchall())


def get_db_tables(cursor) -> set:
    """Get all table names from the database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'alembic_%'")
    return set(row[0] for row in cursor.fetchall())


def main():
    print("=" * 60)
    print("MoltStreet Schema Validation")
    print("=" * 60)
    print()

    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database not found at {DB_PATH}")
        print("Run the seed script first: python -m scripts.seed_data")
        sys.exit(2)

    # Get model table names
    model_tables = set(table.name for table in SQLModel.metadata.tables.values())

    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get database table names
    db_tables = get_db_tables(cursor)

    has_errors = False
    has_warnings = False

    # Check for missing tables in database
    missing_tables = model_tables - db_tables
    if missing_tables:
        has_errors = True
        print("MISSING TABLES in database:")
        for table in sorted(missing_tables):
            print(f"  - {table}")
        print()

    # Check for extra tables in database (not in models)
    extra_tables = db_tables - model_tables
    if extra_tables:
        has_warnings = True
        print("EXTRA TABLES in database (not in models):")
        for table in sorted(extra_tables):
            print(f"  - {table}")
        print()

    # Check columns for each table that exists in both
    common_tables = model_tables & db_tables
    column_issues = []

    for table_name in sorted(common_tables):
        model_cols = get_model_columns(table_name)
        db_cols = get_db_columns(cursor, table_name)

        missing_cols = model_cols - db_cols
        extra_cols = db_cols - model_cols

        if missing_cols:
            has_errors = True
            column_issues.append(f"  Table '{table_name}' - MISSING columns in database:")
            for col in sorted(missing_cols):
                column_issues.append(f"    - {col}")

        if extra_cols:
            has_warnings = True
            column_issues.append(f"  Table '{table_name}' - EXTRA columns in database (not in model):")
            for col in sorted(extra_cols):
                column_issues.append(f"    - {col}")

    if column_issues:
        print("COLUMN MISMATCHES:")
        for issue in column_issues:
            print(issue)
        print()

    conn.close()

    # Summary
    if has_errors:
        print("=" * 60)
        print("SCHEMA MISMATCH DETECTED!")
        print()
        print("To fix, run one of these commands:")
        print("  1. Reset database (loses all data):")
        print("     python -m scripts.reset_db")
        print()
        print("  2. Create Alembic migration (preserves data):")
        print("     alembic revision --autogenerate -m 'description'")
        print("     alembic upgrade head")
        print("=" * 60)
        sys.exit(1)
    elif has_warnings:
        print("=" * 60)
        print("Schema check passed with warnings.")
        print("Extra columns/tables in database may be from old migrations.")
        print("=" * 60)
        sys.exit(0)
    else:
        print("Schema is in sync!")
        print("=" * 60)
        sys.exit(0)


if __name__ == "__main__":
    main()
