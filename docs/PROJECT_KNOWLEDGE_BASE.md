# BỘ TRI THỨC VÀ KIẾN TRÚC DỰ ÁN KLTN (PROJECT KNOWLEDGE BASE)

> **Tên Đề tài:** Xây dựng nền tảng giám sát tập trung và ứng dụng học máy phát hiện bất thường theo thời gian thực cho cụm máy chủ Ubuntu  
> **Phiên bản cập nhật:** 2026-08-20  
> **Trạng thái:** Đã hoàn thiện 5 Phân hệ chính + Pipeline ML Isolation Forest + Realtime Scraping Fallback

---

## 1. TỔNG QUAN & MỤC TIÊU DỰ ÁN

- **Mục tiêu:** Xây dựng giải pháp giám sát tập trung hệ thống máy chủ Ubuntu, tự động thu thập metrics (CPU, RAM, Disk, IOPS, Network), phát hiện bất thường bằng thuật toán Học máy Không giám sát (**Isolation Forest**), cảnh báo tự động và phân tích nguyên nhân gốc (Explainability).
- **Phạm vi triển khai:** Cụm 4 máy chủ Ubuntu (`192.168.138.128` - `192.168.138.131`):
  - `ubuntu-server-01`: `192.168.138.128:9100` (Web Server)
  - `ubuntu-server-02`: `192.168.138.129:9100` (Database Server)
  - `ubuntu-server-03`: `192.168.138.130:9100` (App Server)
  - `ubuntu-server-test`: `192.168.138.131:9100` (Test / Stress Scenario Server)


- **Thời gian thực hiện:** Đồ án Khóa Luận Tốt Nghiệp (2026).

---

## 2. TECH STACK VÀ LÝ DO LỰA CHỌN (DECISION LOG)

| Thành phần | Công nghệ lựa chọn | Lý do chọn & Quyết định từ AI Log |
| :--- | :--- | :--- |
| **Backend** | Python FastAPI (Uvicorn, SQLAlchemy, APScheduler) | Chuyển từ **NestJS sang FastAPI** để giảm 1.5 tuần học framework mới, đồng thời chạy trực tiếp các thư viện ML Python (`scikit-learn`, `pandas`, `joblib`). |
| **Frontend** | React + TypeScript + Vite + ECharts + Lucide Icons | Giao diện Single Page Application (SPA), render đồ thị tốc độ cao với ECharts, chuẩn giao diện Dark Theme chuyên nghiệp. |
| **ML Engine** | Isolation Forest (`scikit-learn`) + StandardScaler | Mô hình phát hiện bất thường không giám sát, phù hợp cho metrics chuỗi thời gian không có nhãn sẵn. |
| **Metrics Collector**| Prometheus + Node Exporter | Standard De-facto trong Cloud Native. Kết hợp cơ chế **Direct HTTP Scrape fallback** (`/metrics` port 9100) khi Prometheus bận/restarting. |
| **Database** | SQLite / PostgreSQL | Lưu trữ danh sách máy chủ, lịch sử cảnh báo và nhật ký sự kiện bất thường. |
| **Scenarios** | Shell Scripts (`stress`, `dd`, `curl`) | Tạo các kịch bản diễn tập sự cố (CPU Spike, RAM Leak, High Disk IOPS, Network Flood). |

---

## 3. CẤU TRÚC HỆ THỐNG VÀ 5 PHÂN HỆ CHỨC NĂNG (PH1 - PH5)

### 📊 Executive Overview Dashboard
- Hiển thị bức tranh toàn cảnh sức khỏe cụm máy chủ (Tổng máy chủ online/offline, % CPU/RAM trung bình cụm, số cảnh báo active, số điểm bất thường mới phát hiện).

### 🖥️ PH1: Quản lý Máy chủ Fleet (`ServerManagement.tsx`, `servers.py`)
- **Chức năng:** Quản lý danh mục máy chủ Ubuntu (Thêm, Sửa, Xóa).
- **Tính năng:** Đo ping tự động, kiểm tra trạng thái hoạt động (online/offline), quản lý IP/Port Node Exporter (9100) và vai trò (Web/DB/App).

### 📈 PH2: Giám sát Thời gian thực (`RealtimeDashboard.tsx`, `metrics.py`)
- **Chức năng:** Thu thập và hiển thị chỉ số thời gian thực với chu kỳ refresh liên tục.
- **Metrics giám sát:**
  - **CPU:** % Sử dụng CPU thực tế (tính theo delta `node_cpu_seconds_total`).
  - **RAM:** % RAM tiêu thụ và lượng RAM khả dụng.
  - **Disk:** % Dung lượng đĩa, IOPS (`reads_completed` + `writes_completed`), Tốc độ Đọc/Ghi đĩa (MB/s).
  - **Network:** Tốc độ nhận dữ liệu Mạng RX (Mbps).
- **Cơ chế dự phòng:** Hàm `parse_node_exporter_direct` cào trực tiếp từ Node Exporter qua HTTP port 9100 nếu Prometheus không phản hồi.

### 🛡️ PH3: Trung tâm Phát hiện Bất thường ML (`AnomalyCenter.tsx`, `anomalies.py`)
- **Chức năng:** Đánh giá điểm dữ liệu real-time qua mô hình Isolation Forest.
- **Tính năng:**
  - Tính toán **Anomaly Score** ($Score < 0$ là bất thường, âm càng sâu bất thường càng nặng).
  - Phân loại mức độ: **Critical** (Nghiêm trọng) hoặc **Warning** (Cảnh báo).
  - **SHAP-like Explainability:** Tính toán tỷ lệ đóng góp của từng chỉ số (CPU contribution %, RAM %, Network RX %) vào điểm bất thường để quản trị viên xử lý ngay.
  - Hỗ trợ bộ lọc nâng cao (lọc theo tên máy chủ, độ nghiêm trọng, từ khóa).

### 🔔 PH4: Quản lý Cảnh báo & Sự cố (`AlertHub.tsx`, `alerts.py`)
- **Chức năng:** Quản lý vòng đời cảnh báo (Tạo mới `new`, Xác nhận `ack`, Giải quyết `resolved`).
- **Cơ chế Tự động Phục hồi (Auto-Recovery):**
  - Khi chỉ số CPU hoặc RAM vượt ngưỡng (CPU > 80%, RAM > 85%), hệ thống tự động sinh Cảnh báo mới.
  - Khi tải hệ thống giảm về mức an toàn (CPU <= 80%, RAM <= 85%), hệ thống **tự động chuyển trạng thái Cảnh báo thành Resolved**.

### 🔬 PH5: MLOps & Analytics Mô hình (`ModelInsights.tsx`, `ml.py`, `train.py`)
- **Chức năng:** Quản lý vòng đời mô hình Isolation Forest.
- **Lưu trữ mô hình:** Các file mô hình `.pkl` và scaler `.pkl` lưu tại `ml/models/`.
- **Dữ liệu huấn luyện:** Các file CSV chỉ số lưu tại `ml/dataset/` (`ubuntu-server-01_metrics.csv`, `02`, `03`).
- **Chỉ số đánh giá:** Theo dõi Precision, Recall, F1-Score và phân bố đặc trưng dữ liệu.

---

## 4. TỔNG HỢP LỊCH SỬ THAY ĐỔI & LỖI ĐÃ XỬ LÝ (HISTORICAL BUG LOG)

1. **[2026-08-09] Chốt kiến trúc dự án:**
   - Thay thế NestJS bằng FastAPI để tối ưu hóa việc tích hợp trực tiếp scikit-learn.
   - Chốt scope 5 phân hệ chức năng (PH1 - PH5).
2. **[2026-08-11] Sửa lỗi `UnboundLocalError` trong cào metrics direct (`metrics.py`):**
   - **Hiện tượng:** Máy chủ `ubuntu-server-test` bị khựng chỉ số trên dashboard.
   - **Nguyên nhân:** Biến `d_free_gb` bị truy cập trước khi gán do lỗi gán điều kiện `if d_free_gb`.
   - **Khắc phục:** Sửa điều kiện gán biến thành `if d_free_m`, giúp hàm `parse_node_exporter_direct` hoạt động ổn định 100%.
3. **[2026-08-20] Quét & Định hình toàn bộ dự án:**
   - Cập nhật nhật ký AI (`ai_prompting_log.md`).
   - Tổng hợp Bộ tri thức dự án (`docs/PROJECT_KNOWLEDGE_BASE.md`).

---

## 5. HƯỚNG DẪN VẬN HÀNH VÀ KÍCH HOẠT QUY TRÌNH

```bash
# 1. Khởi động toàn bộ dịch vụ Backend & Monitoring
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Khởi động Frontend React
cd frontend
npm run dev

# 3. Kích hoạt kịch bản tạo bất thường (Diễn tập)
cd scenarios
bash scenario_01_cpu_spike.sh
bash scenario_02_ram_leak.sh
```
