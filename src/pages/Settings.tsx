// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
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

    try {
      localStorage.setItem('theme', newTheme);
    } catch {
      // ignore private mode / storage errors
    }
  };

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('theme')) as
      | 'light'
      | 'dark'
      | 'system'
      | null;
    const initial = saved ?? 'system';
    setTheme(initial);
    applyTheme(initial);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
      const currentStored = localStorage.getItem('theme');
      if (currentStored === 'system' || !currentStored) {
        applyTheme('system');
      }
    };

    // Prefer addEventListener when available; otherwise call older addListener via a safe any-cast
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Single-button behavior: cycle through modes on each click
  const getNextTheme = (current: 'light' | 'dark' | 'system') => {
    // order: system -> dark -> light -> system
    if (current === 'system') return 'dark';
    if (current === 'dark') return 'light';
    return 'system';
  };

  // Resolve what the UI actually shows for preview (if system, base on prefersDark)
  const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;

  // Choose an icon reflecting the resolved visual mode (monitor when strictly showing "system")
  const ThemeIcon = theme === 'system' ? Icons.Monitor : resolvedTheme === 'dark' ? Icons.Moon : Icons.Sun;

  const label = theme === 'system' ? `System` : theme === 'dark' ? 'Dark Mode' : 'Light Mode';

  return (
    <>
      <h1 className="section-title">Settings</h1>

      <div className="settings-grid">
        {/* Profile */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Users size={20} />
            <h2>Profile</h2>
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" defaultValue="Admin User" placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" defaultValue="admin@axess.must.ac.tz" disabled />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" placeholder="+255 700 123 456" />
          </div>
          <button className="primary-btn mt-4">Save Profile Changes</button>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Bell size={20} />
            <h2>Notifications</h2>
          </div>
          <label className="toggle-row flex items-center gap-3 py-2">
            <input type="checkbox" defaultChecked className="toggle-checkbox" />
            <span>Email notifications for new requests</span>
          </label>
          <label className="toggle-row flex items-center gap-3 py-2">
            <input type="checkbox" defaultChecked className="toggle-checkbox" />
            <span>Push alerts for key returns / sign-outs</span>
          </label>
          <label className="toggle-row flex items-center gap-3 py-2">
            <input type="checkbox" className="toggle-checkbox" />
            <span>Daily summary email report</span>
          </label>
        </div>

        {/* Appearance - single button to switch theme */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Paintbrush size={20} />
            <h2>Appearance</h2>
          </div>

          <div className="space-y-3">
            <button
              className="primary-btn flex items-center gap-3"
              onClick={() => handleThemeChange(getNextTheme(theme))}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-current">
                <ThemeIcon size={18} />
              </span>
              <div className="text-left">
                <div className="font-medium">{label}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Lock size={20} />
            <h2>Security</h2>
          </div>
          <div className="space-y-3">
            <button className="secondary-btn w-full justify-start">Change Password</button>
            <button className="secondary-btn w-full justify-start">Enable Two-Factor Authentication</button>
          </div>
          <p className="security-note mt-4 text-sm">Last login: January 28, 2026 10:45 AM EAT</p>
        </div>
      </div>
    </>
  );
};

export default Settings;