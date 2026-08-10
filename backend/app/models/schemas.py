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


# ==========================================
# Pydantic Schemas
# ==========================================

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
