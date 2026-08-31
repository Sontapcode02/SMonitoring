#!/usr/bin/env python3
"""
simulate_ubuntu_workload.py — Điều Khiển Mô Phỏng Tải Vận Hành Thường Ngày Cho Cụm Máy Chủ Ubuntu
Mô phỏng các trạng thái hoạt động thực tế (Web Nginx, DB MySQL/Postgres, App Workers) thay vì sự cố.
Sử dụng:
  python infra/simulate_ubuntu_workload.py --ip 192.168.138.128 --role web --minutes 30
  python infra/simulate_ubuntu_workload.py --ip 192.168.138.129 --role db --minutes 60
  python infra/simulate_ubuntu_workload.py --ip 192.168.138.128 --role stop
"""

import argparse
import subprocess
import sys

NODES = [
    {"name": "ubuntu-server-01", "ip": "192.168.138.128", "role": "web"},
    {"name": "ubuntu-server-02", "ip": "192.168.138.129", "role": "db"},
    {"name": "ubuntu-server-03", "ip": "192.168.138.130", "role": "app"},
]

def run_remote_workload(ip: str, user: str, role: str, minutes: int):
    print(f"\n==================================================")
    print(f" ⚙️ [WORKLOAD SIMULATOR] Gửi lệnh mô phỏng vận hành tới Node: {user}@{ip}")
    print(f" 🖥️ Role: {role.upper()} | Thời gian: {minutes} phút")
    print(f"==================================================")

    remote_cmd = f"curl -sSL https://raw.githubusercontent.com/Sontapcode02/SMonitoring/master/infra/node-exporter/simulate_ubuntu_workload.sh | sudo bash -s {role} {minutes}"
    if role == "stop":
        remote_cmd = "sudo pkill -f stress-ng || true; sudo pkill -f dd || true"

    ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=5", f"{user}@{ip}", remote_cmd]

    try:
        res = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=15)
        print("[+] Output từ Ubuntu Node:")
        print(res.stdout)
        if res.stderr:
            print("[!] Warnings:", res.stderr)
    except Exception as e:
        print(f"[!] Lỗi kết nối SSH tới {ip}: {e}")
        print(f"💡 Hướng dẫn chạy trực tiếp trên máy chủ Ubuntu ({ip}):")
        print(f"   curl -sSL https://raw.githubusercontent.com/Sontapcode02/SMonitoring/master/infra/node-exporter/simulate_ubuntu_workload.sh | sudo bash -s {role} {minutes}")

def main():
    parser = argparse.ArgumentParser(description="Điều Khiển Mô Phỏng Tải Vận Hành Bình Thường Máy Chủ Ubuntu")
    parser.add_argument("--ip", default="192.168.138.128", help="IP máy chủ Ubuntu target")
    parser.add_argument("--user", default="ubuntu", help="SSH Username")
    parser.add_argument("--role", choices=["web", "db", "app", "stop"], default="web", help="Role vận hành: web, db, app, stop")
    parser.add_argument("--minutes", type=int, default=30, help="Thời gian mô phỏng (phút)")

    args = parser.parse_args()
    run_remote_workload(args.ip, args.user, args.role, args.minutes)

if __name__ == "__main__":
    main()
