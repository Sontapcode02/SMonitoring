import React, { useState } from 'react';
import { ServerManagement } from './pages/ServerManagement';
import { LayoutDashboard, Server, ShieldAlert, BellRing, BarChart3, Activity } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'servers' | 'anomalies' | 'alerts' | 'ml'>('servers');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Brand Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 24px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Activity color="white" size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Ubuntu Monitor</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>AI ANOMALY DETECT</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'dashboard' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 600 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={18} /> PH2: Dashboard Realtime
          </button>

          <button
            onClick={() => setActiveTab('servers')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'servers' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'servers' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'servers' ? 600 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <Server size={18} /> PH1: Quản Lý Máy Chủ
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'anomalies' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'anomalies' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'anomalies' ? 600 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <ShieldAlert size={18} /> PH3: Phát Hiện Bất Thường
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'alerts' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'alerts' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'alerts' ? 600 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <BellRing size={18} /> PH4: Cảnh Báo & Alert
          </button>

          <button
            onClick={() => setActiveTab('ml')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'ml' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'ml' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'ml' ? 600 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={18} /> PH5: Báo Cáo Model ML
          </button>
        </nav>

        {/* System Version Footer */}
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div>KLTN — 2026</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>FastAPI + React + ML</div>
        </div>
      </aside>

      {/* Main Content View */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'servers' && <ServerManagement />}
        {activeTab !== 'servers' && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>{activeTab.toUpperCase()} Module Status</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
              Phân hệ này đang được kết nối dữ liệu ở các tuần tiếp theo trong Kế hoạch 8 Tuần.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
