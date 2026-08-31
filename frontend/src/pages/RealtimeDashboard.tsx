import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { Cpu, HardDrive, Activity, Wifi, Filter, Clock, RefreshCw, ArrowDownRight, ArrowUpRight, Zap, Server, Flame, Search } from 'lucide-react';
import { useWebSocketWithFallback } from '../hooks/useWebSocketWithFallback';

interface MetricPoint {
  time: string;
  rawTimestamp?: string;
  cpu: number | null;
  ram: number | null;
  disk_iops: number | null;
  net_in_mbps: number | null;
  isAnomaly: boolean;
}

interface ServerItem {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  role: string;
  status: string;
  has_anomaly?: boolean;
}

export const RealtimeDashboard: React.FC = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState('ubuntu-server-01');
  const selectedServerRef = useRef(selectedServer);
  const [timeWindow, setTimeWindow] = useState('5m');
  const timeWindowRef = useRef(timeWindow);
  useEffect(() => {
    timeWindowRef.current = timeWindow;
  }, [timeWindow]);

  const WINDOW_LIMIT_MAP: Record<string, number> = {
    '5m': 120,
    '15m': 360,
    '30m': 700,
    '1h': 1400,
    '6h': 3500,
    '12h': 6000,
    '24h': 12000,
  };
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
  const [activeServices, setActiveServices] = useState<any[]>([]);
  const [topProcesses, setTopProcesses] = useState<any[]>([]);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [liveClientTime, setLiveClientTime] = useState<string>('');

  // Live client machine clock updated every second for 100% device sync
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const se = String(d.getSeconds()).padStart(2, '0');
      setLiveClientTime(`${yr}-${mo}-${da} ${hr}:${mi}:${se}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
    fetchRealtimeFallback().then(initialMetrics => {
      if (Array.isArray(initialMetrics) && initialMetrics.length > 0) {
        setAllRealtimeMetrics(initialMetrics);
        setIsLiveConnected(true);
        const srvMetric = initialMetrics.find((m: any) => m.server_name === selectedServerRef.current) || initialMetrics[0];
        if (srvMetric) {
          setCpuUsage(Number(srvMetric.cpu_percent || 0));
          setRamUsage(Number(srvMetric.ram_percent || 0));
          setDiskPercent(Number(srvMetric.disk_percent || 0));
          setDiskSizeGb(Number(srvMetric.disk_size_gb || 0));
          setDiskFreeGb(Number(srvMetric.disk_free_gb || 0));
          setDiskIO(Number(srvMetric.disk_iops || 0));
          setDiskReadMb(Number(srvMetric.disk_read_mbps || 0));
          setDiskWriteMb(Number(srvMetric.disk_write_mbps || 0));
          setNetTraffic(Number(srvMetric.net_in_mbps || 0));
          setLastUpdate(srvMetric.timestamp || '');
          if (Array.isArray(srvMetric.services)) setActiveServices(srvMetric.services);
          if (Array.isArray(srvMetric.top_processes)) setTopProcesses(srvMetric.top_processes);
        }
      }
    }).catch(err => console.warn('Initial realtime fetch error:', err));
  }, []);

  // Instant server switch handler with synchronous state hydration & offline clearing
  const handleServerChange = (newServer: string) => {
    setSelectedServer(newServer);
    selectedServerRef.current = newServer;
    setIsSwitching(true);

    const srvInfo = servers.find((s: any) => s.name === newServer);
    const srvMetric = Array.isArray(allRealtimeMetrics) ? allRealtimeMetrics.find((m: any) => m.server_name === newServer) : null;
    const isOffline = (srvInfo && srvInfo.status === 'offline') || (srvMetric && srvMetric.status === 'offline');

    if (isOffline) {
      // Clear metrics and lists immediately when switching to offline node
      setCpuUsage(0);
      setRamUsage(0);
      setDiskPercent(0);
      setDiskSizeGb(0);
      setDiskFreeGb(0);
      setDiskIO(0);
      setDiskReadMb(0);
      setDiskWriteMb(0);
      setNetTraffic(0);
      setActiveServices([]);
      setTopProcesses([]);
      if (srvMetric && srvMetric.timestamp) setLastUpdate(srvMetric.timestamp);
    } else if (srvMetric) {
      setCpuUsage(Number(srvMetric.cpu_percent || 0));
      setRamUsage(Number(srvMetric.ram_percent || 0));
      setDiskPercent(Number(srvMetric.disk_percent || 0));
      setDiskSizeGb(Number(srvMetric.disk_size_gb || 0));
      setDiskFreeGb(Number(srvMetric.disk_free_gb || 0));
      setDiskIO(Number(srvMetric.disk_iops || 0));
      setDiskReadMb(Number(srvMetric.disk_read_mbps || 0));
      setDiskWriteMb(Number(srvMetric.disk_write_mbps || 0));
      setNetTraffic(Number(srvMetric.net_in_mbps || 0));
      setLastUpdate(srvMetric.timestamp || '');
      setActiveServices(Array.isArray(srvMetric.services) ? srvMetric.services : []);
      setTopProcesses(Array.isArray(srvMetric.top_processes) ? srvMetric.top_processes : []);
    } else {
      setCpuUsage(0);
      setRamUsage(0);
      setDiskPercent(0);
      setDiskSizeGb(0);
      setDiskFreeGb(0);
      setDiskIO(0);
      setDiskReadMb(0);
      setDiskWriteMb(0);
      setNetTraffic(0);
      setActiveServices([]);
      setTopProcesses([]);
    }
  };

  // Hybrid WebSocket Stream with HTTP Fallback handler
  const fetchRealtimeFallback = async () => {
    const res = await fetch('/api/metrics/realtime');
    if (!res.ok) throw new Error('HTTP Fetch Failed');
    return await res.json();
  };

  const { data: wsMetricsData, isWsConnected, isFallbackActive } = useWebSocketWithFallback<any[]>({
    wsUrl: '/api/metrics/ws',
    fallbackFetchFn: fetchRealtimeFallback,
    fallbackIntervalMs: 3000
  });

  // Whenever wsMetricsData arrives (via WebSocket push or Fallback HTTP)
  useEffect(() => {
    if (Array.isArray(wsMetricsData) && wsMetricsData.length > 0) {
      setAllRealtimeMetrics(wsMetricsData);
      setIsLiveConnected(true);

      wsMetricsData.forEach((serverMetric: any) => {
        const hostName = serverMetric.server_name;
        if (!hostName) return;

        const isOfflineNode = serverMetric.status === 'offline';
        const freshCpu = isOfflineNode ? 0 : Number(serverMetric.cpu_percent || 0);
        const freshRam = isOfflineNode ? 0 : Number(serverMetric.ram_percent || 0);
        const freshDiskPct = isOfflineNode ? 0 : Number(serverMetric.disk_percent || 55.4);
        const freshDiskSize = isOfflineNode ? 0 : Number(serverMetric.disk_size_gb || 9.75);
        const freshDiskFree = isOfflineNode ? 0 : Number(serverMetric.disk_free_gb || 4.35);
        const freshDiskIO = isOfflineNode ? 0 : Number(serverMetric.disk_iops || 0);
        const freshDiskRead = isOfflineNode ? 0 : Number(serverMetric.disk_read_mbps || 0);
        const freshDiskWrite = isOfflineNode ? 0 : Number(serverMetric.disk_write_mbps || 0);
        const freshNet = isOfflineNode ? 0 : Number(serverMetric.net_in_mbps || 0);
        const freshTime = serverMetric.timestamp ? serverMetric.timestamp.split(' ')[1] || serverMetric.timestamp : '';

        // Update active server summary cards & services / top processes
        if (hostName === selectedServerRef.current) {
          if (isOfflineNode) {
            setCpuUsage(0);
            setRamUsage(0);
            setDiskPercent(0);
            setDiskSizeGb(0);
            setDiskFreeGb(0);
            setDiskIO(0);
            setDiskReadMb(0);
            setDiskWriteMb(0);
            setNetTraffic(0);
            setActiveServices([]);
            setTopProcesses([]);
          } else {
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
            if (Array.isArray(serverMetric.services)) setActiveServices(serverMetric.services);
            if (Array.isArray(serverMetric.top_processes)) setTopProcesses(serverMetric.top_processes);
          }
        }

        // Append to per-host time-series array
        setHostTimeSeriesMap(prevMap => {
          const currentArray = prevMap[hostName] || [];
          const lastPoint = currentArray.length > 0 ? currentArray[currentArray.length - 1] : null;
          if (lastPoint && lastPoint.time === freshTime) {
            return prevMap;
          }

          const newPoint: MetricPoint = {
            time: freshTime,
            rawTimestamp: serverMetric.timestamp || freshTime,
            cpu: freshCpu,
            ram: freshRam,
            disk_iops: freshDiskIO,
            net_in_mbps: freshNet,
            isAnomaly: Boolean(serverMetric.is_anomaly)
          };

          const limit = WINDOW_LIMIT_MAP[timeWindowRef.current] || 30;
          return {
            ...prevMap,
            [hostName]: [...currentArray, newPoint].slice(-limit)
          };
        });
      });
    }
  }, [wsMetricsData]);

  // Initial history fetch upon host change or time window change
  const fetchServerData = async () => {
    const currentHost = selectedServerRef.current;
    const currentWindow = timeWindowRef.current;
    const limit = WINDOW_LIMIT_MAP[currentWindow] || 30;
    try {
      const resHistory = await fetch(`/api/metrics/history?server_name=${encodeURIComponent(currentHost)}&window=${currentWindow}&limit=${limit}`);
      if (resHistory.ok) {
        const historyData = await resHistory.json();
        if (Array.isArray(historyData)) {
          const initialPoints: MetricPoint[] = historyData.map((row: any) => ({
            time: row.time || (row.timestamp ? row.timestamp.split(' ')[1] || row.timestamp : ''),
            rawTimestamp: row.timestamp || row.time || '',
            cpu: row.cpu_percent === null || row.cpu_percent === undefined ? null : Number(row.cpu_percent),
            ram: row.ram_percent === null || row.ram_percent === undefined ? null : Number(row.ram_percent),
            disk_iops: row.disk_iops === null || row.disk_iops === undefined ? null : Number(row.disk_iops),
            net_in_mbps: row.net_in_mbps === null || row.net_in_mbps === undefined ? null : Number(row.net_in_mbps),
            isAnomaly: Boolean(row.is_anomaly)
          }));

          setHostTimeSeriesMap(prev => ({
            ...prev,
            [currentHost]: initialPoints
          }));
        }
      }
    } catch (err) {
      console.error("Fetch server history error:", err);
    } finally {
      if (selectedServerRef.current === currentHost) {
        setIsSwitching(false);
      }
    }
  };

  useEffect(() => {
    fetchServerData();
  }, [selectedServer, timeWindow]);

  const parseTimestampMs = (tsStr?: string): number => {
    if (!tsStr) return 0;
    const cleanStr = tsStr.trim();

    let d = new Date(cleanStr.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d.getTime();

    const parts = cleanStr.split(' ');
    if (parts.length === 2) {
      const [datePart, timePart] = parts;
      const dateSubs = datePart.split('-').map(Number);
      const timeSubs = timePart.split(':').map(Number);
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      let day = now.getDate();

      if (dateSubs.length === 3) {
        year = dateSubs[0];
        month = dateSubs[1] - 1;
        day = dateSubs[2];
      } else if (dateSubs.length === 2) {
        month = dateSubs[0] - 1;
        day = dateSubs[1];
      }

      const hour = timeSubs[0] || 0;
      const min = timeSubs[1] || 0;
      const sec = timeSubs[2] || 0;
      return new Date(year, month, day, hour, min, sec).getTime();
    }

    if (cleanStr.includes(':')) {
      const timeSubs = cleanStr.split(':').map(Number);
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), timeSubs[0] || 0, timeSubs[1] || 0, timeSubs[2] || 0).getTime();
    }

    return 0;
  };

  const WINDOW_MS_MAP: Record<string, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 3600 * 1000,
    '12h': 12 * 3600 * 1000,
    '24h': 24 * 3600 * 1000
  };

  const formatTimestamp = (date: Date, showDate: boolean): string => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    if (showDate) {
      return `${m}-${d} ${h}:${mi}`;
    }
    return `${h}:${mi}:${s}`;
  };

  const processTimeSeriesGaps = (rawPoints: MetricPoint[], windowStr: string) => {
    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      return { points: [], markAreas: [] };
    }

    // Strip virtual gap points to prevent re-processing
    const cleanRawPoints = rawPoints.filter(pt => !pt.time.includes('...'));
    if (cleanRawPoints.length === 0) return { points: [], markAreas: [] };

    const thresholdSec = ['5m', '15m', '30m'].includes(windowStr) ? 90 : (['1h', '6h'].includes(windowStr) ? 180 : 300);
    const windowMs = WINDOW_MS_MAP[windowStr] || (5 * 60 * 1000);
    const showDate = ['6h', '12h', '24h'].includes(windowStr);

    const processedPoints: MetricPoint[] = [];
    const markAreas: any[] = [];

    // Scale timeline to full chosen live window if DB has fewer hours of data
    const latestPt = cleanRawPoints[cleanRawPoints.length - 1];
    const latestMs = parseTimestampMs(latestPt.rawTimestamp || latestPt.time) || Date.now();
    const targetWindowStartMs = latestMs - windowMs;

    const firstPt = cleanRawPoints[0];
    const firstPtMs = parseTimestampMs(firstPt.rawTimestamp || firstPt.time);

    if (firstPtMs > 0 && targetWindowStartMs > 0 && (firstPtMs - targetWindowStartMs) > thresholdSec * 1000) {
      const windowStartStr = formatTimestamp(new Date(targetWindowStartMs), showDate);

      // Highlight uncollected history span before the earliest data point in DB
      markAreas.push([
        { xAxis: windowStartStr },
        { xAxis: firstPt.time }
      ]);

      // Insert start-of-window null point to scale X-axis properly
      processedPoints.push({
        time: windowStartStr,
        rawTimestamp: windowStartStr,
        cpu: null,
        ram: null,
        disk_iops: null,
        net_in_mbps: null,
        isAnomaly: false
      });
    }

    let nullGapStart: MetricPoint | null = null;

    for (let i = 0; i < cleanRawPoints.length; i++) {
      const curr = cleanRawPoints[i];
      const isNullPt = curr.cpu === null || curr.cpu === undefined;

      if (isNullPt) {
        if (!nullGapStart) {
          nullGapStart = i > 0 ? cleanRawPoints[i - 1] : curr;
        }
        processedPoints.push(curr);
        continue;
      } else {
        if (nullGapStart) {
          markAreas.push([
            { xAxis: nullGapStart.time },
            { xAxis: curr.time }
          ]);
          nullGapStart = null;
        }
      }

      if (processedPoints.length > 0) {
        const prev = processedPoints[processedPoints.length - 1];
        if (prev.cpu !== null && prev.cpu !== undefined) {
          const t1 = parseTimestampMs(prev.rawTimestamp || prev.time);
          const t2 = parseTimestampMs(curr.rawTimestamp || curr.time);
          const diffSec = (t2 - t1) / 1000;

          if (t1 > 0 && t2 > 0 && diffSec > thresholdSec) {
            markAreas.push([
              {
                xAxis: prev.time
              },
              {
                xAxis: curr.time
              }
            ]);

            const gapTime = `${prev.time} ...`;
            processedPoints.push({
              time: gapTime,
              rawTimestamp: gapTime,
              cpu: null,
              ram: null,
              disk_iops: null,
              net_in_mbps: null,
              isAnomaly: false
            });
          }
        }
      }

      processedPoints.push(curr);
    }

    if (nullGapStart && cleanRawPoints.length > 0) {
      markAreas.push([
        { xAxis: nullGapStart.time },
        { xAxis: cleanRawPoints[cleanRawPoints.length - 1].time }
      ]);
    }

    return { points: processedPoints, markAreas };
  };

  const cpuColor = cpuUsage > 80 ? 'var(--accent-rose)' : 'var(--accent-cyan)';
  const rawTimeSeries = hostTimeSeriesMap[selectedServer] || [];
  const { points: processedPoints, markAreas: gapHighlightAreas } = processTimeSeriesGaps(rawTimeSeries, timeWindow);

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
      textStyle: { color: '#9ca3af', fontWeight: 600 }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: processedPoints.map(d => d.time),
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
        showSymbol: false,
        connectNulls: false,
        data: processedPoints.map(d => d.cpu),
        itemStyle: { color: '#38bdf8' },
        lineStyle: { width: 3, color: '#38bdf8' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
              { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
            ]
          }
        },
        markArea: {
          itemStyle: {
            color: 'rgba(244, 63, 94, 0.15)',
            borderWidth: 1,
            borderColor: 'rgba(244, 63, 94, 0.4)',
            borderType: 'dashed'
          },
          label: {
            show: false
          },
          data: gapHighlightAreas
        }
      },
      {
        name: '% RAM Usage',
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: false,
        data: processedPoints.map(d => d.ram),
        itemStyle: { color: '#c084fc' },
        lineStyle: { width: 2.5, type: 'dashed', color: '#c084fc' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(192, 132, 252, 0.20)' },
              { offset: 1, color: 'rgba(192, 132, 252, 0.0)' }
            ]
          }
        }
      }
    ]
  };

  return (
    <div className="page-container">
      {/* Top Header & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
              PH2: Real-time Live Monitoring
            </h1>

            {/* Stream Connection Mode Indicator Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isWsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isWsConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              fontSize: '12px',
              fontWeight: 700,
              color: isWsConnected ? '#34d399' : '#fbbf24'
            }}>
              <Zap size={13} className={isWsConnected ? '' : 'spin'} />
              Stream Mode: {isWsConnected ? 'WebSocket Live' : 'HTTP Polling Fallback'}
            </div>

            {/* Realtime Device Clock Display Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#38bdf8'
            }}>
              <Clock size={13} color="#38bdf8" />
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{lastUpdate || 'Syncing...'}</span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
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
                [...servers].sort((a, b) => {
                  const wA = a.status === 'offline' ? 4 : (a.has_anomaly ? 3 : 1);
                  const wB = b.status === 'offline' ? 4 : (b.has_anomaly ? 3 : 1);
                  if (wB !== wA) return wB - wA;
                  return a.name.localeCompare(b.name);
                }).map(s => (
                  <option key={s.id || s.name} value={s.name} style={{ background: '#111827' }}>
                    {s.status === 'offline' ? '🔴 ' : (s.has_anomaly ? '🟠 ' : '🟢 ')}
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
              <option value="30m" style={{ background: '#111827' }}>Live 30m</option>
              <option value="1h" style={{ background: '#111827' }}>Live 1h</option>
              <option value="6h" style={{ background: '#111827' }}>Live 6h</option>
              <option value="12h" style={{ background: '#111827' }}>Live 12h</option>
              <option value="24h" style={{ background: '#111827' }}>Live 24h</option>
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

      {/* 2 Bottom Widgets: System Services Health Status & Top Resource-Consuming Processes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        {/* System Services Health Status Widget with Category Filtering & Search */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="var(--accent-cyan)" /> System Services Status
            </h3>
            <span style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              {activeServices.filter(s => s.status === 'running').length} / {activeServices.length || 8} Active
            </span>
          </div>

          {/* Service Search & Category Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {/* Search Input Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search enterprise service..."
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', outline: 'none', width: '100%' }}
              />
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'ALL' },
                { id: 'infra', label: '🛡️ Infra & Sec' },
                { id: 'web', label: '🌐 Web Gateway' },
                { id: 'db', label: '🗄️ Database' },
                { id: 'container', label: '🐳 Container' },
                { id: 'monitoring', label: '📊 Monitoring' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setServiceCategoryFilter(cat.id)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: serviceCategoryFilter === cat.id ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    color: serviceCategoryFilter === cat.id ? '#0f172a' : 'var(--text-secondary)',
                    border: serviceCategoryFilter === cat.id ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {activeServices.filter(svc => {
              const matchesCategory = serviceCategoryFilter === 'all' || (svc.category && svc.category.toLowerCase() === serviceCategoryFilter.toLowerCase());
              const matchesSearch = serviceSearchQuery.trim() === '' || svc.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (svc.description && svc.description.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
              return matchesCategory && matchesSearch;
            }).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                🔍 Không tìm thấy service hiện hữu nào phù hợp với bộ lọc cho máy chủ này
              </div>
            ) : (
              activeServices.filter(svc => {
                const matchesCategory = serviceCategoryFilter === 'all' || (svc.category && svc.category.toLowerCase() === serviceCategoryFilter.toLowerCase());
                const matchesSearch = serviceSearchQuery.trim() === '' || svc.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) || (svc.description && svc.description.toLowerCase().includes(serviceSearchQuery.toLowerCase()));
                return matchesCategory && matchesSearch;
              }).map((svc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.25)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: svc.status === 'running' ? '#34d399' : '#fb7185', boxShadow: svc.status === 'running' ? '0 0 8px #34d399' : 'none' }}></span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {svc.name}
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {svc.category || 'core'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{svc.description} • Port {svc.port}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: svc.status === 'running' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: svc.status === 'running' ? '#34d399' : '#fb7185',
                    border: `1px solid ${svc.status === 'running' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                  }}>
                    {svc.status === 'running' ? 'ACTIVE' : 'STOPPED'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Resource-Consuming Processes Widget (htop view) */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="var(--accent-rose)" /> Top Resource Processes (`htop` view)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live Top 5</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '8px 4px' }}>PID</th>
                  <th style={{ padding: '8px 4px' }}>PROCESS</th>
                  <th style={{ padding: '8px 4px' }}>USER</th>
                  <th style={{ padding: '8px 4px' }}>% CPU</th>
                  <th style={{ padding: '8px 4px' }}>% RAM</th>
                </tr>
              </thead>
              <tbody>
                {topProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      🔴 Máy chủ đang offline hoặc không có tiến trình nào hoạt động
                    </td>
                  </tr>
                ) : (
                  topProcesses.map((proc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: '#9ca3af' }}>{proc.pid}</td>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: '#f3f4f6' }}>{proc.name}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>{proc.user}</td>
                      <td style={{ padding: '8px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8', minWidth: '38px' }}>{proc.cpu_percent}%</span>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, proc.cpu_percent * 2.5)}%`, height: '100%', background: '#38bdf8', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#c084fc', minWidth: '38px' }}>{proc.ram_percent}%</span>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, proc.ram_percent * 2.5)}%`, height: '100%', background: '#c084fc', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
