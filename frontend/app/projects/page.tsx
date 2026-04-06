import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { FolderOpen, Cloud, Activity, Cpu, Database, MoreHorizontal, ArrowUpRight, Search } from 'lucide-react'

const projects = [
  { name: 'kjhgjohvgbj', desc: 'kjbv ghjkghjk', cloud: 'AWS', tags: ['active', 'production'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#3b82f6' },
  { name: 'aws deploy server ec2', desc: 'new one', cloud: 'AWS', tags: ['active', 'production'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#06b6d4' },
  { name: 'S3 Static Website Project', desc: 'Deployed from S3 Static Website template', cloud: 'AWS', tags: ['deploying', 'staging'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#10b981' },
  { name: 'Microservices Stack Project', desc: 'Deployed from Microservices Stack template', cloud: 'AWS', tags: ['deploying', 'development'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#8b5cf6' },
  { name: 'Static Site + CDN Project', desc: 'Deployed from Static Site + CDN template', cloud: 'Gcp', tags: ['deploying', 'staging'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#f59e0b' },
  { name: 'ML Ops Platform Project', desc: 'Deployed from ML Ops Platform template', cloud: 'Azure', tags: ['deploying', 'production'], compute: '0%', storage: '0%', health: '100%', cost: '$0.00', color: '#ef4444' },
]

const filters = ['All', 'Active', 'Deploying', 'Paused', 'Error']

export default function Projects() {
  return (
    <DashboardLayout>
      <Header title="Your Projects" subtitle="Manage all your cloud infrastructure projects" action={{ label: 'New Project' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'Total Projects', value: '10' },
            { title: 'Active', value: '5' },
            { title: 'Deploying', value: '5' },
            { title: 'Paused', value: '0' },
          ].map((s, i) => (
            <StatCard key={i} title={s.title} value={s.value} />
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
            <input placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#101420', border: '1px solid #1a2035', color: '#e8eaf0' }} />
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            {filters.map((f, i) => (
              <button key={f} className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: i === 0 ? '#3b82f6' : 'transparent',
                  color: i === 0 ? '#fff' : '#8892a4',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <div key={i} className="rounded-xl p-5 card-hover cursor-pointer"
              style={{ background: '#101420', border: '1px solid #1a2035' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${project.color}18` }}>
                    <Cloud className="w-4.5 h-4.5" style={{ color: project.color }} />
                  </div>
                  <div>
                    <div className="font-medium text-sm" style={{ color: '#e8eaf0' }}>{project.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>{project.cloud}</div>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <MoreHorizontal className="w-4 h-4" style={{ color: '#4a5568' }} />
                </button>
              </div>

              {project.desc && (
                <p className="text-xs mb-3 line-clamp-1" style={{ color: '#4a5568' }}>{project.desc}</p>
              )}

              <div className="flex gap-1.5 mb-4">
                {project.tags.map(tag => (
                  <Badge key={tag} variant={tag as 'active' | 'deploying' | 'production' | 'staging' | 'development'} dot>
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 py-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                {[
                  { label: 'Compute', icon: Cpu, value: project.compute },
                  { label: 'Storage', icon: Database, value: project.storage },
                  { label: 'Health', icon: Activity, value: project.health },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <m.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: '#4a5568' }} />
                    <div className="text-xs font-semibold"
                      style={{ color: m.value === '100%' ? '#10b981' : '#e8eaf0' }}>{m.value}</div>
                    <div className="text-xs" style={{ color: '#4a5568' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#4a5568' }}>
                  Cost: <span style={{ color: '#e8eaf0' }}>{project.cost}</span>/mo
                </span>
                <button className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: '#3b82f6' }}>
                  View <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
