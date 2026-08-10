import sqlite3
from datetime import datetime

conn = sqlite3.connect('D:/KLTN/backend/ubuntu_monitor.db')
c = conn.cursor()
c.execute("""
INSERT INTO alerts (server_id, alert_type, message, severity, status, timestamp)
VALUES (1, 'CPU_HIGH', 'Cảnh báo: CPU Usage trên ubuntu-server-01 vượt 92.5% trong vòng 5 phút', 'critical', 'new', ?)
""", (datetime.utcnow(),))

c.execute("""
INSERT INTO alerts (server_id, alert_type, message, severity, status, timestamp)
VALUES (2, 'ML_ANOMALY', 'Isolation Forest phát hiện Anomaly (Net In spike 85Mbps) trên ubuntu-server-02', 'critical', 'new', ?)
""", (datetime.utcnow(),))

conn.commit()
conn.close()
print("Seeded 2 live sample alerts successfully into Database!")
