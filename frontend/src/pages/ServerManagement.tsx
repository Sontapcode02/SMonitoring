import React, { useState, useEffect } from 'react';

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

  // Auto-Scan Prometheus State
  const [scanningPrometheus, setScanningPrometheus] = useState<boolean>(false);
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [port, setPort] = useState(9100);
  const [role, setRole] = useState('web');
  const [isCustomRole, setIsCustomRole] = useState<boolean>(false);
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const DEFAULT_SERVERS: ServerItem[] = [
    { id: 1, name: 'ubuntu-server-01', ip_address: '192.168.138.128', port: 9100, role: 'web', status: 'online', last_ping: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 2, name: 'ubuntu-server-02', ip_address: '192.168.138.129', port: 9100, role: 'db', status: 'online', last_ping: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 3, name: 'ubuntu-server-03', ip_address: '192.168.138.130', port: 9100, role: 'app', status: 'online', last_ping: new Date().toISOString(), created_at: new Date().toISOString() },
    { id: 4, name: 'ubuntu-server-test', ip_address: '192.168.138.131', port: 9100, role: 'test', status: 'online', last_ping: new Date().toISOString(), created_at: new Date().toISOString() },
  ];

  // Dynamic available roles list
  const standardRoles = ['web', 'db', 'app', 'windows', 'storage', 'redis', 'k8s', 'test'];
  const currentRolesInUse = Array.from(new Set(servers.map(s => s.role ? s.role.toLowerCase() : 'web')));
  const allAvailableRoles = Array.from(new Set([...standardRoles, ...currentRolesInUse]));

  const fetchServersAndAlerts = async () => {
    setLoading(true);
    try {
      const resServers = await fetch('/api/servers/');
      let serverList: ServerItem[] = [];
      if (resServers.ok) {
        const data = await resServers.json();
        if (Array.isArray(data) && data.length > 0) {
          serverList = data;
        } else {
          serverList = DEFAULT_SERVERS;
        }
      } else {
        serverList = DEFAULT_SERVERS;
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
      setServers(DEFAULT_SERVERS);
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
    setIsCustomRole(false);
    setCustomRoleInput('');
    setErrorMsg('');
    setShowAddModal(true);
  };

  const openEditModal = (srv: ServerItem) => {
    setEditingServer(srv);
    setName(srv.name);
    setIpAddress(srv.ip_address);
    setPort(srv.port);
    const normalizedRole = srv.role ? srv.role.toLowerCase() : 'web';
    if (allAvailableRoles.includes(normalizedRole)) {
      setRole(normalizedRole);
      setIsCustomRole(false);
      setCustomRoleInput('');
    } else {
      setRole('__custom__');
      setIsCustomRole(true);
      setCustomRoleInput(srv.role);
    }
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const url = editingServer ? `/api/servers/${editingServer.id}` : '/api/servers/';
      const method = editingServer ? 'PUT' : 'POST';

      const finalRole = (isCustomRole || role === '__custom__')
        ? (customRoleInput.trim().toLowerCase() || 'web')
        : role;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ip_address: ipAddress, port: Number(port), role: finalRole })
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

  const handleScanPrometheusTargets = async () => {
    setScanningPrometheus(true);
    setScanToast(null);
    try {
      const res = await fetch('/api/servers/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScanToast(data.message);
        fetchServersAndAlerts();
      } else {
        setScanToast('⚠️ Không thể kết nối API quét Prometheus Targets!');
      }
    } catch (err) {
      console.error("Scan error:", err);
      setScanToast('❌ Lỗi kết nối khi quét Prometheus!');
    } finally {
      setScanningPrometheus(false);
    }
  };

  const monitoredServers = servers.filter(
    s => s.role !== 'prometheus' && s.name !== 'prometheus' && s.port !== 9090
  );
  const promNode = servers.find(
    s => s.role === 'prometheus' || s.name === 'prometheus' || s.port === 9090
  );
  const isPromOnline = promNode ? promNode.status === 'online' : true;

  return (
    <div className="page-container">
      {/* SECTION 1: Top Header Title Block */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
            PH1: Server Fleet Management
          </h1>
          
          {/* Prometheus Engine Status Pill Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: isPromOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${isPromOnline ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.45)'}`,
            fontSize: '12px',
            fontWeight: 700,
            color: isPromOnline ? '#34d399' : '#fb7185'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isPromOnline ? '#10b981' : '#f43f5e',
              boxShadow: `0 0 8px ${isPromOnline ? '#10b981' : '#f43f5e'}`
            }}></span>
            Prometheus Engine: {isPromOnline ? 'ONLINE' : 'OFFLINE'}
            {promNode && (
              <button
                onClick={() => handlePing(promNode.id)}
                disabled={pingingId === promNode.id}
                title="Re-check Prometheus Engine connection"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px',
                  marginLeft: '2px'
                }}
              >
                ↻
              </button>
            )}
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
          Infrastructure health overview for Ubuntu & Windows servers. Auto-Discovery via Prometheus API.
        </p>
      </div>

      {/* SECTION 2: Control Toolbar Row (Separated with Fixed Button Widths) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          className="btn-primary"
          style={{
            background: 'linear-gradient(135deg, #0284c7, #2563eb)',
            minWidth: '250px',
            justifyContent: 'center'
          }}
          onClick={handleScanPrometheusTargets}
          disabled={scanningPrometheus}
          title="Tự động quét & đồng bộ các Node đang hoạt động từ Prometheus API"
        >
          {scanningPrometheus ? ' Scanning...' : ' Auto-Scan Prometheus Nodes'}
        </button>
        <button className="btn-primary" style={{ minWidth: '110px', justifyContent: 'center' }} onClick={fetchServersAndAlerts}>
          Refresh
        </button>
        <button
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', minWidth: '130px', justifyContent: 'center' }}
          onClick={openAddModal}
        >
          Add Server
        </button>
      </div>

      {/* Auto-Scan Floating Fixed Toast Banner (No vertical layout shift!) */}
      {scanToast && (
        <div style={{
          position: 'fixed',
          top: '84px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          color: '#38bdf8',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.25)'
        }}>
          <span>🔍 {scanToast}</span>
          <button
            onClick={() => setScanToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: 700, marginLeft: '8px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary Cards (Auto-fit Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>TOTAL SERVERS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-cyan)' }}>{monitoredServers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>ONLINE & HEALTHY</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {monitoredServers.filter(s => s.status === 'online' && !s.has_anomaly).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>ANOMALY / ALERTS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-amber)' }}>
            {monitoredServers.filter(s => s.has_anomaly).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase', fontWeight: 600 }}>OFFLINE</div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-rose)' }}>
            {monitoredServers.filter(s => s.status === 'offline').length}
          </div>
        </div>
      </div>

      {/* Server List Table */}
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          Ubuntu & Windows Server Infrastructure List
        </h2>

        {loading && monitoredServers.length === 0 ? (
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
              {monitoredServers.map((srv) => (
                <tr key={srv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '14px' }}>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {srv.name}
                  </td>
                  <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {srv.ip_address}:{srv.port}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {srv.role === 'prometheus' || srv.name === 'prometheus' ? (
                      <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                        METRIC ENGINE
                      </span>
                    ) : (
                      <span className={`tag-role-${srv.role.toLowerCase()}`}>
                        {srv.role.toUpperCase()} SERVER
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {srv.status === 'offline' ? (
                      <span className="badge-offline">
                        Offline
                      </span>
                    ) : srv.has_anomaly ? (
                      <span className="badge-warning">
                        Anomaly Detected
                      </span>
                    ) : (
                      <span className="badge-online">
                        Online & Healthy
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
                        Test Connection
                      </button>
                      <button
                        style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)', color: 'white', cursor: 'pointer' }}
                        onClick={() => openEditModal(srv)}
                      >
                        Edit
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(srv.id, srv.name)}>
                        Delete
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Server Role</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !isCustomRole;
                        setIsCustomRole(nextState);
                        if (nextState) {
                          setRole('__custom__');
                        } else {
                          setRole('web');
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textDecoration: 'underline'
                      }}
                    >
                      {isCustomRole ? '← Standard' : '➕ Custom Role'}
                    </button>
                  </div>

                  {isCustomRole || role === '__custom__' ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. redis, storage, kafka..."
                      value={customRoleInput}
                      onChange={e => setCustomRoleInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid #38bdf8',
                        color: 'white'
                      }}
                    />
                  ) : (
                    <select
                      value={role}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setIsCustomRole(true);
                          setRole('__custom__');
                        } else {
                          setIsCustomRole(false);
                          setRole(e.target.value);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-color)',
                        color: 'white'
                      }}
                    >
                      {allAvailableRoles.map(r => (
                        <option key={r} value={r}>
                          {r.toUpperCase()} SERVER
                        </option>
                      ))}
                      <option value="__custom__">➕ Add Custom Role...</option>
                    </select>
                  )}
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
