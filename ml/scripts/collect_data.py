#!/usr/bin/env python3
"""
collect_data.py — Tự động thu thập 10 metrics từ Prometheus và ghi vào dataset CSV.
Sử dụng: python collect_data.py [--interval 15] [--prometheus http://localhost:9090]
"""

import argparse
import os
import time
import datetime
import requests
import pandas as pd

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")

# PromQL Queries cho bộ 10 features toàn diện
QUERIES = {
    "cpu_percent": '100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)',
    "ram_percent": '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100',
    "load1_per_cpu": 'node_load1 / count by(instance) (node_cpu_seconds_total{mode="idle"})',
    "disk_read_mbps": 'sum by(instance) (rate(node_disk_read_bytes_total[1m])) / 1048576',
    "disk_write_mbps": 'sum by(instance) (rate(node_disk_written_bytes_total[1m])) / 1048576',
    "disk_iops": 'sum by(instance) (rate(node_disk_reads_completed_total[1m])) + sum by(instance) (rate(node_disk_writes_completed_total[1m]))',
    "net_in_mbps": 'sum by(instance) (rate(node_network_receive_bytes_total{device!="lo"}[1m])) * 8 / 1048576',
    "net_out_mbps": 'sum by(instance) (rate(node_network_transmit_bytes_total{device!="lo"}[1m])) * 8 / 1048576',
    "net_packets_in_pps": 'sum by(instance) (rate(node_network_receive_packets_total{device!="lo"}[1m]))',
    "tcp_connections": 'node_netstat_Tcp_CurrEstab',
}

def query_prometheus(prom_url: str, query: str):
    """Gửi PromQL query tới Prometheus và trả về dict {instance: value}."""
    try:
        response = requests.get(f"{prom_url}/api/v1/query", params={"query": query}, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        result = {}
        if data.get("status") == "success":
            for item in data["data"]["result"]:
                instance = item["metric"].get("instance", "unknown")
                server_id = instance.split(":")[0]
                val = float(item["value"][1])
                result[server_id] = round(val, 4)
        return result
    except Exception as e:
        return {}

def collect_step(prom_url: str):
    """Thực hiện 1 lần thu thập metrics từ tất cả servers."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    metrics_by_server = {}
    
    for feature, query in QUERIES.items():
        res = query_prometheus(prom_url, query)
        for server_id, val in res.items():
            if server_id not in metrics_by_server:
                metrics_by_server[server_id] = {"timestamp": timestamp}
            metrics_by_server[server_id][feature] = val
            
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    for server_id, row in metrics_by_server.items():
        # Phải đủ timestamp + 10 features = 11 columns
        if len(row) < 11:
            continue
            
        csv_filename = f"{server_id}_metrics.csv"
        csv_path = os.path.join(DATASET_DIR, csv_filename)
        
        df_row = pd.DataFrame([row])
        file_exists = os.path.exists(csv_path)
        
        df_row.to_csv(csv_path, mode="a", index=False, header=not file_exists)
        print(f"[{timestamp}] 📥 [{server_id}] CPU={row.get('cpu_percent')}% | RAM={row.get('ram_percent')}% | Load1/CPU={row.get('load1_per_cpu')} | IOPS={row.get('disk_iops')} → {csv_filename}")

def main():
    parser = argparse.ArgumentParser(description="Collector data 10 metrics từ Prometheus vào CSV")
    parser.add_argument("--prometheus", default="http://localhost:9090", help="Prometheus URL")
    parser.add_argument("--interval", type=int, default=15, help="Khoảng thời gian thu thập (giây)")
    args = parser.parse_args()

    print("==================================================")
    print(" 🚀 Start Data Collector Service (10 Features)")
    print(f" Target Prometheus: {args.prometheus}")
    print(f" Interval: {args.interval} seconds")
    print(f" Output folder: {os.path.abspath(DATASET_DIR)}")
    print("==================================================")

    while True:
        try:
            collect_step(args.prometheus)
        except Exception as e:
            print(f"❌ Collector error: {e}")
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
