import asyncio
import socket
from datetime import datetime
from app.core.database import SessionLocal
from app.models.schemas import ServerModel, AlertModel

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
    """Background task định kỳ ping Node Exporter và quản lý vòng đời sự cố (Alert Lifecycle Engine)."""
    print("[Scheduler] Starting live Node Exporter healthcheck & Alert Auto-Recovery loop...")
    asyncio.create_task(_healthcheck_loop())

async def _healthcheck_loop():
    while True:
        try:
            db = SessionLocal()
            servers = db.query(ServerModel).all()
            for server in servers:
                is_online = ping_node_exporter(server.ip_address, server.port)
                new_status = "online" if is_online else "offline"
                
                # Check if server status changed
                if server.status != new_status:
                    server.status = new_status
                    
                    if not is_online:
                        # 1. Server went offline -> Auto-create Critical Alert
                        existing_alert = db.query(AlertModel).filter(
                            AlertModel.server_id == server.id,
                            AlertModel.alert_type == "SERVER_OFFLINE",
                            AlertModel.status.in_(["new", "ack"])
                        ).first()
                        if not existing_alert:
                            new_alert = AlertModel(
                                server_id=server.id,
                                alert_type="SERVER_OFFLINE",
                                message=f"Máy chủ {server.name} ({server.ip_address}) bị mất kết nối Node Exporter!",
                                severity="critical",
                                status="new",
                                timestamp=datetime.utcnow()
                            )
                            db.add(new_alert)
                    else:
                        # 2. Server came back online -> Auto-recover offline alerts
                        active_offline_alerts = db.query(AlertModel).filter(
                            AlertModel.server_id == server.id,
                            AlertModel.alert_type == "SERVER_OFFLINE",
                            AlertModel.status.in_(["new", "ack"])
                        ).all()
                        for alert in active_offline_alerts:
                            alert.status = "resolved"

                server.last_ping = datetime.utcnow()

            db.commit()
            db.close()
        except Exception as e:
            print(f"[Scheduler] Healthcheck & Alert recovery error: {e}")
        
        await asyncio.sleep(15)  # Check health every 15 seconds
