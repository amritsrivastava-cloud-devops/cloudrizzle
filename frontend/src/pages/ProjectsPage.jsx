// ProjectsPage.jsx
import React, { useEffect, useState } from 'react';
import { Plus, Folder, Trash2, Cloud, Calendar, DollarSign, X } from 'lucide-react';
import { useProjectStore, useUIStore } from '../store';

function NewProjectModal({ onClose }) {
  const [form, setForm] = useState({ name: '', description: '', provider: 'aws', region: 'us-east-1' });
  const { createProject } = useProjectStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);

  const REGIONS = {
    aws: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    azure: ['eastus', 'westeurope', 'southeastasia'],
    gcp: ['us-central1', 'europe-west1', 'asia-east1']
  };

  const submit = async () => {
    setLoading(true);
    const result = await createProject(form);
    setLoading(false);
    if (result.success) {
      addNotification({ type: 'success', title: 'Project Created', message: `${form.name} is ready` });
      onClose();
    } else {
      addNotification({ type: 'error', message: result.error });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>New Project</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Project Name</label>
            <input className="input" placeholder="My Production API" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Cloud Provider</label>
            <select className="input" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value, region: REGIONS[e.target.value][0] }))}>
              <option value="aws">Amazon Web Services (AWS)</option>
              <option value="azure">Microsoft Azure</option>
              <option value="gcp">Google Cloud Platform (GCP)</option>
            </select>
          </div>
          <div>
            <label className="label">Region</label>
            <select className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
              {REGIONS[form.provider].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button onClick={submit} className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !form.name}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { projects, fetchProjects, deleteProject, isLoading } = useProjectStore();
  const { addNotification } = useUIStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete project "${name}"?`)) return;
    const result = await deleteProject(id);
    if (result.success) addNotification({ type: 'success', message: `${name} deleted` });
  };

  const PROVIDER_ICONS = { aws: '🟠', azure: '🔵', gcp: '🔴' };
  const STATUS_COLORS = { active: 'var(--brand-success)', deploying: 'var(--brand-warning)', failed: 'var(--brand-danger)', archived: 'var(--text-muted)' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> New Project</button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="card shimmer" style={{ height: 140 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Folder size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No projects yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Create your first cloud infrastructure project</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> Create Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{PROVIDER_ICONS[p.provider]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: STATUS_COLORS[p.status], fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{p.status}</span>
                  </div>
                  <span className={`provider-badge ${p.provider}`}>{p.provider} · {p.region}</span>
                </div>
                <button onClick={() => handleDelete(p.id, p.name)} className="btn btn-ghost" style={{ padding: 6, color: 'var(--text-muted)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              {p.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{p.description}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-dim)', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DollarSign size={11} />
                  ${p.cost?.toFixed(2)}/mo
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} />
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
                {p.tags?.map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default ProjectsPage;
