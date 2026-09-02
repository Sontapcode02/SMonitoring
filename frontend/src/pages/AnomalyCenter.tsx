import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface AnomalyItem {
  id: number;
  hour: number;
  timestamp: string;
  full_timestamp?: string;
  server: string;
  severity: 'Critical' | 'Warning';
  score: number;
  shapFactors: { metric: string; contribution: number }[];
  summary: string;
}

interface ServerItem {
  id: number;
  name: string;
  role: string;
}

const defaultAnomalies: AnomalyItem[] = [
  {
    id: 101,
    hour: 10,
    timestamp: '10:05:15',
    full_timestamp: '2026-08-11 10:05:15',
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
    full_timestamp: '2026-08-11 14:22:00',
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
    full_timestamp: '2026-08-11 03:15:45',
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
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Multi-Field Filter States
  const [filterServer, setFilterServer] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const handleDeleteAnomaly = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/anomalies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAnomalies(prev => prev.filter(item => item.id !== id));
        if (selectedAnomaly?.id === id) {
          const remaining = anomalies.filter(item => item.id !== id);
          if (remaining.length > 0) setSelectedAnomaly(remaining[0]);
        }
      }
    } catch (err) {
      console.error("Delete anomaly error:", err);
    }
  };

  // Fetch registered servers for dropdown
  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers/');
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch (err) {
      console.error("Fetch servers error:", err);
    }
  };

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterServer !== 'all') params.append('server_name', filterServer);
      if (filterSeverity !== 'all') params.append('severity', filterSeverity);
      if (searchKeyword.trim() !== '') params.append('search', searchKeyword.trim());

      const res = await fetch(`/api/anomalies/?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAnomalies(data);
          if (data.length > 0 && !data.some((a: any) => a.id === selectedAnomaly.id)) {
            setSelectedAnomaly(data[0]);
          }
        }
      }
    } catch (err) {
      console.error("Fetch anomalies error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 3000);
    return () => clearInterval(interval);
  }, [filterServer, filterSeverity, searchKeyword]);

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
      data: selectedAnomaly?.shapFactors?.map(f => f.metric) || [],
      axisLabel: { color: '#f3f4f6', fontWeight: 600 }
    },
    series: [
      {
        name: 'SHAP Contribution Level (%)',
        type: 'bar',
        data: selectedAnomaly?.shapFactors?.map(f => f.contribution) || [],
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

  const isFiltered = filterServer !== 'all' || filterSeverity !== 'all' || searchKeyword.trim() !== '';

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            PH3: Anomaly Detection Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Demonstrating <b>Isolation Forest</b> detection power coupled with <b>SHAP Values</b> root-cause explainability.
          </p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }} onClick={fetchAnomalies}>
          Refresh Stream
        </button>
      </div>

      {/* Multi-Field Filter Control Bar */}
      <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '13px' }}>
          ANOMALY LOG FILTERS:
        </div>

        {/* Filter 1: Server Node */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Node:</span>
          <select
            value={filterServer}
            onChange={(e) => setFilterServer(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#111827' }}>All Servers</option>
            {servers.map(s => (
              <option key={s.id} value={s.name} style={{ background: '#111827' }}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Filter 2: Severity Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 600, fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#111827' }}>All Severities</option>
            <option value="critical" style={{ background: '#111827' }}>Critical</option>
            <option value="warning" style={{ background: '#111827' }}>Warning</option>
          </select>
        </div>

        {/* Filter 3: Search Input Keyword */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search metric (e.g. CPU, RAM, Disk), server, timestamp..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '13px', outline: 'none', width: '100%' }}
          />
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={() => { setFilterServer('all'); setFilterSeverity('all'); setSearchKeyword(''); }}
            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Heatmap Timeline (Top Half 0h - 24h Bar) */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            24-Hour Incident Heatmap Timeline (00:00 - 24:00)
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
                    title={`${item.full_timestamp || item.timestamp} [${item.server}] - ${item.summary}`}
                    style={{
                      width: '8px',
                      height: '24px',
                      background: item.severity === 'Critical' ? '#f43f5e' : '#f59e0b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      boxShadow: item.severity === 'Critical' ? '0 0 10px #f43f5e' : '0 0 10px #f59e0b',
                      position: 'absolute',
                      top: '4px',
                      zIndex: selectedAnomaly?.id === item.id ? 10 : 2
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
              Recorded Anomaly Incidents ({anomalies.length})
            </h2>
            {isFiltered && (
              <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Filtered View
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {anomalies.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No anomaly logs matched your filter criteria. Try resetting filters.
              </div>
            ) : (
              anomalies.map((item) => {
                const isSelected = selectedAnomaly?.id === item.id;
                const borderCol = isSelected ? 'var(--accent-cyan)' : 'var(--border-color)';
                const bgCol = isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(0, 0, 0, 0.2)';
                const fullTimeDisplay = item.full_timestamp || `2026-08-11 ${item.timestamp}`;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAnomaly(item)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: bgCol,
                      border: `1px solid ${borderCol}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{item.server}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                          background: item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: item.severity === 'Critical' ? '#fb7185' : '#fbbf24'
                        }}>
                          {item.severity.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => handleDeleteAnomaly(e, item.id)}
                          title="Xóa chủ động bản ghi Anomaly này"
                          style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: '#fb7185',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    {/* Specific Full Datetime Display */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--accent-cyan)' }}>
                        {fullTimeDisplay}
                      </span>
                      <span>Isolation Score: <b style={{ color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>{item.score}</b></span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.summary}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: SHAP Explainability & Natural Language Summary */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
            SHAP Explainability & Root-Cause Analysis
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Explaining why Isolation Forest flagged sample at <b>{selectedAnomaly?.full_timestamp || selectedAnomaly?.timestamp}</b> on <b>{selectedAnomaly?.server}</b> as anomalous.
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
              "{selectedAnomaly?.summary}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
