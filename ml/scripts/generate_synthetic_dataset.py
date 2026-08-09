#!/usr/bin/env python3
"""
generate_synthetic_dataset.py — Tạo bộ dữ liệu mẫu chuẩn (7 ngày, 10 features)
Dùng để huấn luyện ML và kiểm thử ngay lập tức mà không cần chờ 7 ngày thu thập thật.
Sử dụng: python generate_synthetic_dataset.py --days 7 --samples-per-day 5760
"""

import argparse
import os
import datetime
import numpy as np
import pandas as pd

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")

SERVERS = [
    ("ubuntu-server-01", 12.0, 45.0),  # Web Server (tải CPU ~12%, RAM ~45%)
    ("ubuntu-server-02", 18.0, 65.0),  # DB Server (tải CPU ~18%, RAM ~65%)
    ("ubuntu-server-03", 8.0,  30.0),  # App Server (tải CPU ~8%, RAM ~30%)
]

def generate_server_dataset(server_id: str, base_cpu: float, base_ram: float, days: int = 7):
    """Sinh dữ liệu giả lập 10 features thực tế với các anomaly được tiêm ngẫu nhiên."""
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    # 15 giây 1 sample → 4 samples/phút = 5760 samples/ngày
    samples_per_day = 5760
    total_samples = days * samples_per_day
    
    start_time = datetime.datetime.now() - datetime.timedelta(days=days)
    timestamps = [start_time + datetime.timedelta(seconds=15 * i) for i in range(total_samples)]
    
    np.random.seed(42 + hash(server_id) % 100)
    
    # 1. Sinh chuỗi thời gian bình thường (Gaussian noise)
    cpu = np.clip(np.random.normal(loc=base_cpu, scale=3.0, size=total_samples), 2.0, 95.0)
    ram = np.clip(np.random.normal(loc=base_ram, scale=2.0, size=total_samples), 10.0, 95.0)
    load1 = np.clip(cpu / 100.0 * 1.5 + np.random.normal(0, 0.1, total_samples), 0.05, 4.0)
    
    disk_r = np.clip(np.random.exponential(scale=0.5, size=total_samples), 0.0, 50.0)
    disk_w = np.clip(np.random.exponential(scale=0.8, size=total_samples), 0.0, 50.0)
    disk_iops = np.clip((disk_r + disk_w) * 120 + np.random.normal(50, 10, total_samples), 10, 5000)
    
    net_in = np.clip(np.random.normal(loc=5.0, scale=1.5, size=total_samples), 0.1, 100.0)
    net_out = np.clip(np.random.normal(loc=8.0, scale=2.0, size=total_samples), 0.1, 100.0)
    net_pps = np.clip((net_in + net_out) * 150 + np.random.normal(100, 20, total_samples), 50, 10000)
    tcp_conn = np.clip(np.random.poisson(lam=45, size=total_samples), 5, 500)
    
    is_anomaly = np.zeros(total_samples, dtype=int)
    
    # 2. Tiêm Anomaly (5% tổng số mẫu)
    num_anomalies = int(total_samples * 0.04)  # 4% bất thường
    anomaly_indices = np.random.choice(total_samples, size=num_anomalies, replace=False)
    
    for idx in anomaly_indices:
        is_anomaly[idx] = 1
        anomaly_type = np.random.choice(["cpu_spike", "ram_leak", "disk_flood", "syn_flood"])
        
        if anomaly_type == "cpu_spike":
            cpu[idx] = np.random.uniform(88.0, 99.5)
            load1[idx] = np.random.uniform(3.5, 8.0)
        elif anomaly_type == "ram_leak":
            ram[idx] = np.random.uniform(90.0, 98.5)
        elif anomaly_type == "disk_flood":
            disk_w[idx] = np.random.uniform(40.0, 120.0)
            disk_iops[idx] = np.random.uniform(3000, 8000)
        elif anomaly_type == "syn_flood":
            net_pps[idx] = np.random.uniform(8000, 25000)
            tcp_conn[idx] = np.random.randint(300, 1200)

    df = pd.DataFrame({
        "timestamp": [t.strftime("%Y-%m-%d %H:%M:%S") for t in timestamps],
        "cpu_percent": np.round(cpu, 2),
        "ram_percent": np.round(ram, 2),
        "load1_per_cpu": np.round(load1, 3),
        "disk_read_mbps": np.round(disk_r, 3),
        "disk_write_mbps": np.round(disk_w, 3),
        "disk_iops": np.round(disk_iops, 1),
        "net_in_mbps": np.round(net_in, 3),
        "net_out_mbps": np.round(net_out, 3),
        "net_packets_in_pps": np.round(net_pps, 1),
        "tcp_connections": tcp_conn,
        "is_anomaly": is_anomaly  # Ground truth label cho việc test P/R/F1
    })
    
    csv_path = os.path.join(DATASET_DIR, f"{server_id}_metrics.csv")
    df.to_csv(csv_path, index=False)
    print(f"[OK] Generated dataset: {csv_path} ({len(df)} rows, {df['is_anomaly'].sum()} anomalies)")

def main():
    parser = argparse.ArgumentParser(description="Sinh dữ liệu mẫu 7 ngày cho 3 máy chủ")
    parser.add_argument("--days", type=int, default=7, help="Số ngày dữ liệu (default: 7)")
    args = parser.parse_args()
    
    print("==================================================")
    print(f" [*] Generating Synthetic Dataset ({args.days} days)")
    print("==================================================")
    
    for server_id, cpu, ram in SERVERS:
        generate_server_dataset(server_id, cpu, ram, args.days)
        
    print("==================================================")
    print("[OK] Done! Datasets generated in ml/dataset/")
    print("Run: python ml/scripts/train.py --server ubuntu-server-01")
    print("==================================================")

if __name__ == "__main__":
    main()
