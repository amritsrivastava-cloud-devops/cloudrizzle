import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store';

const ICONS = {
  success: <CheckCircle size={16} color="var(--brand-success)" />,
  error: <XCircle size={16} color="var(--brand-danger)" />,
  warning: <AlertTriangle size={16} color="var(--brand-warning)" />,
  info: <Info size={16} color="var(--brand-primary)" />
};

const COLORS = {
  success: 'var(--brand-success)',
  error: 'var(--brand-danger)',
  warning: 'var(--brand-warning)',
  info: 'var(--brand-primary)'
};

export default function NotificationToast() {
  const { notifications, dismissNotification } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16,
      zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360
    }}>
      {notifications.slice(0, 5).map((n) => (
        <div key={n.id} className="animate-slide-right" style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${COLORS[n.type] || 'var(--border-subtle)'}30`,
          borderLeft: `3px solid ${COLORS[n.type] || 'var(--brand-primary)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          boxShadow: 'var(--shadow-card)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>
            {ICONS[n.type] || ICONS.info}
          </div>
          <div style={{ flex: 1 }}>
            {n.title && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {n.title}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {n.message}
            </div>
          </div>
          <button
            onClick={() => dismissNotification(n.id)}
            className="btn btn-ghost"
            style={{ padding: 4, flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
