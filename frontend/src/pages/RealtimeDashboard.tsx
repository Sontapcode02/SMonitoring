import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Cpu, HardDrive, Activity, Wifi, Filter, Clock, RefreshCw, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MetricPoint {
  time: string;
  cpu: number;
  ram: number;
  disk_iops: number;
  net_in_mbps: number;
  isAnomaly: boolean;
}

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  role: string;
  status: string;
}

export const RealtimeDashboard: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState('ubuntu-server-01');
  const selectedServerRef = useRef(selectedServer);
  const [timeWindow, setTimeWindow] = useState('5m');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Per-host isolated time-series history for ECharts
  const [hostTimeSeriesMap, setHostTimeSeriesMap] = useState<Record<string, MetricPoint[]>>({});

  // Focused server real-time metric states
  const [allRealtimeMetrics, setAllRealtimeMetrics] = useState<any[]>([]);
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [ramUsage, setRamUsage] = useState<number>(0);
  const [diskPercent, setDiskPercent] = useState<number>(0);
  const [diskSizeGb, setDiskSizeGb] = useState<number>(0);
  const [diskFreeGb, setDiskFreeGb] = useState<number>(0);
  const [diskIO, setDiskIO] = useState<number>(0);
  const [diskReadMb, setDiskReadMb] = useState<number>(0);
  const [diskWriteMb, setDiskWriteMb] = useState<number>(0);
  const [netTraffic, setNetTraffic] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const DEFAULT_SERVERS: ServerItem[] = [
    { id: 1, name: 'ubuntu-server-01', ip_address: '192.168.138.128', port: 9100, role: 'web', status: 'online' },
    { id: 2, name: 'ubuntu-server-02', ip_address: '192.168.138.129', port: 9100, role: 'db', status: 'online' },
    { id: 3, name: 'ubuntu-server-03', ip_address: '192.168.138.130', port: 9100, role: 'app', status: 'online' },
    { id: 4, name: 'ubuntu-server-test', ip_address: '192.168.138.131', port: 9100, role: 'test', status: 'online' },
  ];

  // Update selectedServerRef whenever selectedServer changes
  useEffect(() => {
    selectedServerRef.current = selectedServer;
  }, [selectedServer]);

  // 1. Fetch Server Fleet List from Database
  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setServers(data);
          if (!data.some((s: any) => s.name === selectedServer)) {
            setSelectedServer(data[0].name);
            selectedServerRef.current = data[0].name;
          }
          return;
        }
      }
      setServers(DEFAULT_SERVERS);
    } catch (err) {
      console.error("Fetch server list error:", err);
      setServers(DEFAULT_SERVERS);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Instant server switch handler
  const handleServerChange = (newServer: string) => {
    setSelectedServer(newServer);
    selectedServerRef.current = newServer;
    setIsSwitching(true);
  };

  // Fetch historical & latest metrics strictly isolated per host
  const fetchServerData = async () => {
    const currentHost = selectedServerRef.current;
    try {
      const [resHistory, resRealtime] = await Promise.all([
        fetch(`/api/metrics/history?server_name=${encodeURIComponent(currentHost)}&limit=30`),
        fetch('/api/metrics/realtime')
      ]);

      let initialPoints: MetricPoint[] = [];

      if (resHistory.ok) {
        const historyData = await resHistory.json();
        if (Array.isArray(historyData) && historyData.length > 0) {
          initialPoints = historyData.map((row: any) => ({
            time: row.timestamp ? row.timestamp.split(' ')[1] || row.timestamp : '',
            cpu: Number(row.cpu_percent || 0),
            ram: Number(row.ram_percent || 0),
            disk_iops: Number(row.disk_iops || 0),
            net_in_mbps: Number(row.net_in_mbps || 0),
            isAnomaly: Boolean(row.is_anomaly)
          }));

          // Only update top metrics cards if fetching for the currently selected server
          if (selectedServerRef.current === currentHost) {
            const lastHistory = historyData[historyData.length - 1];
            setCpuUsage(Number(lastHistory.cpu_percent || 0));
            setRamUsage(Number(lastHistory.ram_percent || 0));
            setDiskPercent(Number(lastHistory.disk_percent || 55.4));
            setDiskSizeGb(Number(lastHistory.disk_size_gb || 9.75));
            setDiskFreeGb(Number(lastHistory.disk_free_gb || 4.35));
            setDiskIO(Number(lastHistory.disk_iops || 0));
            setDiskReadMb(Number(lastHistory.disk_read_mbps || 0));
            setDiskWriteMb(Number(lastHistory.disk_write_mbps || 0));
            setNetTraffic(Number(lastHistory.net_in_mbps || 0));
            setLastUpdate(lastHistory.timestamp || '');
          }
        }
      }

      if (resRealtime.ok) {
        const realtimeData = await resRealtime.json();
        if (Array.isArray(realtimeData) && realtimeData.length > 0) {
          setAllRealtimeMetrics(realtimeData);

          // Update each host's time series independently
          realtimeData.forEach((serverMetric: any) => {
            const hostName = serverMetric.server_name;
            if (!hostName) return;

            const freshCpu = Number(serverMetric.cpu_percent || 0);
            const freshRam = Number(serverMetric.ram_percent || 0);
            const freshDiskPct = Number(serverMetric.disk_percent || 55.4);
            const freshDiskSize = Number(serverMetric.disk_size_gb || 9.75);
            const freshDiskFree = Number(serverMetric.disk_free_gb || 4.35);
            const freshDiskIO = Number(serverMetric.disk_iops || 0);
            const freshDiskRead = Number(serverMetric.disk_read_mbps || 0);
            const freshDiskWrite = Number(serverMetric.disk_write_mbps || 0);
            const freshNet = Number(serverMetric.net_in_mbps || 0);
            const freshTime = serverMetric.timestamp ? serverMetric.timestamp.split(' ')[1] || serverMetric.timestamp : '';

            // Update top cards if this is the active server
            if (hostName === selectedServerRef.current) {
              setCpuUsage(freshCpu);
              setRamUsage(freshRam);
              setDiskPercent(freshDiskPct);
              setDiskSizeGb(freshDiskSize);
              setDiskFreeGb(freshDiskFree);
              setDiskIO(freshDiskIO);
              setDiskReadMb(freshDiskRead);
              setDiskWriteMb(freshDiskWrite);
              setNetTraffic(freshNet);
              setLastUpdate(serverMetric.timestamp || '');
            }

            // Append new point specifically to this host's independent metric array
            setHostTimeSeriesMap(prevMap => {
              const currentArray = prevMap[hostName] && prevMap[hostName].length > 0
                ? prevMap[hostName]
                : (hostName === currentHost && initialPoints.length > 0 ? initialPoints : []);

              const lastPoint = currentArray.length > 0 ? currentArray[currentArray.length - 1] : null;
              if (lastPoint && lastPoint.time === freshTime) {
                return { ...prevMap, [hostName]: currentArray };
              }

              const newPoint: MetricPoint = {
                time: freshTime,
                cpu: freshCpu,
                ram: freshRam,
                disk_iops: freshDiskIO,
                net_in_mbps: freshNet,
                isAnomaly: Boolean(serverMetric.is_anomaly)
              };

              const updatedArray = [...currentArray, newPoint].slice(-30);
              return {
                ...prevMap,
                [hostName]: updatedArray
              };
            });
          });
        }
      }

      setIsLiveConnected(true);
    } catch (err) {
      console.error("Fetch server data error:", err);
      setIsLiveConnected(false);
    } finally {
      if (selectedServerRef.current === currentHost) {
        setIsSwitching(false);
      }
    }
  };

  useEffect(() => {
    fetchServerData();
    const interval = setInterval(fetchServerData, 3000);
    return () => clearInterval(interval);
  }, [selectedServer]);

  const cpuColor = cpuUsage > 80 ? 'var(--accent-rose)' : 'var(--accent-cyan)';
  const activeTimeSeries = hostTimeSeriesMap[selectedServer] || [];

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
      data: activeTimeSeries.map(d => d.time),
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
        data: activeTimeSeries.map(d => d.cpu),
        itemStyle: { color: '#73bf69' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(115, 191, 105, 0.35)' },
              { offset: 1, color: 'rgba(115, 191, 105, 0.0)' }
            ]
          }
        }
      },
      {
        name: '% RAM Usage',
        type: 'line',
        smooth: true,
        data: activeTimeSeries.map(d => d.ram),
        itemStyle: { color: '#5794f2' },
        lineStyle: { width: 2, type: 'dashed' }
      }
    ]
  };

  return (
    <div className="page-container">
      {/* Top Header & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            PH2: Real-time Live Monitoring
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Live metrics streaming directly from <b>Prometheus Server</b> & Ubuntu instances. Currently viewing: <b style={{ color: 'var(--accent-cyan)' }}>{selectedServer}</b>
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ padding: '8px 12px' }} onClick={fetchServerData}>
            <RefreshCw size={14} className={isSwitching ? 'spin' : ''} /> Refresh Stream
          </button>

          {/* Node Server Selector (Dynamic Server Fleet Options) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <Filter size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>NODE:</span>
            <select
              value={selectedServer}
              onChange={(e) => handleServerChange(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              {servers.length > 0 ? (
                servers.map(s => (
                  <option key={s.id || s.name} value={s.name} style={{ background: '#111827' }}>
                    {s.name} ({s.ip_address ? s.ip_address : '192.168.138.x'}) - {s.role ? s.role.toUpperCase() : 'NODE'}
                  </option>
                ))
              ) : (
                DEFAULT_SERVERS.map(s => (
                  <option key={s.id} value={s.name} style={{ background: '#111827' }}>
                    {s.name} ({s.ip_address}) - {s.role.toUpperCase()}
                  </option>
                ))
              )}
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

      {/* 5 Sparkline / Gauge Cards Dedicated to Currently Selected Server (Auto-fit Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px' }}>


        <div className="glass-card" style={{ padding: '16px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>% CPU USAGE</span>
            <Cpu size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: cpuColor }}>
            {cpuUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Real-time CPU Load</div>
        </div>

        <div className="glass-card" style={{ padding: '16px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>% RAM USAGE</span>
            <Activity size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-purple)' }}>
            {ramUsage.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Memory Allocation</div>
        </div>

        {/* Disk Space & Free GB Card */}
        <div className="glass-card" style={{ padding: '16px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>DISK CAPACITY</span>
            <HardDrive size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-emerald)' }}>
            {diskPercent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Free: <b>{diskFreeGb.toFixed(1)} GB</b> / {diskSizeGb.toFixed(1)} GB
          </div>
        </div>

        {/* Disk Read/Write Speed Card */}
        <div className="glass-card" style={{ padding: '16px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>READ / WRITE SPEED</span>
            <HardDrive size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px', color: '#60a5fa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownRight size={14} color="#34d399" /> R: {diskReadMb.toFixed(3)} MB/s
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={14} color="#fb7185" /> W: {diskWriteMb.toFixed(3)} MB/s
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>IOPS: <b>{diskIO.toFixed(1)} ops/s</b></div>
        </div>

        <div className="glass-card" style={{ padding: '16px', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>NETWORK RX</span>
            <Wifi size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-amber)' }}>
            {netTraffic.toFixed(4)} Mbps
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Incoming Traffic eth0</div>
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
        <ReactECharts option={lineChartOption} notMerge={true} style={{ height: '400px' }} />
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
