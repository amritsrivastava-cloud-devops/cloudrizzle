'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Send, Bot, AlertTriangle, Info, ChevronRight, Sparkles, Zap } from 'lucide-react'

type Severity = 'critical' | 'medium' | 'low'

const recommendations = [
  {
    id: 1,
    severity: 'critical' as Severity,
    title: 'Update Security Groups',
    description: '2 security groups have overly permissive rules allowing 0.0.0.0/0 access',
    impact: 'High security risk',
    action: 'Fix Now',
    icon: AlertTriangle,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
  },
  {
    id: 2,
    severity: 'medium' as Severity,
    title: 'Enable CloudFront Caching',
    description: 'Static assets are served directly from S3. Enable CloudFront for 40% faster load times',
    impact: 'Better user experience',
    action: 'Configure',
    icon: Zap,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
  },
  {
    id: 3,
    severity: 'medium' as Severity,
    title: 'Clean Up Unused Resources',
    description: 'Found 5 unattached EBS volumes and 2 unused Elastic IPs costing $45/month',
    impact: '$45/month savings',
    action: 'Review',
    icon: Info,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
  },
  {
    id: 4,
    severity: 'low' as Severity,
    title: 'Reserved Instances Opportunity',
    description: '3 EC2 instances running 24/7 could save $127/month with 1-year reserved instances',
    impact: '18% cost reduction',
    action: 'View Details',
    icon: Sparkles,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
  },
]

const quickPrompts = [
  'Create a 3-tier VPC with load balancer on AWS',
  'Set up a PostgreSQL database on RDS',
  'Deploy a Node.js app to EC2',
  'Create an S3 bucket with CloudFront CDN',
  'Set up auto-scaling for my web servers',
  'Configure SSL certificate with ACM',
]

const messages = [
  { role: 'assistant', content: 'Hello! I\'m your AI infrastructure assistant. I can help you deploy and manage cloud resources across AWS, Azure, and GCP. What would you like to build today?' },
]

const severityLabel: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:      { label: 'Low',      color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
}

export default function AIAssistant() {
  const [input, setInput] = useState('')
  const [chat, setChat] = useState(messages)

  const sendMessage = () => {
    if (!input.trim()) return
    setChat(prev => [
      ...prev,
      { role: 'user', content: input },
      { role: 'assistant', content: `I'll help you with: "${input}". Let me generate the Terraform configuration for that...` },
    ])
    setInput('')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0"
          style={{ borderColor: '#1a2035' }}>
          <div>
            <h1 className="font-display font-semibold text-xl" style={{ color: '#e8eaf0' }}>AI Assistant</h1>
            <p className="text-sm mt-0.5" style={{ color: '#3b82f6' }}>
              Your intelligent infrastructure deployment companion with advanced capabilities
            </p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid #1a2035' }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chat.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${msg.role === 'user'
                    ? 'rounded-tr-sm text-white'
                    : 'rounded-tl-sm'
                    }`}
                    style={{
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                        : '#141926',
                      border: msg.role === 'assistant' ? '1px solid #1a2035' : 'none',
                      color: msg.role === 'assistant' ? '#e8eaf0' : undefined,
                    }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Prompts */}
            <div className="px-6 py-3 flex gap-2 flex-wrap" style={{ borderTop: '1px solid #1a2035' }}>
              {quickPrompts.slice(0, 3).map((p, i) => (
                <button key={i}
                  onClick={() => setInput(p)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:border-blue-500/50"
                  style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #1a2035' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about infrastructure, deployments, or optimization..."
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: '#141926',
                  border: '1px solid #1a2035',
                  color: '#e8eaf0',
                }}
              />
              <button onClick={sendMessage}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs pb-3" style={{ color: '#4a5568' }}>
              ⚡ AI-powered responses may not always be accurate. Verify critical infrastructure decisions.
            </p>
          </div>

          {/* Recommendations Panel */}
          <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto p-5 space-y-3">
            <div>
              <h2 className="font-display font-semibold text-sm mb-1" style={{ color: '#e8eaf0' }}>AI Recommendations</h2>
              <p className="text-xs" style={{ color: '#4a5568' }}>Suggestions to optimize your infrastructure</p>
            </div>

            {recommendations.map(rec => {
              const Icon = rec.icon
              const sev = severityLabel[rec.severity]
              return (
                <div key={rec.id} className="rounded-xl p-4 card-hover"
                  style={{ background: rec.bg, border: `1px solid ${rec.color}25` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: rec.color }} />
                      <span className="text-sm font-medium" style={{ color: '#e8eaf0' }}>{rec.title}</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: sev.bg, color: sev.color }}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#8892a4' }}>{rec.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#4a5568' }}>
                      Impact: <span style={{ color: rec.color }}>{rec.impact}</span>
                    </span>
                    <button className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ color: rec.color }}>
                      {rec.action} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}

            <div className="pt-2">
              <h3 className="text-xs font-medium mb-2" style={{ color: '#4a5568' }}>Quick Prompts</h3>
              <div className="space-y-1.5">
                {quickPrompts.map((p, i) => (
                  <button key={i} onClick={() => setInput(p)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all hover:border-blue-500/30"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1a2035', color: '#8892a4' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
