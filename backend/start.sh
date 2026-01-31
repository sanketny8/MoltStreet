#!/bin/bash
# Railway startup script
# Runs migrations and starts the server

set -e

echo "Starting MoltStreet Backend..."
echo "Running database migrations..."

# Run migrations
alembic upgrade head

echo "Migrations completed. Starting server..."

# Start the server
exec uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}

