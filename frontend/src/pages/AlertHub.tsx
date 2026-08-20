import React, { useState, useEffect } from 'react';
import { BellRing, ShieldAlert, CheckCircle2, Clock, Plus, Sliders, ToggleLeft, ToggleRight, ArrowRight, Zap } from 'lucide-react';

interface AlertItem {
  id: number;
  server_id: number;
  alert_type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'ack' | 'resolved';
  timestamp: string;
  server_name?: string;
}

export const AlertHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kanban' | 'rules'>('kanban');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoMlToggle, setAutoMlToggle] = useState<boolean>(true);
  const [recovering, setRecovering] = useState<boolean>(false);

  // Rule Builder Form State
  const [ruleMetric, setRuleMetric] = useState('cpu_percent');
  const [ruleOperator, setRuleOperator] = useState('>');
  const [ruleThreshold, setRuleThreshold] = useState(90);
  const [ruleDuration, setRuleDuration] = useState('5m');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Fetch alerts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Move Incident Status (Acknowledge)
  const handleAcknowledge = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error("Acknowledge alert error:", err);
    }
  };

  // 2. Resolve Incident Status (Resolve)
  const handleResolve = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error("Resolve alert error:", err);
    }
  };

  // 3. Trigger Auto Recovery Engine
  const handleAutoRecover = async () => {
    setRecovering(true);
    try {
      const res = await fetch('/api/alerts/auto-recover', { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error("Auto recover error:", err);
    } finally {
      setRecovering(false);
    }
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            PH4: Alert Hub & Incident Response Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            3-Stage Incident Response Kanban & Automated Alert Auto-Recovery Engine.
          </p>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--accent-emerald), #059669)', fontSize: '13px' }}
            onClick={handleAutoRecover}
            disabled={recovering}
          >
            <Zap size={15} className={recovering ? 'spin' : ''} />
            {recovering ? 'Recovering...' : 'Run Auto-Recovery Engine'}
          </button>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('kanban')}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                background: activeTab === 'kanban' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'kanban' ? 'white' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Incident Kanban Board
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
              Rule Engine Config
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: KANBAN BOARD FOR INCIDENT RESPONSE (Auto-fit Grid) */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
          {/* Column 1: Mới (New) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> 1. NEW ALERTS
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.2)', fontSize: '12px', fontWeight: 700, color: '#fb7185' }}>
                {alerts.filter(a => a.status === 'new').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'new').length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No new incidents.</div>
              ) : (
                alerts.filter(a => a.status === 'new').map(item => (
                  <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.alert_type}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>{item.message}</div>
                    <button
                      onClick={() => handleAcknowledge(item.id)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      Acknowledge <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Đang xử lý (Acknowledged) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> 2. ACKNOWLEDGED
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>
                {alerts.filter(a => a.status === 'ack').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'ack').length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No acknowledged incidents.</div>
              ) : (
                alerts.filter(a => a.status === 'ack').map(item => (
                  <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{item.alert_type}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>{item.message}</div>
                    <button
                      onClick={() => handleResolve(item.id)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      Resolve Incident <CheckCircle2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Đã giải quyết (Resolved) */}
          <div className="glass-card" style={{ padding: '20px', minHeight: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> 3. RESOLVED
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                {alerts.filter(a => a.status === 'resolved').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {alerts.filter(a => a.status === 'resolved').length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No resolved history yet.</div>
              ) : (
                alerts.filter(a => a.status === 'resolved').map(item => (
                  <div key={item.id} className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', opacity: 0.85, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{item.alert_type}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.message}</div>
                  </div>
                ))
              )}
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
              <Sliders size={20} color="var(--accent-purple)" /> Static Threshold Rule Engine Builder
            </h2>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '14px' }}>RULE DEFINITION LOGIC:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <span style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontWeight: 700 }}>[IF]</span>
                <select value={ruleMetric} onChange={e => setRuleMetric(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value="cpu_percent">CPU Usage (%)</option>
                  <option value="ram_percent">RAM Usage (%)</option>
                  <option value="disk_iops">Disk IOPS</option>
                  <option value="net_in_mbps">Network In (Mbps)</option>
                </select>
                <select value={ruleOperator} onChange={e => setRuleOperator(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value=">">Greater Than (&gt;)</option>
                  <option value="<">Less Than (&lt;)</option>
                </select>
                <input type="number" value={ruleThreshold} onChange={e => setRuleThreshold(Number(e.target.value))} style={{ width: '80px', padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }} />
                <span style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontWeight: 700 }}>[FOR DURATION]</span>
                <select value={ruleDuration} onChange={e => setRuleDuration(e.target.value)} style={{ padding: '8px', borderRadius: '6px', background: '#111827', color: 'white', border: '1px solid var(--border-color)' }}>
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                </select>
                <span style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.2)', color: '#fb7185', borderRadius: '6px', fontWeight: 700 }}>[TRIGGER CRITICAL ALERT]</span>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Save New Rule
            </button>
          </div>

          {/* ML Auto-Alert Toggle Settings */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Automated ML Anomaly Alert Triggering</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>Auto-dispatch alerts when Isolation Forest detects anomaly</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>No manual threshold tuning required; model automatically pushes anomalies to Kanban board</div>
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
