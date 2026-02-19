// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../icons';
import { performLogout } from '../../lib/auth';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to log out?')) return;

    try {
      await performLogout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      navigate('/login', { replace: true });
      window.location.reload();
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>

      {/* Logo */}
      <div className="sidebar-logo">
        {collapsed ? 'aX' : 'aXess'}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/dashboard" title="Dashboard">
              <Icons.Home className="sidebar-icon" />
              <span className="sidebar-label">Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/members" title="Members">
              <Icons.Users className="sidebar-icon" />
              <span className="sidebar-label">Members</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/rooms" title="Rooms">
              <Icons.Key className="sidebar-icon" />
              <span className="sidebar-label">Rooms</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/requests" title="Requests">
              <Icons.FileText className="sidebar-icon" />
              <span className="sidebar-label">Requests</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" title="Reports">
              <Icons.BarChart className="sidebar-icon" />
              <span className="sidebar-label">Reports</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" title="Settings">
              <Icons.Settings className="sidebar-icon" />
              <span className="sidebar-label">Settings</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/help" title="Help & Support">
              <Icons.HelpCircle className="sidebar-icon" />
              <span className="sidebar-label">Help & Support</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Bottom area */}
      <div className="sidebar-bottom">
        <button
          className="sidebar-logout"
          onClick={handleLogout}
          title="Logout"
        >
          <Icons.LogOut className="sidebar-icon" />
          <span className="sidebar-label">Logout</span>
        </button>

        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className={`toggle-icon ${collapsed ? 'rotated' : ''}`}>
            {collapsed ? '»»' : '««'}
          </span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;