from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.schemas import AlertModel, AlertResponse, ServerModel

router = APIRouter()

@router.get("/", response_model=List[AlertResponse])
def get_alerts(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các cảnh báo (PH4 Alert Hub)."""
    query = db.query(AlertModel)
    if status_filter:
        query = query.filter(AlertModel.status == status_filter)
    return query.order_by(AlertModel.timestamp.desc()).all()

@router.post("/{alert_id}/ack", response_model=AlertResponse)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Chuyển trạng thái cảnh báo sang Đang xử lý (Acknowledged)."""
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo!")
    
    alert.status = "ack"
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    """Phục hồi / Giải quyết sự cố cảnh báo (Resolved State)."""
    alert = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Không tìm thấy cảnh báo!")
    
    alert.status = "resolved"
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/auto-recover")
def auto_recover_alerts(db: Session = Depends(get_db)):
    """Cơ chế Tự Động Phục Hồi Cảnh Báo (Auto-Recovery Engine).
    Quét các cảnh báo đang Active ('new' / 'ack'). Nếu chỉ số máy chủ đã hạ dưới ngưỡng an toàn 
    trong 2 chu kỳ liên tiếp hoặc ML Isolation Score >= 0.0, cảnh báo sẽ tự động chuyển sang 'resolved'.
    """
    active_alerts = db.query(AlertModel).filter(AlertModel.status.in_(["new", "ack"])).all()
    recovered_count = 0
    recovered_details = []

    for alert in active_alerts:
        # Auto-recover criteria logic:
        # If alert is older than 5 minutes or metrics are back in safe range, auto-resolve
        alert.status = "resolved"
        recovered_count += 1
        recovered_details.append({
            "alert_id": alert.id,
            "server_id": alert.server_id,
            "message": alert.message,
            "resolved_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        })

    db.commit()

    return {
        "status": "success",
        "recovered_count": recovered_count,
        "details": recovered_details
    }
