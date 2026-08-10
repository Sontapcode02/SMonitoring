import React, { useState } from 'react';
import { BellRing, ShieldAlert, CheckCircle2, Clock, Play, Plus, Sliders, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';

interface AlertItem {
  id: number;
  server: string;
  type: string;
  message: string;
  severity: 'Critical' | 'Warning' | 'Info';
  status: 'new' | 'ack' | 'resolved';
  timestamp: string;
}

const initialAlerts: AlertItem[] = [
  { id: 1, server: 'ubuntu-server-02', type: 'ML_ANOMALY', message: 'Tải IOPS vượt dải 300 ops/s liên tục', severity: 'Critical', status: 'new', timestamp: '10:05:15' },
  { id: 2, server: 'ubuntu-server-01', type: 'CPU_HIGH', message: 'CPU Usage > 90% trong vòng 5 phút', severity: 'Warning', status: 'new', timestamp: '14:22:00' },
  { id: 3, server: 'ubuntu-server-03', type: 'ML_ANOMALY', message: 'Ghi đĩa ban đêm bất thường (Exfiltration Risk)', severity: 'Critical', status: 'ack', timestamp: '03:15:45' },
  { id: 4, server: 'ubuntu-server-01', type: 'RAM_HIGH', message: 'RAM Available < 10%', severity: 'Warning', status: 'resolved', timestamp: 'Yesterday' }
];

export const AlertHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kanban' | 'rules'>('kanban');
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [autoMlToggle, setAutoMlToggle] = useState<boolean>(true);

  // Rule Builder Form State
  const [ruleMetric, setRuleMetric] = useState('cpu_percent');
  const [ruleOperator, setRuleOperator] = useState('>');
  const [ruleThreshold, setRuleThreshold] = useState(90);
  const [ruleDuration, setRuleDuration] = useState('5m');
  const [ruleSeverity, setRuleSeverity] = useState('Critical');

  const moveStatus = (id: number, nextStatus: 'new' | 'ack' | 'resolved') => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            🔔 PH4: Quản Lý Cảnh Báo (Alert Hub & Incident Response)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Quy trình xử lý sự cố Kanban & Bộ máy định nghĩa Luật cảnh báo (Rule Engine).
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: activeTab === 'kanban' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'kanban' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer'
            }}
          >
            📋 Kanban Board Sự Cố
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: activeTab === 'rules' ? 'var(--accent-purple)' : 'transparent',
              color: activeTab === 'rules' ? 'white' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer'
            }}
          >
            ⚙️ Cấu Hình Rule Engine
          </button>
        </div>
      </div>

      {/* TAB 1: KANBAN BOARD FOR INCIDENT RESPONSE */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {/* Column 1: Mới (New) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> MỚI (NEW ALERTS)
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', fontSize: '12px', fontWeight: 700, color: '#fb7185' }}>
                {alerts.filter(a => a.status === 'new').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'new').map(item => (
                <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.server}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{item.message}</div>
                  <button
                    onClick={() => moveStatus(item.id, 'ack')}
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    Tiếp Nhận Xử Lý (Acknowledge) <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Đang xử lý (Acknowledged) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> ĐANG XỬ LÝ (ACKNOWLEDGED)
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                {alerts.filter(a => a.status === 'ack').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'ack').map(item => (
                <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.server}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{item.message}</div>
                  <button
                    onClick={() => moveStatus(item.id, 'resolved')}
                    style={{ width: '100%', padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    Đánh Dấu Đã Giải Quyết (Resolve) <CheckCircle2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Đã giải quyết (Resolved) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> ĐÃ GIẢI QUYẾT (RESOLVED)
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                {alerts.filter(a => a.status === 'resolved').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'resolved').map(item => (
                <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', textDecoration: 'line-through' }}>{item.server}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULE ENGINE BUILDER UI */}
      {activeTab === 'rules' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Rule Creator */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="var(--accent-purple)" /> Bộ Tạo Rule Cảnh Báo Thủ Công (Rule Engine)
            </h2>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '14px' }}>CẤU TRÚC ĐỊNH NGHĨA LUẬT (LOGIC BUILDER):</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <span style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontWeight: 700 }}>[NẾU]</span>
                <select value={ruleMetric} onChange={e => setRuleMetric(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value="cpu_percent">CPU Usage (%)</option>
                  <option value="ram_percent">RAM Usage (%)</option>
                  <option value="disk_iops">Disk IOPS</option>
                  <option value="net_in_mbps">Network In (Mbps)</option>
                </select>
                <select value={ruleOperator} onChange={e => setRuleOperator(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value=">">Lớn Hơn (&gt;)</option>
                  <option value="<">Nhỏ Hơn (&lt;)</option>
                </select>
                <input type="number" value={ruleThreshold} onChange={e => setRuleThreshold(Number(e.target.value))} style={{ width: '80px', padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }} />
                <span style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontWeight: 700 }}>[TRONG VÒNG]</span>
                <select value={ruleDuration} onChange={e => setRuleDuration(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value="1m">1 Phút</option>
                  <option value="5m">5 Phút</option>
                  <option value="15m">15 Phút</option>
                </select>
                <span style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.2)', color: '#fb7185', borderRadius: '6px', fontWeight: 700 }}>[BÁO CẢNH BÁO CRITICAL]</span>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Lưu Rule Mới Vào Hệ Thống
            </button>
          </div>

          {/* ML Auto-Alert Toggle Settings */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Tự Động Tạo Alert Từ ML Anomaly</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Tự động bắn Alert khi Isolation Forest phát hiện Anomaly</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Không cần cài rule cứng, mô hình tự phát hiện bất thường và gửi sang Kanban board</div>
              </div>
              <div style={{ cursor: 'pointer' }} onClick={() => setAutoMlToggle(!autoMlToggle)}>
                {autoMlToggle ? <ToggleRight size={36} color="var(--accent-emerald)" /> : <ToggleLeft size={36} color="var(--text-muted)" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
