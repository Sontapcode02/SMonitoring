#!/bin/bash
# ==============================================================================
# install_workload_daemon.sh — Script Cài Đặt Tiến Trình Mô Phỏng Tải Vận Hành 24/7 Tự Khởi Động Cùng OS
# Chạy lệnh này 1 lần trên từng máy chủ Ubuntu Target để cài đặt systemd service tự chạy cùng boot.
# Sử dụng: sudo bash install_workload_daemon.sh [web|db|app]
# Ví dụ:
#   sudo bash install_workload_daemon.sh web   (Cài đặt cho Ubuntu Server 01 - Web Role)
#   sudo bash install_workload_daemon.sh db    (Cài đặt cho Ubuntu Server 02 - DB Role)
#   sudo bash install_workload_daemon.sh app   (Cài đặt cho Ubuntu Server 03 - App Role)
# ==============================================================================

ROLE=${1:-"web"}

echo "=================================================="
echo " ⚙️ CÀI ĐẶT UBUNTU WORKLOAD DAEMON 24/7 (SYSTEMD SERVICE)"
echo " 🖥️ Server Role: $ROLE"
echo "=================================================="

# 1. Cài đặt stress-ng nếu chưa có
if ! command -v stress-ng &> /dev/null; then
    echo "[1/4] Cài đặt công cụ stress-ng..."
    sudo apt-get update -qq && sudo apt-get install -y -qq stress-ng
fi

# 2. Tạo Daemon Daemon Script tại /usr/local/bin/ubuntu_workload_daemon.sh
echo "[2/4] Khởi tạo daemon script tại /usr/local/bin/ubuntu_workload_daemon.sh..."
cat << 'EOF' | sudo tee /usr/local/bin/ubuntu_workload_daemon.sh > /dev/null
#!/bin/bash
# Daemon sinh tải vận hành tự nhiên liên tục 24/7 có biến thiên theo giờ trong ngày
ROLE=${1:-"web"}

echo "[Workload Daemon] Started 24/7 background loop for role: $ROLE"

while true; do
    # Lấy giờ hiện tại (0-23) để điều chỉnh tải theo chu kỳ ngày/đêm
    HOUR=$(date +%H)
    
    # Ban ngày (8h - 22h): Tải tăng tự nhiên
    # Ban đêm (23h - 7h): Tải giảm xuống mức nghỉ
    if [ "$HOUR" -ge 8 ] && [ "$HOUR" -le 22 ]; then
        CPU_LOAD=$((15 + RANDOM % 20))  # 15% - 35%
        RAM_PCT=$((35 + RANDOM % 15))   # 35% - 50%
    else
        CPU_LOAD=$((5 + RANDOM % 8))    # 5% - 13%
        RAM_PCT=$((20 + RANDOM % 10))   # 20% - 30%
    fi

    case $ROLE in
        web)
            # Mô phỏng Web Server Nginx xử lý HTTP requests & socket traffic
            stress-ng --cpu 2 --cpu-load "$CPU_LOAD" --sock 2 --sock-ops 100000 --vm 1 --vm-bytes "${RAM_PCT}%" --timeout 300s --quiet
            ;;
        db)
            # Mô phỏng DB Server PostgreSQL/MySQL với buffer pool & đĩa ghi WAL
            stress-ng --vm 2 --vm-bytes "${RAM_PCT}%" --hdd 1 --hdd-write-size 2M --timeout 300s --quiet
            ;;
        app)
            # Mô phỏng App Worker / Cron jobs
            stress-ng --cpu 1 --cpu-load "$CPU_LOAD" --vm 1 --vm-bytes "${RAM_PCT}%" --timeout 300s --quiet
            ;;
        *)
            stress-ng --cpu 1 --cpu-load 10 --timeout 300s --quiet
            ;;
    esac

    sleep 5
done
EOF

sudo chmod +x /usr/local/bin/ubuntu_workload_daemon.sh

# 3. Khởi tạo File Systemd Service tại /etc/systemd/system/ubuntu-workload.service
echo "[3/4] Khởi tạo systemd service '/etc/systemd/system/ubuntu-workload.service'..."
cat << EOF | sudo tee /etc/systemd/system/ubuntu-workload.service > /dev/null
[Unit]
Description=Ubuntu 24/7 Normal Operating Workload Simulator Daemon
After=network.target node_exporter.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/ubuntu_workload_daemon.sh $ROLE
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 4. Reload systemd daemon & kích hoạt tự động chạy cùng OS (Boot startup)
echo "[4/4] Kích hoạt service tự động chạy khi bật máy (Boot startup)..."
sudo systemctl daemon-reload
sudo systemctl enable --now ubuntu-workload.service

echo "=================================================="
echo "✅ CÀI ĐẶT HOÀN TẤT!"
echo "Service 'ubuntu-workload' đã được kích hoạt chạy liên tục 24/7 & tự bật cùng OS."
echo " - Kiểm tra trạng thái: sudo systemctl status ubuntu-workload"
echo " - Dừng service:         sudo systemctl stop ubuntu-workload"
echo " - Khởi động lại:       sudo systemctl restart ubuntu-workload"
echo "=================================================="
