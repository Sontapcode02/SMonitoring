import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Cpu, HardDrive, Activity, Wifi, Filter, Clock, RefreshCw } from 'lucide-react';

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
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Focused server real-time metric states
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [ramUsage, setRamUsage] = useState<number>(0);
  const [diskIO, setDiskIO] = useState<number>(0);
  const [netTraffic, setNetTraffic] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Time-series history for ECharts
  const [timeSeries, setTimeSeries] = useState<MetricPoint[]>([]);

  // Instant server switch handler
  const handleServerChange = (newServer: string) => {
    setSelectedServer(newServer);
    setIsSwitching(true);
  };

  // Fetch historical & latest metrics instantly for the newly selected server
  const fetchServerData = async () => {
    try {
      const [resHistory, resRealtime] = await Promise.all([
        fetch(`/api/metrics/history?server_name=${selectedServer}&limit=30`),
        fetch('/api/metrics/realtime')
      ]);

      if (resHistory.ok) {
        const historyData = await resHistory.json();
        if (Array.isArray(historyData) && historyData.length > 0) {
          const points: MetricPoint[] = historyData.map((row: any) => ({
            time: row.timestamp ? row.timestamp.split(' ')[1] || row.timestamp : '',
            cpu: Number(row.cpu_percent || 0),
            ram: Number(row.ram_percent || 0),
            disk_iops: Number(row.disk_iops || 0),
            net_in_mbps: Number(row.net_in_mbps || 0),
            isAnomaly: Boolean(row.is_anomaly)
          }));
          setTimeSeries(points);

          const lastHistory = historyData[historyData.length - 1];
          setCpuUsage(Number(lastHistory.cpu_percent || 0));
          setRamUsage(Number(lastHistory.ram_percent || 0));
          setDiskIO(Number(lastHistory.disk_iops || 0));
          setNetTraffic(Number(lastHistory.net_in_mbps || 0));
          setLastUpdate(lastHistory.timestamp || '');
        }
      }

      if (resRealtime.ok) {
        const realtimeData = await resRealtime.json();
        if (Array.isArray(realtimeData)) {
          const serverMetric = realtimeData.find((item: any) => item.server_name === selectedServer);
          if (serverMetric) {
            const freshCpu = Number(serverMetric.cpu_percent || 0);
            const freshRam = Number(serverMetric.ram_percent || 0);
            const freshDisk = Number(serverMetric.disk_iops || 0);
            const freshNet = Number(serverMetric.net_in_mbps || 0);
            const freshTime = serverMetric.timestamp ? serverMetric.timestamp.split(' ')[1] || serverMetric.timestamp : '';

            setCpuUsage(freshCpu);
            setRamUsage(freshRam);
            setDiskIO(freshDisk);
            setNetTraffic(freshNet);
            setLastUpdate(serverMetric.timestamp || '');

            // Dynamically append new point to ECharts timeSeries live
            setTimeSeries(prev => {
              const newPoint: MetricPoint = {
                time: freshTime,
                cpu: freshCpu,
                ram: freshRam,
                disk_iops: freshDisk,
                net_in_mbps: freshNet,
                isAnomaly: Boolean(serverMetric.is_anomaly)
              };
              const updated = [...prev, newPoint];
              return updated.slice(-30);
            });
          }
        }
      }

      setIsLiveConnected(true);
    } catch (err) {
      console.error("Fetch server data error:", err);
      setIsLiveConnected(false);
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    fetchServerData();
    const interval = setInterval(fetchServerData, 3000);
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
            PH2: Real-time Live Monitoring
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Live metrics streaming directly from <b>Prometheus Server</b> & Ubuntu instances. Currently viewing: <b style={{ color: 'var(--accent-cyan)' }}>{selectedServer}</b>
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-primary" style={{ padding: '8px 12px' }} onClick={fetchServerData}>
            <RefreshCw size={14} className={isSwitching ? 'spin' : ''} /> Refresh Stream
          </button>

          {/* Node Server Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <Filter size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>NODE:</span>
            <select
              value={selectedServer}
              onChange={(e) => handleServerChange(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, fontSize: '14px', outline: 'none', cursor: 'pointer' }}
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
              <option value="5m" style={{ background: '#111827' }}>Live 5m</option>
              <option value="15m" style={{ background: '#111827' }}>Live 15m</option>
              <option value="1h" style={{ background: '#111827' }}>Live 1h</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 Sparkline / Gauge Cards Dedicated to Currently Selected Server */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>% CPU USAGE ({selectedServer})</span>
            <Cpu size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: cpuColor }}>
            {cpuUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time Linux CPU Workload</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>% RAM USAGE ({selectedServer})</span>
            <Activity size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-purple)' }}>
            {ramUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Memory Allocation Ratio</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>DISK IOPS ({selectedServer})</span>
            <HardDrive size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {diskIO.toFixed(1)} ops/s
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Read/Write Storage Operations</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>NETWORK RX ({selectedServer})</span>
            <Wifi size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-amber)' }}>
            {netTraffic.toFixed(4)} Mbps
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Incoming Traffic on eth0</div>
        </div>
      </div>

      {/* Main ECharts Stream Area for Selected Server */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-cyan)" /> Real-time Metrics Stream: <span style={{ color: 'var(--accent-cyan)' }}>[{selectedServer}]</span>
          </h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Updated from Prometheus at: <b>{lastUpdate || 'Live'}</b>
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
          <span style={{ color: 'var(--text-secondary)' }}>Scrape Rate: <b>3s / sample</b></span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Node: {selectedServer}</span>
        </div>
      </div>
    </div>
  );
};
