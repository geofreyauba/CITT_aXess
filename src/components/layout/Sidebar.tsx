// src/components/layout/Sidebar.tsx
// ═══════════════════════════════════════════════════════════════════════════
// ROLE-BASED NAVIGATION SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════
//
// NORMAL USERS (role !== 'admin') ONLY SEE:
// - Dashboard
// - Requests
// - Settings
// - Help & Support
// - Logout
//
// ADMINS (role === 'admin') SEE EVERYTHING:
// - Dashboard
// - Members   (ADMIN ONLY)
// - Rooms     (ADMIN ONLY)
// - Requests
// - Reports          (ADMIN ONLY)
// - Pending Returns   (ADMIN ONLY)
// - Settings
// - Help & Support
// - Logout
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../icons';
import { performLogout } from '../../lib/auth';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  // ═══════════════════════════════════════════════════════════════════
  // READ USER ROLE FROM LOCALSTORAGE ON MOUNT
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        const role = user.role || 'user';
        setUserRole(role);
        setIsAdmin(role === 'admin');

        console.log('[SIDEBAR] User role detected:', role);
        console.log('[SIDEBAR] Is admin:', role === 'admin');
      } else {
        console.warn('[SIDEBAR] No currentUser in localStorage');
        setIsAdmin(false);
        setUserRole('user');
      }
    } catch (err) {
      console.error('[SIDEBAR] Failed to parse user:', err);
      setIsAdmin(false);
      setUserRole('user');
    }
  }, []);

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
          {/* ════════════════════════════════════════════════════
              VISIBLE TO ALL USERS
          ════════════════════════════════════════════════════ */}

          <li>
            <NavLink to="/dashboard" title="Dashboard">
              <Icons.Home className="sidebar-icon" />
              <span className="sidebar-label">Dashboard</span>
            </NavLink>
          </li>

          {/* ════════════════════════════════════════════════════
              ADMIN-ONLY LINKS: Members + Rooms
          ════════════════════════════════════════════════════ */}
          {isAdmin && (
            <>
              <li>
                <NavLink to="/members" title="Members (Admin Only)">
                  <Icons.Users className="sidebar-icon" />
                  <span className="sidebar-label">Members</span>
                </NavLink>
              </li>

              <li>
                <NavLink to="/rooms" title="Rooms (Admin Only)">
                  <Icons.Key className="sidebar-icon" />
                  <span className="sidebar-label">Rooms</span>
                </NavLink>
              </li>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              VISIBLE TO ALL USERS
          ════════════════════════════════════════════════════ */}

          <li>
            <NavLink to="/requests" title="Requests">
              <Icons.FileText className="sidebar-icon" />
              <span className="sidebar-label">Requests</span>
            </NavLink>
          </li>

          {/* ════════════════════════════════════════════════════
              ADMIN-ONLY LINKS: Reports & Pending Returns
          ════════════════════════════════════════════════════ */}
          {isAdmin && (
            <>
              <li>
                <NavLink to="/reports" title="Reports (Admin Only)">
                  <Icons.BarChart className="sidebar-icon" />
                  <span className="sidebar-label">Reports</span>
                </NavLink>
              </li>

              <li>
                <NavLink to="/pending-returns" title="Pending Returns (Admin Only)">
                  <Icons.Clock className="sidebar-icon" />
                  <span className="sidebar-label">Pending Returns</span>
                </NavLink>
              </li>
            </>
          )}

          {/* ════════════════════════════════════════════════════
              VISIBLE TO ALL USERS (continued)
          ════════════════════════════════════════════════════ */}

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