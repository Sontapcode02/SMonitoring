from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import servers, metrics, anomalies, alerts, ml
from app.core.database import engine, Base, SessionLocal
from app.models.schemas import ServerModel
from app.core.scheduler import start_scheduler
from datetime import datetime

# Auto create database tables upon startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ubuntu Monitor API",
    description="Nền tảng giám sát tập trung + ML Anomaly Detection (LVTN)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def seed_default_servers():
    """Khởi tạo 3 máy chủ mặc định vào Database nếu chưa có."""
    db = SessionLocal()
    try:
        count = db.query(ServerModel).count()
        if count == 0:
            default_servers = [
                ServerModel(name="ubuntu-server-01", ip_address="192.168.199.131", port=9100, role="web", status="online", last_ping=datetime.utcnow()),
                ServerModel(name="ubuntu-server-02", ip_address="192.168.199.132", port=9100, role="db", status="online", last_ping=datetime.utcnow()),
                ServerModel(name="ubuntu-server-03", ip_address="192.168.199.133", port=9100, role="app", status="online", last_ping=datetime.utcnow()),
            ]
            db.add_all(default_servers)
            db.commit()
            print("[Seed] Successfully seeded 3 default Ubuntu servers into Database.")
    except Exception as e:
        print(f"[Seed] Error seeding default servers: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def startup():
    print("[Server] Starting Ubuntu Monitor API...")
    seed_default_servers()
    await start_scheduler()
    print("[Server] Ready.")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "service": "Ubuntu Monitor API"}
