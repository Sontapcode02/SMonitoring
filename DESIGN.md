# DESIGN.md — Impeccable Grafana Industrial Dark Theme

## Brand & Visual World
- **Theme:** Grafana Industrial Dark Monitoring Dashboard System
- **Primary Register:** **Operate** (Ultra-scannable metrics, matte dark panels, high density data visualization, zero eye fatigue)

## Color System (Grafana Industrial Matte Palette)
- **Background Base:** `#111217` (Grafana Matte Dark Canvas)
- **Header & Sidebar Base:** `#181b1f` (Grafana Navigation Surface)
- **Panel Elevation 1:** `#181b1f` (Grafana Matte Card Fill)
- **Panel Elevation 2:** `#22252b` (Grafana Hover Card Fill)
- **Borders & Dividers:** `1px solid #2c3235` (Grafana Crisp Panel Border)
- **Grafana Blue (Primary / Info):** `#5794f2` — Metric highlights & primary actions
- **Grafana Green (Success / Online):** `#73bf69` — Normal status & online nodes
- **Grafana Yellow (Warning):** `#fade2a` — Warning anomalies
- **Grafana Orange (Alert):** `#ff9830` — Active warning thresholds & sidebar active indicator
- **Grafana Red (Critical / Anomaly):** `#f2495c` — Anomaly detection & offline servers
- **Grafana Purple (Secondary):** `#b877d9` — Memory & process allocation metrics

## Typography Rules
- **Font Stack:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Headings:** Compact uppercase (`12px-14px`), letter-spacing `0.05em`, crisp contrast (`#f4f5f7`)
- **Body Text:** Scannable medium (`#c7d0d9`), muted labels (`#8e9499`)
- **Monospace Code/IPs:** `'JetBrains Mono', monospace`

## Component Guidelines
- **Card Containers:** Solid matte `#181b1f`, 8px border radius, 1px border `#2c3235`, zero glossy blurs.
- **Badges & Tags:** Solid dark fills (`#112117` for Green, `#2c1214` for Red, `#2b220e` for Orange), crisp 1px borders, bright high-contrast labels.
- **ECharts Graphs:** Transparent background, crisp metric lines (`#73bf69`, `#5794f2`, `#b877d9`), dark grid lines `rgba(255,255,255,0.05)`.

## Anti-Patterns Enforcement
- 🚫 **No glossy glassmorphism blurs on metrics panels**
- 🚫 **No low-contrast gray text on dark tinted badges**
- 🚫 **No default browser scrollbars**
- 🚫 **No cramped padding or tight touch targets**

