// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../lib/api'; // Make sure this file exists and is correctly exported

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ─── Debug: confirm the form is actually submitting ───
    console.log('LOGIN FORM SUBMITTED', { email: email.trim(), passwordLength: password.length });

    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.login(email.trim(), password);

      console.log('LOGIN SUCCESS - received:', {
        hasToken: !!response.token,
        user: response.user?.email,
        fullResponse: response
      });

      // Store authentication data
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('currentUser', JSON.stringify(response.user));

      // Optional: force a small delay so you can see the logs before redirect
      // setTimeout(() => navigate('/dashboard'), 800);

      navigate('/dashboard');
    } catch (err: any) {
      console.error('LOGIN FAILED:', err);

      const errorMessage = 
        err.response?.data?.msg ||
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials or try again later.';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          padding: '40px 30px',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 700,
            color: '#1e3a8a',
            marginBottom: '24px',
          }}
        >
          aXess – Sign in
        </h1>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '12px',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#374151',
                fontSize: '14px',
              }}
            >
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
                color: '#374151',
                fontSize: '14px',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
              }}
            />
          </div>

          <div
            style={{
              textAlign: 'right',
              margin: '8px 0 16px 0',
            }}
          >
            <a
              href="/reset-password"
              style={{
                color: '#6366f1',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? '#a5b4fc'
                : 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white',
              border: 'none',
              padding: '14px 24px',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              fontSize: '16px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{
                background: 'transparent',
                border: '1px solid #6366f1',
                color: '#6366f1',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;