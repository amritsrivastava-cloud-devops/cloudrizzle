import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  iconBg?: string
  subtitle?: string
  className?: string
}

export function StatCard({ title, value, change, changeType = 'up', icon, iconBg, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('stat-card animate-in', className)}>
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg || 'rgba(59, 130, 246, 0.1)' }}>
            {icon}
          </div>
        )}
        {change && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ml-auto',
            changeType === 'up' ? 'text-emerald-400' : changeType === 'down' ? 'text-red-400' : 'text-slate-400',
            changeType === 'up' ? 'bg-emerald-400/10' : changeType === 'down' ? 'bg-red-400/10' : 'bg-slate-400/10',
          )}>
            {changeType === 'up' ? <TrendingUp className="w-3 h-3" /> : changeType === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {change}
          </div>
        )}
      </div>
      <div className="font-display font-bold text-2xl mt-2" style={{ color: '#e8eaf0' }}>{value}</div>
      <div className="text-sm mt-1" style={{ color: '#8892a4' }}>{title}</div>
      {subtitle && <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>{subtitle}</div>}
    </div>
  )
}
