from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import urllib.request
import json

from app.core.database import get_db
from app.models.schemas import ServerModel, ServerCreate, ServerResponse
from app.core.scheduler import ping_node_exporter
from app.core.simulator import simulator_engine
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=List[ServerResponse])
def get_servers(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các máy chủ đang được giám sát (PH1)."""
    if simulator_engine.is_active() or settings.SIMULATOR_MODE:
        return simulator_engine.get_servers()

    # Auto-correct any legacy 'localhost' records for Prometheus Engine
    prom_records = db.query(ServerModel).filter(
        (ServerModel.name == "prometheus") | (ServerModel.port == 9090)
    ).all()
    for p_srv in prom_records:
        if p_srv.ip_address in ["localhost", "127.0.0.1"]:
            p_srv.ip_address = "prometheus"
            p_srv.role = "prometheus"
            p_srv.status = "online" if ping_node_exporter("prometheus", 9090) else "offline"
            p_srv.last_ping = datetime.utcnow()
            db.commit()

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

@router.post("/scan")
def scan_prometheus_targets(db: Session = Depends(get_db)):
    """Tự động quét danh sách targets từ Prometheus API và tự động đăng ký các Node mới chưa có trong CSDL (PH1 Auto-Discovery)."""
    if simulator_engine.is_active() or settings.SIMULATOR_MODE:
        return {
            "status": "success",
            "message": "Đang chạy ở Chế độ Giả lập Cô lập (Simulator Mode). Tất cả 5 Node giả lập đã sẵn sàng!",
            "scanned_targets_count": 5,
            "newly_added_count": 0,
            "newly_added_servers": []
        }

    prom_url = f"{settings.PROMETHEUS_URL.rstrip('/')}/api/v1/targets"
    scanned_targets = []
    try:
        req = urllib.request.Request(prom_url, headers={"User-Agent": "FastAPI-Scanner"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("status") == "success":
                active_targets = data.get("data", {}).get("activeTargets", [])
                for t in active_targets:
                    scraped_url = t.get("scrapeUrl", "")
                    labels = t.get("labels", {})
                    instance = labels.get("instance", "")
                    job = labels.get("job", "")
                    health = t.get("health", "unknown")

                    if instance and ":" in instance:
                        ip, port_str = instance.split(":", 1)
                        try:
                            port = int(port_str)
                        except ValueError:
                            port = 9100
                    elif scraped_url:
                        clean_url = scraped_url.replace("http://", "").replace("https://", "").split("/")[0]
                        if ":" in clean_url:
                            ip, port_str = clean_url.split(":", 1)
                            port = int(port_str) if port_str.isdigit() else 9100
                        else:
                            ip = clean_url
                            port = 9100
                    else:
                        continue

                    node_name = labels.get("server_name") or labels.get("job") or f"node-{ip.replace('.', '-')}"
                    scanned_targets.append({
                        "name": node_name,
                        "ip_address": ip,
                        "port": port,
                        "health": health,
                        "job": job
                    })
    except Exception as e:
        print(f"[AutoScan] Prometheus API fetch error: {e}")

    # Fallback query if targets API failed or returned empty
    if not scanned_targets:
        try:
            up_url = f"{settings.PROMETHEUS_URL.rstrip('/')}/api/v1/query?query=up"
            req = urllib.request.Request(up_url, headers={"User-Agent": "FastAPI-Scanner"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for item in data.get("data", {}).get("result", []):
                    inst = item.get("metric", {}).get("instance", "")
                    if ":" in inst:
                        ip, port_str = inst.split(":", 1)
                        port = int(port_str) if port_str.isdigit() else 9100
                    else:
                        ip = inst
                        port = 9100
                    name = item.get("metric", {}).get("server_name") or f"node-{ip.replace('.', '-')}"
                    scanned_targets.append({"name": name, "ip_address": ip, "port": port, "health": "up"})
        except Exception as e:
            print(f"[AutoScan] Fallback PromQL query error: {e}")

    # Auto-correct any existing 'prometheus' host records in DB with 'localhost' -> 'prometheus'
    existing_prom_records = db.query(ServerModel).filter(
        (ServerModel.name == "prometheus") | (ServerModel.port == 9090)
    ).all()
    for p_srv in existing_prom_records:
        if p_srv.ip_address in ["localhost", "127.0.0.1"]:
            p_srv.ip_address = "prometheus"
            p_srv.role = "prometheus"
            p_srv.status = "online" if ping_node_exporter("prometheus", 9090) else "offline"
            p_srv.last_ping = datetime.utcnow()
            db.commit()

    existing_servers = db.query(ServerModel).all()
    existing_ips = {s.ip_address: s for s in existing_servers}
    existing_names = {s.name: s for s in existing_servers}

    newly_added = []
    for target in scanned_targets:
        ip = target["ip_address"]
        port = target["port"]
        health = target.get("health", "up")
        
        # Normalize localhost / 127.0.0.1 for Prometheus core engine
        if (ip in ["localhost", "127.0.0.1"] and port == 9090) or target["name"] == "prometheus":
            ip = "prometheus"
            role = "prometheus"
        else:
            role = "windows" if port == 9182 or "win" in target["name"].lower() else "web"

        if ip not in existing_ips:
            srv_name = target["name"]
            if srv_name in existing_names:
                srv_name = f"{srv_name}-{ip.split('.')[-1]}"

            is_online = health == "up" or ping_node_exporter(ip, port)
            new_srv = ServerModel(
                name=srv_name,
                ip_address=ip,
                port=port,
                role=role,
                status="online" if is_online else "offline",
                last_ping=datetime.utcnow()
            )
            db.add(new_srv)
            newly_added.append({
                "name": srv_name,
                "ip_address": ip,
                "port": port,
                "role": role,
                "status": new_srv.status
            })

    if newly_added:
        db.commit()

    msg = f"Đã quét {len(scanned_targets)} target từ Prometheus! Phát hiện và tự động đăng ký {len(newly_added)} node mới." if newly_added else f"Đã quét {len(scanned_targets)} target từ Prometheus. Tất cả các Node đã sẵn sàng trong hệ thống!"

    return {
        "status": "success",
        "message": msg,
        "scanned_targets_count": len(scanned_targets),
        "newly_added_count": len(newly_added),
        "newly_added_servers": newly_added
    }

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
