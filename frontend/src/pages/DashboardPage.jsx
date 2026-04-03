import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Server, Cloud, Rocket, AlertTriangle, DollarSign, Activity, Cpu, HardDrive, ArrowRight, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore, useCloudStore, useProjectStore, useUIStore } from '../store';
import api from '../utils/api';

const StatCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={color} />
      </div>
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-1px' }}>{value}</div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {trend === 'up' ? <TrendingUp size={12} color="var(--brand-success)" /> : trend === 'down' ? <TrendingDown size={12} color="var(--brand-danger)" /> : null}
          <span style={{ fontSize: 11, color: trend === 'up' ? 'var(--brand-success)' : trend === 'down' ? 'var(--brand-danger)' : 'var(--text-muted)' }}>{sub}</span>
        </div>
      )}
    </div>
  </div>
);

const PROVIDER_COLORS = { aws: '#ff9900', azure: '#0078d4', gcp: '#4285f4' };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { accounts, summary, fetchAccounts, fetchSummary } = useCloudStore();
  const { projects, fetchProjects } = useProjectStore();
  const { liveMetrics } = useUIStore();
  const [overview, setOverview] = useState(null);
  const [costData, setCostData] = useState([]);

  useEffect(() => {
    fetchAccounts();
    fetchSummary();
    fetchProjects();
    loadMonitoring();
    loadCosts();
  }, []);

  const loadMonitoring = async () => {
    try {
      const { data } = await api.get('/monitoring/overview');
      setOverview(data);
    } catch (_) {}
  };

  const loadCosts = async () => {
    try {
      const { data } = await api.get('/monitoring/costs/forecast');
      setCostData(data.forecast?.filter(f => f.actual != null).map(f => ({ month: f.month, cost: parseFloat(f.actual?.toFixed(0)) })) || []);
    } catch (_) {}
  };

  const totalCost = summary?.totalCost || 0;
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const criticalAlerts = overview?.alerts?.filter(a => a.severity === 'critical').length || 0;

  const pieData = Object.entries(summary?.costsByProvider || {}).map(([name, value]) => ({
    name: name.toUpperCase(), value: parseFloat(value?.toFixed(2))
  }));

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Here's your infrastructure overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Monthly Cost" value={`$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="+8.9% vs last month" trend="down" icon={DollarSign} color="var(--brand-warning)" />
        <StatCard label="Cloud Accounts" value={accounts.length} sub={`${accounts.filter(a => a.status === 'active').length} active`} icon={Cloud} color="var(--neon-blue)" />
        <StatCard label="Active Projects" value={activeProjects} sub={`${projects.length} total`} icon={Rocket} color="var(--brand-accent)" />
        <StatCard label="Live CPU" value={`${liveMetrics?.cpu?.toFixed(1) || overview?.metrics?.avgCpuUsage?.toFixed(1) || '--'}%`} sub="across all instances" icon={Cpu} color="var(--neon-purple)" />
        <StatCard label="Critical Alerts" value={criticalAlerts} sub={`${(overview?.alerts?.length || 0)} total alerts`} trend={criticalAlerts > 0 ? 'down' : undefined} icon={AlertTriangle} color={criticalAlerts > 0 ? 'var(--brand-danger)' : 'var(--brand-success)'} />
        <StatCard label="Total Requests" value={overview?.metrics?.totalRequests?.toLocaleString() || '—'} sub={`${overview?.metrics?.errorRate || 0}% error rate`} icon={Activity} color="var(--brand-primary)" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Cost trend */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Cost Trend</h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Monthly spend across all providers</p>
            </div>
            <Link to="/monitoring" className="btn btn-ghost" style={{ fontSize: 11 }}>
              View details <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={costData}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }}
                formatter={(v) => [`$${v?.toLocaleString()}`, 'Cost']}
              />
              <Area type="monotone" dataKey="cost" stroke="var(--brand-primary)" fill="url(#costGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by provider */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>By Provider</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>Cost distribution</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={PROVIDER_COLORS[entry.name.toLowerCase()] || 'var(--brand-primary)'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11 }} formatter={(v) => [`$${v?.toFixed(2)}`, 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pieData.map((entry) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: PROVIDER_COLORS[entry.name.toLowerCase()] }} />
                      <span className="provider-badge" style={{ background: 'none', border: 'none', padding: 0 }}>{entry.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>${entry.value?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 12 }}>No cost data yet</div>
          )}
        </div>
      </div>

      {/* Bottom row: Alerts + Services */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Alerts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Recent Alerts</h3>
            <Link to="/monitoring" className="btn btn-ghost" style={{ fontSize: 11 }}>View all <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(overview?.alerts || []).slice(0, 4).map(alert => (
              <div key={alert.id} style={{
                padding: '10px 12px',
                background: 'var(--bg-deep)',
                borderRadius: 8,
                borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--brand-danger)' : alert.severity === 'warning' ? 'var(--brand-warning)' : 'var(--brand-primary)'}`,
                display: 'flex', alignItems: 'flex-start', gap: 10
              }}>
                <AlertTriangle size={13} color={alert.severity === 'critical' ? 'var(--brand-danger)' : alert.severity === 'warning' ? 'var(--brand-warning)' : 'var(--brand-primary)'} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{alert.message}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {new Date(alert.time).toLocaleTimeString()} · {alert.resource}
                  </div>
                </div>
              </div>
            ))}
            {(!overview?.alerts || overview.alerts.length === 0) && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
                <Zap size={20} color="var(--brand-success)" style={{ marginBottom: 8 }} />
                <p>All systems healthy</p>
              </div>
            )}
          </div>
        </div>

        {/* Service health */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Service Health</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(overview?.services || []).map(svc => (
              <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`status-dot ${svc.status === 'healthy' ? 'active' : 'warning'}`} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{svc.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{svc.instances} instances</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ label: 'CPU', val: svc.cpu }, { label: 'MEM', val: svc.memory }].map(m => (
                      <div key={m.label} style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.val}%</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--bg-deep)', borderRadius: 2 }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${m.val}%`,
                            background: m.val > 80 ? 'var(--brand-danger)' : m.val > 60 ? 'var(--brand-warning)' : 'var(--brand-accent)'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
