from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import glob
import json
import urllib.request
import urllib.parse
import pandas as pd
from datetime import datetime

from app.core.database import get_db

router = APIRouter()
DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "dataset")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

def query_promql(query: str):
    try:
        url = f"{PROMETHEUS_URL}/api/v1/query?query={urllib.parse.quote(query)}"
        req = urllib.request.urlopen(url, timeout=3)
        data = json.loads(req.read().decode())
        if data.get("status") == "success":
            return data.get("data", {}).get("result", [])
        return []
    except Exception as e:
        print(f"[Prometheus Query Error]: {e}")
        return []

@router.get("/realtime")
def get_realtime_metrics():
    """Lấy chỉ số metric mới nhất thời gian thực từ Prometheus / Live CSV của 3 máy chủ Ubuntu."""
    targets = query_promql('up')
    results = {}

    if targets:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ip_to_name = {
            "192.168.199.131:9100": "ubuntu-server-01",
            "192.168.199.133:9100": "ubuntu-server-01",
            "192.168.199.132:9100": "ubuntu-server-02",
            "192.168.199.134:9100": "ubuntu-server-03",
        }

        for item in targets:
            inst = item['metric'].get('instance', '')
            if inst == 'localhost:9090':
                continue
            name = item['metric'].get('server_name') or item['metric'].get('job') or ip_to_name.get(inst, inst)
            results[inst] = {
                "server_name": name,
                "instance": inst,
                "timestamp": now_str,
                "cpu_percent": 5.0,
                "ram_percent": 24.5,
                "load1_per_cpu": 0.1,
                "disk_iops": 0.0,
                "net_in_mbps": 0.0,
                "net_out_mbps": 0.0,
                "is_anomaly": False
            }

        # Query RAM %
        ram_res = query_promql('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
        for item in ram_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["ram_percent"] = round(float(item['value'][1]), 2)

        # Query IOPS
        iops_res = query_promql('sum by (instance) (rate(node_disk_reads_completed_total[1m]) + rate(node_disk_writes_completed_total[1m]))')
        for item in iops_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["disk_iops"] = round(float(item['value'][1]), 2)

        if results:
            return list(results.values())

    # Fallback to reading the latest lines from CSV dataset
    csv_files = glob.glob(os.path.join(DATASET_DIR, "*.csv"))
    csv_results = []
    
    for filepath in sorted(csv_files):
        server_name = os.path.basename(filepath).replace("_metrics.csv", "")
        try:
            df = pd.read_csv(filepath)
            if not df.empty:
                last_row = df.iloc[-1].to_dict()
                csv_results.append({
                    "server_name": server_name,
                    "timestamp": str(last_row.get("timestamp")),
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
            
    return csv_results

@router.get("/history")
def get_metrics_history(server_name: str = "ubuntu-server-01", limit: int = 30):
    """Lấy lịch sử N mẫu metrics gần nhất của 1 máy chủ từ CSV."""
    filepath = os.path.join(DATASET_DIR, f"{server_name}_metrics.csv")
    if not os.path.exists(filepath):
        return []
    
    try:
        df = pd.read_csv(filepath)
        recent_df = df.tail(limit)
        return recent_df.to_dict(orient="records")
    except Exception as e:
        return []
