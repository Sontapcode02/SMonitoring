import React, { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut, Key, ChevronRight } from 'lucide-react';

interface HeaderProps {
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTabTitle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);

  const [isSimulatorActive, setIsSimulatorActive] = useState<boolean>(false);
  const [showSimMenu, setShowSimMenu] = useState<boolean>(false);

  const fetchActiveAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/?status_filter=new');
      if (res.ok) {
        const data = await res.json();
        setActiveAlertCount(Array.isArray(data) ? data.length : 0);
      }
    } catch (err) {
      console.error("Fetch active alerts count error:", err);
    }
  };

  const fetchSimulatorStatus = async () => {
    try {
      const res = await fetch('/api/simulator/status');
      if (res.ok) {
        const data = await res.json();
        setIsSimulatorActive(data.active);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
    fetchSimulatorStatus();
    const interval = setInterval(() => {
      fetchActiveAlerts();
      fetchSimulatorStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSimulator = async (activeState: boolean) => {
    try {
      await fetch('/api/simulator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: activeState })
      });
      fetchSimulatorStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerEvent = async (eventType: string, targetServer: string = 'ubuntu-server-01') => {
    try {
      await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_name: targetServer, event_type: eventType, duration_sec: 45 })
      });
      fetchSimulatorStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSimulator = async () => {
    try {
      await fetch('/api/simulator/reset', { method: 'POST' });
      fetchSimulatorStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const hasUnreadAlerts = activeAlertCount > 0;
  const bellBorder = hasUnreadAlerts ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-color)';

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Breadcrumb Path & Simulator Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        <span>Ubuntu Monitor</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeTabTitle}</span>

        {/* Simulator Toggle & Active Badge */}
        <div style={{ position: 'relative', marginLeft: '12px' }}>
          {isSimulatorActive ? (
            <button
              onClick={() => setShowSimMenu(!showSimMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.6)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
              }}
            >
              <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></span>
              🧪 SIMULATOR ACTIVE (ISOLATED)
            </button>
          ) : (
            <button
              onClick={() => handleToggleSimulator(true)}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🧪 Enable Simulator
            </button>
          )}

          {/* Simulator Trigger Menu */}
          {showSimMenu && (
            <div className="glass-card" style={{
              position: 'absolute',
              left: 0,
              top: '36px',
              width: '260px',
              padding: '10px',
              zIndex: 300,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              border: '1px solid rgba(245, 158, 11, 0.4)'
            }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#fbbf24', marginBottom: '8px' }}>
                ⚡ Demo Telemetry Event Triggers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => { handleTriggerEvent('cpu_spike', 'ubuntu-server-01'); setShowSimMenu(false); }}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔥 Trigger CPU Spike (99% - srv-01)
                </button>
                <button
                  onClick={() => { handleTriggerEvent('node_offline', 'ubuntu-server-02'); setShowSimMenu(false); }}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔴 Trigger Node Offline (srv-02)
                </button>
                <button
                  onClick={() => { handleTriggerEvent('ml_anomaly', 'windows-host-master'); setShowSimMenu(false); }}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🤖 Trigger ML Anomaly (windows-host)
                </button>
                <button
                  onClick={() => { handleResetSimulator(); setShowSimMenu(false); }}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🟢 Reset All (Healthy)
                </button>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <button
                  onClick={() => { handleToggleSimulator(false); setShowSimMenu(false); }}
                  style={{ textAlign: 'left', padding: '6px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}
                >
                  ❌ Disable Simulator Mode
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Bar & Right User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Quick Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search servers, metrics, alerts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '20px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Notification Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }} title={hasUnreadAlerts ? `${activeAlertCount} new unhandled alerts` : 'No new alerts'}>
          <div style={{
            padding: '10px',
            borderRadius: '50%',
            background: hasUnreadAlerts ? 'rgba(253, 164, 175, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${bellBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s'
          }}>
            <Bell size={18} color={hasUnreadAlerts ? 'var(--accent-rose)' : 'var(--text-secondary)'} />
            {hasUnreadAlerts && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'var(--accent-rose)',
                color: '#0f172a',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(253, 164, 175, 0.5)'
              }}>
                {activeAlertCount}
              </span>
            )}
          </div>
        </div>

        {/* User Profile Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '14px'
            }}>
              A
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Admin</div>
          </div>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="glass-card" style={{
              position: 'absolute',
              right: 0,
              top: '48px',
              width: '200px',
              padding: '8px',
              zIndex: 200,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>Administrator</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>admin@ubuntu.local</div>
              </div>
              <button style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}>
                <Key size={14} /> Change Password
              </button>
              <button style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-rose)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
