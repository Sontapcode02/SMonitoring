#!/usr/bin/env python3
"""
audit_dataset.py — Phân tích chất lượng dữ liệu (Data Quality & EDA Audit) của các file CSV dataset.
"""

import os
import glob
import pandas as pd
import numpy as np

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")

def audit_file(filepath):
    filename = os.path.basename(filepath)
    print(f"\n==================================================")
    print(f" [AUDIT FILE] {filename}")
    print(f"==================================================")
    
    try:
        df = pd.read_csv(filepath)
    except Exception as e:
        print(f"[*] Read error: {e}")
        return
        
    total_rows = len(df)
    print(f"[*] Total dataset rows: {total_rows}")
    
    if total_rows == 0:
        print("[!] File is empty!")
        return
        
    # 1. Thời gian thu thập
    if "timestamp" in df.columns:
        start_time = df["timestamp"].min()
        end_time = df["timestamp"].max()
        print(f"[*] Time range: from {start_time} to {end_time}")
        
    # 2. Kiểm tra Null / NaN
    null_counts = df.isnull().sum()
    total_nulls = null_counts.sum()
    if total_nulls == 0:
        print("[OK] DATA QUALITY PERFECT: 0 missing values (NaN/Null = 0).")
    else:
        print(f"[!] Warning: Found {total_nulls} NaN/Null missing values:")
        for col, count in null_counts.items():
            if count > 0:
                print(f"    - {col}: {count} rows missing")
                
    # 3. Phân tích Thống kê 10 Features (Min, Max, Mean, Std)
    feature_cols = [col for col in df.columns if col not in ["timestamp", "is_anomaly"]]
    print(f"\n[*] 10 Feature Statistics Summary ({len(feature_cols)} metrics):")
    
    stats = df[feature_cols].describe().T[["mean", "std", "min", "max"]]
    print(stats.to_string())
    
    # 4. Kiểm tra sự biến thiên (Variance Check)
    stuck_cols = [col for col in feature_cols if df[col].nunique() <= 1]
    if stuck_cols:
        print(f"\n[!] Warning: Constant zero-variance columns: {stuck_cols}")
    else:
        print(f"\n[OK] Variance Check PASS: All {len(feature_cols)} features show dynamic natural fluctuations!")

def main():
    csv_files = glob.glob(os.path.join(DATASET_DIR, "*.csv"))
    if not csv_files:
        print("[!] No CSV dataset files found in ml/dataset/")
    else:
        for f in sorted(csv_files):
            audit_file(f)

if __name__ == "__main__":
    main()
