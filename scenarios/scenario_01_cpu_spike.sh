#!/bin/bash
# scenario_01_cpu_spike.sh — Tạo CPU spike đột ngột
# Yêu cầu: sudo apt install stress -y

echo "=== Kich ban 1: CPU Spike (120 giay) ==="
echo "Thoi gian bat dau: $(date)"
stress --cpu 8 --timeout 120s
echo "Thoi gian ket thuc: $(date)"
echo "=== Done ==="
