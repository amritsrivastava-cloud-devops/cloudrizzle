'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { User, Building, CreditCard, Bell, Lock, Puzzle, LogOut, Camera, Save } from 'lucide-react'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
]

function ProfileTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-base mb-1" style={{ color: '#e8eaf0' }}>Profile Settings</h2>
        <p className="text-sm" style={{ color: '#4a5568' }}>Manage your personal information</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
            A
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: '#3b82f6' }}>
            <Camera className="w-3 h-3 text-white" />
          </button>
        </div>
        <div>
          <button className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ border: '1px solid #1a2035', color: '#8892a4' }}>
            <Camera className="w-3.5 h-3.5" /> Change Avatar
          </button>
          <p className="text-xs mt-1" style={{ color: '#4a5568' }}>JPG, PNG or GIF. Max 2MB</p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Full Name', value: 'Amrit Srivastava', type: 'text' },
          { label: 'Email Address', value: 'amritsrivastava.infra@gmail.com', type: 'email' },
          { label: 'Company', value: 'cloudrizzle.com', type: 'text' },
          { label: 'Timezone', value: 'Pacific Time (UTC-8)', type: 'text' },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892a4' }}>{field.label}</label>
            <input
              defaultValue={field.value}
              type={field.type}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all focus:border-blue-500/50"
              style={{ background: '#0c0f18', border: '1px solid #1a2035', color: '#e8eaf0' }}
            />
          </div>
        ))}
      </div>

      <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
        <Save className="w-4 h-4" /> Save Changes
      </button>
    </div>
  )
}

function OrganizationTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-base mb-1" style={{ color: '#e8eaf0' }}>Organization Settings</h2>
        <p className="text-sm" style={{ color: '#4a5568' }}>Manage your organization details</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Organization Name', value: 'TechCorp Inc.' },
          { label: 'Website', value: 'https://techcorp.com' },
          { label: 'Industry', value: 'Technology' },
          { label: 'Team Size', value: '10-50' },
        ].map(field => (
          <div key={field.label}>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892a4' }}>{field.label}</label>
            <input defaultValue={field.value}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{ background: '#0c0f18', border: '1px solid #1a2035', color: '#e8eaf0' }} />
          </div>
        ))}
      </div>
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
        <Save className="w-4 h-4" /> Save Changes
      </button>
    </div>
  )
}

function NotificationsTab() {
  const notifications = [
    { label: 'Deployment Alerts', desc: 'Get notified when deployments complete or fail', enabled: true },
    { label: 'Cost Alerts', desc: 'Alerts when spending exceeds thresholds', enabled: true },
    { label: 'Security Warnings', desc: 'Critical security notifications', enabled: true },
    { label: 'Weekly Reports', desc: 'Weekly infrastructure summary email', enabled: false },
    { label: 'Marketing Emails', desc: 'Product updates and announcements', enabled: false },
  ]
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base mb-1" style={{ color: '#e8eaf0' }}>Notification Preferences</h2>
        <p className="text-sm" style={{ color: '#4a5568' }}>Choose what you want to be notified about</p>
      </div>
      {notifications.map((n, i) => (
        <div key={i} className="flex items-center justify-between py-4 px-4 rounded-xl"
          style={{ background: '#0c0f18', border: '1px solid #1a2035' }}>
          <div>
            <div className="text-sm font-medium" style={{ color: '#e8eaf0' }}>{n.label}</div>
            <div className="text-xs mt-0.5" style={{ color: '#4a5568' }}>{n.desc}</div>
          </div>
          <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${n.enabled ? '' : ''}`}
            style={{ background: n.enabled ? '#3b82f6' : '#1a2035' }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{ background: '#fff', left: n.enabled ? '22px' : '2px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SecurityTab() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display font-semibold text-base mb-1" style={{ color: '#e8eaf0' }}>Security Settings</h2>
        <p className="text-sm" style={{ color: '#4a5568' }}>Manage your account security</p>
      </div>
      {/* Password */}
      <div className="rounded-xl p-5" style={{ background: '#0c0f18', border: '1px solid #1a2035' }}>
        <h3 className="font-medium text-sm mb-4" style={{ color: '#e8eaf0' }}>Change Password</h3>
        {['Current Password', 'New Password', 'Confirm New Password'].map(f => (
          <div key={f} className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#8892a4' }}>{f}</label>
            <input type="password" placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#07090e', border: '1px solid #1a2035', color: '#e8eaf0' }} />
          </div>
        ))}
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white mt-2 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
          Update Password
        </button>
      </div>
      {/* 2FA */}
      <div className="rounded-xl p-5" style={{ background: '#0c0f18', border: '1px solid #1a2035' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm" style={{ color: '#e8eaf0' }}>Two-Factor Authentication</h3>
            <p className="text-xs mt-0.5" style={{ color: '#4a5568' }}>Add an extra layer of security to your account</p>
          </div>
          <button className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            Enable 2FA
          </button>
        </div>
      </div>
    </div>
  )
}

const tabContent: Record<string, React.ReactNode> = {
  profile: <ProfileTab />,
  organization: <OrganizationTab />,
  notifications: <NotificationsTab />,
  security: <SecurityTab />,
  billing: (
    <div className="text-center py-16" style={{ color: '#4a5568' }}>
      <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <div className="text-sm">Billing settings coming soon</div>
    </div>
  ),
  integrations: (
    <div className="text-center py-16" style={{ color: '#4a5568' }}>
      <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <div className="text-sm">Integrations coming soon</div>
    </div>
  ),
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <DashboardLayout>
      <div className="px-8 py-5 border-b" style={{ borderColor: '#1a2035' }}>
        <h1 className="font-display font-semibold text-xl" style={{ color: '#e8eaf0' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8892a4' }}>Manage your account and preferences</p>
      </div>

      <div className="flex h-full">
        {/* Settings Sidebar */}
        <div className="w-52 flex-shrink-0 p-4 border-r" style={{ borderColor: '#1a2035' }}>
          <nav className="space-y-0.5">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
                  style={{
                    background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                    color: activeTab === tab.id ? '#e8eaf0' : '#8892a4',
                  }}>
                  <Icon className="w-4 h-4" style={{ color: activeTab === tab.id ? '#3b82f6' : '#4a5568' }} />
                  {tab.label}
                </button>
              )
            })}
            <div style={{ borderTop: '1px solid #1a2035', marginTop: 8, paddingTop: 8 }}>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left hover:bg-red-500/5"
                style={{ color: '#ef4444' }}>
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto animate-in">
          {tabContent[activeTab]}
        </div>
      </div>
    </DashboardLayout>
  )
}
