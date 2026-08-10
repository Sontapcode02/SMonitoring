import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Cpu, HardDrive, Activity, Wifi, Filter, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

interface MetricPoint {
  time: string;
  cpu: number;
  ram: number;
  disk_iops: number;
  net_in_mbps: number;
  isAnomaly: boolean;
}

export const RealtimeDashboard: React.FC = () => {
  const [selectedServer, setSelectedServer] = useState('ubuntu-server-01');
  const [timeWindow, setTimeWindow] = useState('5m');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Real-time metric states
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [ramUsage, setRamUsage] = useState<number>(0);
  const [diskIO, setDiskIO] = useState<number>(0);
  const [netTraffic, setNetTraffic] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Time-series history for ECharts
  const [timeSeries, setTimeSeries] = useState<MetricPoint[]>([]);

  // 1. Fetch initial historical metrics for the selected server
  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/metrics/history?server_name=${selectedServer}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const points: MetricPoint[] = data.map((row: any) => ({
            time: row.timestamp ? row.timestamp.split(' ')[1] || row.timestamp : '',
            cpu: Number(row.cpu_percent || 0),
            ram: Number(row.ram_percent || 0),
            disk_iops: Number(row.disk_iops || 0),
            net_in_mbps: Number(row.net_in_mbps || 0),
            isAnomaly: Boolean(row.is_anomaly)
          }));
          setTimeSeries(points);

          const last = data[data.length - 1];
          setCpuUsage(Number(last.cpu_percent || 0));
          setRamUsage(Number(last.ram_percent || 0));
          setDiskIO(Number(last.disk_iops || 0));
          setNetTraffic(Number(last.net_in_mbps || 0));
          setLastUpdate(last.timestamp || '');
          setIsLiveConnected(true);
        }
      }
    } catch (err) {
      console.error("Fetch metrics history error:", err);
      setIsLiveConnected(false);
    }
  };

  // 2. Fetch live realtime metrics loop
  const fetchRealtime = async () => {
    try {
      const res = await fetch('/api/metrics/realtime');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const serverMetric = data.find((item: any) => item.server_name === selectedServer);
          if (serverMetric) {
            const timeStr = serverMetric.timestamp ? serverMetric.timestamp.split(' ')[1] || serverMetric.timestamp : new Date().toLocaleTimeString();
            const cpu = Number(serverMetric.cpu_percent || 0);
            const ram = Number(serverMetric.ram_percent || 0);
            const iops = Number(serverMetric.disk_iops || 0);
            const netIn = Number(serverMetric.net_in_mbps || 0);
            const isAnomaly = Boolean(serverMetric.is_anomaly);

            setCpuUsage(cpu);
            setRamUsage(ram);
            setDiskIO(iops);
            setNetTraffic(netIn);
            setLastUpdate(serverMetric.timestamp || '');
            setIsLiveConnected(true);

            setTimeSeries(prev => {
              const newPoint: MetricPoint = { time: timeStr, cpu, ram, disk_iops: iops, net_in_mbps: netIn, isAnomaly };
              const updated = [...prev, newPoint];
              return updated.slice(-30);
            });
          }
        }
      }
    } catch (err) {
      console.error("Fetch realtime metrics error:", err);
      setIsLiveConnected(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchRealtime, 3000);
    return () => clearInterval(interval);
  }, [selectedServer]);

  const cpuColor = cpuUsage > 80 ? 'var(--accent-rose)' : 'var(--accent-cyan)';

  // ECharts Line Chart Option with Real-Time Data & Anomaly Highlight
  const lineChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#fff' }
    },
    legend: {
      data: ['% CPU Usage', '% RAM Usage'],
      textStyle: { color: '#9ca3af' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timeSeries.map(d => d.time),
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#9ca3af', formatter: '{value}%' }
    },
    series: [
      {
        name: '% CPU Usage',
        type: 'line',
        smooth: true,
        data: timeSeries.map(d => d.cpu),
        itemStyle: { color: '#06b6d4' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.0)' }
            ]
          }
        }
      },
      {
        name: '% RAM Usage',
        type: 'line',
        smooth: true,
        data: timeSeries.map(d => d.ram),
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2, type: 'dashed' }
      }
    ]
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            📊 PH2: Giám Sát Thời Gian Thực (Real-time Prometheus Stream)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Đang lấy dữ liệu thực tế thời gian thực trực tiếp từ <b>Prometheus Server</b> & cụm máy chủ Ubuntu.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-primary" style={{ padding: '8px 12px' }} onClick={fetchHistory}>
            <RefreshCw size={14} /> Refresh Stream
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <Filter size={16} color="var(--accent-cyan)" />
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ubuntu-server-01" style={{ background: '#111827' }}>ubuntu-server-01 (Web)</option>
              <option value="ubuntu-server-02" style={{ background: '#111827' }}>ubuntu-server-02 (DB)</option>
              <option value="ubuntu-server-03" style={{ background: '#111827' }}>ubuntu-server-03 (App)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <Clock size={16} color="var(--accent-purple)" />
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="5m" style={{ background: '#111827' }}>Live 5 phút</option>
              <option value="15m" style={{ background: '#111827' }}>Live 15 phút</option>
              <option value="1h" style={{ background: '#111827' }}>Live 1 giờ</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Sparkline / Gauge Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>% CPU USAGE (PROMETHEUS)</span>
            <Cpu size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: cpuColor }}>
            {cpuUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tải CPU nhân Linux thời gian thực</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>% RAM USAGE (PROMETHEUS)</span>
            <Activity size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-purple)' }}>
            {ramUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tỷ lệ RAM sử dụng thực tế</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>DISK IOPS (PROMETHEUS)</span>
            <HardDrive size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {diskIO.toFixed(1)} ops/s
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tốc độ đọc/ghi ổ cứng thực tế</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>NETWORK RX (PROMETHEUS)</span>
            <Wifi size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-amber)' }}>
            {netTraffic.toFixed(2)} Mbps
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Lưu lượng mạng nhận vào eth0</div>
        </div>
      </div>

      {/* Main ECharts Stream Area */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-cyan)" /> Biểu Đồ Metric Thời Gian Thực ({selectedServer})
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Cập nhật từ Prometheus lúc: <b>{lastUpdate || 'Live'}</b>
          </div>
        </div>
        <ReactECharts option={lineChartOption} style={{ height: '400px' }} />
      </div>

      {/* Footer Right: Prometheus Connection Telemetry Status */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="glass-card" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLiveConnected ? '#34d399' : '#fb7185', fontWeight: 600 }}>
            <span className={`pulse-dot ${isLiveConnected ? 'online' : 'offline'}`}></span>
            Prometheus Engine: {isLiveConnected ? 'CONNECTED (REALTIME)' : 'OFFLINE'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>Tốc độ cào: <b>3s / sample</b></span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Source: http://localhost:9090</span>
        </div>
      </div>
    </div>
  );
};
