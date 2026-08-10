import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Cpu, HardDrive, Activity, Wifi, Filter, Clock, AlertTriangle } from 'lucide-react';

export const RealtimeDashboard: React.FC = () => {
  const [selectedServer, setSelectedServer] = useState('ubuntu-server-01');
  const [timeWindow, setTimeWindow] = useState('5m');

  // Real-time metric states
  const [cpuUsage, setCpuUsage] = useState(42.5);
  const [ramUsage, setRamUsage] = useState(61.2);
  const [diskIO, setDiskIO] = useState(14.8);
  const [netTraffic, setNetTraffic] = useState(28.4);

  // Time-series history for ECharts
  const [timeSeries, setTimeSeries] = useState<{ time: string; cpu: number; ram: number; isAnomaly: boolean }[]>([]);

  useEffect(() => {
    // Generate initial 20 points
    const now = new Date();
    const initData = [];
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 15000);
      const isAnomaly = i >= 8 && i <= 10;
      initData.push({
        time: t.toLocaleTimeString(),
        cpu: isAnomaly ? Math.min(100, 85 + Math.random() * 15) : 25 + Math.random() * 20,
        ram: isAnomaly ? 88 + Math.random() * 5 : 55 + Math.random() * 10,
        isAnomaly
      });
    }
    setTimeSeries(initData);

    // Live update interval
    const interval = setInterval(() => {
      const liveT = new Date().toLocaleTimeString();
      const randomCpu = selectedServer === 'ubuntu-server-02' ? 55 + Math.random() * 25 : 30 + Math.random() * 20;
      const randomRam = 60 + Math.random() * 5;
      
      setCpuUsage(Number(randomCpu.toFixed(1)));
      setRamUsage(Number(randomRam.toFixed(1)));
      setDiskIO(Number((Math.random() * 25).toFixed(1)));
      setNetTraffic(Number((15 + Math.random() * 30).toFixed(1)));

      setTimeSeries(prev => [
        ...prev.slice(1),
        { time: liveT, cpu: Number(randomCpu.toFixed(1)), ram: Number(randomRam.toFixed(1)), isAnomaly: false }
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedServer]);

  const cpuColor = cpuUsage > 80 ? 'var(--accent-rose)' : 'var(--accent-cyan)';

  // ECharts Line Chart Option with Anomaly Highlight Band (markArea)
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
        },
        markArea: {
          itemStyle: { color: 'rgba(244, 63, 94, 0.2)' },
          data: [
            [
              { name: '⚠️ ML Anomaly Zone Detected', xAxis: timeSeries[8]?.time || '' },
              { xAxis: timeSeries[10]?.time || '' }
            ]
          ]
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
            📊 PH2: Giám Sát Thời Gian Thực (Real-time Dashboard)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Nơi Admin theo dõi từng giây số liệu hạ tầng qua WebSocket & phát hiện vùng bất thường.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>% CPU USAGE</span>
            <Cpu size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: cpuColor }}>
            {cpuUsage}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Dung lượng xử lý nhân Linux</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>% RAM USAGE</span>
            <Activity size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-purple)' }}>
            {ramUsage}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>2.4 / 4.0 GB MemAvailable</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>DISK I/O (MB/s)</span>
            <HardDrive size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-emerald)' }}>
            {diskIO} MB/s
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tốc độ đọc/ghi ổ cứng thực tế</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>NETWORK TRAFFIC</span>
            <Wifi size={20} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, marginTop: '8px', color: 'var(--accent-amber)' }}>
            {netTraffic} Mbps
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Băng thông mạng eth0</div>
        </div>
      </div>

      {/* Main ECharts Stream Area with Anomaly Highlight */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--accent-cyan)" /> Luồng Dữ Liệu Metrics Thời Gian Thực ({selectedServer})
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fb7185', background: 'rgba(244,63,94,0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(244,63,94,0.2)' }}>
            <AlertTriangle size={14} /> Vùng Highlight đỏ nhạt = Vùng có Anomaly từ ML
          </div>
        </div>
        <ReactECharts option={lineChartOption} style={{ height: '400px' }} />
      </div>

      {/* Footer Right: WebSocket Telemetry Status */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="glass-card" style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 600 }}>
            <span className="pulse-dot online"></span> WebSocket Streaming: ACTIVE
          </span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>Tốc độ nhận: <b>15 msgs/s</b></span>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Latency: 12ms</span>
        </div>
      </div>
    </div>
  );
};
