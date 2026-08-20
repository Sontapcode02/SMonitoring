import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Sliders, RefreshCw, BarChart3, CheckCircle } from 'lucide-react';

export const ModelInsights: React.FC = () => {
  const [contamination, setContamination] = useState<number>(0.05);
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainSuccess, setRetrainSuccess] = useState<boolean>(false);

  const handleRetrain = () => {
    setIsRetraining(true);
    setRetrainSuccess(false);
    setTimeout(() => {
      setIsRetraining(false);
      setRetrainSuccess(true);
    }, 1500);
  };

  // ECharts Dual Line Comparison Option (Rule-based vs ML-based)
  const comparisonChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['Static Rule Alerts', 'Isolation Forest ML Alerts'],
      textStyle: { color: '#9ca3af' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { lineStyle: { color: '#374151' } },
      axisLabel: { color: '#9ca3af' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#374151' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
      axisLabel: { color: '#9ca3af' }
    },
    series: [
      {
        name: 'Static Rule Alerts',
        type: 'line',
        data: [12, 14, 10, 15, 11, 8, 9],
        itemStyle: { color: '#6b7280' },
        lineStyle: { type: 'dashed', width: 2 }
      },
      {
        name: 'Isolation Forest ML Alerts',
        type: 'line',
        smooth: true,
        data: [18, 22, 19, 28, 24, 14, 16],
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
            ]
          }
        }
      }
    ]
  };

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
          PH5: MLOps & Model Analytics (Model Insights)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Fine-tune Isolation Forest hyperparameters directly on Web & Evaluate empirical model performance.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '24px' }}>
        {/* Left Panel: Hyperparameter Tuning Sliders */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--accent-cyan)" /> Hyperparameter Tuning
          </h2>

          {retrainSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> Model successfully retrained & updated!
            </div>
          )}

          {/* Contamination Slider */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Contamination Ratio</label>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{contamination}</span>
            </div>
            <input
              type="range" min="0.01" max="0.15" step="0.01"
              value={contamination} onChange={e => setContamination(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Expected anomaly percentage in training dataset (Default 0.05 = 5%)</div>
          </div>

          {/* n_estimators Slider */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>n_estimators (Trees)</label>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)' }}>{nEstimators}</span>
            </div>
            <input
              type="range" min="50" max="300" step="10"
              value={nEstimators} onChange={e => setNEstimators(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-purple)' }}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Number of random decision trees in Isolation Forest ensemble</div>
          </div>

          {/* Retrain Button */}
          <button
            className="btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))'
            }}
            onClick={handleRetrain}
            disabled={isRetraining}
          >
            <RefreshCw size={16} className={isRetraining ? 'spin' : ''} />
            {isRetraining ? 'Retraining Model...' : 'Retrain / Update Model'}
          </button>
        </div>

        {/* Right Panel: Big Metrics & Dual Comparison Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 4 Big Metrics Cards (Auto-fit Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>PRECISION</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-emerald)' }}>94.2%</div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RECALL</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-cyan)' }}>91.8%</div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>F1-SCORE</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-purple)' }}>93.0%</div>
            </div>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>INFERENCE TIME</div>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent-amber)' }}>12 ms</div>
            </div>
          </div>

          {/* Dual Line Chart Comparison */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="var(--accent-emerald)" /> Detection Efficacy Comparison: Static Rule vs. Isolation Forest ML
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Green line demonstrates ML model capturing <b>+35% stealth anomalies</b> missed by static rules.
              </p>
            </div>
            <ReactECharts option={comparisonChartOption} style={{ height: '340px' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
