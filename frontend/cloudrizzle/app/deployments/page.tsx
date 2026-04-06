import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { Search, Rocket } from 'lucide-react'

const deployments = [
  { id: 'DEP-17668132026425-802LN', project: 'kjhgjohvgbj', status: 'queued', env: 'production', version: '9867686', duration: '-', deployed: 'Dec 18, 04:37', cloud: '#3b82f6' },
  { id: 'DEP-17655622833 9-9DLF1', project: 'Static Site + CDN Project', status: 'queued', env: 'development', version: 'v1.2', duration: '-', deployed: 'Dec 17, 07:23', cloud: '#06b6d4' },
  { id: 'N/A', project: 'aws deploy server ec2', status: 'queued', env: 'production', version: 'v1.0.17655...', duration: '-', deployed: 'Dec 12, 06:08', cloud: '#10b981' },
  { id: 'N/A', project: 'aws deploy server ec2', status: 'queued', env: 'production', version: 'v1.0.9', duration: '-', deployed: 'Dec 12, 06:04', cloud: '#10b981' },
  { id: 'N/A', project: 'aws deploy server ec2', status: 'queued', env: 'production', version: 'v1.0.8', duration: '-', deployed: 'Dec 12, 06:04', cloud: '#10b981' },
  { id: 'N/A', project: 'aws deploy server ec2', status: 'queued', env: 'production', version: 'v1.0.7', duration: '-', deployed: 'Dec 12, 06:04', cloud: '#10b981' },
  { id: 'N/A', project: 'Analytics Platform', status: 'rolled back', env: 'production', version: 'v1.7.9', duration: '112s', deployed: 'Dec 9, 09:35', cloud: '#8b5cf6' },
  { id: 'N/A', project: 'Staging Environment', status: 'deploying', env: 'staging', version: 'v2.5.0-rc1', duration: '-', deployed: 'Dec 9, 09:35', cloud: '#f59e0b' },
  { id: 'N/A', project: 'Dev Sandbox', status: 'failed', env: 'development', version: 'v0.9.2', duration: '45s', deployed: 'Dec 9, 09:35', cloud: '#ef4444' },
]

const statusVariant: Record<string, 'queued' | 'deploying' | 'failed' | 'active' | 'warning'> = {
  queued: 'queued',
  deploying: 'deploying',
  failed: 'failed',
  'rolled back': 'warning',
  live: 'active',
}

const filters = ['All', 'Live', 'Deploying', 'Failed']

export default function Deployments() {
  return (
    <DashboardLayout>
      <Header title="Deployments" subtitle="Track and manage your deployment pipeline" action={{ label: 'New Deployment' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'Total', value: '12' },
            { title: 'Live', value: '3' },
            { title: 'In Progress', value: '7' },
            { title: 'Failed', value: '1' },
          ].map((s, i) => <StatCard key={i} title={s.title} value={s.value} />)}
        </div>

        {/* Filters & Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
            <input placeholder="Search deployments..."
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

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#101420', border: '1px solid #1a2035' }}>
          {/* Header */}
          <div className="grid grid-cols-7 px-5 py-3 text-xs font-medium"
            style={{ borderBottom: '1px solid #1a2035', color: '#4a5568', background: 'rgba(255,255,255,0.02)' }}>
            <div className="col-span-2">Deployment ID</div>
            <div className="col-span-1">Project</div>
            <div>Status</div>
            <div>Environment</div>
            <div>Version</div>
            <div className="text-right">Deployed</div>
          </div>

          {/* Rows */}
          {deployments.map((d, i) => (
            <div key={i} className="grid grid-cols-7 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
              style={{ borderBottom: i < deployments.length - 1 ? '1px solid #1a2035' : 'none' }}>
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${d.cloud}18` }}>
                    <Rocket className="w-3 h-3" style={{ color: d.cloud }} />
                  </div>
                  <span className="font-mono text-xs" style={{ color: '#8892a4' }}>{d.id}</span>
                </div>
              </div>
              <div className="col-span-1 text-sm truncate pr-4" style={{ color: '#e8eaf0' }}>{d.project}</div>
              <div>
                <Badge variant={statusVariant[d.status] || 'default'} dot>
                  {d.status}
                </Badge>
              </div>
              <div>
                <Badge variant={d.env as 'production' | 'development' | 'staging'}>
                  {d.env}
                </Badge>
              </div>
              <div className="font-mono text-xs" style={{ color: '#8892a4' }}>{d.version}</div>
              <div className="text-right text-xs" style={{ color: '#4a5568' }}>{d.deployed}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
