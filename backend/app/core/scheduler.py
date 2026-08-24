import asyncio
import socket
import urllib.request
from datetime import datetime
from app.core.database import SessionLocal
from app.models.schemas import ServerModel, AlertModel

def ping_node_exporter(ip: str, port: int = 9100, timeout: float = 1.5) -> bool:
    """Kiểm tra socket connection tới Node Exporter / Prometheus Engine của máy chủ."""
    target_ip = ip
    if target_ip in ["localhost", "127.0.0.1"] and port == 9090:
        target_ip = "prometheus"

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((target_ip, port))
        sock.close()
        if result == 0:
            return True
    except Exception:
        pass

    # Fallback check for Prometheus HTTP health endpoint
    if port == 9090 or "prometheus" in target_ip.lower():
        try:
            req = urllib.request.Request(f"http://{target_ip}:{port}/-/healthy", headers={"User-Agent": "FastAPI-Ping"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status == 200
        except Exception:
            pass

    return False

async def start_scheduler():
    """Background task định kỳ ping Node Exporter và quản lý vòng đời sự cố (Alert Lifecycle Engine) & WebSocket Broadcast."""
    print("[Scheduler] Starting live Node Exporter healthcheck & WebSocket Broadcast loop...")
    asyncio.create_task(_healthcheck_loop())
    asyncio.create_task(_websocket_metrics_broadcast_loop())

async def _websocket_metrics_broadcast_loop():
    """Background loop đẩy chỉ số realtime telemetry lên WebSocket mỗi 3 giây."""
    from app.routers.metrics import get_realtime_metrics
    from app.core.websocket_manager import manager

    while True:
        try:
            if manager.active_connections.get("metrics"):
                db = SessionLocal()
                try:
                    metrics_data = get_realtime_metrics(db=db)
                    await manager.broadcast(metrics_data, channel="metrics")
                finally:
                    db.close()
        except Exception as e:
            print(f"[WebSocket Broadcast Loop Error]: {e}")

        await asyncio.sleep(3)

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
