import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { StatCard } from '@/components/ui/StatCard'
import { Shield, Wifi, Star, Search, CheckCircle } from 'lucide-react'

const accounts = [
  { name: 'gankit', provider: 'Google Cloud Platform', color: '#ea4335', initial: 'G', status: 'Connected', region: 'us-central1', tested: 'Dec 18, 10:09', isDefault: false },
  { name: 'Azure Atom', provider: 'Microsoft Azure', color: '#0078d4', initial: 'A', status: 'Connected', region: 'eastus', tested: 'Dec 18, 09:47', isDefault: false },
  { name: 'Gcp amrit', provider: 'Google Cloud Platform', color: '#ea4335', initial: 'G', status: 'Connected', region: 'us-central1', tested: 'Dec 18, 09:46', isDefault: false },
  { name: 'Prod AWS', provider: 'Amazon Web Services', color: '#ff9900', initial: 'A', status: 'Connected', region: 'us-east-1', tested: 'Dec 18, 09:50', isDefault: true },
  { name: 'Production AWS', provider: 'Amazon Web Services', color: '#ff9900', initial: 'A', status: 'Connected', region: 'us-west-2', tested: 'Dec 18, 09:45', isDefault: false },
  { name: 'Staging GCP', provider: 'Google Cloud Platform', color: '#ea4335', initial: 'G', status: 'Connected', region: 'us-central1', tested: 'Dec 18, 09:40', isDefault: false },
  { name: 'Dev Azure', provider: 'Microsoft Azure', color: '#0078d4', initial: 'A', status: 'Connected', region: 'westus', tested: 'Dec 18, 09:30', isDefault: false },
]

export default function CloudAccounts() {
  return (
    <DashboardLayout>
      <Header title="Cloud Provider Accounts" subtitle="Manage your cloud provider credentials and connections" action={{ label: 'Add Cloud Account' }} />

      <div className="p-8 space-y-6 animate-in">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { title: 'Total Accounts', value: '7' },
            { title: 'AWS', value: '2', color: '#ff9900' },
            { title: 'Azure', value: '2', color: '#0078d4' },
            { title: 'GCP', value: '3', color: '#ea4335' },
            { title: 'Connected', value: '7' },
          ].map((s, i) => <StatCard key={i} title={s.title} value={s.value} />)}
        </div>

        {/* Encryption Notice */}
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#3b82f6' }} />
          <div>
            <div className="text-sm font-medium" style={{ color: '#93c5fd' }}>Secure Credential Storage</div>
            <p className="text-xs mt-0.5" style={{ color: '#4a5568' }}>
              Your cloud provider credentials are encrypted using AES-256 encryption and stored securely. After saving, credentials are never displayed in plain text. Only masked versions are shown for security.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
          <input placeholder="Search accounts..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#101420', border: '1px solid #1a2035', color: '#e8eaf0' }} />
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, i) => (
            <div key={i} className="rounded-xl p-5 card-hover"
              style={{ background: '#101420', border: '1px solid #1a2035' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: acc.color }}>
                    {acc.initial}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm" style={{ color: '#e8eaf0' }}>{acc.name}</span>
                      {acc.isDefault && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                          <Star className="w-2.5 h-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>{acc.provider}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: '#10b981' }}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  {acc.status}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#4a5568' }}>Default Region</span>
                  <span className="font-mono text-xs" style={{ color: '#e8eaf0' }}>{acc.region}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#4a5568' }}>Last Tested</span>
                  <span style={{ color: '#e8eaf0' }}>{acc.tested}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                  style={{ border: '1px solid #1a2035', color: '#8892a4' }}>
                  <Wifi className="w-3.5 h-3.5" />
                  Test Connection
                </button>
                <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                  Use Account
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
