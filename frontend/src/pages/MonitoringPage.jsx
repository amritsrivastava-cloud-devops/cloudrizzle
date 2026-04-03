import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, MemoryStick, Wifi, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useUIStore } from '../store';
import api from '../utils/api';
import { useSocket } from '../hooks/useSocket';

const METRIC_CONFIG = {
  cpu:     { label: 'CPU Usage',     color: 'var(--neon-purple)',  unit: '%', icon: Cpu },
  memory:  { label: 'Memory Usage',  color: 'var(--brand-primary)', unit: '%', icon: MemoryStick },
  network: { label: 'Network I/O',   color: 'var(--brand-accent)',  unit: 'Mbps', icon: Wifi },
  requests:{ label: 'Request Rate',  color: 'var(--brand-warning)', unit: '/s', icon: Activity },
};

const MetricCard = ({ metricKey, data, current, isSelected, onClick }) => {
  const cfg = METRIC_CONFIG[metricKey];
  const Icon = cfg.icon;
  const latest = current || data[data.length - 1]?.value;
  return (
    <div onClick={onClick} className="card interactive" style={{
      borderColor: isSelected ? 'var(--border-active)' : undefined,
      boxShadow: isSelected ? `0 0 20px ${cfg.color}20` : undefined,
      cursor: 'pointer'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={14} color={cfg.color} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{cfg.label}</span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', color: cfg.color }}>
          {latest?.toFixed(1)}{cfg.unit}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={50}>
        <AreaChart data={data.slice(-30)}>
          <defs>
            <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={cfg.color} fill={`url(#grad-${metricKey})`} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function MonitoringPage() {
  const { liveMetrics } = useUIStore();
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [metricsHistory, setMetricsHistory] = useState({ cpu: [], memory: [], network: [], requests: [] });
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [costForecast, setCostForecast] = useState(null);
  const [period, setPeriod] = useState('1h');
  const { subscribe } = useSocket();

  useEffect(() => {
    loadData();
    loadLogs();
    loadForecast();
  }, []);

  // Accumulate live metrics
  useEffect(() => {
    if (!liveMetrics) return;
    const ts = new Date(liveMetrics.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setMetricsHistory(h => ({
      cpu:      [...h.cpu.slice(-59),      { time: ts, value: liveMetrics.cpu }],
      memory:   [...h.memory.slice(-59),   { time: ts, value: liveMetrics.memory }],
      network:  [...h.network.slice(-59),  { time: ts, value: (liveMetrics.network?.in + liveMetrics.network?.out) / 100 }],
      requests: [...h.requests.slice(-59), { time: ts, value: liveMetrics.requests / 10 }]
    }));
  }, [liveMetrics]);

  const loadData = async () => {
    try {
      const { data } = await api.get('/monitoring/overview');
      setOverview(data);
    } catch (_) {}
  };

  const loadLogs = async () => {
    try {
      const { data } = await api.get('/monitoring/logs?limit=30');
      setLogs(data.logs || []);
    } catch (_) {}
  };

  const loadForecast = async () => {
    try {
      const { data } = await api.get('/monitoring/costs/forecast');
      setCostForecast(data);
    } catch (_) {}
  };

  const cfg = METRIC_CONFIG[selectedMetric];
  const history = metricsHistory[selectedMetric];

  const LOG_LEVEL_COLORS = { INFO: 'var(--brand-accent)', WARN: 'var(--brand-warning)', ERROR: 'var(--brand-danger)' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Live Monitoring</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot active animate-pulse-glow" /> Real-time metrics · Updates every 5s
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {Object.keys(METRIC_CONFIG).map(key => (
          <MetricCard
            key={key}
            metricKey={key}
            data={metricsHistory[key]}
            current={key === 'cpu' ? liveMetrics?.cpu : key === 'memory' ? liveMetrics?.memory : undefined}
            isSelected={selectedMetric === key}
            onClick={() => setSelectedMetric(key)}
          />
        ))}
      </div>

      {/* Expanded chart */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <cfg.icon size={16} color={cfg.color} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{cfg.label}</h3>
            <span className="status-dot active animate-pulse-glow" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['1h', '6h', '24h'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 10px', fontSize: 11 }}>{p}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}${cfg.unit}`} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: `1px solid ${cfg.color}30`, borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              formatter={v => [`${v?.toFixed(2)}${cfg.unit}`, cfg.label]}
            />
            <Area type="monotone" dataKey="value" stroke={cfg.color} fill="url(#mainGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cost + Logs row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cost forecast */}
        {costForecast && (
          <div className="card">
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Cost Forecast</h3>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>THIS MONTH EST.</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--brand-warning)' }}>${costForecast.currentMonthEstimate?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VS LAST MONTH</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: costForecast.percentChange > 0 ? 'var(--brand-danger)' : 'var(--brand-success)' }}>
                    {costForecast.percentChange > 0 ? '↑' : '↓'} {Math.abs(costForecast.percentChange)}%
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(costForecast.breakdown || []).map(b => (
                <div key={b.service} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70, fontFamily: 'var(--font-mono)' }}>{b.service}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-deep)', borderRadius: 3 }}>
                    <div style={{ width: `${b.percentage}%`, height: '100%', background: 'var(--brand-primary)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${b.amount?.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live logs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Live Logs</h3>
            <button onClick={loadLogs} className="btn btn-ghost" style={{ fontSize: 11 }}><RefreshCw size={12} /> Refresh</button>
          </div>
          <div className="terminal" style={{ flex: 1, maxHeight: 280, overflowY: 'auto' }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4, fontSize: 11, lineHeight: 1.5 }}>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString()} </span>
                <span style={{ color: LOG_LEVEL_COLORS[log.level] || 'var(--text-secondary)', fontWeight: 700 }}>[{log.level}] </span>
                <span style={{ color: '#a8f0c8' }}>{log.message}</span>
              </div>
            ))}
            <span className="terminal-cursor" />
          </div>
        </div>
      </div>
    </div>
  );
}
