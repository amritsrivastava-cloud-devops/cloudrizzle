'use client'

import { Bell, Search, Plus } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b"
      style={{ borderColor: '#1a2035', background: 'rgba(7, 9, 14, 0.8)', backdropFilter: 'blur(12px)' }}>
      <div>
        <h1 className="font-display font-semibold text-xl" style={{ color: '#e8eaf0' }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: '#8892a4' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#4a5568' }} />
          <input
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all w-48 focus:w-64"
            style={{
              background: '#101420',
              border: '1px solid #1a2035',
              color: '#e8eaf0',
            }}
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: '1px solid #1a2035' }}>
          <Bell className="w-4 h-4" style={{ color: '#8892a4' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#ef4444' }} />
        </button>

        {/* Action */}
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
            <Plus className="w-4 h-4" />
            {action.label}
          </button>
        )}
      </div>
    </header>
  )
}
