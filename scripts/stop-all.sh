#!/bin/bash

# MoltStreet - Stop All Services
# Gracefully stops backend and frontend services

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   MoltStreet - Stopping Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to kill process and its children
kill_process_tree() {
    local pid=$1
    local name=$2

    if [ -z "$pid" ]; then
        echo -e "${YELLOW}$name: No PID found${NC}"
        return
    fi

    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}$name: Process $pid not running${NC}"
        return
    fi

    echo -e "${GREEN}$name: Stopping process $pid...${NC}"

    # Get child processes
    local children=$(pgrep -P "$pid" 2>/dev/null)

    # Send SIGTERM for graceful shutdown
    kill -TERM "$pid" 2>/dev/null

    # Wait up to 5 seconds for graceful shutdown
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 0.5
        count=$((count + 1))
    done

    # Force kill if still running
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}$name: Force killing process $pid...${NC}"
        kill -9 "$pid" 2>/dev/null
    fi

    # Kill children if any remain
    for child in $children; do
        if kill -0 "$child" 2>/dev/null; then
            kill -9 "$child" 2>/dev/null
        fi
    done

    echo -e "${GREEN}$name: Stopped${NC}"
}

# Check if PID file exists
if [ ! -f "$PIDS_FILE" ]; then
    echo -e "${YELLOW}No running services found (.pids file not found)${NC}"
    echo ""

    # Check if anything is running on the ports anyway
    echo "Checking ports..."

    BACKEND_PID=$(lsof -ti :8000 2>/dev/null)
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${YELLOW}Found process on port 8000: $BACKEND_PID${NC}"
        read -p "Kill it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $BACKEND_PID 2>/dev/null
            echo -e "${GREEN}Killed${NC}"
        fi
    fi

    FRONTEND_PID=$(lsof -ti :3000 2>/dev/null)
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}Found process on port 3000: $FRONTEND_PID${NC}"
        read -p "Kill it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $FRONTEND_PID 2>/dev/null
            echo -e "${GREEN}Killed${NC}"
        fi
    fi

    exit 0
fi

# Read PIDs from file
BACKEND_PID=$(grep "backend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)
FRONTEND_PID=$(grep "frontend=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)
STARTED_AT=$(grep "started_at=" "$PIDS_FILE" 2>/dev/null | cut -d'=' -f2)

echo "Services started at: $STARTED_AT"
echo ""

# Stop services
kill_process_tree "$BACKEND_PID" "Backend"
kill_process_tree "$FRONTEND_PID" "Frontend"

# Also kill any orphaned processes on the ports
sleep 1

ORPHAN_8000=$(lsof -ti :8000 2>/dev/null)
if [ -n "$ORPHAN_8000" ]; then
    echo -e "${YELLOW}Cleaning up orphaned process on port 8000...${NC}"
    kill -9 $ORPHAN_8000 2>/dev/null
fi

ORPHAN_3000=$(lsof -ti :3000 2>/dev/null)
if [ -n "$ORPHAN_3000" ]; then
    echo -e "${YELLOW}Cleaning up orphaned process on port 3000...${NC}"
    kill -9 $ORPHAN_3000 2>/dev/null
fi

# Remove PID file
rm -f "$PIDS_FILE"

# Add stop marker to logs
if [ -d "$LOGS_DIR" ]; then
    echo "" >> "$LOGS_DIR/backend.log"
    echo "========== Stopped at $(date) ==========" >> "$LOGS_DIR/backend.log"
    echo "" >> "$LOGS_DIR/frontend.log"
    echo "========== Stopped at $(date) ==========" >> "$LOGS_DIR/frontend.log"
fi

echo ""
echo -e "${GREEN}All services stopped.${NC}"
echo ""
