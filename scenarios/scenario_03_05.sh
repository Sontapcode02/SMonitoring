#!/bin/bash
# scenario_03_disk_io.sh — Disk I/O flood
echo "=== Kich ban 3: Disk I/O Flood ==="
dd if=/dev/zero of=/tmp/kltn_stress bs=1M count=500 oflag=direct
rm -f /tmp/kltn_stress
echo "=== Done ==="

# scenario_04_net_flood.sh — Network flood (cần iperf3)
# iperf3 -c <server_ip> -t 60 -b 100M

# scenario_05_combo.sh — CPU + RAM cùng lúc
# stress --cpu 4 --vm 2 --vm-bytes 512M --timeout 60s
