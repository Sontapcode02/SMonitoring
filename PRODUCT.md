# PRODUCT.md — Ubuntu Monitor & ML Anomaly Detection

## Product Context
- **Product Name:** Ubuntu Monitor (KLTN 2026)
- **Domain:** Server Operations, Real-time Infrastructure Monitoring & ML Anomaly Detection.
- **Target Audience:** System Administrators, DevOps Engineers, Infrastructure Leads, Thesis Evaluation Board.
- **Primary Mode:** **Operate** (Dashboards, Editors, Real-time Metrics, Alerts, Analytics).
- **Core Value Proposition:** High-density, real-time metrics monitoring combined with unsupervised Machine Learning (Isolation Forest) for early anomaly detection and automatic incident recovery.

## Functional Modules Scope
1. **Executive Overview:** High-level cluster health metrics, server cards, real-time KPI overview.
2. **PH1 Fleet Management:** Server inventory, IP/Port node exporter specs, status check.
3. **PH2 Real-time Live Monitoring:** CPU, RAM, Disk IOPS, Read/Write MB/s, Net RX Mbps with direct HTTP scrape fallback.
4. **PH3 Anomaly Detection Center:** Isolation Forest anomaly score ($Score < 0$), SHAP-like feature contribution breakdown, multi-field filtering.
5. **PH4 Alert Hub & Incident Response:** Rule-based + ML alert tracking with Auto-Recovery.
6. **PH5 MLOps Analytics:** Model tracking (`.pkl`), dataset distribution (`.csv`), Precision/Recall/F1-score evaluation.
