# AI Prompting Log — Ubuntu Monitor KLTN

> Ghi lại tất cả lần sử dụng AI trong quá trình phát triển.
> **Quy tắc:** Ghi ngay khi dùng AI — không tổng hợp cuối sẽ quên.

---

## Format mỗi entry

```
### [YYYY-MM-DD HH:MM] — [Công cụ AI]
**Module:** Tên module / giai đoạn
**Prompt:** Nội dung đã hỏi
**Output dùng:** Tóm tắt kết quả áp dụng
**Đã chỉnh sửa:** Những gì thay đổi so với output gốc
```

---

## Session 2026-08-09 — Lên kế hoạch & Khởi tạo dự án

---

### [2026-08-09 19:33] — Antigravity IDE (Gemini)
**Module:** Planning — Tech Stack
**Prompt:**
> Công nghệ thầy đề xuất cho em: FE: React + TypeScript + Vite, UI: Tailwind CSS + Echarts, BE: NestJS, Socket: Websocket, ML service: Python + FastAPI, Thu thập Metrics: Prometheus + Node Exporter, Thu thập log: Promtail + Loki, DB: Mongo hoặc PostgreSQL, Cache: Redis, ML: Isolation Forest

**Output dùng:**
- Phân tích chi tiết vai trò từng công nghệ trong stack
- Sơ đồ kiến trúc tổng thể: Ubuntu VM → Node Exporter → Prometheus → FastAPI → React
- So sánh MongoDB vs PostgreSQL → chọn PostgreSQL

**Đã chỉnh sửa:**
- Thay **NestJS → FastAPI** (giảm 1.5 tuần học framework mới, FastAPI vừa làm backend vừa ML)
- Loki + Promtail → **Optional** (làm nếu còn thời gian T5)

---

### [2026-08-09 19:37] — Antigravity IDE (Gemini)
**Module:** Planning — UI Minimal
**Prompt:**
> Chỗ tối giản web chỉ tập trung thể hiện phần system network ML như thế nào

**Output dùng:**
- Thiết kế 3 trang chính: `/dashboard`, `/anomalies`, `/ml-report`
- Mô tả chi tiết layout từng trang với ECharts và WebSocket stats
- Luồng dữ liệu: Node Exporter → Prometheus → FastAPI → Isolation Forest → WebSocket → React

**Đã chỉnh sửa:**
- Mở rộng thành 5 phân hệ (PH1–PH5) thay vì chỉ 3 route để đủ scope LVTN

---

### [2026-08-09 19:40] — Antigravity IDE (Gemini)
**Module:** Planning — 5 Phân hệ chức năng
**Prompt:**
> Các phân hệ chức năng cho em tự xử lý vì thầy mà đưa thì sẽ rất nhiều. Nhưng em đưa ra thì cũng phải đủ về số lượng cho dashboard đó

**Output dùng:**
- PH1: Quản lý Máy chủ (Thêm/xoá, status, ping Node Exporter)
- PH2: Giám sát Thời gian thực (ECharts + WebSocket)
- PH3: Phát hiện Bất thường (Isolation Forest results)
- PH4: Cảnh báo & Thông báo (Alert từ ML + rule thủ công)
- PH5: Phân tích & Báo cáo ML (P/R/F1, so sánh IF vs Rule-based)

**Đã chỉnh sửa:**
- Thêm Authentication (JWT login) vào PH1 sau khi AI review thiếu

---

### [2026-08-09 19:43] — Antigravity IDE (Gemini)
**Module:** Planning — Tin nhắn gửi GVHD
**Prompt:**
> @Tran The Vinh dạ chỗ này e đưa ra được 5 phân hệ chính... Cần chốt các phân hệ chức năng ngay từ đầu nên cần xét kỹ chỗ này

**Output dùng:**
- Review 5 PH: phát hiện thiếu Authentication, PH4 hơi mỏng
- Bổ sung thêm chức năng rule thủ công cho PH4
- Quyết định về Loki: bỏ hoặc gộp vào PH3

**Đã chỉnh sửa:**
- Giữ nguyên 5 PH, thêm JWT vào PH1, thêm rule thủ công vào PH4

---

### [2026-08-09 19:53] — Antigravity IDE (Gemini)
**Module:** Planning — Deliverables
**Prompt:**
> Điều kiện để hoàn thành bao gồm: Mã nguồn đầy đủ, AI prompting log, Dashboard Web, Monitoring backend, ML anomaly detection service, Hệ thống Prometheus Loki Node Exporter, Bộ dữ liệu đã xử lý, Mô hình đã huấn luyện, Tập kịch bản tạo bất thường, Tài liệu kiến trúc và API, Hướng dẫn triển khai, Báo cáo kết quả thực nghiệm, Video demo, Slide bảo vệ, Báo cáo đồ án

**Output dùng:**
- Phân nhóm 15 deliverables: CODE / DATA&MODEL / TÀI LIỆU / BÁO CÁO
- Map từng deliverable vào tuần hoàn thành
- Thứ tự ưu tiên: Code → Data → Experiment → Video → Slide → Báo cáo
- Lưu ý quan trọng: AI Prompting Log phải ghi ngay từ đầu

**Đã chỉnh sửa:**
- Không có chỉnh sửa đáng kể, áp dụng nguyên

---

### [2026-08-09 20:05] — Antigravity IDE (Gemini)
**Module:** Planning — Phân tích khả thi
**Prompt:**
> Phân tích lại tính khả thi của đề tài Xây dựng nền tảng giám sát tập trung và ứng dụng học máy phát hiện bất thường theo thời gian thực cho cụm máy chủ Ubuntu

**Output dùng:**
- Tổng điểm khả thi: 67/100 — Khả thi với điều kiện cắt scope
- Ma trận rủi ro 8 rủi ro chính
- Ước lượng thực tế: ~10–12 tuần → cần cắt scope về 8 tuần
- Khuyến nghị: Thay NestJS bằng FastAPI, bỏ Loki optional

**Đã chỉnh sửa:**
- Chốt dùng FastAPI thay NestJS (quyết định quan trọng nhất)
- Loki → optional

---

### [2026-08-09 20:10] — Antigravity IDE (Gemini)
**Module:** Planning — 8-Week Plan
**Prompt:**
> Lên plan chi tiết cho 8 tuần làm việc

**Output dùng:**
- Kế hoạch chi tiết từng ngày 8 tuần
- 3 Mốc bắt buộc: T3 (Model OK), T5 (Full demo), T6 (Số liệu đủ)
- Quy tắc: Thu data từ T1D1, không đạt Mốc 1 không sang T4
- File `plan_monitor_8weeks.md` + `plan_monitor_8weeks.xlsx`

**Đã chỉnh sửa:**
- Không có chỉnh sửa đáng kể

---

### [2026-08-09 20:33] — Antigravity IDE (Gemini)
**Module:** ML — Model Generalization
**Prompt:**
> Data thu nhập từ dự án này sẽ cố định như vậy thì đem con web này chạy ra ở môi trường khác thì có hoạt động kh

**Output dùng:**
- Phân tích vấn đề: Model bị "lock" vào môi trường train
- 3 giải pháp: Per-server model, Retrain button, Delta features
- Code implement: auto-retrain scheduler mỗi 7 ngày
- Thêm endpoint `/api/ml/retrain` và hiển thị trên PH5

**Đã chỉnh sửa:**
- Chọn Giải pháp 1+2: Per-server model + Retrain button
- Giải pháp 3 (Delta features) → để Hướng phát triển tương lai

---

### [2026-08-09 20:38] — Antigravity IDE (Gemini)
**Module:** ML — Retrain Performance
**Prompt:**
> Thời gian để retrain phải mất bao lâu

**Output dùng:**
- Benchmark: 40,320 samples × 6 features × 100 trees → **~0.5–1 giây**
- Tất cả 3 server retrain cùng: ~2.23 giây tổng
- So sánh với LSTM (~30 phút) → Isolation Forest rất phù hợp real-time
- Implement auto-retrain scheduler `@scheduler.scheduled_job("interval", days=7)`

**Đã chỉnh sửa:**
- Không có chỉnh sửa đáng kể

---

### [2026-08-09 20:45] — Antigravity IDE (Gemini)
**Module:** Setup — Khởi tạo dự án
**Prompt:**
> Thực hiện trên workspace KLTN (D:\KLTN)

**Output dùng:**
- Tạo toàn bộ cấu trúc thư mục dự án
- File: README.md, .gitignore, docker-compose.yml, requirements.txt
- File: backend/app/main.py, core/config.py
- File: infra/prometheus/prometheus.yml
- File: ml/scripts/train.py (full Isolation Forest training script)
- File: scenarios/scenario_01-05.sh (kịch bản bất thường)
- Git init + first commit

**Đã chỉnh sửa:**
- Thêm `n_jobs=-1` vào IsolationForest để dùng tất cả CPU cores
- Thêm healthcheck vào PostgreSQL service trong docker-compose

---

### [2026-08-09 21:02] — Antigravity IDE (Gemini Flash)
**Module:** Infrastructure & Data Collection — Setup 3 Ubuntu Target VMs
**Prompt:**
> Setup để chuẩn bị collect data từ 3 máy chủ ảo ubuntu

**Output dùng:**
- Viết `infra/node-exporter/install_node_exporter.sh`: Bash script tự động cài đặt Node Exporter systemd service trên Ubuntu.
- Viết `ml/scripts/collect_data.py`: Script Python tự động query PromQL features từ Prometheus mỗi 15 giây và ghi append vào file CSV `ml/dataset/<server_id>_metrics.csv`.
- Cập nhật `infra/prometheus/prometheus.yml`: Định nghĩa 3 target `ubuntu-server-01`, `02`, `03` với cấu hình scrape interval 15s.
- Viết `infra/start_simulated_vms.bat`: Script Docker giả lập ngay 3 node Ubuntu Node Exporter trên local machine cho việc test nhanh.

---

### [2026-08-09 21:08] — Antigravity IDE (Gemini Flash)
**Module:** Feature Engineering — 10 Features Selection
**Prompt:**
> cpu_percent (%), ram_percent (%), disk_read_mbps (MB/s), disk_write_mbps (MB/s), net_in_mbps (Mbps), net_out_mbps (Mbps) - cần bổ sung gì chỗ này kh?

**Output dùng:**
- Đánh giá bổ sung 4 chỉ số nâng cao: `load1_per_cpu`, `disk_iops`, `net_packets_in_pps`, `tcp_connections`.
- Lý do: Bắt được các kịch bản tấn công/bất thường đặc thù mà 6 chỉ số cơ bản bị sót (SYN Flood gói nhỏ, DB Random 4K IOPS overload, Process Queue Deadlock).
- Cập nhật `collect_data.py` và `train.py` để hỗ trợ chuẩn hóa và thu thập bộ 10 features.

---

### [2026-08-09 21:10] — Antigravity IDE (Gemini Flash)
**Module:** Concept Clarification — Docker Simulation vs Ubuntu VM
**Prompt:**
> Việc giả lập có khác gì với chạy ubuntu trên VM?

**Output dùng:**
- Phân tích sự khác biệt về bản chất kỹ thuật: Docker share kernel máy Host Windows vs VM có Kernel Linux độc lập.
- So sánh tác động dữ liệu ML: Docker giả lập khiến cả 3 server có thông số trùng nhau; VM tạo ra dữ liệu thực tế độc lập từng máy chủ.
- Đưa ra định hướng sử dụng kết hợp: Dùng Docker giả lập khi code thử UI/Backend, dùng VM thật để thu Dataset & làm thực nghiệm bảo vệ LVTN.

---

### [2026-08-09 23:05] — Antigravity IDE (Gemini Flash)
**Module:** Workload Simulation — Normal Baseline for ML
**Prompt:**
> Các máy VM cần chạy các srv các tác vụ thường có của 1 server kh?

**Output dùng:**
- Trả lời: Không cần cài ứng dụng phức tạp, nhưng CẦN tạo "Tải bình thường" (Normal Baseline) để model Isolation Forest học được phân phối chuẩn của dữ liệu.
- Giải thích nguyên lý ML: Nếu server nhàn rỗi 100% (0.1% CPU), độ lệch chuẩn = 0, một tác vụ nền nhỏ của OS sẽ bị phán lầm thành Anomaly.
- Tạo script `scenarios/generate_normal_traffic.sh` chạy ngầm sinh tải nhẹ biến thiên tự động (CPU 5-15%, I/O nhẹ, ping).

---

### [2026-08-09 23:17] — Antigravity IDE (Gemini Flash)
**Module:** Dataset Availability & Synthetic Generator
**Prompt:**
> Có bộ data nào sẵn phục vụ cái này kh?

**Output dùng:**
- Giới thiệu 3 bộ dữ liệu nghiên cứu công khai nổi tiếng trong bài báo quốc tế: NAB (Numenta Anomaly Benchmark), SMD (Server Metrics Dataset), Kaggle System Metrics.
- Tạo script `ml/scripts/generate_synthetic_dataset.py` tự động sinh 40,320 mẫu dữ liệu chuẩn 7 ngày cho 3 máy chủ (`ubuntu-server-01`, `02`, `03`) với đầy đủ 10 features và nhãn thực tế (`is_anomaly`).
- Chạy sinh thành công 3 file CSV dataset trong `D:\KLTN\ml\dataset\` để có dữ liệu huấn luyện ML và test code ngay lập tức.
