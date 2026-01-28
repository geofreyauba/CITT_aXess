// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme('system');
      applyTheme('system');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }

    localStorage.setItem('theme', newTheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

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
          <button className="primary-btn">Save Profile Changes</button>
        </div>

        {/* Notifications */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Bell size={20} />
            <h2>Notifications</h2>
          </div>
          <label className="toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Email notifications for new requests</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" defaultChecked />
            <span>Push alerts for key returns / sign-outs</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" />
            <span>Daily summary email report</span>
          </label>
        </div>

        {/* Appearance – fully working toggle */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Settings size={20} />
            <h2>Appearance</h2>
          </div>
          <div className="radio-group">
            <label className="radio-row">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => handleThemeChange('light')}
              />
              <span>Light Mode</span>
            </label>

            <label className="radio-row">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
              />
              <span>Dark Mode</span>
            </label>

            <label className="radio-row">
              <input
                type="radio"
                name="theme"
                value="system"
                checked={theme === 'system'}
                onChange={() => handleThemeChange('system')}
              />
              <span>System Default</span>
            </label>
          </div>
        </div>

        {/* Security */}
        <div className="settings-card">
          <div className="card-header">
            <Icons.Lock size={20} />
            <h2>Security</h2>
          </div>
          <button className="secondary-btn">Change Password</button>
          <button className="secondary-btn">Enable Two-Factor Authentication</button>
          <p className="security-note">
            Last login: January 28, 2026 10:45 AM EAT
          </p>
        </div>
      </div>
    </>
  );
};

export default Settings;