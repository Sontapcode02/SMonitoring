from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.core.simulator import simulator_engine
from app.core.config import settings

router = APIRouter()

class TriggerRequest(BaseModel):
    server_name: str
    event_type: str  # 'cpu_spike', 'network_drop', 'node_offline', 'ml_anomaly'
    duration_sec: Optional[int] = 45

class ToggleRequest(BaseModel):
    active: bool

@router.get("/status")
def get_simulator_status():
    """Lấy trạng thái Chế độ Giả lập và danh sách các sự cố đang được kích hoạt."""
    return {
        "active": simulator_engine.is_active(),
        "config_default": settings.SIMULATOR_MODE,
        "active_triggers": simulator_engine.triggers,
        "simulated_servers_count": len(simulator_engine.servers)
    }

@router.post("/toggle")
def toggle_simulator(req: ToggleRequest):
    """Bật/Tắt Chế độ Giả lập Cô lập 100% (Telemetry Simulator Mode)."""
    simulator_engine.set_active(req.active)
    return {
        "message": f"Telemetry Simulator mode {'ENABLED (Isolated)' if req.active else 'DISABLED'}",
        "active": simulator_engine.is_active()
    }

@router.post("/trigger")
def trigger_simulator_event(req: TriggerRequest):
    """Kích hoạt thủ công một kịch bản sự cố giả lập cho Demo Báo cáo KLTN."""
    if not simulator_engine.is_active():
        # Auto-enable simulator when a trigger is pressed
        simulator_engine.set_active(True)

    allowed_types = ["cpu_spike", "network_drop", "node_offline", "ml_anomaly"]
    if req.event_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Loại sự cố không hợp lệ. Chọn từ: {allowed_types}"
        )

    simulator_engine.trigger_event(req.server_name, req.event_type, req.duration_sec or 45)
    return {
        "status": "success",
        "message": f"Đã kích hoạt sự cố '{req.event_type}' cho server '{req.server_name}' trong {req.duration_sec}s",
        "server_name": req.server_name,
        "event_type": req.event_type,
        "active_triggers": simulator_engine.triggers
    }

@router.post("/reset")
def reset_simulator(server_name: Optional[str] = None):
    """Xóa tất cả các sự cố giả lập, đưa trạng thái cluster giả lập về bình thường."""
    if server_name:
        simulator_engine.reset_server(server_name)
        msg = f"Đã reset trạng thái cho máy chủ '{server_name}'"
    else:
        simulator_engine.reset_all()
        msg = "Đã reset toàn bộ sự cố giả lập về trạng thái Healthy"

    return {
        "status": "success",
        "message": msg,
        "active_triggers": simulator_engine.triggers
    }
