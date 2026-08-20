from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import glob
import json
import io
import re
import time
import urllib.request
import urllib.parse
import pandas as pd
from datetime import datetime

from app.core.database import get_db, SessionLocal
from app.models.schemas import ServerModel, AlertModel

router = APIRouter()
# Fix dataset path to point to root /ml/dataset
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DATASET_DIR = os.path.join(BASE_DIR, "ml", "dataset")
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
PROMETHEUS_CONFIG_PATH = os.path.join(BASE_DIR, "infra", "prometheus", "prometheus.yml")

# Global memory store to compute accurate real-time delta CPU, Disk MB/s, IOPS, and Net RX Mbps for direct HTTP scraping
prev_metrics_memory = {}

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

def parse_node_exporter_direct(ip: str, port: int = 9100):
    """Cào trực tiếp HTTP Node Exporter của máy chủ để lấy % CPU, RAM, Disk, IOPS & Net RX MB/s thực tế tức thì."""
    url = f"http://{ip}:{port}/metrics"
    try:
        req = urllib.request.urlopen(url, timeout=2)
        text = req.read().decode('utf-8', errors='ignore')
        
        # Cumulative Counters
        idle_sec = 0.0
        total_sec = 0.0
        read_bytes = 0.0
        write_bytes = 0.0
        reads_cnt = 0.0
        writes_cnt = 0.0
        rx_bytes = 0.0

        for line in text.splitlines():
            if line.startswith("#") or not line.strip():
                continue
            
            # CPU Counters (Linux node_cpu_seconds_total & Windows windows_cpu_time_total)
            if line.startswith("node_cpu_seconds_total") or line.startswith("windows_cpu_time_total"):
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        val = float(parts[-1])
                        total_sec += val
                        if 'mode="idle"' in line:
                            idle_sec += val
                    except ValueError: pass

            # Disk Counters (filter out optical sr and loop devices and Windows recovery volumes)
            elif ("node_disk_" in line or "windows_logical_disk_" in line) and 'device="sr' not in line and 'device="loop' not in line and 'HarddiskVolume' not in line:
                parts = line.split()
                if len(parts) >= 2:
                    try:
                        val = float(parts[-1])
                        if "read_bytes" in line or "read_bytes_total" in line:
                            read_bytes += val
                        elif "written_bytes" in line or "write_bytes_total" in line:
                            write_bytes += val
                        elif "reads_completed_total" in line or "reads_total" in line:
                            reads_cnt += val
                        elif "writes_completed_total" in line or "writes_total" in line:
                            writes_cnt += val
                    except ValueError: pass

            # Network Counters (filter out loopback)
            elif (line.startswith("node_network_receive_bytes_total") or line.startswith("windows_net_bytes_received_total")) and 'device="lo"' not in line:
                parts = line.split()
                if len(parts) >= 2:
                    try: rx_bytes += float(parts[-1])
                    except ValueError: pass

        key = f"{ip}:{port}"
        now_t = time.time()

        # Defaults
        cpu_pct = 5.0
        disk_read_mbps = 0.0
        disk_write_mbps = 0.0
        disk_iops = 0.0
        net_in_mbps = 0.0

        if key in prev_metrics_memory:
            prev_idle, prev_total, prev_r_bytes, prev_w_bytes, prev_r_cnt, prev_w_cnt, prev_rx_bytes, prev_t = prev_metrics_memory[key]
            dt = max(0.1, now_t - prev_t)

            # 1. Delta CPU %
            d_idle = idle_sec - prev_idle
            d_total = total_sec - prev_total
            if d_total > 0:
                cpu_pct = max(0.0, min(100.0, round((1.0 - d_idle / d_total) * 100.0, 2)))

            # 2. Delta Disk Read/Write MB/s
            d_r_bytes = max(0.0, read_bytes - prev_r_bytes)
            d_w_bytes = max(0.0, write_bytes - prev_w_bytes)
            disk_read_mbps = round((d_r_bytes / (1024 * 1024)) / dt, 4)
            disk_write_mbps = round((d_w_bytes / (1024 * 1024)) / dt, 4)

            # 3. Delta Disk IOPS
            d_r_cnt = max(0.0, reads_cnt - prev_r_cnt)
            d_w_cnt = max(0.0, writes_cnt - prev_w_cnt)
            disk_iops = round((d_r_cnt + d_w_cnt) / dt, 1)

            # 4. Delta Net RX Mbps
            d_rx_bytes = max(0.0, rx_bytes - prev_rx_bytes)
            net_in_mbps = round(((d_rx_bytes * 8) / (1024 * 1024)) / dt, 4)

        prev_metrics_memory[key] = (idle_sec, total_sec, read_bytes, write_bytes, reads_cnt, writes_cnt, rx_bytes, now_t)

        # RAM % (Linux node_memory_... & Windows windows_memory_available_bytes)
        total_m = re.search(r'(?:node_memory_MemTotal_bytes|windows_cs_physical_memory_bytes)\s+([0-9\.e\+]+)', text)
        avail_m = re.search(r'(?:node_memory_MemAvailable_bytes|windows_memory_available_bytes)\s+([0-9\.e\+]+)', text)
        ram_pct = 24.5
        if total_m and avail_m:
            tot = float(total_m.group(1))
            avl = float(avail_m.group(1))
            if tot > 0:
                ram_pct = round((1 - avl / tot) * 100, 2)
        elif avail_m:
            avl_gb = float(avail_m.group(1)) / (1024**3)
            tot_gb = 16.0
            ram_pct = round(max(0.0, min(100.0, (1 - avl_gb / tot_gb) * 100)), 2)

        # Disk Size & Free Space (Linux node_filesystem_... & Windows windows_logical_disk_...)
        d_size_m = re.search(r'(?:node_filesystem_size_bytes|windows_logical_disk_size_bytes\{volume="C:"\})\s+([0-9\.e\+]+)', text)
        d_free_m = re.search(r'(?:node_filesystem_avail_bytes|windows_logical_disk_free_bytes\{volume="C:"\})\s+([0-9\.e\+]+)', text)
        d_size_gb = round(float(d_size_m.group(1)) / (1024**3), 2) if d_size_m else 10.0
        d_free_gb = round(float(d_free_m.group(1)) / (1024**3), 2) if d_free_m else 4.5
        d_pct = round(((d_size_gb - d_free_gb) / d_size_gb) * 100, 2) if d_size_gb > 0 else 55.4

        return {
            "status": "online",
            "cpu_percent": cpu_pct,
            "ram_percent": ram_pct,
            "disk_percent": d_pct,
            "disk_size_gb": d_size_gb,
            "disk_free_gb": d_free_gb,
            "disk_iops": disk_iops,
            "disk_read_mbps": disk_read_mbps,
            "disk_write_mbps": disk_write_mbps,
            "net_in_mbps": net_in_mbps,
            "is_scraped_direct": True
        }
    except Exception as e:
        print(f"[Direct Scrape Failed] {ip}:{port} - {e}")
        return {"status": "offline", "cpu_percent": 0.0, "ram_percent": 0.0, "is_scraped_direct": False}

def evaluate_and_trigger_alerts(res: dict, db: Session):
    """Đánh giá ngưỡng chỉ số thực tế (CPU > 80%, RAM > 85%, etc.) để kích hoạt Anomaly & Tự Động Phục Hồi (Auto-Recovery)."""
    cpu = res.get("cpu_percent", 0.0)
    ram = res.get("ram_percent", 0.0)
    server_id = res.get("server_id")
    server_name = res.get("server_name")
    ip_addr = res.get("ip_address")

    is_anomaly = False

    # 1. CPU High Stress Test Anomaly & Auto-Recovery Rule
    if cpu > 80.0:
        is_anomaly = True
        existing_alert = db.query(AlertModel).filter(
            AlertModel.server_id == server_id,
            AlertModel.alert_type == "HIGH_CPU_LOAD",
            AlertModel.status.in_(["new", "ack"])
        ).first()
        if not existing_alert:
            new_alert = AlertModel(
                server_id=server_id,
                alert_type="HIGH_CPU_LOAD",
                message=f"[STRESS DETECTED] Máy chủ {server_name} ({ip_addr}) quá tải CPU vọt mức {cpu:.1f}%!",
                severity="critical" if cpu > 90.0 else "high",
                status="new",
                timestamp=datetime.utcnow()
            )
            db.add(new_alert)
            db.commit()
    else:
        # CPU has dropped back to safe range (<= 80%) -> AUTO-RECOVER active HIGH_CPU_LOAD alerts!
        active_cpu_alerts = db.query(AlertModel).filter(
            AlertModel.server_id == server_id,
            AlertModel.alert_type == "HIGH_CPU_LOAD",
            AlertModel.status.in_(["new", "ack"])
        ).all()
        if active_cpu_alerts:
            for alert in active_cpu_alerts:
                alert.status = "resolved"
            db.commit()

    # 2. RAM High Stress Test Anomaly & Auto-Recovery Rule
    if ram > 85.0:
        is_anomaly = True
        existing_alert = db.query(AlertModel).filter(
            AlertModel.server_id == server_id,
            AlertModel.alert_type == "HIGH_RAM_USAGE",
            AlertModel.status.in_(["new", "ack"])
        ).first()
        if not existing_alert:
            new_alert = AlertModel(
                server_id=server_id,
                alert_type="HIGH_RAM_USAGE",
                message=f"[STRESS DETECTED] Máy chủ {server_name} ({ip_addr}) tràn RAM ở mức {ram:.1f}%!",
                severity="high",
                status="new",
                timestamp=datetime.utcnow()
            )
            db.add(new_alert)
            db.commit()
    else:
        # RAM has dropped back to safe range (<= 85%) -> AUTO-RECOVER active HIGH_RAM_USAGE alerts!
        active_ram_alerts = db.query(AlertModel).filter(
            AlertModel.server_id == server_id,
            AlertModel.alert_type == "HIGH_RAM_USAGE",
            AlertModel.status.in_(["new", "ack"])
        ).all()
        if active_ram_alerts:
            for alert in active_ram_alerts:
                alert.status = "resolved"
            db.commit()

    res["is_anomaly"] = is_anomaly

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
    has_prom_data = set()
    cpu_res = query_promql('100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)')
    for item in cpu_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["cpu_percent"] = round(float(item['value'][1]), 2)
                res["status"] = "online"
                has_prom_data.add(k)

    # 3. Query Realtime RAM %
    ram_res = query_promql('(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100')
    for item in ram_res:
        inst = item['metric'].get('instance', '')
        for k, res in results.items():
            if inst == k or item['metric'].get('server_name') == res['server_name']:
                res["ram_percent"] = round(float(item['value'][1]), 2)
                has_prom_data.add(k)

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

    # 8. DIRECT NODE EXPORTER HTTP SCRAPE FALLBACK WITH REAL CPU, DISK MB/S, IOPS & NET RX CALCULATIONS!
    for k, res in results.items():
        direct_data = parse_node_exporter_direct(res["ip_address"], res["port"])
        if direct_data and direct_data.get("status") == "online":
            res["status"] = "online"
            if k not in has_prom_data or direct_data["cpu_percent"] > res["cpu_percent"]:
                res["cpu_percent"] = direct_data["cpu_percent"]
            res["ram_percent"] = direct_data["ram_percent"]
            res["disk_percent"] = direct_data["disk_percent"]
            res["disk_size_gb"] = direct_data["disk_size_gb"]
            res["disk_free_gb"] = direct_data["disk_free_gb"]
            if direct_data["disk_iops"] > res["disk_iops"]: res["disk_iops"] = direct_data["disk_iops"]
            if direct_data["disk_read_mbps"] > res["disk_read_mbps"]: res["disk_read_mbps"] = direct_data["disk_read_mbps"]
            if direct_data["disk_write_mbps"] > res["disk_write_mbps"]: res["disk_write_mbps"] = direct_data["disk_write_mbps"]
            if direct_data["net_in_mbps"] > res["net_in_mbps"]: res["net_in_mbps"] = direct_data["net_in_mbps"]

        # 9. EVALUATE ANOMALY & AUTOMATIC ALERT RECOVERY (AUTO-RESOLVE ALERTS WHEN METRICS STABILIZE)
        evaluate_and_trigger_alerts(res, db)

    return list(results.values())

@router.get("/history")
def get_metrics_history(server_name: str = "ubuntu-server-01", limit: int = 30):
    """Lấy lịch sử N mẫu metrics gần nhất của 1 máy chủ từ CSV."""
    filepath = os.path.join(DATASET_DIR, f"{server_name}_metrics.csv")
    return safe_read_csv_tail(filepath, limit=limit)
