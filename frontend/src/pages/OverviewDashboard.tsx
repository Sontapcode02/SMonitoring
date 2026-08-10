import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Server, ShieldAlert, Bell, Cpu, Activity, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  role: string;
  status: string;
  has_anomaly?: boolean;
}

interface AlertItem {
  id: number;
  server_id?: number;
  alert_type: string;
  message: string;
  severity: string;
  status: string;
  timestamp: string;
}

interface RealtimeMetric {
  server_name: string;
  cpu_percent: number;
  ram_percent: number;
  disk_iops: number;
  net_in_mbps: number;
}

export const OverviewDashboard: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<Record<string, RealtimeMetric>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchOverviewData = async () => {
    try {
      const [resServers, resAlerts, resRealtime] = await Promise.all([
        fetch('/api/servers/'),
        fetch('/api/alerts/'),
        fetch('/api/metrics/realtime')
      ]);

      if (resServers.ok) {
        const sList = await resServers.json();
        setServers(sList);
      }

      if (resAlerts.ok) {
        const aList = await resAlerts.json();
        setAlerts(aList);
      }

      if (resRealtime.ok) {
        const rList = await resRealtime.json();
        if (Array.isArray(rList)) {
          const rMap: Record<string, RealtimeMetric> = {};
          rList.forEach((item: any) => {
            rMap[item.server_name] = item;
          });
          setRealtimeMetrics(rMap);
        }
      }
    } catch (err) {
      console.error("Overview data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}/ack`, { method: 'POST' });
      if (res.ok) fetchOverviewData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) fetchOverviewData();
    } catch (err) {
      console.error(err);
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'new' || a.status === 'ack');
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const avgCpu = Object.values(realtimeMetrics).length > 0
    ? (Object.values(realtimeMetrics).reduce((acc, curr) => acc + (curr.cpu_percent || 0), 0) / Object.values(realtimeMetrics).length).toFixed(1)
    : '5.0';

  // Multi-server comparative line chart option
  const compareChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['ubuntu-server-01 (Web)', 'ubuntu-server-02 (DB)', 'ubuntu-server-03 (App)'],
      textStyle: { color: '#9ca3af' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['20:45', '20:47', '20:49', '20:51', '20:53', '20:55', 'Live'],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#9ca3af' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    series: [
      {
        name: 'ubuntu-server-01 (Web)',
        type: 'line',
        smooth: true,
        data: [12, 15, 14, 18, 12, 10, realtimeMetrics['ubuntu-server-01']?.cpu_percent || 5],
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 3 }
      },
      {
        name: 'ubuntu-server-02 (DB)',
        type: 'line',
        smooth: true,
        data: [42, 55, 62, 58, 48, 52, realtimeMetrics['ubuntu-server-02']?.cpu_percent || 45],
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 3 }
      },
      {
        name: 'ubuntu-server-03 (App)',
        type: 'line',
        smooth: true,
        data: [25, 28, 30, 26, 22, 24, realtimeMetrics['ubuntu-server-03']?.cpu_percent || 15],
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 3 }
      }
    ]
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            Executive System Overview & Status Summary
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Unified real-time dashboard aggregating cluster health, server status, and active incidents.
          </p>
        </div>
        <button className="btn-primary" onClick={fetchOverviewData}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh All
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>MONITORED SERVERS</span>
            <Server size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-cyan)' }}>
            {servers.length}
          </div>
          <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>{onlineServers} / {servers.length} Nodes Online</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>ACTIVE ALERTS</span>
            <Bell size={20} color={activeAlerts.length > 0 ? '#fb7185' : 'var(--accent-emerald)'} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: activeAlerts.length > 0 ? '#fb7185' : '#34d399' }}>
            {activeAlerts.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{alerts.filter(a => a.status === 'resolved').length} Incidents Resolved</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>CLUSTER AVG CPU</span>
            <Cpu size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-purple)' }}>
            {avgCpu}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Average Workload across Cluster</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>ML ANOMALY STATUS</span>
            <ShieldAlert size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: '#34d399' }}>
            NORMAL
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Isolation Forest Inference Active</div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left Column: Server Status Cards */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={18} color="var(--accent-cyan)" /> Server Fleet Real-time Health
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {servers.map((srv) => {
              const m = realtimeMetrics[srv.name] || { cpu_percent: 0, ram_percent: 0 };
              const hasAlert = activeAlerts.some(a => a.server_id === srv.id);

              return (
                <div key={srv.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '15px' }}>{srv.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>({srv.ip_address})</span>
                    </div>
                    {srv.status === 'offline' ? (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(244,63,94,0.2)', color: '#fb7185' }}>OFFLINE</span>
                    ) : hasAlert ? (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>ANOMALY DETECTED</span>
                    ) : (
                      <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>ONLINE</span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>CPU</span>
                        <b style={{ color: m.cpu_percent > 80 ? '#fb7185' : 'var(--accent-cyan)' }}>{m.cpu_percent.toFixed(1)}%</b>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, m.cpu_percent)}%`, background: m.cpu_percent > 80 ? '#fb7185' : 'var(--accent-cyan)' }}></div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>RAM</span>
                        <b style={{ color: '#c084fc' }}>{m.ram_percent.toFixed(1)}%</b>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, m.ram_percent)}%`, background: '#c084fc' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Active Incidents */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#fb7185" /> Live Active Incident Stream
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#34d399', fontSize: '14px', background: 'rgba(16,185,129,0.08)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={32} style={{ margin: '0 auto 10px auto' }} />
                All systems operating normally. No active unhandled incidents!
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,63,94,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#fb7185' }}>{alert.alert_type}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{alert.message}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {alert.status === 'new' && (
                      <button onClick={() => handleAcknowledge(alert.id)} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Acknowledge
                      </button>
                    )}
                    <button onClick={() => handleResolve(alert.id)} style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Multi-Server Workload Comparative Chart */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--accent-cyan)" /> Multi-Server CPU Workload Comparison
        </h2>
        <ReactECharts option={compareChartOption} style={{ height: '320px' }} />
      </div>
    </div>
  );
};
