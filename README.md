# Ubuntu Monitoring Platform + ML Anomaly Detection

**Đề tài:** Xây dựng nền tảng giám sát tập trung và ứng dụng học máy phát hiện bất thường theo thời gian thực cho cụm máy chủ Ubuntu

## Tech Stack
- **Backend:** Python FastAPI (REST API + WebSocket + ML)
- **Frontend:** React + TypeScript + Vite + Tailwind + ECharts
- **ML:** Isolation Forest (scikit-learn)
- **Metrics:** Prometheus + Node Exporter
- **DB:** PostgreSQL + Redis
- **Deploy:** Docker Compose

## Cấu trúc thư mục

```
KLTN/
├── backend/        FastAPI backend (REST + WebSocket + Scheduler)
│   └── app/
│       ├── routers/    API routes
│       ├── models/     DB models (SQLAlchemy)
│       ├── services/   Business logic
│       └── core/       Config, DB, security
├── frontend/       React frontend
│   └── src/
│       ├── pages/      5 phân hệ (PH1–PH5)
│       ├── components/ Shared components
│       └── hooks/      Custom hooks (useWebSocket, useMetrics)
├── ml/             Machine Learning
│   ├── models/     Trained .pkl files
│   ├── dataset/    Processed CSV data
│   └── scripts/    train.py, validate.py, export.py
├── infra/          Infrastructure
│   ├── prometheus/ prometheus.yml, alerts.yml
│   ├── loki/       loki-config.yml (optional)
│   └── node-exporter/
├── scenarios/      Anomaly test scripts (bash)
├── docs/           Architecture + API docs
├── docker-compose.yml
└── ai_prompting_log.md
```

## Khởi động nhanh

```bash
# 1. Clone repo
git clone <repo-url> && cd KLTN

# 2. Cấu hình env
cp backend/.env.example backend/.env

# 3. Chạy toàn bộ stack
docker-compose up -d

# 4. Truy cập
# Frontend:   http://localhost:5173
# Backend API: http://localhost:8000/docs
# Prometheus:  http://localhost:9090
```

## 3 Mốc quan trọng

| Mốc | Tuần | Điều kiện |
|-----|------|-----------|
| **Mốc 1** | T3 | Isolation Forest predict được, pipeline auto-detect |
| **Mốc 2** | T5 | Full frontend 5 PH, inject anomaly → dashboard phát hiện |
| **Mốc 3** | T6 | Đủ số liệu P/R/F1, 45 test runs hoàn chỉnh |
