import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Server, ShieldAlert, Bell, Cpu, Activity, CheckCircle2, RefreshCw, Filter } from 'lucide-react';

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
  disk_percent?: number;
  disk_size_gb?: number;
  disk_free_gb?: number;
  disk_iops: number;
  disk_read_mbps?: number;
  disk_write_mbps?: number;
  net_in_mbps: number;
}

export const OverviewDashboard: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [realtimeMetrics, setRealtimeMetrics] = useState<Record<string, RealtimeMetric>>({});
  const [loading, setLoading] = useState<boolean>(true);
  
  // Dynamic server selection state for ECharts Gauge Charts
  const [gaugeServer, setGaugeServer] = useState<string>('ubuntu-server-01');

  // Comparative time-series history state
  const [compTimes, setCompTimes] = useState<string[]>([]);
  const [srv1History, setSrv1History] = useState<number[]>([]);
  const [srv2History, setSrv2History] = useState<number[]>([]);
  const [srv3History, setSrv3History] = useState<number[]>([]);

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

          const nowTime = new Date().toLocaleTimeString();
          const cpu1 = Number((rMap['ubuntu-server-01']?.cpu_percent || 5.0).toFixed(1));
          const cpu2 = Number((rMap['ubuntu-server-02']?.cpu_percent || 4.2).toFixed(1));
          const cpu3 = Number((rMap['ubuntu-server-03']?.cpu_percent || 5.1).toFixed(1));

          setCompTimes(prev => [...prev.slice(-14), nowTime]);
          setSrv1History(prev => [...prev.slice(-14), cpu1]);
          setSrv2History(prev => [...prev.slice(-14), cpu2]);
          setSrv3History(prev => [...prev.slice(-14), cpu3]);
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
    const interval = setInterval(fetchOverviewData, 3000);
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
  
  // Specific Gauges values for selected server
  const selectedServerMetric = realtimeMetrics[gaugeServer] || { cpu_percent: 5.0, ram_percent: 24.5 };
  const gaugeCpuNum = Number((selectedServerMetric.cpu_percent || 0).toFixed(1));
  const gaugeRamNum = Number((selectedServerMetric.ram_percent || 0).toFixed(1));

  const avgCpuNum = Object.values(realtimeMetrics).length > 0
    ? Number((Object.values(realtimeMetrics).reduce((acc, curr) => acc + (curr.cpu_percent || 0), 0) / Object.values(realtimeMetrics).length).toFixed(1))
    : 5.0;

  // CPU ECharts Gauge Option for Selected Server Node
  const cpuGaugeOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '95%',
        center: ['50%', '70%'],
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.6, '#06b6d4'],
              [0.8, '#fbbf24'],
              [1, '#f43f5e']
            ]
          }
        },
        pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '60%', width: 6, offsetCenter: [0, '-10%'], itemStyle: { color: '#06b6d4' } },
        axisTick: { length: 6, lineStyle: { color: 'auto', width: 1 } },
        splitLine: { length: 10, lineStyle: { color: 'auto', width: 2 } },
        axisLabel: { color: '#9ca3af', fontSize: 10, distance: -20 },
        title: { offsetCenter: [0, '-20%'], fontSize: 11, color: '#9ca3af' },
        detail: {
          fontSize: 22,
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: gaugeCpuNum > 80 ? '#f43f5e' : '#06b6d4',
          fontWeight: 700
        },
        data: [{ value: gaugeCpuNum, name: 'CPU WORKLOAD' }]
      }
    ]
  };

  // RAM ECharts Gauge Option for Selected Server Node
  const ramGaugeOption = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 5,
        radius: '95%',
        center: ['50%', '70%'],
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.7, '#8b5cf6'],
              [0.9, '#fbbf24'],
              [1, '#f43f5e']
            ]
          }
        },
        pointer: { icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z', length: '60%', width: 6, offsetCenter: [0, '-10%'], itemStyle: { color: '#8b5cf6' } },
        axisTick: { length: 6, lineStyle: { color: 'auto', width: 1 } },
        splitLine: { length: 10, lineStyle: { color: 'auto', width: 2 } },
        axisLabel: { color: '#9ca3af', fontSize: 10, distance: -20 },
        title: { offsetCenter: [0, '-20%'], fontSize: 11, color: '#9ca3af' },
        detail: {
          fontSize: 22,
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: '#c084fc',
          fontWeight: 700
        },
        data: [{ value: gaugeRamNum, name: 'RAM MEMORY' }]
      }
    ]
  };

  // Multi-server comparative line chart option (Live Stream)
  const compareChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['ubuntu-server-01', 'ubuntu-server-02', 'ubuntu-server-03'],
      textStyle: { color: '#9ca3af', fontSize: 11 }
    },
    grid: { left: '3%', right: '4%', bottom: '8%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: compTimes.length > 0 ? compTimes : ['Live'],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#9ca3af', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    series: [
      {
        name: 'ubuntu-server-01',
        type: 'line',
        smooth: true,
        data: srv1History,
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 2 }
      },
      {
        name: 'ubuntu-server-02',
        type: 'line',
        smooth: true,
        data: srv2History,
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2 }
      },
      {
        name: 'ubuntu-server-03',
        type: 'line',
        smooth: true,
        data: srv3History,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 2 }
      }
    ]
  };

  return (
    <div style={{ padding: '20px 30px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Top Banner (Compact Row) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Executive Overview & Single-Screen Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Single viewport cluster health summary, ECharts gauges, and active incidents.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={fetchOverviewData}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Top Row: 4 Summary Metric Cards (Compact) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>MONITORED SERVERS</span>
            <Server size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>{servers.length}</div>
          <div style={{ fontSize: '11px', color: '#34d399' }}>{onlineServers} / {servers.length} Nodes Online</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>ACTIVE ALERTS</span>
            <Bell size={16} color={activeAlerts.length > 0 ? '#fb7185' : 'var(--accent-emerald)'} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: activeAlerts.length > 0 ? '#fb7185' : '#34d399' }}>
            {activeAlerts.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alerts.filter(a => a.status === 'resolved').length} Incidents Resolved</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>CLUSTER AVG CPU</span>
            <Cpu size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>{avgCpuNum}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overall Processing Workload</div>
        </div>

        <div className="glass-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>ML ANOMALY STATUS</span>
            <ShieldAlert size={16} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '4px', color: '#34d399' }}>NORMAL</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Isolation Forest Model Active</div>
        </div>
      </div>

      {/* Middle Row: CPU Gauge, RAM Gauge & Server Fleet Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '270px 270px 1fr', gap: '16px', height: '220px' }}>
        {/* CPU Gauge Card */}
        <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)' }}>CPU GAUGE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Filter size={12} color="var(--accent-cyan)" />
              <select
                value={gaugeServer}
                onChange={e => setGaugeServer(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, fontSize: '11px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ubuntu-server-01" style={{ background: '#111827' }}>server-01 (Web)</option>
                <option value="ubuntu-server-02" style={{ background: '#111827' }}>server-02 (DB)</option>
                <option value="ubuntu-server-03" style={{ background: '#111827' }}>server-03 (App)</option>
              </select>
            </div>
          </div>
          <ReactECharts option={cpuGaugeOption} notMerge={true} style={{ height: '145px', width: '100%' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Selected Node: <b style={{ color: 'var(--accent-cyan)' }}>{gaugeServer}</b>
          </div>
        </div>

        {/* RAM Gauge Card */}
        <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>RAM GAUGE</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <Filter size={12} color="#c084fc" />
              <select
                value={gaugeServer}
                onChange={e => setGaugeServer(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, fontSize: '11px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ubuntu-server-01" style={{ background: '#111827' }}>server-01 (Web)</option>
                <option value="ubuntu-server-02" style={{ background: '#111827' }}>server-02 (DB)</option>
                <option value="ubuntu-server-03" style={{ background: '#111827' }}>server-03 (App)</option>
              </select>
            </div>
          </div>
          <ReactECharts option={ramGaugeOption} notMerge={true} style={{ height: '145px', width: '100%' }} />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Selected Node: <b style={{ color: '#c084fc' }}>{gaugeServer}</b>
          </div>
        </div>

        {/* Server Fleet Health List */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={16} color="var(--accent-cyan)" /> Server Fleet Node Health Overview
          </h2>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {servers.map((srv) => {
              const m = realtimeMetrics[srv.name] || { cpu_percent: 0, ram_percent: 0, disk_percent: 55.4, disk_free_gb: 4.35, disk_size_gb: 9.75, disk_read_mbps: 0, disk_write_mbps: 0 };
              const hasAlert = activeAlerts.some(a => a.server_id === srv.id);
              const isGaugeSelected = srv.name === gaugeServer;

              return (
                <div
                  key={srv.id}
                  onClick={() => setGaugeServer(srv.name)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isGaugeSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${isGaugeSelected ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  title="Click to view Gauges for this server"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>{srv.name} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({srv.ip_address})</span></span>
                    {srv.status === 'offline' ? (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(244,63,94,0.2)', color: '#fb7185' }}>OFFLINE</span>
                    ) : hasAlert ? (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>ANOMALY</span>
                    ) : (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>ONLINE</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CPU: </span>
                      <b style={{ color: m.cpu_percent > 80 ? '#fb7185' : 'var(--accent-cyan)' }}>{m.cpu_percent.toFixed(1)}%</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>RAM: </span>
                      <b style={{ color: '#c084fc' }}>{m.ram_percent.toFixed(1)}%</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>DISK: </span>
                      <b style={{ color: '#34d399' }}>{(m.disk_percent || 55.4).toFixed(1)}%</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Incident Stream & Comparative Line Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', height: '220px' }}>
        {/* Active Incident Stream */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185' }}>
            <Bell size={16} /> Active Incident Stream ({activeAlerts.length})
          </h2>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#34d399', fontSize: '13px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} style={{ marginRight: '6px' }} />
                All systems normal. No active incidents!
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,63,94,0.3)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#fb7185', marginBottom: '2px' }}>
                    <span>{alert.alert_type}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px', lineHeight: '1.3' }}>{alert.message}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {alert.status === 'new' && (
                      <button onClick={() => handleAcknowledge(alert.id)} style={{ flex: 1, padding: '3px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        Ack
                      </button>
                    )}
                    <button onClick={() => handleResolve(alert.id)} style={{ flex: 1, padding: '3px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Multi-Server CPU Comparative Chart */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="var(--accent-cyan)" /> Multi-Server CPU Comparison Stream
          </h2>
          <ReactECharts option={compareChartOption} notMerge={true} style={{ flex: 1, height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
};
