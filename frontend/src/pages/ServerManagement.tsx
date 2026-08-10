import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2, RefreshCw, Edit3, Cpu, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  role: string;
  status: string;
  has_anomaly?: boolean;
  last_ping: string;
  created_at: string;
}

export const ServerManagement: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [activeAlertServerIds, setActiveAlertServerIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingServer, setEditingServer] = useState<ServerItem | null>(null);
  const [pingingId, setPingingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(9100);
  const [role, setRole] = useState('web');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchServersAndAlerts = async () => {
    setLoading(true);
    try {
      const resServers = await fetch('/api/servers');
      let serverList: ServerItem[] = [];
      if (resServers.ok) {
        serverList = await resServers.json();
      }

      const resAlerts = await fetch('/api/alerts/');
      let activeIds: number[] = [];
      if (resAlerts.ok) {
        const alertList = await resAlerts.json();
        if (Array.isArray(alertList)) {
          activeIds = alertList
            .filter((a: any) => a.status === 'new' || a.status === 'ack')
            .map((a: any) => a.server_id);
        }
      }
      setActiveAlertServerIds(activeIds);

      const mappedData = serverList.map(s => ({
        ...s,
        has_anomaly: activeIds.includes(s.id)
      }));
      setServers(mappedData);

    } catch (err) {
      console.error("Fetch servers error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServersAndAlerts();
    const interval = setInterval(fetchServersAndAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePing = async (id: number) => {
    setPingingId(id);
    try {
      const res = await fetch(`/api/servers/${id}/ping`, { method: 'POST' });
      if (res.ok) {
        fetchServersAndAlerts();
      }
    } catch (err) {
      console.error("Ping error:", err);
    } finally {
      setPingingId(null);
    }
  };

  const handleDelete = async (id: number, serverName: string) => {
    if (!window.confirm(`Are you sure you want to delete server "${serverName}"?`)) return;
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchServersAndAlerts();
      }
    } catch (err) {
      console.error("Delete server error:", err);
    }
  };

  const openAddModal = () => {
    setEditingServer(null);
    setName('');
    setIpAddress('');
    setPort(9100);
    setRole('web');
    setErrorMsg('');
    setShowAddModal(true);
  };

  const openEditModal = (srv: ServerItem) => {
    setEditingServer(srv);
    setName(srv.name);
    setIpAddress(srv.ip_address);
    setPort(srv.port);
    setRole(srv.role);
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const url = editingServer ? `/api/servers/${editingServer.id}` : '/api/servers';
      const method = editingServer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ip_address: ipAddress, port: Number(port), role })
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchServersAndAlerts();
      } else {
        const errData = await res.json();
        setErrorMsg(errData.detail || 'Error saving server information!');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to API Server!');
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner & Control */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            PH1: Server Fleet Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Infrastructure health overview for Ubuntu servers. Monitor Node Exporter live connection status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={fetchServersAndAlerts}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }} onClick={openAddModal}>
            <Plus size={16} /> Add Server
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>TOTAL SERVERS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-cyan)' }}>{servers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>ONLINE & HEALTHY</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {servers.filter(s => s.status === 'online' && !s.has_anomaly).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>ANOMALY / ALERTS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-amber)' }}>
            {servers.filter(s => s.has_anomaly).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>OFFLINE</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-rose)' }}>
            {servers.filter(s => s.status === 'offline').length}
          </div>
        </div>
      </div>

      {/* Server List Table */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} color="var(--accent-cyan)" /> Ubuntu Server Infrastructure List
        </h2>

        {loading && servers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading server list...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <th style={{ padding: '12px 16px' }}>SERVER NAME</th>
                <th style={{ padding: '12px 16px' }}>IP / NODE EXPORTER</th>
                <th style={{ padding: '12px 16px' }}>ROLE</th>
                <th style={{ padding: '12px 16px' }}>STATUS INDICATOR</th>
                <th style={{ padding: '12px 16px' }}>LAST PING</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
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
                    {srv.status === 'offline' ? (
                      <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <XCircle size={14} color="#fb7185" /> Offline
                      </span>
                    ) : srv.has_anomaly ? (
                      <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={14} color="#fbbf24" /> Anomaly Detected
                      </span>
                    ) : (
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} color="#34d399" /> Online & Healthy
                      </span>
                    )}
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
                        <RefreshCw size={14} className={pingingId === srv.id ? 'spin' : ''} /> Test Connection
                      </button>
                      <button
                        style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer' }}
                        onClick={() => openEditModal(srv)}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(srv.id, srv.name)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Server Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '30px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
              {editingServer ? 'Edit Server Details' : 'Add New Server to Fleet'}
            </h2>
            {errorMsg && (
              <div style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSaveServer}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Server Name</label>
                <input
                  type="text" required placeholder="e.g. ubuntu-server-04"
                  value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: 'white' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>IP Address</label>
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
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Role</label>
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
                <button type="button" className="btn-danger" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Server</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
