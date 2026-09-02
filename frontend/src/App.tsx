import React, { useState } from 'react';
import { Header } from './components/Header';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ServerManagement } from './pages/ServerManagement';
import { RealtimeDashboard } from './pages/RealtimeDashboard';
import { AnomalyCenter } from './pages/AnomalyCenter';
import { AlertHub } from './pages/AlertHub';
import { ModelInsights } from './pages/ModelInsights';
import { UserManagement } from './pages/UserManagement';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutDashboard, Server, ShieldAlert, BellRing, BarChart3, Activity, Gauge, Users } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'dashboard' | 'anomalies' | 'alerts' | 'ml' | 'users'>('overview');

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        Đang khởi tạo hệ thống bảo mật SMonitoring...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Executive System Overview';
      case 'servers': return 'PH1: Server Fleet Management';
      case 'dashboard': return 'PH2: Real-time Live Monitoring';
      case 'anomalies': return 'PH3: Anomaly Detection Center';
      case 'alerts': return 'PH4: Alert Hub & Incident Response';
      case 'ml': return 'PH5: MLOps & Model Analytics';
      case 'users': return 'Quản Lý Tài Khoản & Phân Quyền RBAC';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px 20px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '6px',
            background: 'linear-gradient(135deg, #ff9830, #f2495c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(255, 152, 48, 0.3)'
          }}>
            <Activity color="white" size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px', color: '#f4f5f7' }}>Ubuntu Monitor</div>
            <div style={{ fontSize: '10px', color: '#ff9830', fontWeight: 700, letterSpacing: '0.5px' }}>RBAC SECURE ENGINE</div>
          </div>
        </div>

        {/* Navigation Items Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'overview' ? '#22252b' : 'transparent',
              color: activeTab === 'overview' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'overview' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'overview' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <Gauge size={17} color={activeTab === 'overview' ? '#ff9830' : 'var(--text-muted)'} /> Executive Overview
          </button>

          <button
            onClick={() => setActiveTab('servers')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'servers' ? '#22252b' : 'transparent',
              color: activeTab === 'servers' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'servers' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'servers' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <Server size={17} color={activeTab === 'servers' ? '#ff9830' : 'var(--text-muted)'} /> Servers (PH1)
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'dashboard' ? '#22252b' : 'transparent',
              color: activeTab === 'dashboard' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'dashboard' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <LayoutDashboard size={17} color={activeTab === 'dashboard' ? '#ff9830' : 'var(--text-muted)'} /> Live Monitoring (PH2)
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'anomalies' ? '#22252b' : 'transparent',
              color: activeTab === 'anomalies' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'anomalies' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'anomalies' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <ShieldAlert size={17} color={activeTab === 'anomalies' ? '#ff9830' : 'var(--text-muted)'} /> Anomalies (PH3)
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'alerts' ? '#22252b' : 'transparent',
              color: activeTab === 'alerts' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'alerts' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'alerts' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <BellRing size={17} color={activeTab === 'alerts' ? '#ff9830' : 'var(--text-muted)'} /> Alerts (PH4)
          </button>

          <button
            onClick={() => setActiveTab('ml')}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
              border: 'none', background: activeTab === 'ml' ? '#22252b' : 'transparent',
              color: activeTab === 'ml' ? '#f4f5f7' : 'var(--text-secondary)',
              fontWeight: activeTab === 'ml' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              borderLeft: activeTab === 'ml' ? '4px solid #ff9830' : '4px solid transparent'
            }}
          >
            <BarChart3 size={17} color={activeTab === 'ml' ? '#ff9830' : 'var(--text-muted)'} /> ML Analytics (PH5)
          </button>

          {/* Admin User Management Item */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '4px',
                border: 'none', background: activeTab === 'users' ? '#22252b' : 'transparent',
                color: activeTab === 'users' ? '#f4f5f7' : 'var(--text-secondary)',
                fontWeight: activeTab === 'users' ? 700 : 500, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                borderLeft: activeTab === 'users' ? '4px solid #f43f5e' : '4px solid transparent',
                marginTop: '12px'
              }}
            >
              <Users size={17} color={activeTab === 'users' ? '#f43f5e' : '#fb7185'} /> User Admin (RBAC)
            </button>
          )}
        </nav>

        {/* System Version Footer */}
        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div>KLTN Project — 2026</div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 600 }}>FastAPI + JWT + RBAC</div>
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
          {activeTab === 'users' && user?.role === 'admin' && <UserManagement />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
