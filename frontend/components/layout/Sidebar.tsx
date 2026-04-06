'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FolderOpen, Cloud, Layers, Rocket,
  DollarSign, Bot, Activity, Shield, Settings,
  ChevronRight, Zap, LogOut
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/cloud-accounts', icon: Cloud, label: 'Cloud Accounts' },
  { href: '/templates', icon: Layers, label: 'Templates' },
  { href: '/deployments', icon: Rocket, label: 'Deployments' },
  { href: '/costs', icon: DollarSign, label: 'Costs' },
  { href: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { href: '/monitoring', icon: Activity, label: 'Monitoring' },
  { href: '/admin', icon: Shield, label: 'Admin' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col z-40"
      style={{ background: '#0a0d16', borderRight: '1px solid #1a2035' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: '#1a2035' }}>
        <div className="relative w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
          <Cloud className="w-4 h-4 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-lg opacity-40"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', filter: 'blur(6px)', zIndex: -1 }} />
        </div>
        <div>
          <div className="font-display font-700 text-sm text-white leading-none">CloudRizzle</div>
          <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>AI Infrastructure</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-all',
                isActive ? 'active' : ''
              )}
              style={{
                color: isActive ? '#e8eaf0' : '#8892a4',
                background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#c4c9d4' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#8892a4' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? '#3b82f6' : 'inherit' }} />
              <span className="font-medium">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" style={{ color: '#3b82f6' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Pro Plan Banner */}
      <div className="mx-3 mb-3 rounded-xl p-3" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
          <span className="text-xs font-display font-semibold" style={{ color: '#93c5fd' }}>Pro Plan</span>
        </div>
        <p className="text-xs mb-2.5" style={{ color: '#4a5568' }}>
          Unlock unlimited deployments and AI features
        </p>
        <button className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
          Upgrade Now
        </button>
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t" style={{ borderColor: '#1a2035' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>Amrit Srivastava</div>
          <div className="text-xs truncate" style={{ color: '#4a5568' }}>Admin</div>
        </div>
        <button className="p-1 rounded hover:bg-red-500/10 transition-colors">
          <LogOut className="w-3.5 h-3.5" style={{ color: '#4a5568' }} />
        </button>
      </div>
    </aside>
  )
}
