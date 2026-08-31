#!/usr/bin/env python3
"""
remote_stress_nodes.py — Script Điểu Khiển Bơm Tải Từ Xa Tới Các Máy Chủ Ubuntu (192.168.138.128 - 131)
Sử dụng:
  python infra/remote_stress_nodes.py --ip 192.168.138.128 --user ubuntu --type cpu --duration 60
  python infra/remote_stress_nodes.py --ip 192.168.138.129 --user ubuntu --type ram --duration 45
  python infra/remote_stress_nodes.py --ip 192.168.138.128 --user ubuntu --type stop
"""

import argparse
import subprocess
import sys
import os

DEFAULT_NODES = [
    {"name": "ubuntu-server-01", "ip": "192.168.138.128"},
    {"name": "ubuntu-server-02", "ip": "192.168.138.129"},
    {"name": "ubuntu-server-03", "ip": "192.168.138.130"},
    {"name": "ubuntu-server-test", "ip": "192.168.138.131"},
]

def run_remote_stress(ip: str, user: str, event_type: str, duration: int, password: str = None):
    """Gửi lệnh SSH thực thi inject_node_stress.sh trực tiếp lên Linux kernel của Node Ubuntu."""
    print(f"\n==================================================")
    print(f" 📡 [SSH INJECTOR] Gửi lệnh bơm tải tới Node: {user}@{ip}")
    print(f" 🎯 Event Type: {event_type} | Duration: {duration}s")
    print(f"==================================================")

    # Command chạy trên target node
    remote_cmd = f"curl -sSL https://raw.githubusercontent.com/Sontapcode02/SMonitoring/master/infra/node-exporter/inject_node_stress.sh | sudo bash -s {event_type} {duration}"
    if event_type == "stop":
        remote_cmd = "sudo pkill -f stress-ng || true; sudo pkill -f dd || true; sudo systemctl start node_exporter || true"

    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5", f"{user}@{ip}", remote_cmd]

    try:
        res = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=duration + 10)
        print("[+] Output từ Ubuntu Node:")
        print(res.stdout)
        if res.stderr:
            print("[!] Warnings/Errors:", res.stderr)
        print("✅ Bơm tải hoàn tất!")
    except subprocess.TimeoutExpired:
        print("[!] SSH Command đã kích hoạt chạy ngầm trên Node!")
    except Exception as e:
        print(f"[!] Lỗi kết nối SSH tới {ip}: {e}")
        print(f"💡 Hướng dẫn chạy thủ công trực tiếp trên máy chủ Ubuntu ({ip}):")
        print(f"   curl -sSL https://raw.githubusercontent.com/Sontapcode02/SMonitoring/master/infra/node-exporter/inject_node_stress.sh | sudo bash -s {event_type} {duration}")

def main():
    parser = argparse.ArgumentParser(description="Script Điều Khiển Bơm Tải Sự Cố Trực Tiếp Lên Ubuntu Nodes")
    parser.add_argument("--ip", default="192.168.138.128", help="IP của máy chủ Ubuntu target (VD: 192.168.138.128)")
    parser.add_argument("--user", default="ubuntu", help="SSH Username (mặc định: ubuntu)")
    parser.add_argument("--type", choices=["cpu", "ram", "disk", "net", "offline", "stop"], default="cpu", help="Loại sự cố bơm tải")
    parser.add_argument("--duration", type=int, default=45, help="Thời lượng bơm tải (giây)")

    args = parser.parse_args()
    run_remote_stress(args.ip, args.user, args.type, args.duration)

if __name__ == "__main__":
    main()
