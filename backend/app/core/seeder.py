import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.schemas import ServerModel, MetricModel

VN_TZ = timezone(timedelta(hours=7))

def seed_20_day_telemetry(db: Session):
    """
    Tự động sinh dữ liệu telemetry lịch sử 20 ngày cho tất cả các node server
    đồng thời áp dụng chính sách xóa các bản ghi cũ quá 20 ngày.
    Cố ý tạo các khoảng trống (data gap) để hỗ trợ kiểm thử tính năng vẽ gãy đứt đồ thị.
    """
    now = datetime.now(VN_TZ)
    twenty_days_ago = now - timedelta(days=20)

    # 1. Tự động dọn dẹp (Purge) dữ liệu cũ hơn 20 ngày
    try:
        deleted_count = db.query(MetricModel).filter(MetricModel.timestamp < twenty_days_ago.replace(tzinfo=None)).delete()
        db.commit()
        if deleted_count > 0:
            print(f"[Retention Policy] Purged {deleted_count} metrics records older than 20 days.")
    except Exception as e:
        db.rollback()
        print(f"[Retention Error] {e}")

    servers = db.query(ServerModel).all()
    if not servers:
        return

    # Check which servers need seeding (fewer than 500 historical records)
    servers_to_seed = [srv for srv in servers if db.query(MetricModel).filter(MetricModel.server_id == srv.id).count() < 500]
    if not servers_to_seed:
        return

    print(f"[Seeder] Generating 20 days of historical telemetry for {len(servers_to_seed)} server(s)...")

    # Interval: mỗi 15 phút 1 điểm đo cho 20 ngày (4 * 24 * 20 = 1920 điểm đo mỗi server)
    step_minutes = 15
    total_steps = (20 * 24 * 60) // step_minutes

    metrics_to_insert = []

    for srv in servers_to_seed:
        s_name = srv.name.lower()
        base_cpu = 8.0 if "web" in srv.role else (14.0 if "db" in srv.role else 10.0)
        base_ram = 30.0 if "web" in srv.role else (55.0 if "db" in srv.role else 40.0)

        for step in range(total_steps):
            metric_time = twenty_days_ago + timedelta(minutes=step * step_minutes)

            # Giả lập khoảng trống dữ liệu (Data Gap - server bị tắt/offline hoặc gãy mạng)
            # Tạo gap 2 tiếng cách đây 6 tiếng cho ubuntu-server-01
            hours_ago = (now - metric_time).total_seconds() / 3600.0
            if "01" in s_name and (4.0 <= hours_ago <= 6.0):
                continue # Bỏ qua không tạo bản ghi -> Tạo đứt gãy đồ thị

            if "02" in s_name and (10.0 <= hours_ago <= 12.0):
                continue # Bỏ qua không tạo bản ghi -> Tạo đứt gãy đồ thị

            # Biến động ngẫu nhiên
            cpu_val = round(max(2.0, min(99.0, base_cpu + random.uniform(-4.0, 15.0))), 1)
            ram_val = round(max(10.0, min(95.0, base_ram + random.uniform(-3.0, 8.0))), 1)
            net_in = round(random.uniform(0.5, 12.0), 2)
            disk_iops = round(random.uniform(5.0, 120.0), 1)

            # Thỉnh thoảng có spike bất thường
            is_anom = False
            if random.random() < 0.02:
                cpu_val = round(random.uniform(88.0, 98.5), 1)
                is_anom = True

            metric_entry = MetricModel(
                server_id=srv.id,
                timestamp=metric_time.replace(tzinfo=None),
                cpu_percent=cpu_val,
                ram_percent=ram_val,
                load1_per_cpu=round(cpu_val / 100.0, 2),
                disk_read_mbps=round(random.uniform(0.1, 2.5), 2),
                disk_write_mbps=round(random.uniform(0.5, 5.0), 2),
                disk_iops=disk_iops,
                net_in_mbps=net_in,
                net_out_mbps=round(net_in * 0.8, 2),
                is_anomaly=is_anom,
                is_simulated=True
            )
            metrics_to_insert.append(metric_entry)

    try:
        db.bulk_save_objects(metrics_to_insert)
        db.commit()
        print(f"[Seeder] Successfully seeded {len(metrics_to_insert)} historical telemetry records across {len(servers)} servers.")
    except Exception as e:
        db.rollback()
        print(f"[Seeder Error] {e}")
