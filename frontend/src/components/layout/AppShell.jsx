import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Cloud, Activity, Rocket,
  Layers, Bot, Settings, LogOut, ChevronLeft, ChevronRight,
  Zap, Bell, Search, Menu
} from 'lucide-react';
import { useAuthStore, useUIStore } from '../../store';
import { useSocket } from '../../hooks/useSocket';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',   icon: FolderOpen,      label: 'Projects' },
  { to: '/cloud',      icon: Cloud,           label: 'Cloud Accounts' },
  { to: '/monitoring', icon: Activity,        label: 'Monitoring' },
  { to: '/deploy',     icon: Rocket,          label: 'Deploy' },
  { to: '/templates',  icon: Layers,          label: 'Templates' },
  { to: '/ai',         icon: Bot,             label: 'AI Assistant' },
];

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, liveMetrics, notifications } = useUIStore();
  const navigate = useNavigate();
  useSocket(); // initialize ws connection

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-void)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarCollapsed ? 64 : 220,
        minWidth: sidebarCollapsed ? 64 : 220,
        background: 'var(--bg-deep)',
        borderRight: '1px solid var(--border-dim)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 64
        }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, var(--brand-primary), var(--neon-teal))',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Zap size={16} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                CloudRizzle
              </div>
              <div style={{ fontSize: 10, color: 'var(--brand-accent)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                AI PLATFORM
              </div>
            </div>
          )}
        </div>

        {/* Live metric pill */}
        {!sidebarCollapsed && liveMetrics && (
          <div style={{
            margin: '10px 12px',
            padding: '8px 12px',
            background: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-dim)',
            display: 'flex',
            gap: 12,
            fontSize: 11,
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>CPU</div>
              <div style={{ color: liveMetrics.cpu > 80 ? 'var(--brand-danger)' : 'var(--brand-accent)' }}>
                {liveMetrics.cpu?.toFixed(0)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>MEM</div>
              <div style={{ color: liveMetrics.memory > 85 ? 'var(--brand-warning)' : 'var(--neon-blue)' }}>
                {liveMetrics.memory?.toFixed(0)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 2 }}>REQ/s</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                {liveMetrics.requests}
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: sidebarCollapsed ? '10px 16px' : '10px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(79,142,255,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(79,142,255,0.15)' : '1px solid transparent',
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              transition: 'all 0.15s ease',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            })}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border-dim)' }}>
          <NavLink to="/settings" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: sidebarCollapsed ? '10px 16px' : '10px 12px',
            borderRadius: 8, textDecoration: 'none',
            color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
            fontSize: 13, justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            marginBottom: 4
          })}>
            <Settings size={16} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Settings</span>}
          </NavLink>

          {!sidebarCollapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-surface)',
              marginBottom: 4
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--brand-primary), var(--neon-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.plan?.toUpperCase()}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: 6 }}>
                <LogOut size={14} />
              </button>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--bg-deep)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          flexShrink: 0
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)',
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: 400,
            cursor: 'pointer'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Search resources, projects... ⌘K
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot active animate-pulse-glow" />
            <span style={{ fontSize: 11, color: 'var(--brand-success)', fontFamily: 'var(--font-mono)' }}>LIVE</span>
          </div>

          {/* Notifications */}
          <button className="btn btn-ghost" style={{ position: 'relative', padding: 8 }}>
            <Bell size={16} />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--brand-danger)',
                border: '2px solid var(--bg-deep)'
              }} />
            )}
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-void)' }} className="grid-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
