// src/components/layout/Header.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../icons';
import { FaReact } from 'react-icons/fa';

interface HeaderProps {
  role?: string;
}

const Header: React.FC<HeaderProps> = ({ role = 'Admin' }) => {
  // ── live clock & date ───────────────────────────────────────────────────
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // ── read user from localStorage ─────────────────────────────────────────
  const [firstName, setFirstName] = useState('User');
  const [membership, setMembership] = useState('');

  useEffect(() => {
    const readUser = () => {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          const u = JSON.parse(stored);
          // Take only the first name
          const first = (u.fullName || '').trim().split(' ')[0] || 'User';
          setFirstName(first);
          setMembership(u.membership || '');
        }
      } catch {}
    };

    readUser();

    // Re-read if Settings page updates currentUser in localStorage
    window.addEventListener('storage', readUser);
    return () => window.removeEventListener('storage', readUser);
  }, []);

  return (
    <header className="header">
      {/* ── Left: role badge ──────────────────────────────────────────── */}
      <div className="header-left">
        <div className="role-badge" title={`Role: ${role}`}>
          <span className="role-icon" aria-hidden>
            <Icons.Users size={18} />
          </span>
          <span className="role-text">Your {role}</span>
        </div>
      </div>

      {/* ── Centre: live clock + date strip ──────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '6px 16px',
        borderRadius: '12px',
        background: 'var(--white-glass)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-soft)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {/* Clock icon */}
        <Icons.Clock size={16} style={{ color: 'var(--soft-blue)', flexShrink: 0 }} />

        {/* Time */}
        <span style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--soft-blue-dark)',
          letterSpacing: '0.04em',
          minWidth: '72px',
        }}>
          {timeStr}
        </span>

        {/* Divider */}
        <span style={{ width: '1px', height: '20px', background: 'var(--glass-border)', display: 'block' }} />

        {/* Calendar icon */}
        <Icons.Calendar size={16} style={{ color: 'var(--soft-blue)', flexShrink: 0 }} />

        {/* Date */}
        <span style={{
          fontSize: '0.9rem',
          fontWeight: 500,
          color: 'var(--muted-text)',
          whiteSpace: 'nowrap',
        }}>
          {dateStr}
        </span>
      </div>

      {/* ── Right: user panel ─────────────────────────────────────────── */}
      <div className="header-user" role="region" aria-label="User info">
        <div className="user-icon" aria-hidden>
          <FaReact />
        </div>

        <div className="user-text">
          {/* First name */}
          <div className="welcome">
            Welcome, <span className="user-name">{firstName}</span>
          </div>
          {/* Membership / club below the name */}
          <div className="user-id">
            {membership && membership !== 'None' && membership !== 'No Membership'
              ? membership
              : 'No Club Membership'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;