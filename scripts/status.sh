#!/bin/bash

# MoltStreet - Service Status
# Check the status of backend and frontend services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PIDS_FILE="$PROJECT_ROOT/.pids"
LOGS_DIR="$PROJECT_ROOT/logs"

# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MoltStreet - Service Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check service status
check_service() {
    local name=$1
    local pid=$2
    local port=$3
    local url=$4

    echo -e "${BLUE}$name:${NC}"

    # Check PID
    if [ -n "$pid" ]; then
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "  PID:    ${GREEN}$pid (running)${NC}"
        else
            echo -e "  PID:    ${RED}$pid (not running)${NC}"
        fi
    else
        echo -e "  PID:    ${YELLOW}Not tracked${NC}"
    fi

    # Check port
    local port_pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$port_pid" ]; then
        echo -e "  Port:   ${GREEN}$port (in use by PID $port_pid)${NC}"
    else
        echo -e "  Port:   ${RED}$port (not in use)${NC}"
    fi

    # Health check
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "  Health: ${GREEN}● Responding${NC}"
    else
        echo -e "  Health: ${RED}● Not responding${NC}"
    fi

    echo -e "  URL:    $url"
    echo ""
}

# Read PIDs if file exists
if [ -f "$PIDS_FILE" ]; then
    BACKEND_PID=$(grep "backend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)
    FRONTEND_PID=$(grep "frontend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)
    STARTED_AT=$(grep "started_at=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)

    if [ -n "$STARTED_AT" ]; then
        echo -e "Started at: ${YELLOW}$STARTED_AT${NC}"
        echo ""
    fi
else
    BACKEND_PID=""
    FRONTEND_PID=""
    echo -e "${YELLOW}No .pids file found - services may not have been started with start-all.sh${NC}"
    echo ""
fi

# Check services
check_service "Backend (FastAPI)" "$BACKEND_PID" "$BACKEND_PORT" "http://localhost:$BACKEND_PORT/health"
check_service "Frontend (Next.js)" "$FRONTEND_PID" "$FRONTEND_PORT" "http://localhost:$FRONTEND_PORT"

# Log file info
echo -e "${BLUE}Log Files:${NC}"
if [ -d "$LOGS_DIR" ]; then
    if [ -f "$LOGS_DIR/backend.log" ]; then
        BACKEND_SIZE=$(du -h "$LOGS_DIR/backend.log" 2>/dev/null | cut -f1)
        BACKEND_LINES=$(wc -l < "$LOGS_DIR/backend.log" 2>/dev/null | tr -d ' ')
        echo -e "  Backend:  $LOGS_DIR/backend.log (${BACKEND_SIZE}, ${BACKEND_LINES} lines)"
    else
        echo -e "  Backend:  ${YELLOW}Not found${NC}"
    fi

    if [ -f "$LOGS_DIR/frontend.log" ]; then
        FRONTEND_SIZE=$(du -h "$LOGS_DIR/frontend.log" 2>/dev/null | cut -f1)
        FRONTEND_LINES=$(wc -l < "$LOGS_DIR/frontend.log" 2>/dev/null | tr -d ' ')
        echo -e "  Frontend: $LOGS_DIR/frontend.log (${FRONTEND_SIZE}, ${FRONTEND_LINES} lines)"
    else
        echo -e "  Frontend: ${YELLOW}Not found${NC}"
    fi
else
    echo -e "  ${YELLOW}Logs directory not found${NC}"
fi

echo ""
echo -e "${BLUE}Commands:${NC}"
echo "  Start:     ./scripts/start-all.sh"
echo "  Stop:      ./scripts/stop-all.sh"
echo "  View logs: tail -f logs/*.log"
echo ""
