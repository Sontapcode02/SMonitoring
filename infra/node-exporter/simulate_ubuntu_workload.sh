#!/bin/bash
# ==============================================================================
# simulate_ubuntu_workload.sh — Script Mô Phỏng Tải Vận Hành Thường Ngày Của Máy Chủ Ubuntu
# Giả lập các hoạt động thực tế (Web server requests, DB queries, Log rotation, Worker jobs)
# Sử dụng: sudo bash simulate_ubuntu_workload.sh [web|db|app] [thời_gian_phút]
# Ví dụ:
#   sudo bash simulate_ubuntu_workload.sh web 30   (Giả lập tải Web Server Nginx trong 30 phút)
#   sudo bash simulate_ubuntu_workload.sh db 60    (Giả lập tải Database Server MySQL/Postgres trong 60 phút)
#   sudo bash simulate_ubuntu_workload.sh app 30   (Giả lập tải Application Worker trong 30 phút)
#   sudo bash simulate_ubuntu_workload.sh stop     (Dừng mô phỏng tải vận hành)
# ==============================================================================

ROLE=${1:-"web"}
DURATION_MIN=${2:-30}
DURATION_SEC=$((DURATION_MIN * 60))

echo "=================================================="
echo " ⚙️ UBUNTU NORMAL OPERATING WORKLOAD SIMULATOR"
echo " 🖥️ Target Role Workload: $ROLE"
echo " ⏱️ Duration: ${DURATION_MIN} minutes (${DURATION_SEC}s)"
echo "=================================================="

if [ "$ROLE" == "stop" ]; then
    echo "[*] Đang dừng tất cả tiến trình mô phỏng tải vận hành..."
    sudo pkill -f "stress-ng" || true
    sudo pkill -f "dd if=/dev/urandom" || true
    echo "✅ Đã đưa hệ thống về trạng thái nghỉ (Idle) bình thường!"
    exit 0
fi

# Cài đặt stress-ng nếu chưa có
if ! command -v stress-ng &> /dev/null; then
    echo "[!] Đang cài đặt stress-ng..."
    sudo apt-get update -qq && sudo apt-get install -y -qq stress-ng
fi

case $ROLE in
    web)
        echo "🌐 [WEB SERVER WORKLOAD] Giả lập xử lý HTTP Requests, SSL Handshakes & Dynamic Traffic..."
        echo "   - Tải CPU: dao động tự nhiên 15% - 35%"
        echo "   - Tải RAM: duy trì 35% - 45%"
        echo "   - Network/Socket IO: xử lý luồng kết nối liên tục"
        
        # Bơm tải nhẹ mô phỏng web server với 20% CPU load và socket connections
        sudo stress-ng --cpu 2 --cpu-load 25 --sock 2 --sock-ops 500000 --vm 1 --vm-bytes 35% --timeout "${DURATION_SEC}s" --metrics-brief &
        ;;

    db)
        echo "🗄️ [DATABASE SERVER WORKLOAD] Giả lập truy vấn SQL Query, Buffer Cache & Disk Checkpoints..."
        echo "   - Tải CPU: dao động 20% - 40%"
        echo "   - Tải RAM: duy trì Buffer Pool Memory ~60%"
        echo "   - Disk I/O: đọc/ghi log WAL & Flush checkpoint nhịp nhàng"
        
        # Mô phỏng DB workload: RAM buffer cache + Ghi đĩa định kỳ 2-5 MB/s
        sudo stress-ng --vm 2 --vm-bytes 55% --hdd 1 --hdd-write-size 4M --timeout "${DURATION_SEC}s" --metrics-brief &
        ;;

    app)
        echo "⚙️ [APPLICATION WORKLOAD] Giả lập Queue Workers, Cron Jobs & Background Processing..."
        echo "   - Tải CPU: nhịp nhàng theo chu kỳ worker"
        echo "   - Tải RAM: duy trì 30% - 40%"
        
        # Mô phỏng App Background Job
        sudo stress-ng --cpu 1 --cpu-load 15 --vm 1 --vm-bytes 30% --timeout "${DURATION_SEC}s" --metrics-brief &
        ;;

    *)
        echo "[!] Role không hợp lệ. Chọn từ: web, db, app, stop"
        exit 1
        ;;
esac

echo "=================================================="
echo "🚀 Đã khởi chạy mô phỏng tải vận hành '$ROLE' thành công!"
echo "Node Exporter đang thu thập các chỉ số biến động tự nhiên đẩy về Prometheus & Web Dashboard."
echo "Để dừng trước thời hạn, chạy: sudo bash simulate_ubuntu_workload.sh stop"
echo "=================================================="
