import React, { useState, useEffect, useRef } from 'react';
import { Rocket, Play, CheckCircle, XCircle, Clock, ChevronRight, Terminal, FileCode, Layers, Zap } from 'lucide-react';
import api from '../utils/api';
import { useSocket } from '../hooks/useSocket';
import { useUIStore } from '../store';

const STEPS = [
  { id: 'plan',   label: 'Terraform Plan',  icon: FileCode },
  { id: 'review', label: 'Review Changes',  icon: CheckCircle },
  { id: 'apply',  label: 'Apply',           icon: Rocket },
  { id: 'done',   label: 'Complete',        icon: Zap },
];

export default function DeployPage() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(0);
  const [variables, setVariables] = useState({});
  const [planId, setPlanId] = useState(null);
  const [applyId, setApplyId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [planResult, setPlanResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [running, setRunning] = useState(false);
  const logsRef = useRef(null);
  const { subscribe } = useSocket();
  const { addNotification } = useUIStore();

  useEffect(() => {
    api.get('/terraform/templates').then(({ data }) => setTemplates(data.templates || []));
  }, []);

  useEffect(() => {
    const unsub1 = subscribe('terraform:log', ({ log }) => {
      setLogs(l => [...l, log]);
    });
    const unsub2 = subscribe('terraform:plan:complete', ({ plan }) => {
      setPlanResult(plan);
      setRunning(false);
      setStep(1);
    });
    const unsub3 = subscribe('terraform:apply:complete', ({ resources }) => {
      setApplyResult(resources);
      setRunning(false);
      setStep(3);
      addNotification({ type: 'success', title: 'Deployment Complete!', message: `${resources.length} resource(s) created` });
    });
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, [subscribe]);

  useEffect(() => {
    logsRef.current?.scrollTo(0, logsRef.current.scrollHeight);
  }, [logs]);

  const handlePlan = async () => {
    if (!selected) return;
    setLogs([]);
    setRunning(true);
    try {
      const { data } = await api.post('/terraform/plan', { templateId: selected.id, variables });
      setPlanId(data.executionId);
    } catch (err) {
      setRunning(false);
      addNotification({ type: 'error', title: 'Plan Failed', message: err.response?.data?.error || 'Failed to run plan' });
    }
  };

  const handleApply = async () => {
    if (!planId) return;
    setLogs([]);
    setRunning(true);
    try {
      const { data } = await api.post('/terraform/apply', { executionId: planId });
      setApplyId(data.executionId);
    } catch (err) {
      setRunning(false);
      addNotification({ type: 'error', title: 'Apply Failed', message: err.response?.data?.error || 'Failed to apply' });
    }
  };

  const reset = () => { setSelected(null); setStep(0); setLogs([]); setPlanId(null); setApplyId(null); setPlanResult(null); setApplyResult(null); setVariables({}); };

  const CATEGORY_COLORS = { Compute: 'var(--neon-purple)', Storage: 'var(--brand-accent)', Containers: 'var(--brand-primary)', Database: 'var(--brand-warning)', Serverless: 'var(--neon-teal)', Analytics: 'var(--brand-warning)', DevOps: 'var(--text-secondary)', Observability: 'var(--brand-primary)', Messaging: 'var(--neon-purple)', Networking: 'var(--brand-primary)' };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--text-primary)' }}>Deploy Infrastructure</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Select a template and deploy with Terraform — one click</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i < step ? 'var(--brand-success)' : i === step ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                border: `2px solid ${i < step ? 'var(--brand-success)' : i === step ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                {i < step ? <CheckCircle size={14} color="#fff" /> : <s.icon size={14} color={i === step ? '#fff' : 'var(--text-muted)'} />}
              </div>
              <span style={{ fontSize: 12, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === step ? 700 : 400 }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < step ? 'var(--brand-success)' : 'var(--border-dim)', margin: '0 12px', maxWidth: 80 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 20 }}>
        {/* Template grid */}
        <div>
          {step === 0 && (
            <>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selected ? `Template: ${selected.name}` : 'Choose a Template'}
                </h2>
                {selected && <button onClick={reset} className="btn btn-ghost" style={{ fontSize: 11 }}>← Back</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {templates.map(t => (
                  <div key={t.id} onClick={() => setSelected(t)} className="card interactive" style={{
                    borderColor: selected?.id === t.id ? 'var(--border-active)' : undefined,
                    boxShadow: selected?.id === t.id ? 'var(--shadow-glow-blue)' : undefined
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{t.icon}</span>
                      <span className="provider-badge" style={{ [t.provider]: true } ? { background: `rgba(${t.provider === 'aws' ? '255,153,0' : t.provider === 'azure' ? '0,120,212' : '66,133,244'},0.12)`, color: t.provider === 'aws' ? 'var(--aws)' : t.provider === 'azure' ? 'var(--azure)' : 'var(--gcp)', border: '1px solid currentColor', opacity: 0.8 } : {}}>{t.provider.toUpperCase()}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{t.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: CATEGORY_COLORS[t.category] || 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: `${CATEGORY_COLORS[t.category] || 'var(--text-muted)'}18`, padding: '2px 6px', borderRadius: 4 }}>{t.category}</span>
                      <span style={{ fontSize: 11, color: 'var(--brand-accent)', fontFamily: 'var(--font-mono)' }}>{t.estimatedCost}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Plan/Apply review */}
          {step >= 1 && planResult && (
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>Plan Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'To Add', value: planResult.toAdd, color: 'var(--brand-success)' },
                  { label: 'To Change', value: planResult.toChange, color: 'var(--brand-warning)' },
                  { label: 'To Destroy', value: planResult.toDestroy, color: 'var(--brand-danger)' }
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-deep)', padding: '16px', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {step === 1 && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={reset} className="btn btn-secondary">Cancel</button>
                  <button onClick={handleApply} className="btn btn-primary" disabled={running}>
                    <Rocket size={14} /> {running ? 'Applying...' : 'Apply Changes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success */}
          {step === 3 && applyResult && (
            <div className="card" style={{ borderColor: 'var(--brand-success)', textAlign: 'center', padding: 36 }}>
              <CheckCircle size={48} color="var(--brand-success)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--brand-success)', marginBottom: 8 }}>Deployment Successful!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>{applyResult.length} resource(s) created and configured</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {applyResult.map((r, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-deep)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}>
                    <CheckCircle size={14} color="var(--brand-success)" />
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{r.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.id}</span>
                  </div>
                ))}
              </div>
              <button onClick={reset} className="btn btn-secondary">Deploy Another</button>
            </div>
          )}
        </div>

        {/* Config + Terminal panel */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Variables */}
            {step === 0 && selected.variables?.length > 0 && (
              <div className="card">
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Configuration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selected.variables.map(v => (
                    <div key={v}>
                      <label className="label">{v.replace(/_/g, ' ')}</label>
                      <input className="input" placeholder={`Enter ${v}...`} value={variables[v] || ''} onChange={e => setVariables(vv => ({ ...vv, [v]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <button onClick={handlePlan} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }} disabled={running}>
                  <Play size={14} /> {running ? 'Planning...' : 'Run Terraform Plan'}
                </button>
              </div>
            )}

            {step === 0 && (!selected.variables || selected.variables.length === 0) && (
              <div className="card">
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>No variables required for this template.</p>
                <button onClick={handlePlan} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={running}>
                  <Play size={14} /> {running ? 'Planning...' : 'Run Terraform Plan'}
                </button>
              </div>
            )}

            {/* Terminal */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Terminal size={14} color="var(--brand-accent)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Terraform Output</span>
                {running && <span className="animate-pulse-glow" style={{ fontSize: 10, color: 'var(--brand-accent)', fontFamily: 'var(--font-mono)' }}>● RUNNING</span>}
              </div>
              <div ref={logsRef} className="terminal" style={{ minHeight: 200, maxHeight: 320, overflowY: 'auto' }}>
                {logs.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>$ waiting for terraform output...<span className="terminal-cursor" /></span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 2, lineHeight: 1.6, color: log.includes('Error') || log.includes('error') ? 'var(--brand-danger)' : log.includes('complete') || log.includes('Apply complete') ? 'var(--brand-success)' : log.includes('Creating') || log.includes('Still') ? 'var(--brand-warning)' : '#a8f0c8' }}>
                      {log || ' '}
                    </div>
                  ))
                )}
                {running && <span className="terminal-cursor" />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
