import React, { useState } from 'react';
import { Header } from './components/Header';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ServerManagement } from './pages/ServerManagement';
import { RealtimeDashboard } from './pages/RealtimeDashboard';
import { AnomalyCenter } from './pages/AnomalyCenter';
import { AlertHub } from './pages/AlertHub';
import { ModelInsights } from './pages/ModelInsights';
import { LayoutDashboard, Server, ShieldAlert, BellRing, BarChart3, Activity, Gauge } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'dashboard' | 'anomalies' | 'alerts' | 'ml'>('overview');

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Executive System Overview';
      case 'servers': return 'PH1: Server Fleet Management';
      case 'dashboard': return 'PH2: Real-time Live Monitoring';
      case 'anomalies': return 'PH3: Anomaly Detection Center';
      case 'alerts': return 'PH4: Alert Hub & Incident Response';
      case 'ml': return 'PH5: MLOps & Model Analytics';
      default: return 'Dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Brand Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 24px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
          }}>
            <Activity color="white" size={24} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px', color: '#fff' }}>Ubuntu Monitor</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.5px' }}>AI ANOMALY DETECT</div>
          </div>
        </div>

        {/* Navigation Items Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'overview' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'overview' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'overview' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'overview' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <Gauge size={18} /> Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('servers')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'servers' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'servers' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'servers' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'servers' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <Server size={18} /> Servers (PH1)
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'dashboard' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'dashboard' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <LayoutDashboard size={18} /> Live Monitoring (PH2)
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'anomalies' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'anomalies' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'anomalies' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'anomalies' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <ShieldAlert size={18} /> Anomalies (PH3)
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'alerts' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'alerts' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'alerts' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'alerts' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <BellRing size={18} /> Alerts (PH4)
          </button>

          <button
            onClick={() => setActiveTab('ml')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px',
              border: 'none', background: activeTab === 'ml' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              color: activeTab === 'ml' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'ml' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'ml' ? '3px solid var(--accent-cyan)' : '3px solid transparent'
            }}
          >
            <BarChart3 size={18} /> ML Analytics (PH5)
          </button>
        </nav>

        {/* System Version Footer */}
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div>KLTN Project — 2026</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>FastAPI + React + ECharts</div>
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header activeTabTitle={getTabTitle()} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'overview' && <OverviewDashboard />}
          {activeTab === 'servers' && <ServerManagement />}
          {activeTab === 'dashboard' && <RealtimeDashboard />}
          {activeTab === 'anomalies' && <AnomalyCenter />}
          {activeTab === 'alerts' && <AlertHub />}
          {activeTab === 'ml' && <ModelInsights />}
        </main>
      </div>
    </div>
  );
};

export default App;
