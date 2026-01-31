#!/bin/bash

# MoltStreet - Development Mode
# Runs backend and frontend with live logs in terminal
# Both services auto-reload on file changes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   MoltStreet - Development Mode        ║${NC}"
echo -e "${CYAN}║   Hot-Reload Enabled                   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"

    # Kill background jobs
    jobs -p | xargs -r kill 2>/dev/null || true

    # Kill by port
    lsof -ti :$BACKEND_PORT | xargs -r kill 2>/dev/null || true
    lsof -ti :$FRONTEND_PORT | xargs -r kill 2>/dev/null || true

    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Kill existing processes on ports
echo -e "${BLUE}[1/4]${NC} Clearing ports..."
lsof -ti :$BACKEND_PORT | xargs -r kill 2>/dev/null || true
lsof -ti :$FRONTEND_PORT | xargs -r kill 2>/dev/null || true
sleep 1

# Setup backend
echo -e "${BLUE}[2/4]${NC} Setting up backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo -e "   Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

# Setup frontend
echo -e "${BLUE}[3/4]${NC} Setting up frontend..."
cd "$FRONTEND_DIR"
npm install --silent

# Start services
echo -e "${BLUE}[4/4]${NC} Starting services with hot-reload..."
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo -e "          http://localhost:$BACKEND_PORT/docs (Swagger)"
echo -e "${GREEN}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Hot-Reload: Changes auto-apply without restart${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Start backend in background
cd "$BACKEND_DIR"
source venv/bin/activate
uvicorn server.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload --reload-dir server 2>&1 | sed 's/^/[backend] /' &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend in background
cd "$FRONTEND_DIR"
npm run dev 2>&1 | sed 's/^/[frontend] /' &
FRONTEND_PID=$!

# Wait for any background job to exit
wait
