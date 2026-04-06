import DashboardLayout from '@/components/layout/DashboardLayout'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Search, Users, DollarSign, AlertCircle, FolderOpen, MoreHorizontal } from 'lucide-react'

const users = [
  { name: 'Cricket ki batian', email: 'crickletkibatien183@gmail.com', role: 'User', plan: 'Pro', projects: 4, joined: 'Dec 18, 2025' },
  { name: 'bose', email: 'bose4305@gmail.com', role: 'User', plan: 'Pro', projects: 3, joined: 'Dec 10, 2025' },
  { name: 'Amrit Srivastava', email: 'amritsrivastava.infra@gmail.com', role: 'Admin', plan: 'Enterprise', projects: 10, joined: 'Dec 9, 2025' },
]

const tabs = ['User Management', 'Cost Tracking', 'Cloud Payments']

export default function Admin() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between px-8 py-5 border-b"
        style={{ borderColor: '#1a2035' }}>
        <div>
          <h1 className="font-display font-semibold text-xl" style={{ color: '#e8eaf0' }}>Admin Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8892a4' }}>Manage users, costs, and cloud payments</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
          A
        </div>
      </div>

      <div className="p-8 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard title="Total Users" value="3"
            icon={<Users className="w-4 h-4" style={{ color: '#8b5cf6' }} />} iconBg="rgba(139,92,246,0.1)" />
          <StatCard title="Total Revenue" value="$0.00"
            icon={<DollarSign className="w-4 h-4" style={{ color: '#10b981' }} />} iconBg="rgba(16,185,129,0.1)" />
          <StatCard title="Pending Payments" value="0"
            icon={<AlertCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />} iconBg="rgba(245,158,11,0.1)" />
          <StatCard title="Total Projects" value="10"
            icon={<FolderOpen className="w-4 h-4" style={{ color: '#3b82f6' }} />} iconBg="rgba(59,130,246,0.1)" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#101420', border: '1px solid #1a2035' }}>
          {tabs.map((tab, i) => (
            <button key={tab} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: i === 0 ? '#141926' : 'transparent',
                color: i === 0 ? '#e8eaf0' : '#8892a4',
                border: i === 0 ? '1px solid #1a2035' : '1px solid transparent',
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* User Management */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#101420', border: '1px solid #1a2035' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1a2035' }}>
            <div>
              <h3 className="font-display font-semibold text-sm" style={{ color: '#e8eaf0' }}>User Management</h3>
              <p className="text-xs mt-0.5" style={{ color: '#4a5568' }}>Manage all platform users</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
              <input placeholder="Search users..."
                className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-52"
                style={{ background: '#0c0f18', border: '1px solid #1a2035', color: '#e8eaf0' }} />
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-6 px-5 py-3 text-xs font-medium"
            style={{ color: '#4a5568', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1a2035' }}>
            <div className="col-span-2">User</div>
            <div>Role</div>
            <div>Subscription</div>
            <div>Projects</div>
            <div className="text-right">Joined</div>
          </div>

          {users.map((user, i) => (
            <div key={i} className="grid grid-cols-6 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
              style={{ borderBottom: i < users.length - 1 ? '1px solid #1a2035' : 'none' }}>
              {/* User */}
              <div className="col-span-2 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: user.role === 'Admin' ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                  {user.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: '#e8eaf0' }}>{user.name}</div>
                  <div className="text-xs" style={{ color: '#4a5568' }}>{user.email}</div>
                </div>
              </div>

              {/* Role */}
              <div>
                <Badge variant={user.role === 'Admin' ? 'info' : 'default'}>
                  {user.role}
                </Badge>
              </div>

              {/* Plan */}
              <div>
                <Badge variant={user.plan === 'Enterprise' ? 'active' : 'production'}>
                  {user.plan}
                </Badge>
              </div>

              {/* Projects */}
              <div className="text-sm" style={{ color: '#e8eaf0' }}>{user.projects}</div>

              {/* Joined */}
              <div className="text-right flex items-center justify-end gap-2">
                <span className="text-xs" style={{ color: '#4a5568' }}>{user.joined}</span>
                <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <MoreHorizontal className="w-3.5 h-3.5" style={{ color: '#4a5568' }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Deployments This Month', value: '12', change: '+20%' },
            { label: 'Avg Cost Per User', value: '$0.00', change: '0%' },
            { label: 'Platform Uptime', value: '99.95%', change: '+0.01%' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: '#101420', border: '1px solid #1a2035' }}>
              <div className="text-xs mb-1" style={{ color: '#4a5568' }}>{s.label}</div>
              <div className="font-display font-bold text-xl" style={{ color: '#e8eaf0' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: '#10b981' }}>{s.change}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
