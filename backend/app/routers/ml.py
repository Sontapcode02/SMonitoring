from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import os
import glob
import time
from app.core.database import get_db
from app.models.schemas import ServerModel, MetricModel
from app.core.ml_engine import ml_engine, MODEL_DIR, FEATURES

router = APIRouter()

@router.get("/status")
def get_ml_status(db: Session = Depends(get_db)):
    """Trả về trạng thái các mô hình ML Isolation Forest đã huấn luyện cho từng Node Server."""
    servers = db.query(ServerModel).all()
    result = []

    for srv in servers:
        s_clean = srv.name.lower()
        m_path = os.path.join(MODEL_DIR, f"if_{s_clean}.pkl")
        sc_path = os.path.join(MODEL_DIR, f"scaler_{s_clean}.pkl")

        is_trained = os.path.exists(m_path) and os.path.exists(sc_path)
        file_size_kb = round(os.path.getsize(m_path) / 1024.0, 1) if is_trained else 0.0
        mtime_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(m_path))) if is_trained else "N/A"

        metrics_count = db.query(MetricModel).filter(MetricModel.server_id == srv.id).count()

        result.append({
            "server_id": srv.id,
            "server_name": srv.name,
            "ip_address": srv.ip_address,
            "is_trained": is_trained,
            "model_type": "Isolation Forest (Unsupervised AIOps)",
            "features_count": len(FEATURES),
            "features": FEATURES,
            "metrics_count_in_db": metrics_count,
            "model_file_size_kb": file_size_kb,
            "last_trained_at": mtime_str
        })

    return {
        "total_servers": len(servers),
        "trained_models_count": sum(1 for item in result if item["is_trained"]),
        "algorithm": "Isolation Forest",
        "contamination": 0.05,
        "servers": result
    }

@router.post("/retrain")
def retrain_ml_model(
    server_name: Optional[str] = Query(None, description="Tên server cần retrain (bỏ trống để retrain toàn bộ cụm)"),
    days: int = Query(7, description="Số ngày dữ liệu lịch sử sử dụng để train"),
    db: Session = Depends(get_db)
):
    """Kích hoạt huấn luyện lại (Retrain) mô hình ML từ dữ liệu thực tế trong Database."""
    if server_name:
        res = ml_engine.train_model_from_db(server_name, db, days=days)
        if res.get("status") == "error":
            raise HTTPException(status_code=400, detail=res["message"])
        return res

    # Retrain all servers
    servers = db.query(ServerModel).all()
    results = []
    for srv in servers:
        res = ml_engine.train_model_from_db(srv.name, db, days=days)
        results.append(res)

    return {
        "status": "success",
        "message": f"Đã retrain mô hình ML thành công cho {len(servers)} máy chủ!",
        "results": results
    }

@router.post("/predict")
def predict_telemetry_anomaly(
    server_name: str = "ubuntu-server-01",
    payload: Dict[str, Any] = None
):
    """Dự đoán bất thường (Inference) cho một snapshot metric cụ thể."""
    if not payload:
        raise HTTPException(status_code=400, detail="Metric payload parameters required.")

    is_anom, score_pct, dec_score = ml_engine.predict_anomaly(server_name, payload)
    return {
        "server_name": server_name,
        "is_ml_anomaly": is_anom,
        "anomaly_score_pct": score_pct,
        "decision_score": dec_score,
        "risk_level": "CRITICAL" if score_pct >= 85.0 else ("HIGH" if score_pct >= 65.0 else "NORMAL")
    }
