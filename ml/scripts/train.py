#!/usr/bin/env python3
"""
train.py — Train Isolation Forest model cho từng server với 10 features
Usage: python train.py --server ubuntu-server-01 --days 7
"""

import argparse
import os
import time
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler
import joblib

# Bộ 10 Features toàn diện cho hệ thống giám sát Ubuntu
FEATURES = [
    "cpu_percent",
    "ram_percent",
    "load1_per_cpu",
    "disk_read_mbps",
    "disk_write_mbps",
    "disk_iops",
    "net_in_mbps",
    "net_out_mbps",
    "net_packets_in_pps",
    "tcp_connections"
]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")


def load_data(server_id: str, days: int = 7):
    """Load và xử lý dữ liệu metrics từ CSV."""
    csv_path = os.path.join(DATASET_DIR, f"{server_id}_metrics.csv")

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found: {csv_path}")

    df = pd.read_csv(csv_path, parse_dates=["timestamp"])
    df = df.sort_values("timestamp")

    cutoff = df["timestamp"].max() - pd.Timedelta(days=days)
    df = df[df["timestamp"] >= cutoff]

    # Kiểm tra xem file CSV có đủ 10 features không
    missing_cols = [col for col in FEATURES if col not in df.columns]
    if missing_cols:
        raise ValueError(f"CSV missing features: {missing_cols}")

    df[FEATURES] = df[FEATURES].ffill().bfill().fillna(0)

    print(f"[Data] Loaded {len(df)} samples with 10 features from {csv_path}")
    return df[FEATURES].values


def train(server_id: str, days: int = 7, contamination: float = 0.05):
    """Train Isolation Forest và lưu model."""
    os.makedirs(MODEL_DIR, exist_ok=True)

    X = load_data(server_id, days)

    # Scale
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    # Train
    print(f"[Train] Training Isolation Forest on {len(X)} samples...")
    start = time.time()

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)

    elapsed = time.time() - start
    print(f"[Train] Done in {elapsed:.2f}s")

    # Export
    model_path = os.path.join(MODEL_DIR, f"if_{server_id}.pkl")
    scaler_path = os.path.join(MODEL_DIR, f"scaler_{server_id}.pkl")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    print(f"[Save] Model → {model_path}")
    print(f"[Save] Scaler → {scaler_path}")

    scores = model.decision_function(X_scaled)
    anomaly_count = (model.predict(X_scaled) == -1).sum()
    print(f"[Stats] Score range: [{scores.min():.3f}, {scores.max():.3f}]")
    print(f"[Stats] Detected anomalies: {anomaly_count} / {len(X)} ({anomaly_count/len(X)*100:.1f}%)")

    return {
        "server_id": server_id,
        "samples": len(X),
        "train_time_sec": round(elapsed, 2),
        "contamination": contamination,
        "anomaly_count": int(anomaly_count),
        "features_count": len(FEATURES),
        "model_path": model_path
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Isolation Forest 10 Features")
    parser.add_argument("--server", required=True, help="Server ID (e.g. ubuntu-server-01)")
    parser.add_argument("--days", type=int, default=7, help="Days of data to use")
    parser.add_argument("--contamination", type=float, default=0.05, help="Expected anomaly ratio")
    args = parser.parse_args()

    result = train(args.server, args.days, args.contamination)
    print(f"\n[Result] {result}")
