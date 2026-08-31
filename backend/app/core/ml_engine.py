import os
import time
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.schemas import MetricModel, ServerModel

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MODEL_DIR = os.path.join(BASE_DIR, "ml", "models")
DATASET_DIR = os.path.join(BASE_DIR, "ml", "dataset")

FEATURES = [
    "cpu_percent",
    "ram_percent",
    "load1_per_cpu",
    "disk_read_mbps",
    "disk_write_mbps",
    "disk_iops",
    "net_in_mbps",
    "net_out_mbps",
    "net_packets_in_pps",
    "tcp_connections"
]

class MLAnomalyEngine:
    """
    ML Anomaly Detection Engine cho tất cả các Node Server.
    Sử dụng Isolation Forest 10 đặc trưng với cơ chế Fallback Cold-start và Dynamic Score Normalization.
    """
    def __init__(self):
        self.models_cache: Dict[str, Any] = {}
        self.scalers_cache: Dict[str, Any] = {}
        self.last_load_time: Dict[str, float] = {}

    def _get_model_paths(self, server_name: str) -> Tuple[str, str]:
        s_clean = (server_name or "ubuntu-server-01").lower().strip()
        m_path = os.path.join(MODEL_DIR, f"if_{s_clean}.pkl")
        sc_path = os.path.join(MODEL_DIR, f"scaler_{s_clean}.pkl")

        # Fallback cold-start model if specific server model is not trained yet
        if not os.path.exists(m_path) or not os.path.exists(sc_path):
            m_path = os.path.join(MODEL_DIR, "if_ubuntu-server-01.pkl")
            sc_path = os.path.join(MODEL_DIR, "scaler_ubuntu-server-01.pkl")

        return m_path, sc_path

    def load_model_for_server(self, server_name: str):
        now = time.time()
        # Reload cache every 5 minutes or if missing
        if server_name in self.models_cache and (now - self.last_load_time.get(server_name, 0)) < 300:
            return self.models_cache[server_name], self.scalers_cache[server_name]

        m_path, sc_path = self._get_model_paths(server_name)

        if not os.path.exists(m_path) or not os.path.exists(sc_path):
            print(f"[ML Engine] Model files not found: {m_path}. Training initial baseline...")
            self._train_initial_fallback(server_name)
            m_path, sc_path = self._get_model_paths(server_name)

        try:
            model = joblib.load(m_path)
            scaler = joblib.load(sc_path)
            self.models_cache[server_name] = model
            self.scalers_cache[server_name] = scaler
            self.last_load_time[server_name] = now
            return model, scaler
        except Exception as e:
            print(f"[ML Engine Error] Failed to load model for {server_name}: {e}")
            return None, None

    def _train_initial_fallback(self, server_name: str):
        """Train nhanh mô hình fallback cơ bản nếu chưa có model saved."""
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import MinMaxScaler

            os.makedirs(MODEL_DIR, exist_ok=True)
            # Generate fallback 500 samples
            np.random.seed(42)
            X = np.random.normal(loc=15.0, scale=4.0, size=(500, len(FEATURES)))
            scaler = MinMaxScaler()
            X_scaled = scaler.fit_transform(X)
            model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1)
            model.fit(X_scaled)

            s_clean = (server_name or "ubuntu-server-01").lower().strip()
            joblib.dump(model, os.path.join(MODEL_DIR, f"if_{s_clean}.pkl"))
            joblib.dump(scaler, os.path.join(MODEL_DIR, f"scaler_{s_clean}.pkl"))
        except Exception as e:
            print(f"[ML Engine Initial Train Error]: {e}")

    def predict_anomaly(self, server_name: str, metric_payload: Dict[str, Any]) -> Tuple[bool, float, float]:
        """
        Dự đoán Anomaly bằng Isolation Forest cho 1 snapshot metric.
        Trả về Tuple: (is_ml_anomaly: bool, anomaly_score_pct: float, decision_score: float)
        """
        model, scaler = self.load_model_for_server(server_name)
        if model is None or scaler is None:
            return False, 0.0, 0.0

        # Construct 10-feature vector
        cpu = float(metric_payload.get("cpu_percent", 0.0))
        ram = float(metric_payload.get("ram_percent", 0.0))
        load1 = float(metric_payload.get("load1_per_cpu", cpu / 100.0))
        disk_r = float(metric_payload.get("disk_read_mbps", 0.0))
        disk_w = float(metric_payload.get("disk_write_mbps", 0.0))
        disk_iops = float(metric_payload.get("disk_iops", 0.0))
        net_in = float(metric_payload.get("net_in_mbps", 0.0))
        net_out = float(metric_payload.get("net_out_mbps", net_in * 0.8))
        net_pps = float(metric_payload.get("net_packets_in_pps", net_in * 120.0))
        tcp_conn = float(metric_payload.get("tcp_connections", 40.0))

        feat_vector = np.array([[
            cpu, ram, load1, disk_r, disk_w, disk_iops, net_in, net_out, net_pps, tcp_conn
        ]])

        try:
            X_scaled = scaler.transform(feat_vector)
            decision_score = float(model.decision_function(X_scaled)[0])  # Normal points > 0, Anomalies < 0
            pred = int(model.predict(X_scaled)[0])  # -1 for anomaly, 1 for normal

            # Convert decision_score to intuitive 0-100 Anomaly Risk Percentage
            # decision_score usually in [-0.35, 0.35]. Less than 0 means higher anomaly risk.
            if decision_score < 0:
                anomaly_pct = min(99.9, round((0.0 - decision_score) / 0.30 * 50.0 + 50.0, 1))
            else:
                anomaly_pct = max(0.1, round((0.30 - decision_score) / 0.30 * 45.0, 1))

            is_ml_anomaly = (pred == -1) or (anomaly_pct >= 65.0)
            return is_ml_anomaly, anomaly_pct, round(decision_score, 4)

        except Exception as e:
            print(f"[ML Inference Error] {server_name}: {e}")
            return False, 0.0, 0.0

    def train_model_from_db(self, server_name: str, db: Session, days: int = 7) -> Dict[str, Any]:
        """Huấn luyện lại (Retrain) mô hình Isolation Forest từ dữ liệu thực tế tích lũy trong DB."""
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import MinMaxScaler

        srv = db.query(ServerModel).filter(ServerModel.name == server_name).first()
        if not srv:
            return {"status": "error", "message": f"Server '{server_name}' not found"}

        # Query metrics
        cutoff = datetime.utcnow() - timedelta(days=days)
        rows = db.query(MetricModel).filter(MetricModel.server_id == srv.id, MetricModel.timestamp >= cutoff).all()

        if len(rows) < 50:
            return {"status": "error", "message": f"Not enough metrics rows ({len(rows)}) to train model. Minimum 50 required."}

        data = []
        for r in rows:
            data.append([
                r.cpu_percent, r.ram_percent, r.load1_per_cpu,
                r.disk_read_mbps, r.disk_write_mbps, r.disk_iops,
                r.net_in_mbps, r.net_out_mbps, r.net_packets_in_pps, r.tcp_connections
            ])

        X = np.array(data)
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1)
        model.fit(X_scaled)

        os.makedirs(MODEL_DIR, exist_ok=True)
        m_path = os.path.join(MODEL_DIR, f"if_{server_name.lower()}.pkl")
        sc_path = os.path.join(MODEL_DIR, f"scaler_{server_name.lower()}.pkl")

        joblib.dump(model, m_path)
        joblib.dump(scaler, sc_path)

        # Clear cache
        if server_name in self.models_cache:
            del self.models_cache[server_name]

        return {
            "status": "success",
            "server_name": server_name,
            "samples_count": len(X),
            "model_path": m_path
        }

ml_engine = MLAnomalyEngine()
