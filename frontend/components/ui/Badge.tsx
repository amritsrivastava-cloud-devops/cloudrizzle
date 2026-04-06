import { cn } from '@/lib/utils'

type BadgeVariant = 'active' | 'deploying' | 'queued' | 'failed' | 'paused' | 'production' | 'development' | 'staging' | 'success' | 'warning' | 'error' | 'info' | 'default'

const variants: Record<BadgeVariant, { bg: string; color: string; dot?: string }> = {
  active:      { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', dot: '#10b981' },
  success:     { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', dot: '#10b981' },
  deploying:   { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24', dot: '#fbbf24' },
  warning:     { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' },
  queued:      { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' },
  failed:      { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', dot: '#ef4444' },
  error:       { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  paused:      { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' },
  production:  { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' },
  development: { bg: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa' },
  staging:     { bg: 'rgba(251, 146, 60, 0.12)', color: '#fb923c' },
  info:        { bg: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4' },
  default:     { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' },
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  const style = variants[variant]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ background: style.bg, color: style.color }}>
      {(dot || style.dot) && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: style.dot || style.color }} />
      )}
      {children}
    </span>
  )
}
