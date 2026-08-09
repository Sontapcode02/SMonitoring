#!/bin/bash
# install_node_exporter.sh
# Chạy script này trên từng máy chủ Ubuntu target để cài đặt Node Exporter (systemd service)
# Sử dụng: sudo bash install_node_exporter.sh

set -e

NODE_EXPORTER_VERSION="1.8.1"
ARCH="linux-amd64"

echo "=================================================="
echo " Cài đặt Node Exporter v${NODE_EXPORTER_VERSION} trên Ubuntu"
echo "=================================================="

# 1. Tải về và giải nén
cd /tmp
echo "[1/4] Tải về Node Exporter..."
wget -q "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}.tar.gz" -O node_exporter.tar.gz

echo "[2/4] Giải nén và chuyển binary..."
tar -xzf node_exporter.tar.gz
sudo mv "node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}/node_exporter" /usr/local/bin/
rm -rf node_exporter.tar.gz "node_exporter-${NODE_EXPORTER_VERSION}.${ARCH}"

# 2. Tạo user hệ thống
if ! id "node_exporter" &>/dev/null; then
    echo "[3/4] Tạo user system 'node_exporter'..."
    sudo useradd --rs /bin/false node_exporter
fi

# 3. Tạo systemd service
echo "[4/4] Tạo service systemd..."
cat <<EOF | sudo tee /etc/systemd/system/node_exporter.service > /dev/null
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.cpu \
    --collector.meminfo \
    --collector.diskstats \
    --collector.netdev \
    --collector.filesystem
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 4. Reload và start service
sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

echo "=================================================="
echo "✅ Cài đặt hoàn tất!"
echo "Kiểm tra status: sudo systemctl status node_exporter"
echo "Metrics endpoint: http://localhost:9100/metrics"
echo "=================================================="
