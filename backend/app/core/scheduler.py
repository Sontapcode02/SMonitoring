import asyncio
import socket
from datetime import datetime
from app.core.database import SessionLocal
from app.models.schemas import ServerModel

def ping_node_exporter(ip: str, port: int = 9100, timeout: float = 1.5) -> bool:
    """Kiểm tra socket connection tới Node Exporter của máy chủ Ubuntu."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False

async def start_scheduler():
    """Background task định kỳ ping Node Exporter của các server."""
    print("[Scheduler] Starting live Node Exporter healthcheck background loop...")
    asyncio.create_task(_healthcheck_loop())

async def _healthcheck_loop():
    while True:
        try:
            db = SessionLocal()
            servers = db.query(ServerModel).all()
            for server in servers:
                is_online = ping_node_exporter(server.ip_address, server.port)
                new_status = "online" if is_online else "offline"
                if server.status != new_status:
                    server.status = new_status
                server.last_ping = datetime.utcnow()
            db.commit()
            db.close()
        except Exception as e:
            print(f"[Scheduler] Healthcheck error: {e}")
        
        await asyncio.sleep(15)  # Check health every 15 seconds
