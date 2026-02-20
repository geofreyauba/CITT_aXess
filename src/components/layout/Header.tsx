// src/components/layout/Header.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../icons';

// ─── Role display map ────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin:     'Admin',
  innovator: 'Innovator',
  user:      'User',
  member:    'Member',
  guard:     'Guard',
  leader:    'Leader',
};

const formatRole = (raw: string): string => {
  if (!raw) return 'User';
  return (
    ROLE_LABELS[raw.toLowerCase()] ??
    raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  );
};

// Role badge gradient colours
const ROLE_COLOURS: Record<string, string> = {
  Admin:     'linear-gradient(135deg,#6366f1,#4f46e5)',
  Innovator: 'linear-gradient(135deg,#10b981,#059669)',
  User:      'linear-gradient(135deg,#64748b,#475569)',
  Member:    'linear-gradient(135deg,#f59e0b,#d97706)',
  Guard:     'linear-gradient(135deg,#ef4444,#dc2626)',
  Leader:    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
};

// Avatar border colours (matches badge gradient start)
const ROLE_BORDER: Record<string, string> = {
  Admin:     '#6366f1',
  Innovator: '#10b981',
  User:      '#64748b',
  Member:    '#f59e0b',
  Guard:     '#ef4444',
  Leader:    '#8b5cf6',
};

const PROFILE_PIC_KEY = 'userProfilePic';

interface HeaderProps {
  role?: string; // accepted for API compatibility — but IGNORED in favour of localStorage
}

// ─────────────────────────────────────────────────────────────────────────────
// Header reads the logged-in user's role DIRECTLY from localStorage.
// It deliberately ignores the `role` prop because the parent component can
// pass a stale / default value (e.g. "user") before localStorage is read,
// which would show the wrong badge. Reading localStorage in the component
// itself guarantees the correct role every time.
// ─────────────────────────────────────────────────────────────────────────────
const Header: React.FC<HeaderProps> = () => {

  // ── Live clock ──────────────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  // ── User state ──────────────────────────────────────────────────────────
  const [firstName,       setFirstName]       = useState('');
  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [membership,      setMembership]      = useState('');
  const [userRole,        setUserRole]        = useState('');   // empty = not yet loaded
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [adminName,       setAdminName]       = useState('');

  // ── Profile picture state ───────────────────────────────────────────────
  const [profilePic,   setProfilePic]   = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [uploading,    setUploading]    = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  // ── Read everything from localStorage ──────────────────────────────────
  useEffect(() => {
    const readUser = () => {
      try {
        const stored        = localStorage.getItem('currentUser');
        const impersonating = localStorage.getItem('impersonating') === 'true';
        const savedPic      = localStorage.getItem(PROFILE_PIC_KEY) || '';

        setProfilePic(savedPic);

        if (stored) {
          const u = JSON.parse(stored);
          const first = (u.fullName || '').trim().split(' ')[0] || 'User';
          setFirstName(first);
          setFullName(u.fullName || '');
          setEmail(u.email || '');
          setMembership(u.membership || '');
          setIsImpersonating(impersonating);

          // ── THE FIX: read role from the user object, NEVER from the prop ──
          // The prop can be 'user' by default even for admins/innovators.
          // u.role is set at login time and is always correct.
          setUserRole(formatRole(u.role || 'user'));

          if (impersonating && u.impersonatedBy) setAdminName(u.impersonatedBy);
        }
      } catch {}
    };

    readUser();
    window.addEventListener('storage', readUser);
    return () => window.removeEventListener('storage', readUser);
  }, []); // ← empty deps: runs once on mount, then on storage events only

  // ── Close dropdown on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Profile picture upload ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)    { alert('Image must be smaller than 5 MB.'); return; }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setProfilePic(dataUrl);
      localStorage.setItem(PROFILE_PIC_KEY, dataUrl);
      setUploading(false);
      setDropdownOpen(false);
    };
    reader.onerror = () => { alert('Failed to read image.'); setUploading(false); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePic = () => {
    if (!confirm('Remove profile picture?')) return;
    setProfilePic('');
    localStorage.removeItem(PROFILE_PIC_KEY);
    setDropdownOpen(false);
  };

  const handleExitUserMode = () => {
    if (confirm('Exit user mode and return to admin account?')) {
      localStorage.removeItem('impersonating');
      localStorage.removeItem('originalAdmin');
      alert('Logging out... Please log in again as admin.');
      window.location.href = '/login';
    }
  };

  // ── Derived display values ──────────────────────────────────────────────
  const initials   = fullName
    ? fullName.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : firstName.charAt(0).toUpperCase();

  const roleBg     = ROLE_COLOURS[userRole] || ROLE_COLOURS.User;
  const roleBorder = ROLE_BORDER[userRole]  || ROLE_BORDER.User;
  const membershipLabel =
    membership && membership !== 'None' && membership !== 'No Membership'
      ? membership
      : 'No Club Membership';

  // Don't flash anything until role is resolved
  if (!userRole) return null;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <header className="header" style={{ position: 'relative', zIndex: 100 }}>

        {/* ── LEFT: role badge ──────────────────────────────────────────── */}
        <div className="header-left">
          <div
            className="role-badge"
            title={`Role: ${userRole}`}
            style={{
              background: roleBg,
              color: '#fff',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              letterSpacing: '0.02em',
            }}
          >
            <span aria-hidden style={{ display: 'flex', alignItems: 'center' }}>
              <Icons.Users size={15} />
            </span>
            {/* This now shows "Admin", "Innovator", "User", etc. — never a stale default */}
            <span>{userRole}</span>
          </div>
        </div>

        {/* ── CENTRE: clock + date ─────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '6px 16px', borderRadius: '12px',
          background: 'var(--white-glass)', border: '1px solid var(--glass-border)',
          boxShadow: 'var(--shadow-soft)', fontVariantNumeric: 'tabular-nums',
        }}>
          <Icons.Clock size={16} style={{ color: 'var(--soft-blue)', flexShrink: 0 }} />
          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--soft-blue-dark)', letterSpacing: '0.04em', minWidth: '72px' }}>
            {timeStr}
          </span>
          <span style={{ width: '1px', height: '20px', background: 'var(--glass-border)', display: 'block' }} />
          <Icons.Calendar size={16} style={{ color: 'var(--soft-blue)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted-text)', whiteSpace: 'nowrap' }}>
            {dateStr}
          </span>
        </div>

        {/* ── RIGHT: welcome text + avatar ─────────────────────────────── */}
        <div
          ref={dropdownRef}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}
        >
          {/* Welcome text */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Welcome, <span style={{ color: 'var(--soft-blue-dark)' }}>{firstName}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '1px' }}>
              {membershipLabel}
            </div>
          </div>

          {/* ── Avatar button ──────────────────────────────────────────── */}
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            title="Profile options"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `3px solid ${roleBorder}`,
              overflow: 'hidden', cursor: 'pointer', padding: 0, flexShrink: 0,
              background: profilePic ? 'transparent' : roleBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 2px 10px ${roleBorder}55`,
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 18px ${roleBorder}88`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 10px ${roleBorder}55`;
            }}
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '16px', userSelect: 'none', lineHeight: 1 }}>
                {initials}
              </span>
            )}
          </button>

          {/* ── Dropdown ───────────────────────────────────────────────── */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '54px', right: 0,
              width: '288px',
              background: '#fff',
              borderRadius: '18px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              border: '1px solid #e2e8f0',
              zIndex: 9999,
              overflow: 'hidden',
              animation: 'fadeSlideIn 0.18s ease',
            }}>

              {/* Coloured header */}
              <div style={{
                background: roleBg,
                padding: '22px 16px 18px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
              }}>
                {/* Large avatar — click to view full size */}
                <div
                  onClick={() => profilePic && setLightboxOpen(true)}
                  title={profilePic ? 'Click to view full size' : ''}
                  style={{
                    width: 82, height: 82, borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.85)',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: profilePic ? 'zoom-in' : 'default',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '30px', userSelect: 'none' }}>
                      {initials}
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.3 }}>
                    {fullName || firstName}
                  </div>
                  {email && (
                    <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '3px' }}>
                      {email}
                    </div>
                  )}
                  <div style={{
                    marginTop: '8px', display: 'inline-block',
                    background: 'rgba(255,255,255,0.25)',
                    color: '#fff', fontSize: '11px', fontWeight: 700,
                    padding: '3px 12px', borderRadius: '12px', letterSpacing: '0.04em',
                  }}>
                    {userRole}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ padding: '8px' }}>
                {/* Upload / Change */}
                <button
                  onClick={() => { setDropdownOpen(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                  disabled={uploading}
                  style={actionBtnStyle}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ ...iconWrapStyle, background: '#e0f2fe' }}>
                    <Icons.Edit size={15} color="#0284c7" />
                  </span>
                  {uploading ? 'Uploading…' : profilePic ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </button>

                {/* View full size */}
                {profilePic && (
                  <button
                    onClick={() => { setDropdownOpen(false); setLightboxOpen(true); }}
                    style={actionBtnStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ ...iconWrapStyle, background: '#f0fdf4' }}>
                      <Icons.CheckCircle size={15} color="#16a34a" />
                    </span>
                    View Full Photo
                  </button>
                )}

                {/* Remove */}
                {profilePic && (
                  <button
                    onClick={handleRemovePic}
                    style={{ ...actionBtnStyle, color: '#dc2626' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ ...iconWrapStyle, background: '#fee2e2' }}>
                      <Icons.Trash size={15} color="#dc2626" />
                    </span>
                    Remove Photo
                  </button>
                )}
              </div>

              {/* Footer */}
              <div style={{
                borderTop: '1px solid #f1f5f9', padding: '10px 16px',
                fontSize: '12px', color: 'var(--muted-text)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Icons.Users size={13} /> {membershipLabel}
              </div>
            </div>
          )}
        </div>

        {/* ── Exit User Mode button ────────────────────────────────────── */}
        {isImpersonating && (
          <button
            onClick={handleExitUserMode}
            style={{
              padding: '8px 16px', borderRadius: '10px',
              background: '#ef4444', color: 'white', border: 'none',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            title={`Logged in as ${firstName}. Session by: ${adminName}`}
          >
            🔓 Exit User Mode
          </button>
        )}
      </header>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxOpen && profilePic && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.88)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out', animation: 'fadeIn 0.2s ease',
          }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 24,
              background: 'rgba(255,255,255,0.12)', border: 'none',
              color: '#fff', width: 40, height: 40, borderRadius: '50%',
              fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >✕</button>

          <img
            src={profilePic}
            alt="Profile full size"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '88vw', maxHeight: '88vh',
              borderRadius: '18px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              objectFit: 'contain', cursor: 'default',
            }}
          />

          <div style={{
            position: 'absolute', bottom: 24,
            color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center',
          }}>
            {fullName || firstName} · {userRole}
          </div>
        </div>
      )}

      {/* ── Keyframe animations ───────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
};

// ── Shared inline styles ─────────────────────────────────────────────────────
const actionBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  display: 'flex', alignItems: 'center', gap: '10px',
  background: 'none', border: 'none', borderRadius: '10px',
  cursor: 'pointer', fontSize: '14px', fontWeight: 500,
  color: '#1e293b', transition: 'background 0.15s', textAlign: 'left',
};

const iconWrapStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: '8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

export default Header;