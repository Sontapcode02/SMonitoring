import asyncio
import json
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """Quản lý danh sách kết nối WebSocket đang mở và broadcast tin nhắn thời gian thực."""

    def __init__(self):
        # Active connections grouped by channel topic (e.g. 'metrics', 'alerts', 'servers')
        self.active_connections: Dict[str, List[WebSocket]] = {
            "metrics": [],
            "alerts": [],
            "servers": []
        }

    async def connect(self, websocket: WebSocket, channel: str = "metrics"):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        print(f"[WebSocket] Client connected to channel '{channel}'. Active count: {len(self.active_connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "metrics"):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)
            print(f"[WebSocket] Client disconnected from channel '{channel}'. Active count: {len(self.active_connections[channel])}")

    async def broadcast(self, message: dict, channel: str = "metrics"):
        """Gửi dữ liệu JSON tới tất cả Client đang lắng nghe channel tương ứng."""
        if channel not in self.active_connections or not self.active_connections[channel]:
            return

        json_str = json.dumps(message)
        disconnected_clients = []
        
        for connection in self.active_connections[channel]:
            try:
                await connection.send_text(json_str)
            except Exception as e:
                print(f"[WebSocket Broadcast Error] {e}")
                disconnected_clients.append(connection)

        for client in disconnected_clients:
            self.disconnect(client, channel)

# Global singleton instance for WebSocket ConnectionManager
manager = ConnectionManager()
