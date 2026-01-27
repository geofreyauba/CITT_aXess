// src/pages/Settings.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';

interface SystemSettings {
  // General
  systemName: string;
  timezone: string;
  dateFormat: string;
  
  // Room Management
  defaultRoomCapacity: number;
  autoReleaseTime: number; // minutes
  allowConcurrentBookings: boolean;
  
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  reportAlerts: boolean;
  requestAlerts: boolean;
  
  // Security
  sessionTimeout: number; // minutes
  requirePasswordChange: boolean;
  passwordExpiryDays: number;
  twoFactorAuth: boolean;
  
  // Appearance
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  
  // Advanced
  maintenanceMode: boolean;
  debugMode: boolean;
  apiRateLimit: number;
}

const defaultSettings: SystemSettings = {
  systemName: 'RoomFlow Admin',
  timezone: 'Africa/Dar_es_Salaam',
  dateFormat: 'MM/DD/YYYY',
  defaultRoomCapacity: 20,
  autoReleaseTime: 15,
  allowConcurrentBookings: false,
  emailNotifications: true,
  pushNotifications: true,
  reportAlerts: true,
  requestAlerts: true,
  sessionTimeout: 30,
  requirePasswordChange: false,
  passwordExpiryDays: 90,
  twoFactorAuth: false,
  theme: 'light',
  compactMode: false,
  maintenanceMode: false,
  debugMode: false,
  apiRateLimit: 1000,
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'rooms' | 'notifications' | 'security' | 'appearance' | 'advanced'>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would send to an API
    console.log('Saving settings:', settings);
    setHasChanges(false);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings(defaultSettings);
      setHasChanges(true);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Icons.Settings },
    { id: 'rooms' as const, label: 'Room Management', icon: Icons.Key },
    { id: 'notifications' as const, label: 'Notifications', icon: Icons.Bell },
    { id: 'security' as const, label: 'Security', icon: Icons.Lock },
    { id: 'appearance' as const, label: 'Appearance', icon: Icons.Home },
    { id: 'advanced' as const, label: 'Advanced', icon: Icons.BarChart },
  ];

  return (
    <>
      <div className="settings-header">
        <h1 className="section-title">Settings</h1>
        <div className="settings-header-actions">
          {showSuccessMessage && (
            <div className="success-message">
              <Icons.Lock size={16} /> Settings saved successfully!
            </div>
          )}
          {hasChanges && (
            <>
              <button className="cancel-btn" onClick={handleReset}>
                Reset to Defaults
              </button>
              <button className="save-btn" onClick={handleSave}>
                <Icons.Lock size={16} /> Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="settings-container">
        {/* Tabs Navigation */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <h2 className="settings-section-title">General Settings</h2>
              <p className="settings-section-desc">Configure basic system preferences and regional settings.</p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.Settings size={16} />
                    System Name
                  </label>
                  <input
                    type="text"
                    className="setting-input"
                    value={settings.systemName}
                    onChange={e => updateSetting('systemName', e.target.value)}
                    placeholder="Enter system name"
                  />
                  <p className="setting-hint">This name appears in the header and notifications.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.BarChart size={16} />
                    Timezone
                  </label>
                  <select
                    className="setting-input"
                    value={settings.timezone}
                    onChange={e => updateSetting('timezone', e.target.value)}
                  >
                    <option value="Africa/Dar_es_Salaam">East Africa Time (EAT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">GMT</option>
                    <option value="Europe/Paris">Central European Time (CET)</option>
                    <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                    <option value="UTC">UTC</option>
                  </select>
                  <p className="setting-hint">All timestamps will use this timezone.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.FileText size={16} />
                    Date Format
                  </label>
                  <select
                    className="setting-input"
                    value={settings.dateFormat}
                    onChange={e => updateSetting('dateFormat', e.target.value)}
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                  <p className="setting-hint">Choose how dates are displayed throughout the system.</p>
                </div>
              </div>
            </div>
          )}

          {/* Room Management Settings */}
          {activeTab === 'rooms' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Room Management</h2>
              <p className="settings-section-desc">Configure default room behaviors and booking rules.</p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.Users size={16} />
                    Default Room Capacity
                  </label>
                  <input
                    type="number"
                    className="setting-input"
                    value={settings.defaultRoomCapacity}
                    onChange={e => updateSetting('defaultRoomCapacity', parseInt(e.target.value) || 0)}
                    min="1"
                    max="500"
                  />
                  <p className="setting-hint">Default capacity for new rooms (can be overridden per room).</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.BarChart size={16} />
                    Auto-Release Time (minutes)
                  </label>
                  <input
                    type="number"
                    className="setting-input"
                    value={settings.autoReleaseTime}
                    onChange={e => updateSetting('autoReleaseTime', parseInt(e.target.value) || 0)}
                    min="5"
                    max="120"
                  />
                  <p className="setting-hint">Automatically release unclaimed reservations after this many minutes.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.allowConcurrentBookings}
                      onChange={e => updateSetting('allowConcurrentBookings', e.target.checked)}
                    />
                    <span>Allow Concurrent Bookings</span>
                  </label>
                  <p className="setting-hint">When enabled, users can book multiple rooms simultaneously.</p>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Notification Preferences</h2>
              <p className="settings-section-desc">Choose which events trigger notifications.</p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={e => updateSetting('emailNotifications', e.target.checked)}
                    />
                    <span><Icons.Bell size={16} /> Email Notifications</span>
                  </label>
                  <p className="setting-hint">Send email alerts for important system events.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={e => updateSetting('pushNotifications', e.target.checked)}
                    />
                    <span><Icons.Bell size={16} /> Push Notifications</span>
                  </label>
                  <p className="setting-hint">Show browser/app push notifications in real-time.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.reportAlerts}
                      onChange={e => updateSetting('reportAlerts', e.target.checked)}
                    />
                    <span><Icons.FileText size={16} /> Report Alerts</span>
                  </label>
                  <p className="setting-hint">Get notified when new reports are submitted.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.requestAlerts}
                      onChange={e => updateSetting('requestAlerts', e.target.checked)}
                    />
                    <span><Icons.Key size={16} /> Request Alerts</span>
                  </label>
                  <p className="setting-hint">Get notified when room requests are made or updated.</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Security Settings</h2>
              <p className="settings-section-desc">Manage authentication and security policies.</p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.Lock size={16} />
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    className="setting-input"
                    value={settings.sessionTimeout}
                    onChange={e => updateSetting('sessionTimeout', parseInt(e.target.value) || 0)}
                    min="5"
                    max="480"
                  />
                  <p className="setting-hint">Automatically log out users after this period of inactivity.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.Lock size={16} />
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    className="setting-input"
                    value={settings.passwordExpiryDays}
                    onChange={e => updateSetting('passwordExpiryDays', parseInt(e.target.value) || 0)}
                    min="30"
                    max="365"
                    disabled={!settings.requirePasswordChange}
                  />
                  <p className="setting-hint">Force password changes after this many days.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.requirePasswordChange}
                      onChange={e => updateSetting('requirePasswordChange', e.target.checked)}
                    />
                    <span>Require Periodic Password Changes</span>
                  </label>
                  <p className="setting-hint">Users must change passwords at regular intervals.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={e => updateSetting('twoFactorAuth', e.target.checked)}
                    />
                    <span>Two-Factor Authentication</span>
                  </label>
                  <p className="setting-hint">Require 2FA for all user accounts (recommended).</p>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Appearance</h2>
              <p className="settings-section-desc">Customize the look and feel of the interface.</p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.Home size={16} />
                    Theme
                  </label>
                  <select
                    className="setting-input"
                    value={settings.theme}
                    onChange={e => updateSetting('theme', e.target.value as any)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <p className="setting-hint">Choose your preferred color scheme.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.compactMode}
                      onChange={e => updateSetting('compactMode', e.target.checked)}
                    />
                    <span>Compact Mode</span>
                  </label>
                  <p className="setting-hint">Reduce spacing for a more dense information display.</p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          {activeTab === 'advanced' && (
            <div className="settings-section">
              <h2 className="settings-section-title">Advanced Settings</h2>
              <p className="settings-section-desc">
                <strong style={{ color: 'var(--red-danger)' }}>Warning:</strong> These settings are for advanced users only.
              </p>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <Icons.BarChart size={16} />
                    API Rate Limit (requests/hour)
                  </label>
                  <input
                    type="number"
                    className="setting-input"
                    value={settings.apiRateLimit}
                    onChange={e => updateSetting('apiRateLimit', parseInt(e.target.value) || 0)}
                    min="100"
                    max="10000"
                  />
                  <p className="setting-hint">Maximum API requests allowed per hour per user.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={e => updateSetting('maintenanceMode', e.target.checked)}
                    />
                    <span style={{ color: 'var(--orange-accent)' }}>Maintenance Mode</span>
                  </label>
                  <p className="setting-hint">Temporarily disable system access for all users except admins.</p>
                </div>

                <div className="setting-item">
                  <label className="setting-label setting-checkbox">
                    <input
                      type="checkbox"
                      checked={settings.debugMode}
                      onChange={e => updateSetting('debugMode', e.target.checked)}
                    />
                    <span>Debug Mode</span>
                  </label>
                  <p className="setting-hint">Enable detailed logging and error messages (impacts performance).</p>
                </div>
              </div>

              <div className="settings-danger-zone">
                <h3 className="danger-zone-title">
                  <Icons.Info size={18} /> Danger Zone
                </h3>
                <p className="danger-zone-desc">Irreversible actions that affect the entire system.</p>
                
                <div className="danger-zone-actions">
                  <button className="danger-btn" onClick={() => {
                    if (window.confirm('Clear all cache? This will log out all users.')) {
                      alert('Cache cleared (demo)');
                    }
                  }}>
                    Clear System Cache
                  </button>
                  
                  <button className="danger-btn" onClick={() => {
                    if (window.confirm('Export all data? This may take several minutes.')) {
                      alert('Data export started (demo)');
                    }
                  }}>
                    Export All Data
                  </button>
                  
                  <button className="danger-btn danger-btn-critical" onClick={() => {
                    const confirm1 = window.confirm('⚠️ RESET ENTIRE SYSTEM? This will delete ALL data including users, rooms, and reports!');
                    if (confirm1) {
                      const confirm2 = window.prompt('Type "DELETE ALL DATA" to confirm:');
                      if (confirm2 === 'DELETE ALL DATA') {
                        alert('System reset (demo - not actually implemented)');
                      }
                    }
                  }}>
                    Reset Entire System
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Save Bar (appears when there are changes) */}
      {hasChanges && (
        <div className="fixed-save-bar">
          <div className="save-bar-content">
            <div className="save-bar-info">
              <Icons.Info size={18} />
              <span>You have unsaved changes</span>
            </div>
            <div className="save-bar-actions">
              <button className="cancel-btn" onClick={() => {
                if (window.confirm('Discard all changes?')) {
                  setSettings(defaultSettings);
                  setHasChanges(false);
                }
              }}>
                Discard
              </button>
              <button className="save-btn" onClick={handleSave}>
                <Icons.Lock size={16} /> Save All Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;