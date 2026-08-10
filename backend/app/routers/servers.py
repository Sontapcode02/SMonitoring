from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.schemas import ServerModel, ServerCreate, ServerResponse
from app.core.scheduler import ping_node_exporter

router = APIRouter()

@router.get("/", response_model=List[ServerResponse])
def get_servers(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các máy chủ đang được giám sát (PH1)."""
    return db.query(ServerModel).all()

@router.post("/", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
def create_server(server_in: ServerCreate, db: Session = Depends(get_db)):
    """Thêm một máy chủ mới vào hệ thống giám sát (PH1)."""
    existing = db.query(ServerModel).filter(ServerModel.name == server_in.name).first()
    if existing:
        raise HTTPException(
            status_code=400, detail=f"Máy chủ với tên '{server_in.name}' đã tồn tại trong hệ thống!"
        )
    
    is_online = ping_node_exporter(server_in.ip_address, server_in.port)
    
    db_server = ServerModel(
        name=server_in.name,
        ip_address=server_in.ip_address,
        port=server_in.port,
        role=server_in.role,
        status="online" if is_online else "offline",
        last_ping=datetime.utcnow()
    )
    db.add(db_server)
    db.commit()
    db.refresh(db_server)
    return db_server

@router.get("/{server_id}", response_model=ServerResponse)
def get_server_detail(server_id: int, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 máy chủ theo ID."""
    server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy chủ!")
    return server

@router.put("/{server_id}", response_model=ServerResponse)
def update_server(server_id: int, server_in: ServerCreate, db: Session = Depends(get_db)):
    """Cập nhật thông tin máy chủ (PH1)."""
    server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy chủ!")
    
    is_online = ping_node_exporter(server_in.ip_address, server_in.port)
    
    server.name = server_in.name
    server.ip_address = server_in.ip_address
    server.port = server_in.port
    server.role = server_in.role
    server.status = "online" if is_online else "offline"
    server.last_ping = datetime.utcnow()
    
    db.commit()
    db.refresh(server)
    return server

@router.delete("/{server_id}")
def delete_server(server_id: int, db: Session = Depends(get_db)):
    """Xóa máy chủ khỏi hệ thống giám sát (PH1)."""
    server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy chủ!")
    name = server.name
    db.delete(server)
    db.commit()
    return {"message": f"Đã xóa máy chủ {name} khỏi hệ thống thành công!"}

@router.post("/{server_id}/ping")
def ping_server(server_id: int, db: Session = Depends(get_db)):
    """Ping trực tiếp Node Exporter (port 9100) của máy chủ để cập nhật trạng thái realtime (PH1)."""
    server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy chủ!")
    
    is_online = ping_node_exporter(server.ip_address, server.port)
    server.status = "online" if is_online else "offline"
    server.last_ping = datetime.utcnow()
    db.commit()
    
    return {
        "id": server.id,
        "name": server.name,
        "ip_address": server.ip_address,
        "status": server.status,
        "is_node_exporter_alive": is_online,
        "last_ping": server.last_ping
    }
