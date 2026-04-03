import React, { useEffect, useState } from 'react';
import { Plus, Cloud, Trash2, RefreshCw, Server, Database, Zap, HardDrive, DollarSign, ChevronRight, X, Check } from 'lucide-react';
import { useCloudStore, useUIStore } from '../store';

const PROVIDER_CONFIG = {
  aws: { color: '#ff9900', fields: [{ key: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIAIOSFODNN7EXAMPLE' }, { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '••••••••', type: 'password' }, { key: 'region', label: 'Default Region', placeholder: 'us-east-1' }] },
  azure: { color: '#0078d4', fields: [{ key: 'subscriptionId', label: 'Subscription ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { key: 'tenantId', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { key: 'clientId', label: 'Client ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }, { key: 'clientSecret', label: 'Client Secret', placeholder: '••••••••', type: 'password' }] },
  gcp: { color: '#4285f4', fields: [{ key: 'projectId', label: 'Project ID', placeholder: 'my-gcp-project' }, { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', placeholder: '{"type":"service_account",...}', multiline: true }] }
};

function AddAccountModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState('');
  const [name, setName] = useState('');
  const [creds, setCreds] = useState({});
  const { addAccount } = useCloudStore();
  const { addNotification } = useUIStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await addAccount({ provider, name, credentials: creds });
    setLoading(false);
    if (result.success) {
      addNotification({ type: 'success', title: 'Account Connected', message: `${name} (${provider.toUpperCase()}) connected successfully` });
      onClose();
    } else {
      addNotification({ type: 'error', title: 'Connection Failed', message: result.error });
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
            Connect Cloud Account
          </h2>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
        </div>

        {step === 1 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Select your cloud provider</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'aws', name: 'Amazon Web Services', desc: 'EC2, S3, Lambda, RDS and more', icon: '🟠' },
                { id: 'azure', name: 'Microsoft Azure', desc: 'VMs, Blob Storage, AKS and more', icon: '🔵' },
                { id: 'gcp', name: 'Google Cloud Platform', desc: 'Compute Engine, GCS, GKE and more', icon: '🔴' }
              ].map(p => (
                <button key={p.id} onClick={() => { setProvider(p.id); setStep(2); }} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  background: 'var(--bg-deep)',
                  border: `1px solid ${provider === p.id ? PROVIDER_CONFIG[p.id].color + '50' : 'var(--border-subtle)'}`,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
                }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && provider && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Account Name</label>
              <input className="input" placeholder="Production AWS" value={name} onChange={e => setName(e.target.value)} />
            </div>
            {PROVIDER_CONFIG[provider].fields.map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label className="label">{f.label}</label>
                {f.multiline ? (
                  <textarea className="input" placeholder={f.placeholder} value={creds[f.key] || ''} onChange={e => setCreds(c => ({ ...c, [f.key]: e.target.value }))} style={{ minHeight: 80 }} />
                ) : (
                  <input className="input" type={f.type || 'text'} placeholder={f.placeholder} value={creds[f.key] || ''} onChange={e => setCreds(c => ({ ...c, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ flex: 1 }}>Back</button>
              <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 2 }} disabled={loading || !name}>
                {loading ? 'Connecting...' : <><Check size={14} /> Connect Account</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const RESOURCE_ICONS = { ec2: Server, s3: HardDrive, lambda: Zap, rds: Database, compute: Server, gcs: HardDrive, gke: Server, vms: Server, blob: HardDrive, aks: Server };

export default function CloudAccountsPage() {
  const { accounts, fetchAccounts, removeAccount, isLoading } = useCloudStore();
  const { addNotification } = useUIStore();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchAccounts(); }, []);

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    const result = await removeAccount(id);
    if (result.success) addNotification({ type: 'success', message: `${name} removed` });
    if (selected === id) setSelected(null);
  };

  const selectedAccount = accounts.find(a => a.id === selected);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Cloud Accounts</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{accounts.length} provider{accounts.length !== 1 ? 's' : ''} connected</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchAccounts} className="btn btn-secondary"><RefreshCw size={14} /> Sync</button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> Add Account</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: 20 }}>
        {/* Account list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="card shimmer" style={{ height: 120 }} />)
          ) : accounts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
              <Cloud size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>No cloud accounts</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Connect your first cloud provider</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary"><Plus size={14} /> Add Account</button>
            </div>
          ) : (
            accounts.map(account => (
              <div key={account.id} onClick={() => setSelected(selected === account.id ? null : account.id)}
                className="card interactive"
                style={{
                  borderColor: selected === account.id ? 'var(--border-active)' : undefined,
                  boxShadow: selected === account.id ? 'var(--shadow-glow-blue)' : undefined
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${PROVIDER_CONFIG[account.provider]?.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20
                  }}>
                    {account.provider === 'aws' ? '🟠' : account.provider === 'azure' ? '🔵' : '🔴'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{account.name}</span>
                      <span className={`status-dot ${account.status === 'active' ? 'active' : 'error'}`} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className={`provider-badge ${account.provider}`}>{account.provider}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{account.region}</span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleRemove(account.id, account.name); }} className="btn btn-ghost" style={{ padding: 6, color: 'var(--text-muted)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(account.resources || {}).slice(0, 3).map(([type, count]) => {
                      const Icon = RESOURCE_ICONS[type] || Server;
                      return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <Icon size={11} />
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-warning)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    <DollarSign size={11} />
                    {account.monthlyCost?.toFixed(2)}/mo
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Account detail */}
        {selectedAccount && (
          <div className="card animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 32 }}>{selectedAccount.provider === 'aws' ? '🟠' : selectedAccount.provider === 'azure' ? '🔵' : '🔴'}</span>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>{selectedAccount.name}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {selectedAccount.accountId}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Provider', value: selectedAccount.provider?.toUpperCase() },
                { label: 'Region', value: selectedAccount.region },
                { label: 'Status', value: selectedAccount.status },
                { label: 'Monthly Cost', value: `$${selectedAccount.monthlyCost?.toFixed(2)}` },
                { label: 'Last Sync', value: new Date(selectedAccount.lastSync).toLocaleString() },
                { label: 'Resources', value: Object.values(selectedAccount.resources || {}).reduce((s, v) => s + v, 0) }
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-deep)', padding: '12px', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Resource Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(selectedAccount.resources || {}).map(([type, count]) => {
                const Icon = RESOURCE_ICONS[type] || Server;
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 8 }}>
                    <Icon size={14} color="var(--brand-primary)" />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{type}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>{count} resources</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showModal && <AddAccountModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
