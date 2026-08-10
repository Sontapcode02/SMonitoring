from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import glob
import pandas as pd
from datetime import datetime

from app.core.database import get_db

router = APIRouter()
DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "dataset")

@router.get("/realtime")
def get_realtime_metrics():
    """Lấy chỉ số metric mới nhất của 3 máy chủ Ubuntu từ dataset CSV."""
    csv_files = glob.glob(os.path.join(DATASET_DIR, "*.csv"))
    results = []
    
    for filepath in sorted(csv_files):
        server_name = os.path.basename(filepath).replace("_metrics.csv", "")
        try:
            df = pd.read_csv(filepath)
            if not df.empty:
                last_row = df.iloc[-1].to_dict()
                results.append({
                    "server_name": server_name,
                    "timestamp": last_row.get("timestamp"),
                    "cpu_percent": float(last_row.get("cpu_percent", 0)),
                    "ram_percent": float(last_row.get("ram_percent", 0)),
                    "load1_per_cpu": float(last_row.get("load1_per_cpu", 0)),
                    "disk_iops": float(last_row.get("disk_iops", 0)),
                    "net_in_mbps": float(last_row.get("net_in_mbps", 0)),
                    "net_out_mbps": float(last_row.get("net_out_mbps", 0)),
                    "is_anomaly": bool(last_row.get("is_anomaly", False)) if pd.notnull(last_row.get("is_anomaly")) else False
                })
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            
    return results

@router.get("/history")
def get_metrics_history(server_name: str = "ubuntu-server-01", limit: int = 50):
    """Lấy lịch sử N mẫu metrics gần nhất của 1 máy chủ."""
    filepath = os.path.join(DATASET_DIR, f"{server_name}_metrics.csv")
    if not os.path.exists(filepath):
        return []
    
    try:
        df = pd.read_csv(filepath)
        recent_df = df.tail(limit)
        return recent_df.to_dict(orient="records")
    except Exception as e:
        return []
