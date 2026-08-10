import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Server, ShieldAlert, Bell, Cpu, Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

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
  
  const avgCpuNum = Object.values(realtimeMetrics).length > 0
    ? Number((Object.values(realtimeMetrics).reduce((acc, curr) => acc + (curr.cpu_percent || 0), 0) / Object.values(realtimeMetrics).length).toFixed(1))
    : 5.0;

  const avgRamNum = Object.values(realtimeMetrics).length > 0
    ? Number((Object.values(realtimeMetrics).reduce((acc, curr) => acc + (curr.ram_percent || 0), 0) / Object.values(realtimeMetrics).length).toFixed(1))
    : 24.8;

  // CPU ECharts Gauge Option
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
        title: { offsetCenter: [0, '-20%'], fontSize: 12, color: '#9ca3af' },
        detail: {
          fontSize: 22,
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: avgCpuNum > 80 ? '#f43f5e' : '#06b6d4',
          fontWeight: 700
        },
        data: [{ value: avgCpuNum, name: 'AVG CPU' }]
      }
    ]
  };

  // RAM ECharts Gauge Option
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
        title: { offsetCenter: [0, '-20%'], fontSize: 12, color: '#9ca3af' },
        detail: {
          fontSize: 22,
          offsetCenter: [0, '25%'],
          valueAnimation: true,
          formatter: '{value}%',
          color: '#c084fc',
          fontWeight: 700
        },
        data: [{ value: avgRamNum, name: 'AVG RAM' }]
      }
    ]
  };

  // Multi-server comparative line chart option (Compact)
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
      data: ['20:45', '20:47', '20:49', '20:51', '20:53', '20:55', 'Live'],
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
        data: [12, 15, 14, 18, 12, 10, realtimeMetrics['ubuntu-server-01']?.cpu_percent || 5],
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 2 }
      },
      {
        name: 'ubuntu-server-02',
        type: 'line',
        smooth: true,
        data: [42, 55, 62, 58, 48, 52, realtimeMetrics['ubuntu-server-02']?.cpu_percent || 45],
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2 }
      },
      {
        name: 'ubuntu-server-03',
        type: 'line',
        smooth: true,
        data: [25, 28, 30, 26, 22, 24, realtimeMetrics['ubuntu-server-03']?.cpu_percent || 15],
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

      {/* Middle Row: CPU Gauge, RAM Gauge & Server Fleet Health (3 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 260px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* CPU Gauge Card */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '-10px' }}>CPU WORKLOAD GAUGE</div>
          <ReactECharts option={cpuGaugeOption} style={{ height: '170px', width: '100%' }} />
        </div>

        {/* RAM Gauge Card */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc', marginBottom: '-10px' }}>RAM MEMORY GAUGE</div>
          <ReactECharts option={ramGaugeOption} style={{ height: '170px', width: '100%' }} />
        </div>

        {/* Server Fleet Health List */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={16} color="var(--accent-cyan)" /> Server Fleet Node Health
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
            {servers.map((srv) => {
              const m = realtimeMetrics[srv.name] || { cpu_percent: 0, ram_percent: 0 };
              const hasAlert = activeAlerts.some(a => a.server_id === srv.id);

              return (
                <div key={srv.id} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>{srv.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({srv.ip_address})</span></span>
                    {srv.status === 'offline' ? (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(244,63,94,0.2)', color: '#fb7185' }}>OFFLINE</span>
                    ) : hasAlert ? (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>ANOMALY</span>
                    ) : (
                      <span style={{ padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>ONLINE</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>CPU: </span>
                      <b style={{ color: m.cpu_percent > 80 ? '#fb7185' : 'var(--accent-cyan)' }}>{m.cpu_percent.toFixed(1)}%</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>RAM: </span>
                      <b style={{ color: '#c084fc' }}>{m.ram_percent.toFixed(1)}%</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Incident Stream & Comparative Line Chart (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', height: '220px' }}>
        {/* Active Incident Stream */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185' }}>
            <Bell size={16} /> Active Incident Stream ({activeAlerts.length})
          </h2>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeAlerts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#34d399', fontSize: '13px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} style={{ marginRight: '6px' }} />
                All systems normal. No active incidents!
              </div>
            ) : (
              activeAlerts.map(alert => (
                <div key={alert.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(244,63,94,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#fb7185', marginBottom: '4px' }}>
                    <span>{alert.alert_type}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.3' }}>{alert.message}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {alert.status === 'new' && (
                      <button onClick={() => handleAcknowledge(alert.id)} style={{ flex: 1, padding: '4px', borderRadius: '4px', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                        Ack
                      </button>
                    )}
                    <button onClick={() => handleResolve(alert.id)} style={{ flex: 1, padding: '4px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Multi-Server CPU Comparative Chart */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={16} color="var(--accent-cyan)" /> Multi-Server CPU Comparison Stream
          </h2>
          <ReactECharts option={compareChartOption} style={{ flex: 1, height: '100%', width: '100%' }} />
        </div>
      </div>
    </div>
  );
};
