from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import Base

# ==========================================
# SQLAlchemy ORM Models
# ==========================================

class ServerModel(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, unique=True, index=True, nullable=False)
    ip_address = Column(String, nullable=False)
    port = Column(Integer, default=9100)
    role = Column(String, default="web")  # web / db / app
    status = Column(String, default="online")  # online / offline / warning
    last_ping = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    metrics = relationship("MetricModel", back_populates="server", cascade="all, delete-orphan")
    alerts = relationship("AlertModel", back_populates="server", cascade="all, delete-orphan")


class MetricModel(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    cpu_percent = Column(Float, nullable=False)
    ram_percent = Column(Float, nullable=False)
    load1_per_cpu = Column(Float, default=0.0)
    disk_read_mbps = Column(Float, default=0.0)
    disk_write_mbps = Column(Float, default=0.0)
    disk_iops = Column(Float, default=0.0)
    net_in_mbps = Column(Float, default=0.0)
    net_out_mbps = Column(Float, default=0.0)
    net_packets_in_pps = Column(Float, default=0.0)
    tcp_connections = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    is_simulated = Column(Boolean, default=False, nullable=False, index=True)

    server = relationship("ServerModel", back_populates="metrics")


class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # ML_ANOMALY / CPU_HIGH / DISK_HIGH
    message = Column(String, nullable=False)
    severity = Column(String, default="warning")  # info / warning / critical
    status = Column(String, default="active")  # active / resolved
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    server = relationship("ServerModel", back_populates="alerts")


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=False, index=True, nullable=True, default=None)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="viewer", nullable=False)  # admin / operator / viewer
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# Pydantic Schemas
# ==========================================

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    full_name: Optional[str] = ""
    role: str = "viewer"  # admin / operator / viewer
    expires_in_days: Optional[int] = None
    expires_at: Optional[datetime] = None

class RoleUpdate(BaseModel):
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = ""
    role: str
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ServerBase(BaseModel):
    name: str
    ip_address: str
    port: int = 9100
    role: str = "web"

class ServerCreate(ServerBase):
    pass

class ServerResponse(ServerBase):
    id: int
    status: str
    last_ping: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class MetricResponse(BaseModel):
    id: int
    server_id: int
    timestamp: datetime
    cpu_percent: float
    ram_percent: float
    load1_per_cpu: float
    disk_iops: float
    net_in_mbps: float
    is_anomaly: bool
    is_simulated: bool = False

    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    id: int
    server_id: int
    alert_type: str
    message: str
    severity: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True
