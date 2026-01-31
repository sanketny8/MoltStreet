#!/bin/bash

# MoltStreet - Start All Services
# Starts backend (FastAPI) and frontend (Next.js) with logging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Paths
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOGS_DIR="$PROJECT_ROOT/logs"
PIDS_FILE="$PROJECT_ROOT/.pids"

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MoltStreet - Starting Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if already running
if [ -f "$PIDS_FILE" ]; then
    echo -e "${YELLOW}Warning: Services may already be running.${NC}"
    echo -e "${YELLOW}Run ./scripts/stop-all.sh first or check ./scripts/status.sh${NC}"

    # Check if processes are actually running
    BACKEND_PID=$(grep "backend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)
    FRONTEND_PID=$(grep "frontend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${RED}Backend is still running (PID: $BACKEND_PID)${NC}"
        exit 1
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${RED}Frontend is still running (PID: $FRONTEND_PID)${NC}"
        exit 1
    fi

    # Stale PID file, remove it
    rm -f "$PIDS_FILE"
fi

# Kill any process using a port
kill_port() {
    local port=$1
    local service=$2
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Port $port is in use (needed for $service). Killing existing processes...${NC}"
        for pid in $pids; do
            echo -e "   Killing PID $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        sleep 1
        echo -e "   ${GREEN}Port $port cleared${NC}"
    fi
}

kill_port $BACKEND_PORT "backend"
kill_port $FRONTEND_PORT "frontend"

# Create logs directory and clear old logs
mkdir -p "$LOGS_DIR"

echo -e "${GREEN}[1/6]${NC} Clearing old logs..."
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"

# Clear logs and add start marker
echo "========== Starting at $(date) ==========" > "$BACKEND_LOG"
echo "========== Starting at $(date) ==========" > "$FRONTEND_LOG"

# Start Backend
echo -e "${GREEN}[2/6]${NC} Setting up backend environment..."

cd "$BACKEND_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo -e "   ${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "   ${GREEN}Virtual environment created${NC}"
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Install/update dependencies
echo -e "${GREEN}[3/6]${NC} Installing backend dependencies..."
pip install -r requirements.txt --quiet >> "$BACKEND_LOG" 2>&1
echo -e "   ${GREEN}Dependencies installed${NC}"

# Verify uvicorn is available
if ! command -v uvicorn &> /dev/null; then
    echo -e "${RED}Error: uvicorn not found after pip install${NC}"
    exit 1
fi

# Start uvicorn in background with hot-reload
echo -e "${GREEN}[4/6]${NC} Starting backend (FastAPI) with hot-reload..."
uvicorn server.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload --reload-dir server >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

echo -e "   Backend PID: ${YELLOW}$BACKEND_PID${NC}"

# Start Frontend
echo -e "${GREEN}[5/6]${NC} Starting frontend (Next.js) with hot-reload..."

cd "$FRONTEND_DIR"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm not found. Please install Node.js${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Install/update npm dependencies
echo -e "   Installing dependencies..."
npm install >> "$FRONTEND_LOG" 2>&1

# Start Next.js in background
npm run dev >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo -e "   Frontend PID: ${YELLOW}$FRONTEND_PID${NC}"

# Save PIDs
echo "backend=$BACKEND_PID" > "$PIDS_FILE"
echo "frontend=$FRONTEND_PID" >> "$PIDS_FILE"
echo "started_at=$(date -Iseconds)" >> "$PIDS_FILE"

# Wait for services to be ready
echo -e "${GREEN}[6/6]${NC} Waiting for services to start..."
sleep 3

# Health check
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${GREEN}Services Started!${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""

# Check backend health
if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
    echo -e "Backend:  ${GREEN}● Running${NC} at http://localhost:$BACKEND_PORT"
    echo -e "          API Docs: http://localhost:$BACKEND_PORT/docs"
else
    echo -e "Backend:  ${YELLOW}● Starting...${NC} at http://localhost:$BACKEND_PORT"
fi

# Check frontend
if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo -e "Frontend: ${GREEN}● Running${NC} at http://localhost:$FRONTEND_PORT"
else
    echo -e "Frontend: ${YELLOW}● Starting...${NC} at http://localhost:$FRONTEND_PORT"
fi

echo ""
echo -e "${BLUE}Logs:${NC}"
echo "  Backend:  $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
echo ""
echo -e "${GREEN}Hot-Reload Enabled:${NC}"
echo "  - Backend:  Changes to Python files auto-restart server"
echo "  - Frontend: Changes to React/TS files auto-refresh browser"
echo ""
echo -e "${BLUE}Commands:${NC}"
echo "  View logs:    tail -f $LOGS_DIR/*.log"
echo "  Stop all:     ./scripts/stop-all.sh"
echo "  Check status: ./scripts/status.sh"
echo ""
