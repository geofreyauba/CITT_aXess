import React, { useState } from 'react';
import { Icons } from '../components/icons';

/**
 * Demo-friendly Login page.
 * - Demo mode (default): no backend required — stores auth token in localStorage
 * - Use API (toggle) to call real backend when available
 */

const Login: React.FC = () => {
  const [email, setEmail] = useState('demo@axess.local');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useApi, setUseApi] = useState(false); // default: demo mode

  const doLocalLogin = (emailVal: string) => {
    // Simple demo token + currentUser stored in localStorage
    const token = `demo-token-${Date.now()}`;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify({ name: emailVal.split('@')[0], email: emailVal, id: 'REG-DEMO-001' }));
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }

    if (!useApi) {
      // demo/local login
      doLocalLogin(email.trim());
      return;
    }

    // try real API
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || `Login failed (${res.status})`);
        setLoading(false);
        return;
      }

      const body = await res.json().catch(() => ({}));
      const token = body.token ?? body.accessToken ?? `server-token-${Date.now()}`;
      try { localStorage.setItem('authToken', token); } catch {}
      try { localStorage.setItem('currentUser', JSON.stringify(body.user ?? { name: email.split('@')[0], email })); } catch {}
      window.location.href = '/dashboard';
    } catch (err) {
      console.error(err);
      setError('Network error — could not reach API. You can use demo mode instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">aXess — Sign in</h1>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={useApi} onChange={e => setUseApi(e.target.checked)} />
              Use API (uncheck to use local/demo)
            </label>

            <div style={{ marginLeft: 'auto', color: 'var(--muted-text)', fontSize: 13 }}>
              Demo credentials: demo@axess.local / password
            </div>
          </div>

          <label className="form-label">
            Email address
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@institution.edu"
              className="auth-input"
              autoComplete="email"
            />
          </label>

          <label className="form-label">
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="auth-input"
              autoComplete="current-password"
            />
          </label>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? 'Signing in...' : (<><Icons.Key size={14} /> Sign in</>)}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() => (window.location.href = '/register')}
            >
              Create account
            </button>
          </div>
        </form>

        <p className="auth-note" style={{ marginTop: 12 }}>
          Don't have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
};

export default Login;