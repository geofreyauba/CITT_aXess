// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import { Eye, EyeOff, Check, X, Shield, ShieldCheck } from 'lucide-react';
import TwoFactorSetup from '../components/TwoFactorSetup';

// ── helpers ────────────────────────────────────────────────────────────────
const getToken = (): string | null => {
  try { return localStorage.getItem('authToken'); } catch { return null; }
};

const checkReqs = (pw: string) => ({
  minLength:  pw.length >= 8,
  hasUpper:  /[A-Z]/.test(pw),
  hasLower:  /[a-z]/.test(pw),
  hasNumber: /[0-9]/.test(pw),
  hasSpecial:/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
});

// ── Settings component ─────────────────────────────────────────────────────
const Settings: React.FC = () => {

  // ── theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (newTheme === 'system') {
      root.classList.toggle('dark', prefers);
      root.setAttribute('data-theme', prefers ? 'dark' : 'light');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
      root.setAttribute('data-theme', newTheme);
    }
    try { localStorage.setItem('theme', newTheme); } catch {}
  };

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null) ?? 'system';
    setTheme(saved);
    applyTheme(saved);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
      if ((localStorage.getItem('theme') ?? 'system') === 'system') applyTheme('system');
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else (mq as any).addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
      else (mq as any).removeListener(onChange);
    };
  }, []);

  const handleThemeChange = (t: 'light' | 'dark' | 'system') => { setTheme(t); applyTheme(t); };
  const getNextTheme = (c: 'light' | 'dark' | 'system') =>
    c === 'system' ? 'dark' : c === 'dark' ? 'light' : 'system';
  const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
  const ThemeIcon = theme === 'system' ? Icons.Monitor : resolvedTheme === 'dark' ? Icons.Moon : Icons.Sun;
  const themeLabel = theme === 'system' ? 'System' : theme === 'dark' ? 'Dark Mode' : 'Light Mode';

  // ── profile ───────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        setProfile({
          fullName: u.fullName || '',
          email:    u.email    || '',
          phone:    u.phone    || '',
        });
      }
    } catch {}
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!profile.fullName.trim()) {
      setProfileMsg({ type: 'err', text: 'Full name is required.' });
      return;
    }
    setProfileLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName.trim(),
          phone:    profile.phone.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || 'Failed to save profile');

      // sync localStorage so Header / other components see updated name
      try {
        const stored = localStorage.getItem('currentUser');
        const u = stored ? JSON.parse(stored) : {};
        localStorage.setItem('currentUser', JSON.stringify({
          ...u,
          fullName: profile.fullName.trim(),
          phone:    profile.phone.trim(),
        }));
      } catch {}

      setProfileMsg({ type: 'ok', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.message || 'Failed to save profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // ── password change (inline – no navigation) ──────────────────────────────
  const [showPwForm, setShowPwForm]           = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [pwLoading, setPwLoading]             = useState(false);
  const [pwMsg, setPwMsg]                     = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showPwReqs, setShowPwReqs]           = useState(false);
  const [pwReqs, setPwReqs]                   = useState(checkReqs(''));

  useEffect(() => {
    setShowPwReqs(newPassword.length > 0);
    setPwReqs(checkReqs(newPassword));
  }, [newPassword]);

  const isPwStrong    = Object.values(pwReqs).every(Boolean);
  const passwordMatch = newPassword === confirmPassword && newPassword.length > 0;

  const resetPwForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwMsg(null);
    setShowPwForm(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!currentPassword.trim()) { setPwMsg({ type: 'err', text: 'Enter your current password.' }); return; }
    if (!isPwStrong)             { setPwMsg({ type: 'err', text: 'New password does not meet requirements.' }); return; }
    if (!passwordMatch)          { setPwMsg({ type: 'err', text: 'Passwords do not match.' }); return; }

    setPwLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword:     newPassword.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.msg || data.message || 'Failed to change password');

      // Show success, clear form, collapse – user stays on Settings page
      setPwMsg({ type: 'ok', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwForm(false);
    } catch (err: any) {
      setPwMsg({ type: 'err', text: err.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  // ── notifications (local state only – extend with API if needed) ──────────
  const [notif, setNotif] = useState({
    emailNew:    true,
    pushReturns: true,
    dailySummary: false,
  });

  // ── 2FA ───────────────────────────────────────────────────────────────────
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal]         = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      setTwoFactorEnabled(!!u.twoFactorEnabled);
    } catch {}
  }, []);

  // ── requirement rows ──────────────────────────────────────────────────────
  const reqRows = [
    { label: 'At least 8 characters',          met: pwReqs.minLength  },
    { label: 'One uppercase letter (A–Z)',      met: pwReqs.hasUpper   },
    { label: 'One lowercase letter (a–z)',      met: pwReqs.hasLower   },
    { label: 'One number (0–9)',                met: pwReqs.hasNumber  },
    { label: 'One special character (!@#$…)',   met: pwReqs.hasSpecial },
  ];

  return (
    <>
      <h1 className="section-title">Settings</h1>

      <div className="settings-grid">

        {/* ── Profile card ────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Users size={20} />
            <h2>Profile</h2>
          </div>

          {profileMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
              background: profileMsg.type === 'ok' ? '#d1fae5' : '#fee2e2',
              color:      profileMsg.type === 'ok' ? '#065f46' : '#b91c1c',
            }}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ opacity: 0.55, cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '4px', display: 'block' }}>
                Email cannot be changed here.
              </span>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+255 700 123 456"
              />
            </div>
            <button
              type="submit"
              className="primary-btn"
              disabled={profileLoading}
              style={{ width: '100%', opacity: profileLoading ? 0.7 : 1 }}
            >
              {profileLoading ? 'Saving…' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* ── Notifications card ───────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Bell size={20} />
            <h2>Notifications</h2>
          </div>
          <label className="toggle-row">
            <input type="checkbox" className="toggle-checkbox"
              checked={notif.emailNew}
              onChange={e => setNotif(n => ({ ...n, emailNew: e.target.checked }))} />
            <span>Email notifications for new requests</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" className="toggle-checkbox"
              checked={notif.pushReturns}
              onChange={e => setNotif(n => ({ ...n, pushReturns: e.target.checked }))} />
            <span>Push alerts for key returns / sign-outs</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" className="toggle-checkbox"
              checked={notif.dailySummary}
              onChange={e => setNotif(n => ({ ...n, dailySummary: e.target.checked }))} />
            <span>Daily summary email report</span>
          </label>
        </div>

        {/* ── Appearance card ──────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Paintbrush size={20} />
            <h2>Appearance</h2>
          </div>
          <button
            className="primary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            onClick={() => handleThemeChange(getNextTheme(theme))}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <ThemeIcon size={18} />
            </span>
            <span>{themeLabel}</span>
          </button>
        </div>

        {/* ── Security card ────────────────────────────────────────────────── */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Lock size={20} />
            <h2>Security</h2>
          </div>

          {/* Success message shown after form collapses */}
          {pwMsg && !showPwForm && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
              background: pwMsg.type === 'ok' ? '#d1fae5' : '#fee2e2',
              color:      pwMsg.type === 'ok' ? '#065f46' : '#b91c1c',
            }}>
              {pwMsg.text}
            </div>
          )}

          {!showPwForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="secondary-btn"
                style={{ width: '100%', textAlign: 'left', margin: 0 }}
                onClick={() => { setShowPwForm(true); setPwMsg(null); }}
              >
                Change Password
              </button>

              {/* 2FA button — shows status and opens modal */}
              <button
                className={twoFactorEnabled ? 'primary-btn' : 'secondary-btn'}
                style={{ width: '100%', textAlign: 'left', margin: 0,
                  display: 'flex', alignItems: 'center', gap: '10px' }}
                onClick={() => !twoFactorEnabled && setShow2FAModal(true)}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {twoFactorEnabled
                    ? <ShieldCheck size={16} />
                    : <Shield size={16} />}
                </span>
                <span style={{ flex: 1 }}>
                  {twoFactorEnabled
                    ? 'Two-Factor Authentication — Enabled ✓'
                    : 'Enable Two-Factor Authentication'}
                </span>
              </button>

              {twoFactorEnabled && (
                <p style={{ fontSize: '12px', color: '#10b981', marginTop: '2px', marginLeft: '4px' }}>
                  Your account is protected with 2FA.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handlePasswordChange}>

              {/* Inline error inside the open form */}
              {pwMsg && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px',
                  background: pwMsg.type === 'ok' ? '#d1fae5' : '#fee2e2',
                  color:      pwMsg.type === 'ok' ? '#065f46' : '#b91c1c',
                }}>
                  {pwMsg.text}
                </div>
              )}

              {/* Current password */}
              <div className="form-group">
                <label>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{ paddingRight: '44px' }}
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} style={eyeStyle}>
                    {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="form-group">
                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{ paddingRight: '44px' }}
                    required
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} style={eyeStyle}>
                    {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {showPwReqs && (
                  <div style={{ marginTop: '10px' }}>
                    {reqRows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                        {r.met ? <Check size={14} color="#10b981" /> : <X size={14} color="#ef4444" />}
                        <span style={{ fontSize: '13px', color: r.met ? '#10b981' : 'var(--muted-text)' }}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{ paddingRight: '44px' }}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeStyle}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                    {passwordMatch
                      ? <><Check size={13} color="#10b981" /><span style={{ fontSize: '13px', color: '#10b981' }}>Passwords match</span></>
                      : <><X     size={13} color="#ef4444" /><span style={{ fontSize: '13px', color: '#ef4444' }}>Passwords do not match</span></>
                    }
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={pwLoading || !isPwStrong || !passwordMatch || !currentPassword.trim()}
                  style={{
                    flex: 1,
                    opacity: (pwLoading || !isPwStrong || !passwordMatch || !currentPassword.trim()) ? 0.55 : 1,
                  }}
                >
                  {pwLoading ? 'Saving…' : 'Save Password'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ margin: 0 }}
                  onClick={resetPwForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <p className="security-note">
            Last login:{' '}
            {new Date().toLocaleDateString('en-GB', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}{' '}
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} EAT
          </p>
        </div>

      </div>

      {/* 2FA Setup Modal */}
      {show2FAModal && (
        <TwoFactorSetup
          onClose={() => setShow2FAModal(false)}
          onSuccess={() => setTwoFactorEnabled(true)}
        />
      )}
    </>
  );
};

// Shared style for eye-toggle buttons
const eyeStyle: React.CSSProperties = {
  position: 'absolute', right: '12px', top: '50%',
  transform: 'translateY(-50%)', background: 'none',
  border: 'none', cursor: 'pointer', padding: '4px',
  color: 'var(--muted-text)',
};

export default Settings;