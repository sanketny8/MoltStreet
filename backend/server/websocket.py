from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        """Accept connection and add to channel."""
        await websocket.accept()
        if channel not in self.connections:
            self.connections[channel] = set()
        self.connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        """Remove connection from channel."""
        if channel in self.connections:
            self.connections[channel].discard(websocket)
            if not self.connections[channel]:
                del self.connections[channel]

    async def broadcast(self, channel: str, message: dict):
        """Send message to all connections in channel."""
        if channel not in self.connections:
            return

        disconnected = []
        for websocket in self.connections[channel]:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)

        # Clean up disconnected clients
        for ws in disconnected:
            self.connections[channel].discard(ws)

    async def broadcast_to_market(self, market_id: str, message: dict):
        """Broadcast to market channel."""
        channel = f"market:{market_id}"
        await self.broadcast(channel, message)


# Global connection manager
manager = ConnectionManager()


async def broadcast_order(market_id: str, order_data: dict):
    """Broadcast new order to market subscribers."""
    await manager.broadcast_to_market(market_id, {"type": "order", "data": order_data})


async def broadcast_trade(market_id: str, trade_data: dict):
    """Broadcast trade execution to market subscribers."""
    await manager.broadcast_to_market(market_id, {"type": "trade", "data": trade_data})


async def broadcast_market_update(market_id: str, market_data: dict):
    """Broadcast market price update to subscribers."""
    await manager.broadcast_to_market(market_id, {"type": "market", "data": market_data})
