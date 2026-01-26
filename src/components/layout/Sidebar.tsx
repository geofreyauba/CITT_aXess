import { Icons } from '../icons';

interface SidebarProps {
  role?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ role = 'Admin' }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">CITT axess</div>
      <div className="sidebar-role">{role}</div>
      <nav>
        <ul className="sidebar-nav">
          <li><a href="#" className="active"><Icons.Home className="sidebar-icon" /> Dashboard</a></li>
          <li><a href="#"><Icons.Key className="sidebar-icon" /> Rooms</a></li>
          <li><a href="#"><Icons.FileText className="sidebar-icon" /> Requests</a></li>
          <li><a href="#"><Icons.BarChart className="sidebar-icon" /> Reports</a></li>
          <li><a href="#"><Icons.Settings className="sidebar-icon" /> Settings</a></li>
          <li><a href="#"><Icons.HelpCircle className="sidebar-icon" /> Help & Support</a></li>
          <li><a href="#"><Icons.LogOut className="sidebar-icon" /> Logout</a></li>
        </ul>
      </nav>
      <div className="sidebar-footer">©Sightsx</div>
    </aside>
  );
};

export default Sidebar;