from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import servers, metrics, anomalies, alerts, ml, simulator, auth
from app.core.database import engine, Base, SessionLocal
from app.models.schemas import ServerModel, UserModel
from app.core.security import get_password_hash
from app.core.scheduler import start_scheduler
from datetime import datetime

# Auto create database tables upon startup
Base.metadata.create_all(bind=engine)

# Ensure is_simulated column exists on metrics table
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE metrics ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT FALSE;"))
        conn.commit()
except Exception as e:
    print(f"[DB Migration Warning] {e}")

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
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(servers.router,    prefix="/api/servers",    tags=["Servers"])
app.include_router(metrics.router,    prefix="/api/metrics",    tags=["Metrics"])
app.include_router(anomalies.router,  prefix="/api/anomalies",  tags=["Anomalies"])
app.include_router(alerts.router,     prefix="/api/alerts",     tags=["Alerts"])
app.include_router(ml.router,         prefix="/api/ml",         tags=["ML"])
app.include_router(simulator.router,  prefix="/api/simulator",  tags=["Simulator"])

def seed_default_servers():
    """Khởi tạo & đồng bộ 4 máy chủ mặc định (192.168.138.128 - 192.168.138.131) vào Database."""
    db = SessionLocal()
    try:
        targets = [
            {"name": "ubuntu-server-01", "ip_address": "192.168.138.128", "port": 9100, "role": "web"},
            {"name": "ubuntu-server-02", "ip_address": "192.168.138.129", "port": 9100, "role": "db"},
            {"name": "ubuntu-server-03", "ip_address": "192.168.138.130", "port": 9100, "role": "app"},
            {"name": "ubuntu-server-test", "ip_address": "192.168.138.131", "port": 9100, "role": "test"},
        ]
        for t in targets:
            existing = db.query(ServerModel).filter(ServerModel.name == t["name"]).first()
            if not existing:
                srv = ServerModel(
                    name=t["name"],
                    ip_address=t["ip_address"],
                    port=t["port"],
                    role=t["role"],
                    status="online",
                    last_ping=datetime.utcnow()
                )
                db.add(srv)
            else:
                existing.ip_address = t["ip_address"]
                existing.port = t["port"]
                existing.role = t["role"]
        db.commit()
        print("[Seed] Successfully synced 4 default Ubuntu servers (192.168.138.128-131) into Database.")
    except Exception as e:
        print(f"[Seed] Error seeding default servers: {e}")
    finally:
        db.close()

def seed_default_users():
    """Khởi tạo 3 tài khoản mặc định chuẩn phân quyền (admin, operator, viewer) vào Database."""
    db = SessionLocal()
    try:
        default_users = [
            {
                "username": "admin",
                "email": "admin@ubuntu.local",
                "password": "admin123",
                "full_name": "Quản Trị Viên Hệ Thống",
                "role": "admin"
            },
            {
                "username": "operator",
                "email": "operator@ubuntu.local",
                "password": "operator123",
                "full_name": "Chuyên Viên SOC / Operator",
                "role": "operator"
            },
            {
                "username": "viewer",
                "email": "viewer@ubuntu.local",
                "password": "viewer123",
                "full_name": "Người Xem / Kiểm Toán Viên",
                "role": "viewer"
            }
        ]
        for u in default_users:
            existing = db.query(UserModel).filter(UserModel.username == u["username"]).first()
            if not existing:
                user_obj = UserModel(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True
                )
                db.add(user_obj)
            else:
                existing.role = u["role"]
                existing.hashed_password = get_password_hash(u["password"])
                existing.is_active = True
        db.commit()
        print("[Seed] Successfully seeded RBAC default accounts: admin, operator, viewer.")
    except Exception as e:
        print(f"[Seed] Error seeding default users: {e}")
    finally:
        db.close()


@app.on_event("startup")
async def startup():
    print("[Server] Starting Ubuntu Monitor API...")
    seed_default_servers()
    seed_default_users()
    await start_scheduler()
    print("[Server] Ready.")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "service": "Ubuntu Monitor API"}
