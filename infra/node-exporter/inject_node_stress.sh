#!/bin/bash
# ==============================================================================
# inject_node_stress.sh — Script Bơm Tải & Giả Lập Sự Cố Thực Tế Trực Tiếp Lên Ubuntu Node
# Sử dụng: sudo bash inject_node_stress.sh [cpu|ram|disk|net|offline|stop] [thời_gian_giây]
# Ví dụ: 
#   sudo bash inject_node_stress.sh cpu 60      (Bơm quá tải CPU 100% trong 60s)
#   sudo bash inject_node_stress.sh ram 45      (Bơm tràn RAM 90% trong 45s)
#   sudo bash inject_node_stress.sh disk 30     (Bơm bão I/O ghi đĩa 100MB/s trong 30s)
#   sudo bash inject_node_stress.sh net 45      (Bơm bão gói tin mạng trong 45s)
#   sudo bash inject_node_stress.sh offline 60  (Ngắt service Node Exporter 60s -> Offline)
#   sudo bash inject_node_stress.sh stop        (Dừng khẩn cấp toàn bộ tiến trình bơm tải)
# ==============================================================================

TYPE=${1:-"cpu"}
DURATION=${2:-45}

echo "=================================================="
echo " ⚡ UBUNTU NODE STRESS INJECTOR"
echo " 🎯 Target Event Type: $TYPE"
echo " ⏱️ Duration: ${DURATION}s"
echo "=================================================="

# 1. Kiểm tra & cài đặt tự động stress-ng (nếu chưa có)
if ! command -v stress-ng &> /dev/null; then
    echo "[!] Đang cài đặt công cụ stress-ng..."
    sudo apt-get update -qq && sudo apt-get install -y -qq stress-ng
fi

# 2. Xử lý kịch bản dừng khẩn cấp
if [ "$TYPE" == "stop" ]; then
    echo "[*] Đang dừng tất cả tiến trình stress-ng & khôi phục Node Exporter..."
    sudo pkill -f stress-ng || true
    sudo pkill -f dd || true
    sudo pkill -f ping || true
    sudo systemctl start node_exporter || true
    echo "✅ Đã khôi phục trạng thái bình thường!"
    exit 0
fi

# 3. Kích hoạt các kịch bản bơm tải trực tiếp lên Linux Kernel
case $TYPE in
    cpu)
        echo "🔥 [SCENARIO 1] Bơm tải CPU 100% trên tất cả các nhân CPU..."
        sudo stress-ng --cpu 0 --cpu-method all --timeout "${DURATION}s" --metrics-brief &
        ;;

    ram)
        echo "🧠 [SCENARIO 2] Bơm tràn RAM (Memory Leak 85-95%)..."
        sudo stress-ng --vm 2 --vm-bytes 85% --timeout "${DURATION}s" --metrics-brief &
        ;;

    disk)
        echo "💾 [SCENARIO 3] Bơm bão I/O Ghi Đĩa (Disk Write Flood & High IOPS)..."
        sudo stress-ng --io 4 --hdd 2 --hdd-bytes 1G --timeout "${DURATION}s" --metrics-brief &
        ;;

    net)
        echo "🌐 [SCENARIO 4] Bơm bão mạng Network Traffic Surge..."
        sudo stress-ng --sock 4 --sock-ops 100000 --timeout "${DURATION}s" --metrics-brief &
        ;;

    offline)
        echo "🔌 [SCENARIO 5] Giả lập Server Offline (Stop Node Exporter Service trong ${DURATION}s)..."
        sudo systemctl stop node_exporter
        echo "⚠️ Node Exporter service đã dừng. Node hiện tại sẽ báo OFFLINE trên Prometheus!"
        echo "⏳ Đang chờ ${DURATION}s trước khi tự động khởi động lại service..."
        (sleep "$DURATION" && sudo systemctl start node_exporter && echo "✅ Node Exporter service đã online trở lại!") &
        ;;

    *)
        echo "[!] Loại sự cố không hợp lệ. Chọn từ: cpu, ram, disk, net, offline, stop"
        exit 1
        ;;
esac

echo "=================================================="
echo "🚀 Đã kích hoạt bơm tải thành công trong ${DURATION}s!"
echo "Node Exporter đang thu thập chỉ số thực tế và đẩy về Prometheus Server."
echo "Để dừng trước thời hạn, chạy: sudo bash inject_node_stress.sh stop"
echo "=================================================="
