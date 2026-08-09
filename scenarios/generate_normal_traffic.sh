#!/bin/bash
# generate_normal_traffic.sh
# Script giả lập "tải bình thường" (Normal Baseline) cho Ubuntu Server
# Chạy script này ngầm trên VM để sinh dữ liệu tải nhẹ chuẩn cho Isolation Forest học

echo "=================================================="
echo " 🟢 Bắt đầu sinh tải bình thường (Normal Workload)"
echo " Press Ctrl+C to stop"
echo "=================================================="

while true; do
    # 1. Tải CPU nhẹ biến thiên ngẫu nhiên (5% - 15%)
    DURATION=$(( ( RANDOM % 5 ) + 2 ))
    stress --cpu 1 --timeout ${DURATION}s &>/dev/null &
    
    # 2. Đọc/ghi đĩa nhẹ ngẫu nhiên
    dd if=/dev/urandom of=/tmp/normal_temp bs=64k count=50 &>/dev/null
    rm -f /tmp/normal_temp
    
    # 3. Ping mạng giả lập traffic nhẹ
    ping -c 3 8.8.8.8 &>/dev/null
    
    # Nghỉ ngẫu nhiên giữa các lần 5-15 giây
    SLEEP_TIME=$(( ( RANDOM % 10 ) + 5 ))
    sleep $SLEEP_TIME
done
