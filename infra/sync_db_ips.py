import os
import sqlite3

db_path = os.path.join(os.path.dirname(__file__), "..", "backend", "ubuntu_monitor.db")
if not os.path.exists(db_path):
    print(f"DB file not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

targets = [
    ("ubuntu-server-01", "192.168.138.128", 9100, "web"),
    ("ubuntu-server-02", "192.168.138.129", 9100, "db"),
    ("ubuntu-server-03", "192.168.138.130", 9100, "app"),
    ("ubuntu-server-test", "192.168.138.131", 9100, "test"),
]

for name, ip, port, role in targets:
    cursor.execute("SELECT id FROM servers WHERE name = ?", (name,))
    row = cursor.fetchone()
    if row:
        cursor.execute("UPDATE servers SET ip_address = ?, port = ?, role = ?, status = 'online' WHERE id = ?", (ip, port, role, row[0]))
        print(f"[Updated] {name} -> IP: {ip}:{port}")
    else:
        cursor.execute("INSERT INTO servers (name, ip_address, port, role, status) VALUES (?, ?, ?, ?, 'online')", (name, ip, port, role))
        print(f"[Inserted] {name} -> IP: {ip}:{port}")

conn.commit()
conn.close()
print("[Database Sync Complete] 4 servers updated to 192.168.138.128-131.")
