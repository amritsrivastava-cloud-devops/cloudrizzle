'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const generateHourlyData = () =>
  Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    cpu: Math.floor(Math.random() * 40 + 30),
    memory: Math.floor(Math.random() * 30 + 40),
    latency: Math.floor(Math.random() * 20 + 25),
  }))

const data = generateHourlyData()

const alerts = [
  { type: 'warning', service: 'EC2 CPU', message: 'Instance i-0abc123 CPU usage at 87%', time: '2m ago' },
  { type: 'error', service: 'RDS', message: 'Database connection pool near limit (92/100)', time: '15m ago' },
  { type: 'info', service: 'S3', message: 'Bucket lifecycle policy applied successfully', time: '1h ago' },
]

const services = [
  { name: 'API Gateway', status: 'operational', uptime: '99.98%', latency: '45ms' },
  { name: 'EC2 Cluster', status: 'operational', uptime: '99.95%', latency: '12ms' },
  { name: 'RDS Primary', status: 'degraded', uptime: '99.12%', latency: '89ms' },
  { name: 'Redis Cache', status: 'operational', uptime: '100%', latency: '2ms' },
  { name: 'S3 Storage', status: 'operational', uptime: '100%', latency: '55ms' },
  { name: 'CloudFront', status: 'operational', uptime: '99.99%', latency: '8ms' },
]

const tabs = ['Health Overview', 'Pipeline Tracing', 'Log Streaming']
const timeFilters = ['1h', '24h', '7d', '30d']

export default function Monitoring() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between px-8 py-5 border-b"
        style={{ borderColor: '#1a2035' }}>
        <div>
          <h1 className="font-display font-semibold text-xl" style={{ color: '#e8eaf0' }}>Infrastructure Monitoring</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8892a4' }}>Real-time health and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            {timeFilters.map((f, i) => (
              <button key={f} className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{ background: i === 1 ? '#3b82f6' : 'transparent', color: i === 1 ? '#fff' : '#8892a4' }}>
                {f}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5"
            style={{ border: '1px solid #1a2035', color: '#8892a4' }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6 animate-in">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#101420', border: '1px solid #1a2035' }}>
          {tabs.map((tab, i) => (
            <button key={tab} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: i === 0 ? '#141926' : 'transparent', color: i === 0 ? '#e8eaf0' : '#8892a4', border: i === 0 ? '1px solid #1a2035' : '1px solid transparent' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'System Status', value: 'Operational', icon: <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />, iconBg: 'rgba(16,185,129,0.1)' },
            { title: 'Services Healthy', value: '5/6' },
            { title: 'Avg Uptime', value: '99.95%' },
            { title: 'Active Alerts', value: '3', icon: <AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />, iconBg: 'rgba(239,68,68,0.1)' },
          ].map((s, i) => <StatCard key={i} title={s.title} value={s.value} icon={s.icon} iconBg={s.iconBg} />)}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Resource Utilization */}
          <div className="rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>Resource Utilization</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {[{ label: 'CPU Usage', color: '#3b82f6' }, { label: 'Memory Usage', color: '#06b6d4' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    <span style={{ color: '#8892a4' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
                <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false}
                  interval={5} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: '#141926', border: '1px solid #1a2035', borderRadius: 8 }}
                  labelStyle={{ color: '#8892a4', fontSize: 11 }} itemStyle={{ color: '#e8eaf0', fontSize: 11 }} />
                <Area type="monotone" dataKey="cpu" name="CPU" stroke="#3b82f6" strokeWidth={1.5} fill="url(#cpu)" />
                <Area type="monotone" dataKey="memory" name="Memory" stroke="#06b6d4" strokeWidth={1.5} fill="url(#mem)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Response Latency */}
          <div className="rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>Response Latency</h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: '#8b5cf6' }} />
                <span style={{ color: '#8892a4' }}>Average Latency 32ms</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
                <XAxis dataKey="time" tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}ms`} />
                <Tooltip contentStyle={{ background: '#141926', border: '1px solid #1a2035', borderRadius: 8 }}
                  labelStyle={{ color: '#8892a4', fontSize: 11 }} itemStyle={{ color: '#e8eaf0', fontSize: 11 }} />
                <Line type="monotone" dataKey="latency" name="Latency" stroke="#8b5cf6" strokeWidth={1.5}
                  dot={false} activeDot={{ r: 3, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Health + Alerts */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <h3 className="font-display font-semibold text-sm mb-4" style={{ color: '#e8eaf0' }}>Service Health</h3>
            <div className="space-y-2">
              {services.map((svc, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: i < services.length - 1 ? '1px solid #1a2035' : 'none' }}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${svc.status === 'operational' ? 'status-live' : ''}`}
                      style={{ background: svc.status === 'operational' ? '#10b981' : svc.status === 'degraded' ? '#f59e0b' : '#ef4444', position: 'relative' }} />
                    <span className="text-sm font-medium" style={{ color: '#e8eaf0' }}>{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <span style={{ color: '#4a5568' }}>Uptime: <span style={{ color: '#e8eaf0' }}>{svc.uptime}</span></span>
                    <span style={{ color: '#4a5568' }}>Latency: <span style={{ color: '#e8eaf0' }}>{svc.latency}</span></span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{
                        background: svc.status === 'operational' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: svc.status === 'operational' ? '#10b981' : '#f59e0b',
                      }}>
                      {svc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>Recent Alerts</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>3 active</span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="rounded-lg p-3"
                  style={{
                    background: alert.type === 'error' ? 'rgba(239,68,68,0.06)' : alert.type === 'warning' ? 'rgba(245,158,11,0.06)' : 'rgba(59,130,246,0.06)',
                    border: `1px solid ${alert.type === 'error' ? 'rgba(239,68,68,0.15)' : alert.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)'}`,
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium"
                      style={{ color: alert.type === 'error' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#3b82f6' }}>
                      {alert.service}
                    </span>
                    <span className="text-xs" style={{ color: '#4a5568' }}>{alert.time}</span>
                  </div>
                  <p className="text-xs" style={{ color: '#8892a4' }}>{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
