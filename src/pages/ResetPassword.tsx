// src/pages/ResetPassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showRequirements, setShowRequirements] = useState(false);   // ← NEW

  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    setShowRequirements(newPassword.length > 0);   // ← Only show when typing

    const check = {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    };
    setRequirements(check);
  }, [newPassword]);

  const isPasswordStrong = Object.values(requirements).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isPasswordStrong) {
      setError('Password is not strong enough. Please meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), newPassword }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.msg || 'Failed to reset password');

      setMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <h1 className="auth-title">Reset Password</h1>

        {message && <div className="form-success">{message}</div>}
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute' as const,
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Requirements appear only when typing starts */}
          {showRequirements && (
            <div style={{ margin: '20px 0' }}>
              <p style={{ fontWeight: 600, marginBottom: '10px' }}>Password must contain:</p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {[
                  { label: 'At least 8 characters', met: requirements.minLength },
                  { label: 'One uppercase letter (A-Z)', met: requirements.hasUpper },
                  { label: 'One lowercase letter (a-z)', met: requirements.hasLower },
                  { label: 'One number (0-9)', met: requirements.hasNumber },
                  { label: 'One special character (!@#$%^&*)', met: requirements.hasSpecial },
                ].map((req, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {req.met ? (
                      <Check size={18} color="#10b981" />
                    ) : (
                      <X size={18} color="#ef4444" />
                    )}
                    <span style={{ color: req.met ? '#10b981' : '#6b7280', fontSize: '14px' }}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label>Confirm New Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{
                position: 'absolute' as const,
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
              }}
            >
              {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordStrong || !passwordsMatch}
            className="save-btn"
            style={{
              opacity: loading || !isPasswordStrong || !passwordsMatch ? 0.6 : 1,
              cursor: loading || !isPasswordStrong || !passwordsMatch ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <a href="/login" style={{ color: '#6366f1' }}>← Back to Sign in</a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;