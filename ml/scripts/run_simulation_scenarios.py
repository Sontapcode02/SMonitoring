#!/usr/bin/env python3
"""
run_simulation_scenarios.py — Script Chạy Các Kịch Bản Mô Phỏng Dữ Liệu Test & Sự Cố Telemetry (KLTN)
Sử dụng:
  1. Mô phỏng & sinh dataset test (với 5 dạng Anomaly):
     python ml/scripts/run_simulation_scenarios.py --mode generate --days 7 --server ubuntu-server-01

  2. Kích hoạt sự cố Live trực tiếp tới hệ thống Backend đang chạy (API Trigger):
     python ml/scripts/run_simulation_scenarios.py --mode trigger --scenario cpu_spike --server ubuntu-server-01 --duration 60

  3. Đánh giá chất lượng mô hình ML (Precision / Recall / F1-Score) trên Dataset:
     python ml/scripts/run_simulation_scenarios.py --mode evaluate --server ubuntu-server-01
"""

import argparse
import os
import sys
import time
import json
import urllib.request
import urllib.parse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Import ML Sklearn & Joblib
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
    import joblib
except ImportError:
    print("[!] Gợi ý: Hãy cài đặt sklearn và joblib bằng command: pip install scikit-learn joblib pandas numpy")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASET_DIR = os.path.join(BASE_DIR, "ml", "dataset")
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000")

FEATURES = [
    "cpu_percent", "ram_percent", "load1_per_cpu",
    "disk_read_mbps", "disk_write_mbps", "disk_iops",
    "net_in_mbps", "net_out_mbps", "net_packets_in_pps", "tcp_connections"
]

SCENARIOS = {
    "1": ("cpu_spike", "Quá tải CPU Peak Load (> 90% CPU, Load1 > 4.5)"),
    "2": ("ram_leak", "Rò rỉ bộ nhớ Memory Leak (RAM leo thang 95%+)"),
    "3": ("disk_flood", "Tràn ổ đĩa / Bão I/O Disk Write Flood (Write > 60MB/s, IOPS > 4000)"),
    "4": ("syn_flood", "Tấn công mạng / Bão Traffic Network RX Surge (Net RX > 50Mbps)"),
    "5": ("node_offline", "Máy chủ mất kết nối Node Exporter (Tạo Data Gap)"),
}

def generate_scenario_dataset(server_id: str = "ubuntu-server-01", days: int = 7):
    """Kịch bản 1: Sinh bộ dữ liệu Test chuyên sâu với 5 dạng sự cố được tiêm theo mốc thời gian."""
    os.makedirs(DATASET_DIR, exist_ok=True)
    print(f"\n==================================================")
    print(f" 🚀 [GENERATOR] Sinh Dữ Liệu Test Giả Lập Cho Server: {server_id}")
    print(f"==================================================")

    samples_per_day = 5760  # 15 giây 1 sample
    total_samples = days * samples_per_day
    start_time = datetime.now() - timedelta(days=days)
    timestamps = [start_time + timedelta(seconds=15 * i) for i in range(total_samples)]

    np.random.seed(42 + hash(server_id) % 100)

    # 1. Baseline Bình thường
    cpu = np.clip(np.random.normal(loc=12.0, scale=3.0, size=total_samples), 2.0, 90.0)
    ram = np.clip(np.random.normal(loc=45.0, scale=2.0, size=total_samples), 15.0, 85.0)
    load1 = np.clip(cpu / 100.0 * 1.2 + np.random.normal(0, 0.05, total_samples), 0.05, 3.5)
    disk_r = np.clip(np.random.exponential(scale=0.4, size=total_samples), 0.0, 30.0)
    disk_w = np.clip(np.random.exponential(scale=0.6, size=total_samples), 0.0, 30.0)
    disk_iops = np.clip((disk_r + disk_w) * 100 + np.random.normal(40, 10, total_samples), 10, 3000)
    net_in = np.clip(np.random.normal(loc=4.5, scale=1.2, size=total_samples), 0.1, 50.0)
    net_out = np.clip(np.random.normal(loc=6.0, scale=1.5, size=total_samples), 0.1, 50.0)
    net_pps = np.clip((net_in + net_out) * 120 + np.random.normal(80, 15, total_samples), 40, 8000)
    tcp_conn = np.clip(np.random.poisson(lam=40, size=total_samples), 5, 400)

    is_anomaly = np.zeros(total_samples, dtype=int)

    # 2. Tiêm các kịch bản sự cố thực tế
    num_anomalies = int(total_samples * 0.04)  # 4% mẫu bất thường
    anomaly_indices = np.random.choice(total_samples, size=num_anomalies, replace=False)

    for idx in anomaly_indices:
        is_anomaly[idx] = 1
        scenario_choice = np.random.choice(["cpu_spike", "ram_leak", "disk_flood", "syn_flood"])
        if scenario_choice == "cpu_spike":
            cpu[idx] = np.random.uniform(90.0, 99.8)
            load1[idx] = np.random.uniform(4.5, 9.0)
        elif scenario_choice == "ram_leak":
            ram[idx] = np.random.uniform(92.0, 99.0)
        elif scenario_choice == "disk_flood":
            disk_w[idx] = np.random.uniform(55.0, 150.0)
            disk_iops[idx] = np.random.uniform(3500, 9500)
        elif scenario_choice == "syn_flood":
            net_in[idx] = np.random.uniform(50.0, 120.0)
            net_pps[idx] = np.random.uniform(9000, 30000)
            tcp_conn[idx] = np.random.randint(450, 1500)

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
        "is_anomaly": is_anomaly
    })

    filepath = os.path.join(DATASET_DIR, f"{server_id}_metrics.csv")
    df.to_csv(filepath, index=False)
    print(f"[OK] Đã xuất thành công Dataset: {filepath}")
    print(f"     - Tổng số mẫu: {len(df)} dòng")
    print(f"     - Số mẫu sự cố (Anomalies): {df['is_anomaly'].sum()} dòng ({df['is_anomaly'].mean()*100:.2f}%)")

def trigger_live_scenario(server_name: str, event_type: str, duration_sec: int = 60):
    """Kịch bản 2: Gửi API Trigger kích hoạt trực tiếp sự cố tới hệ thống Backend đang chạy."""
    url = f"{BACKEND_API_URL}/api/simulator/trigger"
    payload = {
        "server_name": server_name,
        "event_type": event_type,
        "duration_sec": duration_sec
    }
    print(f"\n==================================================")
    print(f" 📡 [TRIGGER LIVE] Kích hoạt kịch bản: '{event_type}' trên '{server_name}'")
    print(f"==================================================")
    try:
        data_json = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data_json, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            res = json.loads(resp.read().decode())
            print(f"[OK] API Response: {res['message']}")
            print(f"     - Thời lượng sự cố: {duration_sec}s")
            print(f"     - Trạng thái Active Triggers: {res.get('active_triggers')}")
            print(f" 💡 Hãy mở Web Dashboard tại http://localhost để quan sát sự thay đổi trên biểu đồ real-time!")
    except Exception as e:
        print(f"[!] Lỗi kết nối Backend API ({url}): {e}")

def evaluate_ml_model(server_id: str = "ubuntu-server-01"):
    """Kịch bản 3: Đánh giá mô hình Isolation Forest (Precision, Recall, F1-Score) trên Dataset Test."""
    csv_path = os.path.join(DATASET_DIR, f"{server_id}_metrics.csv")
    model_path = os.path.join(MODEL_DIR, f"if_{server_id}.pkl")
    scaler_path = os.path.join(MODEL_DIR, f"scaler_{server_id}.pkl")

    print(f"\n==================================================")
    print(f" 🧪 [EVALUATION] Đánh Giá Mô Hình ML Isolation Forest: {server_id}")
    print(f"==================================================")

    if not os.path.exists(csv_path):
        print(f"[!] Không tìm thấy file dataset: {csv_path}. Hãy chạy --mode generate trước!")
        return

    df = pd.read_csv(csv_path)
    X = df[FEATURES].fillna(0).values
    y_true = df["is_anomaly"].values

    if os.path.exists(model_path) and os.path.exists(scaler_path):
        print(f"[+] Tải mô hình đã train: {model_path}")
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        X_scaled = scaler.transform(X)
    else:
        print(f"[+] Chưa có model saved. Đang tự động fit nhanh Isolation Forest...")
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)
        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1)
        model.fit(X_scaled)

    # Inference (Predict: -1 là Anomaly, 1 là Normal)
    preds = model.predict(X_scaled)
    y_pred = np.where(preds == -1, 1, 0)

    p = precision_score(y_true, y_pred, zero_division=0)
    r = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    cm = confusion_matrix(y_true, y_pred)

    print("\n--- BÁO CÁO KẾT QUẢ ĐÁNH GIÁ MÔ HÌNH (ML PERFORMANCE REPORT) ---")
    print(f" - Total Test Samples:  {len(df)}")
    print(f" - True Anomalies:      {sum(y_true)}")
    print(f" - Predicted Anomalies: {sum(y_pred)}")
    print(f" - Precision Score:     {p * 100:.2f}%")
    print(f" - Recall Score:        {r * 100:.2f}%")
    print(f" - F1-Score:            {f1 * 100:.2f}%")
    print("\nConfusion Matrix (Ma trận nhầm lẫn):")
    print(f"  [TN={cm[0][0]:<6} FP={cm[0][1]:<6}]")
    print(f"  [FN={cm[1][0]:<6} TP={cm[1][1]:<6}]")
    print("------------------------------------------------------------------")

def main():
    parser = argparse.ArgumentParser(description="Script Chạy Kịch Bản Mô Phỏng Dataset & Sự Cố Telemetry (KLTN)")
    parser.add_argument("--mode", choices=["generate", "trigger", "evaluate"], default="evaluate", help="Chế độ chạy: generate (sinh dataset), trigger (kích hoạt live sự cố), evaluate (đánh giá ML)")
    parser.add_argument("--server", default="ubuntu-server-01", help="ID Máy chủ (mặc định: ubuntu-server-01)")
    parser.add_argument("--scenario", default="cpu_spike", choices=["cpu_spike", "ram_leak", "disk_flood", "syn_flood", "node_offline"], help="Kịch bản sự cố cho mode trigger")
    parser.add_argument("--duration", type=int, default=60, help="Thời lượng sự cố (giây)")
    parser.add_argument("--days", type=int, default=7, help="Số ngày sinh dữ liệu test")

    args = parser.parse_args()

    if args.mode == "generate":
        generate_scenario_dataset(args.server, args.days)
    elif args.mode == "trigger":
        trigger_live_scenario(args.server, args.scenario, args.duration)
    elif args.mode == "evaluate":
        evaluate_ml_model(args.server)

if __name__ == "__main__":
    main()
