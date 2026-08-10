import React, { useState, useEffect } from 'react';
import { Server, Activity, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, ShieldAlert, Cpu } from 'lucide-react';

interface ServerItem {
  id: number;
  name: str;
  ip_address: str;
  port: number;
  role: str;
  status: str;
  last_ping: str;
  created_at: str;
}

export const ServerManagement: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [pingingId, setPingingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(9100);
  const [role, setRole] = useState('web');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (err) {
      console.error("Fetch servers error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePing = async (id: number) => {
    setPingingId(id);
    try {
      const res = await fetch(`/api/servers/${id}/ping`, { method: 'POST' });
      if (res.ok) {
        fetchServers();
      }
    } catch (err) {
      console.error("Ping error:", err);
    } finally {
      setPingingId(null);
    }
  };

  const handleDelete = async (id: number, serverName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa máy chủ "${serverName}"?`)) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServers();
      }
    } catch (err) {
      console.error("Delete server error:", err);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ip_address: ipAddress, port: Number(port), role })
      });
      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setIpAddress('');
        fetchServers();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || 'Lỗi khi thêm máy chủ!');
      }
    } catch (err) {
      setErrorMsg('Không thể kết nối đến API Server!');
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            🖥️ Phân Hệ 1: Quản Lý Máy Chủ (Server Cluster Management)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Quản lý tập trung các máy chủ Ubuntu, theo dõi trạng thái Node Exporter kết nối thời gian thực.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={fetchServers}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} /> Làm Mới
          </button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Thêm Máy Chủ Mới
          </button>
        </div>
      </div>

      {/* Cluster Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Tổng Máy Chủ</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-cyan)' }}>{servers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Đang Hoạt Động (Online)</div>
          <div style={{ fontSize: '32px', fontWeight 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {servers.filter(s => s.status === 'online').length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>Mất Kết Nối (Offline)</div>
          <div style={{ fontSize: '32px', fontWeight 700, marginTop: '8px', color: 'var(--accent-rose)' }}>
            {servers.filter(s => s.status === 'offline').length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight 600 }}>Node Exporter Port</div>
          <div style={{ fontSize: '32px', fontWeight 700, marginTop: '8px', color: 'var(--accent-purple)' }}>9100</div>
        </div>
      </div>

      {/* Server List Table */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} color="var(--accent-cyan)" /> Danh Sách Cụm Máy Chủ Ubuntu
        </h2>

        {loading && servers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải danh sách máy chủ từ API...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>TÊN MÁY CHỦ</th>
                <th style={{ padding: '12px 16px' }}>ĐỊA CHỈ IP</th>
                <th style={{ padding: '12px 16px' }}>VAI TRÒ (ROLE)</th>
                <th style={{ padding: '12px 16px' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 16px' }}>LẦN PING CUỐI</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((srv) => (
                <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Cpu size={18} color="var(--accent-blue)" /> {srv.name}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {srv.ip_address}:{srv.port}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      background: srv.role === 'db' ? 'rgba(139, 92, 246, 0.15)' : srv.role === 'web' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: srv.role === 'db' ? '#c084fc' : srv.role === 'web' ? '#60a5fa' : '#34d399'
                    }}>
                      {srv.role.toUpperCase()} SERVER
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge-${srv.status}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                      <span className={`pulse-dot ${srv.status}`}></span>
                      {srv.status === 'online' ? 'CONNECTED (ONLINE)' : 'DISCONNECTED (OFFLINE)'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(srv.last_ping).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handlePing(srv.id)}
                        disabled={pingingId === srv.id}
                      >
                        <RefreshCw size={14} className={pingingId === srv.id ? 'spin' : ''} /> Ping Node Exporter
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(srv.id, srv.name)}>
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '30px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>Thêm Máy Chủ Mới Vào Cụm</h2>
            {errorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleAddServer}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Tên Máy Chủ (Server Name)</label>
                <input
                  type="text" required placeholder="ví dụ: ubuntu-server-04"
                  value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Địa Chỉ IP (IP Address)</label>
                <input
                  type="text" required placeholder="192.168.199.xxx"
                  value={ipAddress} onChange={e => setIpAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Node Exporter Port</label>
                  <input
                    type="number" required value={port} onChange={e => setPort(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Vai Trò (Role)</label>
                  <select
                    value={role} onChange={e => setRole(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white' }}
                  >
                    <option value="web">Web Server</option>
                    <option value="db">DB Server</option>
                    <option value="app">App Server</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-danger" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Thêm Máy Chủ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
