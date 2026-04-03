import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, ArrowRight, Cloud } from 'lucide-react';
import { useAuthStore, useUIStore } from '../store';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login, register, isLoading } = useAuthStore();
  const { addNotification } = useUIStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register(form.name, form.email, form.password);

    if (result.success) {
      addNotification({ type: 'success', title: 'Welcome back!', message: 'Signed in successfully' });
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const fillDemo = () => setForm({ name: '', email: 'demo@cloudrizzle.ai', password: 'Demo@12345' });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-void)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden'
    }} className="grid-bg">
      {/* Background glow blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(79,142,255,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '8%',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <div className="animate-slide-up" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, var(--brand-primary), var(--neon-teal))',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 40px rgba(79,142,255,0.4)'
          }}>
            <Zap size={24} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28,
            color: 'var(--text-primary)', letterSpacing: '-1px', marginBottom: 6
          }}>CloudRizzle AI</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            Robust infrastructure in one prompt
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--bg-deep)',
            borderRadius: 8, padding: 4, marginBottom: 24
          }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px 0',
                background: mode === m ? 'var(--brand-primary)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 6,
                fontFamily: 'var(--font-ui)', fontWeight: 700,
                fontSize: 12, letterSpacing: 0.5,
                cursor: 'pointer', transition: 'all 0.15s ease',
                textTransform: 'uppercase'
              }}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 40 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                  }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8,
                fontSize: 12, color: 'var(--brand-danger)',
                fontFamily: 'var(--font-mono)'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={isLoading}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="animate-pulse-glow">●</span> Processing...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={14} />
                </span>
              )}
            </button>
          </form>

          <div className="divider" />

          {/* Demo login */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              Try the demo
            </p>
            <button
              onClick={fillDemo}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Cloud size={14} />
              Use Demo Account
            </button>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
              demo@cloudrizzle.ai / Demo@12345
            </p>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {['AWS · Azure · GCP', 'AI-powered', 'Terraform IaC', 'Live Monitoring'].map(f => (
            <span key={f} className="tag">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
