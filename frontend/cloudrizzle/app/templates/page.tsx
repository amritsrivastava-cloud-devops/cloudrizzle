import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Badge } from '@/components/ui/Badge'
import { Search, Star, ArrowUpRight, Cloud, Layers } from 'lucide-react'

const templates = [
  { name: 'S3 Static Website', desc: 'Host a static website using S3 and CloudFront CDN with automatic HTTPS', cloud: 'AWS', category: 'Web Hosting', stars: 48, color: '#ff9900', popular: true },
  { name: 'Microservices Stack', desc: 'Complete microservices architecture with ECS, API Gateway and service mesh', cloud: 'AWS', category: 'Architecture', stars: 92, color: '#3b82f6', popular: true },
  { name: 'ML Ops Platform', desc: 'End-to-end machine learning pipeline with model training and serving', cloud: 'Azure', category: 'Machine Learning', stars: 61, color: '#0078d4', popular: false },
  { name: 'Static Site + CDN', desc: 'Static site hosting with global CDN distribution and edge caching', cloud: 'GCP', category: 'Web Hosting', stars: 37, color: '#ea4335', popular: false },
  { name: 'Kubernetes Cluster', desc: 'Production-ready Kubernetes cluster with auto-scaling and monitoring', cloud: 'AWS', category: 'Container', stars: 115, color: '#06b6d4', popular: true },
  { name: 'Serverless API', desc: 'REST API built with Lambda, API Gateway and DynamoDB', cloud: 'AWS', category: 'Serverless', stars: 79, color: '#10b981', popular: false },
  { name: 'Data Pipeline', desc: 'ETL pipeline with Glue, S3, and Redshift for data warehousing', cloud: 'AWS', category: 'Data', stars: 43, color: '#8b5cf6', popular: false },
  { name: 'Multi-Region HA', desc: 'High availability setup across multiple regions with failover', cloud: 'AWS', category: 'Architecture', stars: 88, color: '#f59e0b', popular: true },
]

const categories = ['All', 'Web Hosting', 'Architecture', 'Container', 'Serverless', 'Data', 'Machine Learning']

export default function Templates() {
  return (
    <DashboardLayout>
      <Header title="Templates" subtitle="Deploy infrastructure from pre-built templates" action={{ label: 'New Template' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
            <input placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#101420', border: '1px solid #1a2035', color: '#e8eaf0' }} />
          </div>
          <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: '#101420', border: '1px solid #1a2035' }}>
            {categories.map((c, i) => (
              <button key={c} className="px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
                style={{ background: i === 0 ? '#3b82f6' : 'transparent', color: i === 0 ? '#fff' : '#8892a4' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Popular badge */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" style={{ color: '#4a5568' }} />
          <span className="text-sm" style={{ color: '#4a5568' }}>
            <span style={{ color: '#e8eaf0' }}>{templates.length}</span> templates available
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((tpl, i) => (
            <div key={i} className="rounded-xl p-5 card-hover cursor-pointer flex flex-col"
              style={{ background: '#101420', border: '1px solid #1a2035' }}>
              {/* Icon & Cloud */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${tpl.color}18` }}>
                  <Cloud className="w-5 h-5" style={{ color: tpl.color }} />
                </div>
                <div className="flex items-center gap-1.5">
                  {tpl.popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                      Popular
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: `${tpl.color}15`, color: tpl.color }}>
                    {tpl.cloud}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-display font-semibold text-sm mb-1" style={{ color: '#e8eaf0' }}>{tpl.name}</h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: '#4a5568' }}>{tpl.desc}</p>
                <Badge variant="default">{tpl.category}</Badge>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-3"
                style={{ borderTop: '1px solid #1a2035' }}>
                <div className="flex items-center gap-1 text-xs" style={{ color: '#4a5568' }}>
                  <Star className="w-3 h-3" style={{ color: '#f59e0b' }} />
                  {tpl.stars}
                </div>
                <button className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: '#3b82f6' }}>
                  Use Template <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
