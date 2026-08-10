from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import glob
import json
import io
import urllib.request
import urllib.parse
import pandas as pd
from datetime import datetime

from app.core.database import get_db
from app.models.schemas import ServerModel

router = APIRouter()
# Fix dataset path to point to root /ml/dataset
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATASET_DIR = os.path.join(BASE_DIR, "ml", "dataset")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

def safe_read_csv_tail(filepath: str, limit: int = 30):
    """Đọc an toàn N dòng cuối cùng của file CSV ngay cả khi script cào data đang mở ghi file."""
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            if len(lines) <= 1:
                return []
            header = lines[0]
            tail_lines = lines[-limit:] if len(lines) > limit else lines[1:]
            csv_str = header + "".join(tail_lines)
            df = pd.read_csv(io.StringIO(csv_str))
            df = df.fillna(0)
            return df.to_dict(orient="records")
    except Exception as e:
        print(f"[CSV Read Error] {filepath}: {e}")
        return []

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
def get_realtime_metrics(db: Session = Depends(get_db)):
    """Lấy chỉ số metric mới nhất thời gian thực cho TẤT CẢ máy chủ Ubuntu đăng ký trong Database."""
    db_servers = db.query(ServerModel).all()
    results = {}
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Initialize result structure for all servers registered in Database
    for srv in db_servers:
        inst_key = f"{srv.ip_address}:{srv.port}"
        results[inst_key] = {
            "server_id": srv.id,
            "server_name": srv.name,
            "instance": inst_key,
            "ip_address": srv.ip_address,
            "port": srv.port,
            "role": srv.role,
            "status": srv.status,
            "timestamp": now_str,
            "cpu_percent": 5.0,
            "ram_percent": 24.5,
            "disk_percent": 55.4,
            "disk_size_gb": 10.0,
            "disk_free_gb": 4.5,
            "disk_iops": 0.0,
            "disk_read_mbps": 0.0,
            "disk_write_mbps": 0.0,
            "load1_per_cpu": 0.1,
            "net_in_mbps": 0.0,
            "net_out_mbps": 0.0,
            "is_anomaly": False
        }

    # 2. Query Realtime CPU % from Prometheus
    cpu_res = query_promql('100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)')
    for item in cpu_res:
        inst = item['metric'].get('instance', '')
        # Match by instance IP or server name
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["cpu_percent"] = round(float(item['value'][1]), 2)
                res["status"] = "online"

    # 3. Query Realtime RAM %
    ram_res = query_promql('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
    for item in ram_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["ram_percent"] = round(float(item['value'][1]), 2)

    # 4. Query Realtime Disk Size & Free Space
    size_res = query_promql('node_filesystem_size_bytes{mountpoint="/"}' or 'node_filesystem_size_bytes{fstype=~"ext4|xfs"}')
    for item in size_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                val_bytes = float(item['value'][1])
                res["disk_size_gb"] = round(val_bytes / (1024 ** 3), 2)

    free_res = query_promql('node_filesystem_avail_bytes{mountpoint="/"}' or 'node_filesystem_avail_bytes{fstype=~"ext4|xfs"}')
    for item in free_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                val_free_bytes = float(item['value'][1])
                res["disk_free_gb"] = round(val_free_bytes / (1024 ** 3), 2)
                if res["disk_size_gb"] > 0:
                    used_gb = res["disk_size_gb"] - res["disk_free_gb"]
                    res["disk_percent"] = round((used_gb / res["disk_size_gb"]) * 100, 2)

    # 5. Query Realtime Disk IOPS
    iops_res = query_promql('sum by (instance) (rate(node_disk_reads_completed_total[1m]) + rate(node_disk_writes_completed_total[1m]))')
    for item in iops_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["disk_iops"] = round(float(item['value'][1]), 2)

    # 6. Query Realtime Disk Read/Write Speed
    read_res = query_promql('sum by (instance) (rate(node_disk_read_bytes_total[1m])) / 1024 / 1024')
    for item in read_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["disk_read_mbps"] = round(float(item['value'][1]), 4)

    write_res = query_promql('sum by (instance) (rate(node_disk_written_bytes_total[1m])) / 1024 / 1024')
    for item in write_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["disk_write_mbps"] = round(float(item['value'][1]), 4)

    # 7. Query Realtime Network RX Mbps
    net_res = query_promql('sum by (instance) (rate(node_network_receive_bytes_total[1m])) * 8 / 1024 / 1024')
    for item in net_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["net_in_mbps"] = round(float(item['value'][1]), 4)

    # Fallback/supplement for servers with CSV datasets
    for k, res in results.items():
        filepath = os.path.join(DATASET_DIR, f"{res['server_name']}_metrics.csv")
        if os.path.exists(filepath):
            records = safe_read_csv_tail(filepath, limit=1)
            if records:
                last_row = records[-1]
                if res["cpu_percent"] == 5.0 and "cpu_percent" in last_row:
                    res["cpu_percent"] = float(last_row.get("cpu_percent", 5.0))
                if res["ram_percent"] == 24.5 and "ram_percent" in last_row:
                    res["ram_percent"] = float(last_row.get("ram_percent", 24.5))

    return list(results.values())

@router.get("/history")
def get_metrics_history(server_name: str = "ubuntu-server-01", limit: int = 30):
    """Lấy lịch sử N mẫu metrics gần nhất của 1 máy chủ từ CSV."""
    filepath = os.path.join(DATASET_DIR, f"{server_name}_metrics.csv")
    return safe_read_csv_tail(filepath, limit=limit)
