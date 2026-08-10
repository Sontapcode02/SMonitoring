#!/usr/bin/env python3
"""
test_prometheus_fetch.py — Test query live metrics directly from Prometheus (http://localhost:9090)
"""

import urllib.request
import urllib.parse
import json
import sys

PROMETHEUS_URL = "http://localhost:9090"

def query_prometheus(promql):
    url = f"{PROMETHEUS_URL}/api/v1/query?query={urllib.parse.quote(promql)}"
    try:
        req = urllib.request.urlopen(url, timeout=5)
        data = json.loads(req.read().decode())
        if data.get("status") == "success":
            return data.get("data", {}).get("result", [])
        return []
    except Exception as e:
        print(f"[*] Error querying Prometheus: {e}")
        return []

def main():
    print(f"\n==================================================")
    print(f" [TESTING PROMETHEUS LIVE DATA FETCH] ({PROMETHEUS_URL})")
    print(f"==================================================")
    
    # 1. Target Status
    up_results = query_prometheus('up')
        
    print("\n1. Ubuntu Target Instances Status ('up'):")
    for item in up_results:
        instance = item['metric'].get('instance', 'unknown')
        job = item['metric'].get('job', '')
        status = "ONLINE (1)" if item['value'][1] == "1" else "OFFLINE (0)"
        print(f"   - [{job}] {instance:<25} Status: {status}")

    # 2. Live CPU Usage (%)
    print("\n2. Live CPU Usage (%):")
    cpu_query = '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
    cpu_results = query_prometheus(cpu_query)
    for item in cpu_results:
        instance = item['metric'].get('instance', 'unknown')
        cpu_val = float(item['value'][1])
        print(f"   - Instance: {instance:<25} CPU: {cpu_val:.2f}%")

    # 3. Live RAM Usage (%)
    print("\n3. Live RAM Usage (%):")
    ram_query = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
    ram_results = query_prometheus(ram_query)
    for item in ram_results:
        instance = item['metric'].get('instance', 'unknown')
        ram_val = float(item['value'][1])
        print(f"   - Instance: {instance:<25} RAM: {ram_val:.2f}%")

    # 4. Live Disk IOPS
    print("\n4. Live Disk IOPS:")
    iops_query = 'sum by (instance) (rate(node_disk_reads_completed_total[1m]) + rate(node_disk_writes_completed_total[1m]))'
    iops_results = query_prometheus(iops_query)
    for item in iops_results:
        instance = item['metric'].get('instance', 'unknown')
        iops_val = float(item['value'][1])
        print(f"   - Instance: {instance:<25} IOPS: {iops_val:.2f} ops/s")

    print("\n[OK] Prometheus Live Data Fetch Test Complete!")

if __name__ == "__main__":
    main()
