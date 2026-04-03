// TemplatesPage.jsx
import React, { useState, useEffect } from 'react';
import { Search, Rocket, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, [search, provider, category]);

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (provider) params.set('provider', provider);
      if (category) params.set('category', category);
      const { data } = await api.get(`/templates?${params}`);
      setTemplates(data.templates || []);
      setCategories(data.categories || []);
    } catch (_) {}
  };

  const DIFFICULTY_COLORS = { beginner: 'var(--brand-success)', intermediate: 'var(--brand-warning)', advanced: 'var(--brand-danger)' };
  const CATEGORY_BG = { Compute: '#7c3aed', Storage: '#0891b2', Containers: '#0ea5e9', Database: '#d97706', Serverless: '#10b981', Analytics: '#f59e0b', DevOps: '#6366f1', Observability: '#8b5cf6', Messaging: '#ec4899', Networking: '#14b8a6' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Infrastructure Templates</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Pre-built Terraform configurations for rapid deployment</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>
        <select className="input" style={{ width: 160 }} value={provider} onChange={e => setProvider(e.target.value)}>
          <option value="">All Providers</option>
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">GCP</option>
        </select>
        <select className="input" style={{ width: 180 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
        {templates.map(t => (
          <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${CATEGORY_BG[t.category] || '#4f8eff'}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22
              }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t.name}</div>
                <span className={`provider-badge ${t.provider}`}>{t.provider}</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12, flex: 1 }}>{t.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: DIFFICULTY_COLORS[t.difficulty], fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>● {t.difficulty}</span>
              <span style={{ fontSize: 11, color: 'var(--brand-accent)', fontFamily: 'var(--font-mono)' }}>{t.estimatedCost}</span>
            </div>
            <button onClick={() => navigate('/deploy')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
              <Rocket size={12} /> Deploy Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TemplatesPage;
