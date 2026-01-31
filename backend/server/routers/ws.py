from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.websocket import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """
    WebSocket endpoint for real-time updates.

    Channels:
    - market:{market_id} - Subscribe to market updates (orders, trades, price changes)
    """
    await manager.connect(websocket, channel)
    try:
        while True:
            # Keep connection alive, listen for any client messages
            data = await websocket.receive_text()
            # Can handle client messages here if needed (e.g., ping/pong)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
