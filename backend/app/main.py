from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import servers, metrics, anomalies, alerts, ml
from app.core.config import settings
from app.core.scheduler import start_scheduler

app = FastAPI(
    title="Ubuntu Monitor API",
    description="Nền tảng giám sát tập trung + ML Anomaly Detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(servers.router,    prefix="/api/servers",    tags=["Servers"])
app.include_router(metrics.router,    prefix="/api/metrics",    tags=["Metrics"])
app.include_router(anomalies.router,  prefix="/api/anomalies",  tags=["Anomalies"])
app.include_router(alerts.router,     prefix="/api/alerts",     tags=["Alerts"])
app.include_router(ml.router,         prefix="/api/ml",         tags=["ML"])

@app.on_event("startup")
async def startup():
    print("[Server] Starting Ubuntu Monitor API...")
    await start_scheduler()
    print("[Server] Ready.")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
