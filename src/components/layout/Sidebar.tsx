// src/components/layout/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../icons';
import { performLogout } from '../../lib/auth';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  const navigate = useNavigate();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = window.confirm('Are you sure you want to log out?');
    if (!ok) return;

    try {
      await performLogout();
    } catch {
      // ignore
    } finally {
      // send to login page
      navigate('/login', { replace: true });
      // force reload to clear any in-memory state if you have it
      window.location.reload();
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">aXess</div>
      <div className="sidebar-role">Your {role}</div>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.Home className="sidebar-icon" /> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/members" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.Users className="sidebar-icon" /> Members
            </NavLink>
          </li>
          <li>
            <NavLink to="/rooms" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.Key className="sidebar-icon" /> Rooms
            </NavLink>
          </li>
          <li>
            <NavLink to="/requests" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.FileText className="sidebar-icon" /> Requests
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.BarChart className="sidebar-icon" /> Reports
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.Settings className="sidebar-icon" /> Settings
            </NavLink>
          </li>
          <li>
            <NavLink to="/help" className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icons.HelpCircle className="sidebar-icon" /> Help & Support
            </NavLink>
          </li>

          <li>
            <button
              onClick={handleLogout}
              className="sidebar-logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.75rem 1.5rem',
                width: '100%',
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: 500,
              }}
            >
              <Icons.LogOut className="sidebar-icon" /> Logout
            </button>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">©Sightsx</div>
    </aside>
  );
};

export default Sidebar;