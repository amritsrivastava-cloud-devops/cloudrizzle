'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { Download, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const costTrends = [
  { month: 'Jan', actual: 1100, projected: 1050 },
  { month: 'Feb', actual: 1180, projected: 1130 },
  { month: 'Mar', actual: 1250, projected: 1200 },
  { month: 'Apr', actual: 1310, projected: 1280 },
  { month: 'May', actual: 1380, projected: 1400 },
  { month: 'Jun', actual: 1413, projected: 1625 },
]

const distribution = [
  { name: 'Compute', value: 185, color: '#3b82f6' },
  { name: 'Storage', value: 95, color: '#06b6d4' },
  { name: 'Network', value: 45, color: '#8b5cf6' },
  { name: 'Database', value: 125, color: '#10b981' },
  { name: 'Other', value: 35, color: '#f59e0b' },
]

const services = [
  { name: 'EC2', usage: 40, cost: '$856', current: '$1,412.75', projected: '$1,624.66', savings: '$124.00', alerts: 2 },
  { name: 'S3', usage: 25, cost: '$320', current: '$320.00', projected: '$380.00', savings: '$45.00', alerts: 0 },
  { name: 'RDS', usage: 20, cost: '$240', current: '$240.00', projected: '$260.00', savings: '$20.00', alerts: 1 },
  { name: 'CloudFront', usage: 15, cost: '$96', current: '$96.00', projected: '$110.00', savings: '$0.00', alerts: 0 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 text-xs" style={{ background: '#141926', border: '1px solid #1a2035' }}>
        <div className="font-medium mb-2" style={{ color: '#e8eaf0' }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: '#8892a4' }}>{p.name}: </span>
            <span style={{ color: '#e8eaf0' }}>${p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Costs() {
  return (
    <DashboardLayout>
      <Header title="Cost Management" subtitle="Track spending and optimize your cloud costs"
        action={{ label: 'Export' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Current Monthly Cost" value="$1,412.75"
            icon={<span className="text-lg">$</span>} iconBg="rgba(59,130,246,0.1)" />
          <StatCard title="Projected Cost" value="$1,624.66"
            change="+15%" changeType="up"
            icon={<TrendingUp className="w-4 h-4" style={{ color: '#f59e0b' }} />} iconBg="rgba(245,158,11,0.1)" />
          <StatCard title="Potential Savings" value="$124.00"
            icon={<Download className="w-4 h-4" style={{ color: '#10b981' }} />} iconBg="rgba(16,185,129,0.1)" />
          <StatCard title="Cost Alerts" value="2"
            icon={<AlertTriangle className="w-4 h-4" style={{ color: '#ef4444' }} />} iconBg="rgba(239,68,68,0.1)" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-5 gap-6">
          {/* Line Chart */}
          <div className="col-span-3 rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>Cost Trends</h3>
                <p className="text-xs mt-0.5" style={{ color: '#4a5568' }}>Monthly spending over time</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {[{ label: 'Actual', color: '#3b82f6' }, { label: 'Projected', color: '#06b6d4' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                    <span style={{ color: '#8892a4' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={costTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
                <XAxis dataKey="month" tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a5568', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="projected" name="Projected" stroke="#06b6d4" strokeWidth={2}
                  strokeDasharray="5 5" dot={false} activeDot={{ r: 4, fill: '#06b6d4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="col-span-2 rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            <div className="mb-4">
              <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>Cost Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  paddingAngle={3} dataKey="value">
                  {distribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${v}`, '']} contentStyle={{ background: '#141926', border: '1px solid #1a2035', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
              {distribution.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs" style={{ color: '#8892a4' }}>{d.name}</span>
                  <span className="text-xs ml-auto font-medium" style={{ color: '#e8eaf0' }}>${d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost by Service */}
        <div className="rounded-xl p-5" style={{ background: '#101420', border: '1px solid #1a2035' }}>
          <h3 className="font-display font-semibold text-sm mb-4" style={{ color: '#e8eaf0' }}>Cost by Service</h3>
          <div className="space-y-3">
            {services.map((svc, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a2035' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                      {svc.name[0]}
                    </div>
                    <span className="font-medium text-sm" style={{ color: '#e8eaf0' }}>{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#4a5568' }}>{svc.usage}%</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: '#e8eaf0' }}>{svc.cost}</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#1a2035' }}>
                  <div className="h-full rounded-full" style={{ width: `${svc.usage}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)' }} />
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  {[
                    { label: 'Current Monthly Cost', value: svc.current },
                    { label: 'Projected Cost', value: svc.projected, color: '#f59e0b' },
                    { label: 'Potential Savings', value: svc.savings, color: '#10b981' },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ color: '#4a5568' }}>{m.label}</div>
                      <div className="font-semibold mt-0.5" style={{ color: m.color || '#e8eaf0' }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
