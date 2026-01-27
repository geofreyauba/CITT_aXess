// src/components/layout/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';
import { Icons } from '../icons';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">aXess_</div>
      <div className="sidebar-role">{role}</div>
      <nav>
        <ul className="sidebar-nav">
          <li>
            <Link
              to="/dashboard"
              className={location.pathname === '/dashboard' ? 'active' : ''}
            >
              <Icons.Home className="sidebar-icon" /> Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/rooms"
              className={location.pathname === '/rooms' ? 'active' : ''}
            >
              <Icons.Key className="sidebar-icon" /> Rooms
            </Link>
          </li>
          <li>
            <Link
              to="/requests"
              className={location.pathname === '/requests' ? 'active' : ''}
            >
              <Icons.FileText className="sidebar-icon" /> Requests
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className={location.pathname === '/reports' ? 'active' : ''}
            >
              <Icons.BarChart className="sidebar-icon" /> Reports
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className={location.pathname === '/settings' ? 'active' : ''}
            >
              <Icons.Settings className="sidebar-icon" /> Settings
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className={location.pathname === '/help' ? 'active' : ''}
            >
              <Icons.HelpCircle className="sidebar-icon" /> Help & Support
            </Link>
          </li>
          <li>
            <Link
              to="#"
              className={location.pathname === '/logout' ? 'active' : ''}
            >
              <Icons.LogOut className="sidebar-icon" /> Logout
            </Link>
          </li>
        </ul>
      </nav>
      <div className="sidebar-footer">©Sightsx</div>
    </aside>
  );
};

export default Sidebar;