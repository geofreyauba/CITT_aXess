// src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import { Icons } from '../icons';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">aXess</div>
      <div className="sidebar-role">{role}</div>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.Home className="sidebar-icon" /> Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/rooms"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.Key className="sidebar-icon" /> Rooms
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/requests"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.FileText className="sidebar-icon" /> Requests
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/reports"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.BarChart className="sidebar-icon" /> Reports
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.Settings className="sidebar-icon" /> Settings
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/help"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icons.HelpCircle className="sidebar-icon" /> Help & Support
            </NavLink>
          </li>
          <li>
            <a href="#" onClick={(e) => {
              e.preventDefault();
              // Optional: Add logout logic here later (clear token, redirect to login)
              alert('Logout clicked – implement real logout here');
            }}>
              <Icons.LogOut className="sidebar-icon" /> Logout
            </a>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">©Sightsx</div>
    </aside>
  );
};

export default Sidebar;