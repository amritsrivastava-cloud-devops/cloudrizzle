import React, { useState } from 'react';
import { User, Key, Bell, Shield, Palette, Save, Check } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store';

const Section = ({ title, children }) => (
  <div className="card" style={{ marginBottom: 16 }}>
    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-dim)' }}>{title}</h3>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    addNotification({ type: 'success', title: 'Settings saved', message: 'Your preferences have been updated' });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Manage your account and platform preferences</p>
      </div>

      <Section title="Profile">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Full Name</label>
            <input className="input" defaultValue={user?.name} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" defaultValue={user?.email} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="label">Role</label>
          <div style={{ padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {user?.role?.toUpperCase()} · {user?.plan?.toUpperCase()} Plan
          </div>
        </div>
      </Section>

      <Section title="API Keys">
        <div style={{ marginBottom: 12 }}>
          <label className="label">Anthropic API Key</label>
          <input className="input" type="password" placeholder="sk-ant-..." />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Used for AI assistant features. Never stored in plaintext.</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="label">AWS Access Key ID</label>
          <input className="input" placeholder="AKIAIOSFODNN7EXAMPLE" />
        </div>
        <div>
          <label className="label">AWS Secret Access Key</label>
          <input className="input" type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
        </div>
      </Section>

      <Section title="Notifications">
        {[
          { label: 'Deployment completions', desc: 'Notify when a deployment succeeds or fails' },
          { label: 'Cost threshold alerts', desc: 'Alert when monthly spend exceeds your budget' },
          { label: 'Security alerts', desc: 'Critical security findings and recommendations' },
          { label: 'Weekly cost summary', desc: 'Receive a weekly email with your cost breakdown' }
        ].map(n => (
          <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-dim)' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{n.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.desc}</div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{
                position: 'absolute', inset: 0,
                background: 'var(--brand-primary)',
                borderRadius: 11,
                transition: '0.2s'
              }} />
            </label>
          </div>
        ))}
      </Section>

      <Section title="Default Region Preferences">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { provider: 'AWS', regions: ['us-east-1', 'us-west-2', 'eu-west-1'] },
            { provider: 'Azure', regions: ['eastus', 'westeurope', 'southeastasia'] },
            { provider: 'GCP', regions: ['us-central1', 'europe-west1', 'asia-east1'] }
          ].map(p => (
            <div key={p.provider}>
              <label className="label">{p.provider} Default Region</label>
              <select className="input">
                {p.regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} className="btn btn-primary" style={{ padding: '12px 28px' }}>
          {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}
