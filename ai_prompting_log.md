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

### [2026-08-10 19:17] — Antigravity IDE (Gemini Flash)
**Module:** System Optimization — VMware VM Footprint & Disk Compact Strategies
**Prompt:**
> Có thể tối ưu chỗ này kh?

**Output dùng:**
- Đưa ra 3 giải pháp tối ưu dứt điểm dung lượng 3 máy ảo VMware/VirtualBox (Lấy lại **10 – 15 GB** ngay):
  1. **Tắt file RAM đệm `.vmem` của VMware:** Thêm cấu hình `mainMem.useNamedFile = "FALSE"` trong VMware Preferences ➡️ Giải phóng ngay **6 GB file `.vmem`**.
  2. **Co gọn đĩa đệm động (Compact VM Disk):** Dọn dẹp cache `sudo apt clean` trên Ubuntu và bấm nút **Compact** trong VMware Settings ➡️ Thu nhỏ file `.vmdk` lại **3 - 5 GB**.
  3. **Chuyển thư mục máy ảo ra khỏi OneDrive:** Chuyển sang `C:\VMs` hoặc `D:\VMs` để dừng hoàn toàn việc OneDrive tự cào cache đệm.
