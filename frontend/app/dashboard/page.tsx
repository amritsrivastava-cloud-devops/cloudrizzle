import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import {
  FolderOpen, Rocket, DollarSign, Shield,
  Cloud, ArrowUpRight, MoreHorizontal, Activity,
  Cpu, Database
} from 'lucide-react'

const projects = [
  {
    name: 'kjhgjohvgbj', cloud: 'AWS', tags: ['active', 'production'],
    compute: '0%', storage: '0%', health: '100%', cost: '$0.00',
    color: '#3b82f6',
  },
  {
    name: 'aws deploy server ec2', cloud: 'AWS', tags: ['active', 'production'],
    compute: '0%', storage: '0%', health: '100%', cost: '$0.00',
    color: '#06b6d4',
  },
  {
    name: 'S3 Static Website Project', cloud: 'AWS', tags: ['deploying', 'staging'],
    compute: '0%', storage: '0%', health: '100%', cost: '$0.00',
    color: '#10b981',
  },
  {
    name: 'Microservices Stack Project', cloud: 'AWS', tags: ['deploying', 'development'],
    compute: '0%', storage: '0%', health: '100%', cost: '$0.00',
    color: '#8b5cf6',
  },
]

const recentDeployments = [
  { project: 'kjhgjohvgbj', id: '9867686', env: 'production', status: 'queued', time: 'Dec 18, 04:37' },
  { project: 'Static Site + CDN Project', id: 'v1.2', env: 'development', status: 'queued', time: 'Dec 17, 07:23' },
  { project: 'aws deploy server ec2', id: 'v1.0.17655', env: 'production', status: 'queued', time: 'Dec 12, 06:08' },
  { project: 'aws deploy server ec2', id: 'v1.0.9', env: 'production', status: 'queued', time: 'Dec 12, 06:04' },
  { project: 'Analytics Platform', id: 'v1.7.9', env: 'production', status: 'rolled back', time: 'Dec 9, 09:35' },
]

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Header title="Dashboard" action={{ label: 'New Project' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Welcome Banner */}
        <div className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.06) 100%)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-6xl opacity-10">☁️</div>
          <div>
            <h2 className="font-display font-bold text-xl" style={{ color: '#e8eaf0' }}>
              Welcome back! 👋
            </h2>
            <p className="text-sm mt-1" style={{ color: '#8892a4' }}>
              Your infrastructure at a glance • Thursday, Apr 2
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Active Projects"
            value="5"
            subtitle="10 total projects"
            change="+12%"
            changeType="up"
            icon={<FolderOpen className="w-4.5 h-4.5" style={{ color: '#3b82f6' }} />}
            iconBg="rgba(59,130,246,0.1)"
          />
          <StatCard
            title="Total Deployments"
            value="10"
            subtitle="This month"
            change="+8%"
            changeType="up"
            icon={<Rocket className="w-4.5 h-4.5" style={{ color: '#10b981' }} />}
            iconBg="rgba(16,185,129,0.1)"
          />
          <StatCard
            title="Monthly Cost"
            value="$1,412.75"
            subtitle="Across all providers"
            change="-3%"
            changeType="down"
            icon={<DollarSign className="w-4.5 h-4.5" style={{ color: '#f59e0b' }} />}
            iconBg="rgba(245,158,11,0.1)"
          />
          <StatCard
            title="System Health"
            value="99%"
            subtitle="All systems operational"
            icon={<Shield className="w-4.5 h-4.5" style={{ color: '#06b6d4' }} />}
            iconBg="rgba(6,182,212,0.1)"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-5 gap-6">
          {/* Projects */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base" style={{ color: '#e8eaf0' }}>Your Projects</h2>
              <a href="/projects" className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
                style={{ color: '#3b82f6' }}>
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.map((project, i) => (
                <div key={i} className="rounded-xl p-4 card-hover cursor-pointer"
                  style={{ background: '#101420', border: '1px solid #1a2035' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${project.color}18` }}>
                        <Cloud className="w-3.5 h-3.5" style={{ color: project.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium truncate max-w-28" style={{ color: '#e8eaf0' }}>{project.name}</div>
                        <div className="text-xs" style={{ color: '#4a5568' }}>{project.cloud}</div>
                      </div>
                    </div>
                    <button className="p-1 rounded hover:bg-white/5 transition-colors">
                      <MoreHorizontal className="w-3.5 h-3.5" style={{ color: '#4a5568' }} />
                    </button>
                  </div>

                  <div className="flex gap-1.5 mb-3">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant={tag as 'active' | 'deploying' | 'production' | 'staging' | 'development'} dot>
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Compute', icon: Cpu, value: project.compute },
                      { label: 'Storage', icon: Database, value: project.storage },
                      { label: 'Health', icon: Activity, value: project.health },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <m.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: '#4a5568' }} />
                        <div className="text-xs font-medium"
                          style={{ color: m.value === '100%' ? '#10b981' : '#e8eaf0' }}>{m.value}</div>
                        <div className="text-xs" style={{ color: '#4a5568' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3"
                    style={{ borderTop: '1px solid #1a2035' }}>
                    <span className="text-xs" style={{ color: '#4a5568' }}>Cost: <span style={{ color: '#e8eaf0' }}>{project.cost}</span>/mo</span>
                    <button className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{ color: '#3b82f6' }}>
                      View <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Deployments */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base" style={{ color: '#e8eaf0' }}>Recent Deployments</h2>
              <a href="/deployments" className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity"
                style={{ color: '#3b82f6' }}>
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: '#101420', border: '1px solid #1a2035' }}>
              {recentDeployments.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  style={{ borderBottom: i < recentDeployments.length - 1 ? '1px solid #1a2035' : 'none' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <Rocket className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{d.project}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>
                      <span style={{ color: '#3b82f6' }}>{d.env}</span> • {d.id}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Badge variant={d.status === 'queued' ? 'queued' : d.status === 'rolled back' ? 'warning' : 'active'}>
                      {d.status}
                    </Badge>
                    <div className="text-xs mt-1" style={{ color: '#4a5568' }}>{d.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
