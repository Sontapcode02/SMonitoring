import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "ubuntu_monitor.db"))
print(f"Connecting to DB at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id FROM servers WHERE name = 'windows-host-master'")
row = cursor.fetchone()
if row:
    cursor.execute("UPDATE servers SET ip_address = '192.168.138.1', port = 9182, role = 'windows', status = 'online' WHERE id = ?", (row[0],))
    print("[Updated] windows-host-master -> IP: 192.168.138.1:9182")
else:
    cursor.execute("INSERT INTO servers (name, ip_address, port, role, status) VALUES ('windows-host-master', '192.168.138.1', 9182, 'windows', 'online')")
    print("[Inserted] windows-host-master -> IP: 192.168.138.1:9182")

conn.commit()
conn.close()
print("Success!")
