import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { AlertOctagon, Clock, HelpCircle, RefreshCw } from 'lucide-react';

interface AnomalyItem {
  id: number;
  hour: number;
  timestamp: string;
  server: string;
  severity: 'Critical' | 'Warning';
  score: number;
  shapFactors: { metric: string; contribution: number }[];
  summary: string;
}

const defaultAnomalies: AnomalyItem[] = [
  {
    id: 101,
    hour: 10,
    timestamp: '10:05:15',
    server: 'ubuntu-server-02',
    severity: 'Critical',
    score: -0.284,
    shapFactors: [
      { metric: 'net_in_mbps (Network RX)', contribution: 60 },
      { metric: 'disk_iops (Disk IOPS)', contribution: 25 },
      { metric: 'cpu_percent (CPU Usage)', contribution: 15 }
    ],
    summary: 'Anomaly at 10:05 driven by unexpected Network RX spike exceeding historical baseline distribution.'
  },
  {
    id: 102,
    hour: 14,
    timestamp: '14:22:00',
    server: 'ubuntu-server-01',
    severity: 'Warning',
    score: -0.195,
    shapFactors: [
      { metric: 'cpu_percent (CPU Usage)', contribution: 65 },
      { metric: 'load1_per_cpu (Process Load)', contribution: 25 },
      { metric: 'ram_percent (RAM Usage)', contribution: 10 }
    ],
    summary: 'Anomaly at 14:22 caused by CPU workload contention during business hours peak.'
  },
  {
    id: 103,
    hour: 3,
    timestamp: '03:15:45',
    server: 'ubuntu-server-03',
    severity: 'Critical',
    score: -0.312,
    shapFactors: [
      { metric: 'disk_write_mbps (Disk Write)', contribution: 70 },
      { metric: 'tcp_connections (TCP Sockets)', contribution: 20 },
      { metric: 'cpu_percent (CPU Usage)', contribution: 10 }
    ],
    summary: 'Off-hours anomaly at 03:15 AM caused by suspicious high disk write throughput (Data Exfiltration Risk).'
  }
];

export const AnomalyCenter: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>(defaultAnomalies);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyItem>(defaultAnomalies[0]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAnomalies = async () => {
    try {
      const res = await fetch('/api/anomalies/');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAnomalies(data);
          // If current selected anomaly is not in the new list, select the first one
          if (!data.some((a: any) => a.id === selectedAnomaly.id)) {
            setSelectedAnomaly(data[0]);
          }
        }
      }
    } catch (err) {
      console.error("Fetch anomalies error:", err);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 3000);
    return () => clearInterval(interval);
  }, []);

  // SHAP Horizontal Bar Chart Option
  const shapChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#9ca3af' },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    yAxis: {
      type: 'category',
      data: selectedAnomaly.shapFactors.map(f => f.metric),
      axisLabel: { color: '#f3f4f6', fontWeight: 600 }
    },
    series: [
      {
        name: 'SHAP Contribution Level (%)',
        type: 'bar',
        data: selectedAnomaly.shapFactors.map(f => f.contribution),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#f43f5e' },
              { offset: 1, color: '#f59e0b' }
            ]
          },
          borderRadius: [0, 8, 8, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#fff',
          fontWeight: 700
        }
      }
    ]
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            PH3: Anomaly Detection Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Demonstrating <b>Isolation Forest</b> detection power coupled with <b>SHAP Values</b> root-cause explainability.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={fetchAnomalies}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Stream
        </button>
      </div>

      {/* Heatmap Timeline (Top Half 0h - 24h Bar) */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--accent-cyan)" /> 24-Hour Incident Heatmap Timeline (00:00 - 24:00)
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>*Click anomaly ticks to inspect incident details</span>
        </div>

        {/* 24-Hour Interactive Timeline Slider */}
        <div style={{ height: '40px', background: 'rgba(0,0,0,0.4)', borderRadius: '10px', display: 'flex', alignItems: 'center', position: 'relative', padding: '0 10px', border: '1px solid var(--border-color)' }}>
          {Array.from({ length: 24 }).map((_, hour) => {
            const hourAnomalies = anomalies.filter(a => a.hour === hour);
            return (
              <div key={hour} style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', position: 'absolute', bottom: '2px' }}>{hour}h</span>
                
                {/* Highlight Ticks for Anomaly Events in this hour */}
                {hourAnomalies.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnomaly(item)}
                    title={`${item.timestamp} ${item.server} - ${item.summary}`}
                    style={{
                      width: '8px',
                      height: '24px',
                      background: item.severity === 'Critical' ? '#f43f5e' : '#f59e0b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: item.severity === 'Critical' ? '0 0 10px #f43f5e' : '0 0 10px #f59e0b',
                      position: 'absolute',
                      top: '4px',
                      zIndex: selectedAnomaly.id === item.id ? 10 : 2
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Half Split 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Anomaly Event List Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={18} color="#f43f5e" /> Recorded Anomaly Incidents ({anomalies.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {anomalies.map((item) => {
              const isSelected = selectedAnomaly.id === item.id;
              const borderCol = isSelected ? 'var(--accent-cyan)' : 'var(--border-color)';
              const bgCol = isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.2)';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAnomaly(item)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: bgCol,
                    border: `1px solid ${borderCol}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{item.server}</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                      background: item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: item.severity === 'Critical' ? '#fb7185' : '#fbbf24'
                    }}>
                      {item.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Timestamp: <b>{item.timestamp}</b></span>
                    <span>Isolation Score: <b style={{ color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>{item.score}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: SHAP Explainability & Natural Language Summary */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} color="var(--accent-cyan)" /> SHAP Explainability & Root-Cause Analysis
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Explaining why Isolation Forest flagged sample at <b>{selectedAnomaly.timestamp}</b> on <b>{selectedAnomaly.server}</b> as anomalous.
          </p>

          {/* SHAP Bar Chart */}
          <ReactECharts option={shapChartOption} notMerge={true} style={{ height: '220px' }} />

          {/* Natural Language Summary Card */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
              AI Incident Explanation Summary
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
              "{selectedAnomaly.summary}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
