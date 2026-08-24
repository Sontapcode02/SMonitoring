import random
import time
from datetime import datetime, timezone, timedelta

# Vietnam Timezone (GMT+7)
VN_TZ = timezone(timedelta(hours=7))
from typing import List, Dict, Any

class TelemetrySimulatorEngine:
    """
    In-Memory Telemetry Simulator Engine.
    Guarantees 100% ISOLATION from production PostgreSQL/SQLite databases.
    All data generation, metric calculations, and trigger events happen purely in RAM.
    """
    def __init__(self):
        self.active: bool = False
        self.last_update: float = time.time()
        
        # Virtual Servers State (In-Memory Only)
        self.servers: List[Dict[str, Any]] = [
            {"id": 101, "name": "ubuntu-server-01", "ip_address": "192.168.138.128", "port": 9100, "role": "web", "status": "online"},
            {"id": 102, "name": "ubuntu-server-02", "ip_address": "192.168.138.129", "port": 9100, "role": "db", "status": "online"},
            {"id": 103, "name": "ubuntu-server-03", "ip_address": "192.168.138.130", "port": 9100, "role": "app", "status": "online"},
            {"id": 104, "name": "ubuntu-server-test", "ip_address": "192.168.138.131", "port": 9100, "role": "test", "status": "online"},
            {"id": 105, "name": "windows-host-master", "ip_address": "192.168.138.1", "port": 9182, "role": "windows", "status": "online"},
        ]

        # Active Triggers (server_name -> {"type": str, "expires_at": float})
        self.triggers: Dict[str, Dict[str, Any]] = {}

    def is_active(self) -> bool:
        return self.active

    def set_active(self, status: bool):
        self.active = status
        print(f"[SimulatorEngine] Simulator mode active = {self.active}")

    def trigger_event(self, server_name: str, event_type: str, duration_sec: int = 45):
        expires_at = time.time() + duration_sec
        self.triggers[server_name] = {
            "type": event_type,  # 'cpu_spike', 'network_drop', 'node_offline', 'ml_anomaly'
            "expires_at": expires_at
        }
        print(f"[SimulatorEngine] Triggered '{event_type}' on '{server_name}' for {duration_sec}s")

    def reset_server(self, server_name: str):
        if server_name in self.triggers:
            del self.triggers[server_name]
        for srv in self.servers:
            if srv["name"] == server_name:
                srv["status"] = "online"

    def reset_all(self):
        self.triggers.clear()
        for srv in self.servers:
            srv["status"] = "online"

    def get_servers(self) -> List[Dict[str, Any]]:
        now = time.time()
        result = []
        for srv in self.servers:
            item = dict(srv)
            trg = self.triggers.get(srv["name"])
            if trg and trg["expires_at"] > now:
                if trg["type"] == "node_offline":
                    item["status"] = "offline"
                elif trg["type"] in ["cpu_spike", "ml_anomaly"]:
                    item["has_anomaly"] = True
            result.append(item)
        return result

    def get_realtime_metrics(self) -> List[Dict[str, Any]]:
        now = time.time()
        metrics = []

        for srv in self.servers:
            name = srv["name"]
            trg = self.triggers.get(name)
            is_active_trg = trg and trg["expires_at"] > now

            # Default base metric ranges
            cpu = round(random.uniform(4.0, 12.0), 1)
            ram = round(random.uniform(22.0, 32.0), 1)
            disk_pct = 45.2
            disk_iops = round(random.uniform(10.0, 50.0), 1)
            disk_r_mbps = round(random.uniform(0.1, 1.5), 2)
            disk_w_mbps = round(random.uniform(0.5, 3.0), 2)
            net_in = round(random.uniform(1.2, 5.5), 2)
            net_out = round(random.uniform(0.8, 4.0), 2)
            is_anomaly = False
            status = "online"

            if is_active_trg:
                t_type = trg["type"]
                if t_type == "cpu_spike":
                    cpu = round(random.uniform(92.0, 99.5), 1)
                    ram = round(random.uniform(75.0, 88.0), 1)
                    is_anomaly = True
                elif t_type == "network_drop":
                    net_in = 0.01
                    net_out = 0.01
                    disk_iops = 0.0
                    is_anomaly = True
                elif t_type == "ml_anomaly":
                    cpu = round(random.uniform(85.0, 96.0), 1)
                    ram = round(random.uniform(90.0, 98.0), 1)
                    disk_r_mbps = round(random.uniform(45.0, 80.0), 1)
                    disk_iops = round(random.uniform(800.0, 1500.0), 1)
                    is_anomaly = True
                elif t_type == "node_offline":
                    status = "offline"

            metrics.append({
                "server_id": srv["id"],
                "server_name": name,
                "instance": f"{srv['ip_address']}:{srv['port']}",
                "ip_address": srv["ip_address"],
                "port": srv["port"],
                "role": srv["role"],
                "status": status,
                "timestamp": datetime.now(VN_TZ).strftime("%Y-%m-%d %H:%M:%S"),
                "cpu_percent": cpu,
                "ram_percent": ram,
                "disk_percent": disk_pct,
                "disk_size_gb": 50.0 if srv["role"] != "windows" else 500.0,
                "disk_free_gb": 27.4 if srv["role"] != "windows" else 245.0,
                "disk_iops": disk_iops,
                "disk_read_mbps": disk_r_mbps,
                "disk_write_mbps": disk_w_mbps,
                "load1_per_cpu": round(cpu / 100.0, 2),
                "net_in_mbps": net_in,
                "net_out_mbps": net_out,
                "is_anomaly": is_anomaly,
                "is_simulated": True
            })

        return metrics

# Singleton instance
simulator_engine = TelemetrySimulatorEngine()
