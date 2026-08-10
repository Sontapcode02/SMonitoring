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
def get_realtime_metrics():
    """Lấy chỉ số metric mới nhất thời gian thực từ Prometheus cho tất cả máy chủ Ubuntu (CPU, RAM, Disk Capacity, IOPS, Read/Write, Net)."""
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
            name = item['metric'].get('server_name') or ip_to_name.get(inst, inst)
            results[inst] = {
                "server_name": name,
                "instance": inst,
                "timestamp": now_str,
                "cpu_percent": 0.0,
                "ram_percent": 0.0,
                "disk_percent": 0.0,
                "disk_size_gb": 0.0,
                "disk_free_gb": 0.0,
                "disk_iops": 0.0,
                "disk_read_mbps": 0.0,
                "disk_write_mbps": 0.0,
                "load1_per_cpu": 0.1,
                "net_in_mbps": 0.0,
                "net_out_mbps": 0.0,
                "is_anomaly": False
            }

        # 1. Query Realtime CPU %
        cpu_res = query_promql('100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)')
        for item in cpu_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["cpu_percent"] = round(float(item['value'][1]), 2)

        # 2. Query Realtime RAM %
        ram_res = query_promql('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
        for item in ram_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["ram_percent"] = round(float(item['value'][1]), 2)

        # 3. Query Realtime Disk Size & Free Space
        size_res = query_promql('node_filesystem_size_bytes{mountpoint="/"}' or 'node_filesystem_size_bytes{fstype=~"ext4|xfs"}')
        for item in size_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                val_bytes = float(item['value'][1])
                results[inst]["disk_size_gb"] = round(val_bytes / (1024 ** 3), 2)

        free_res = query_promql('node_filesystem_avail_bytes{mountpoint="/"}' or 'node_filesystem_avail_bytes{fstype=~"ext4|xfs"}')
        for item in free_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                val_free_bytes = float(item['value'][1])
                results[inst]["disk_free_gb"] = round(val_free_bytes / (1024 ** 3), 2)
                size_gb = results[inst]["disk_size_gb"]
                if size_gb > 0:
                    used_gb = size_gb - results[inst]["disk_free_gb"]
                    results[inst]["disk_percent"] = round((used_gb / size_gb) * 100, 2)

        # 4. Query Realtime Disk IOPS
        iops_res = query_promql('sum by (instance) (rate(node_disk_reads_completed_total[1m]) + rate(node_disk_writes_completed_total[1m]))')
        for item in iops_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["disk_iops"] = round(float(item['value'][1]), 2)

        # 5. Query Realtime Disk Read Speed (MB/s)
        read_res = query_promql('sum by (instance) (rate(node_disk_read_bytes_total[1m])) / 1024 / 1024')
        for item in read_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["disk_read_mbps"] = round(float(item['value'][1]), 4)

        # 6. Query Realtime Disk Write Speed (MB/s)
        write_res = query_promql('sum by (instance) (rate(node_disk_written_bytes_total[1m])) / 1024 / 1024')
        for item in write_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["disk_write_mbps"] = round(float(item['value'][1]), 4)

        # 7. Query Realtime Network RX Mbps
        net_res = query_promql('sum by (instance) (rate(node_network_receive_bytes_total[1m])) * 8 / 1024 / 1024')
        for item in net_res:
            inst = item['metric'].get('instance', '')
            if inst in results:
                results[inst]["net_in_mbps"] = round(float(item['value'][1]), 4)

        if results:
            return list(results.values())

    # Fallback to reading the latest lines from CSV dataset
    csv_files = glob.glob(os.path.join(DATASET_DIR, "*.csv"))
    csv_results = []
    
    for filepath in sorted(csv_files):
        server_name = os.path.basename(filepath).replace("_metrics.csv", "")
        records = safe_read_csv_tail(filepath, limit=1)
        if records:
            last_row = records[-1]
            csv_results.append({
                "server_name": server_name,
                "timestamp": str(last_row.get("timestamp")),
                "cpu_percent": float(last_row.get("cpu_percent", 0)),
                "ram_percent": float(last_row.get("ram_percent", 0)),
                "disk_percent": float(last_row.get("disk_percent", 0)),
                "disk_size_gb": float(last_row.get("disk_size_gb", 10)),
                "disk_free_gb": float(last_row.get("disk_free_gb", 5)),
                "load1_per_cpu": float(last_row.get("load1_per_cpu", 0)),
                "disk_iops": float(last_row.get("disk_iops", 0)),
                "disk_read_mbps": float(last_row.get("disk_read_mbps", 0)),
                "disk_write_mbps": float(last_row.get("disk_write_mbps", 0)),
                "net_in_mbps": float(last_row.get("net_in_mbps", 0)),
                "net_out_mbps": float(last_row.get("net_out_mbps", 0)),
                "is_anomaly": bool(last_row.get("is_anomaly", False))
            })
            
    return csv_results

@router.get("/history")
def get_metrics_history(server_name: str = "ubuntu-server-01", limit: int = 30):
    """Lấy lịch sử N mẫu metrics gần nhất của 1 máy chủ từ CSV."""
    filepath = os.path.join(DATASET_DIR, f"{server_name}_metrics.csv")
    return safe_read_csv_tail(filepath, limit=limit)
