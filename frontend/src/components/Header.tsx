import React, { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut, Key, ChevronRight } from 'lucide-react';


interface HeaderProps {
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTabTitle }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);

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

  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Breadcrumb Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
        <span>Ubuntu Monitor</span>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeTabTitle}</span>
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

        {/* Notification Bell (Live Alert Counter) */}
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
