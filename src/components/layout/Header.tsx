import { Icons } from '../icons';

interface HeaderProps {
  role?: string;
}

const Header: React.FC<HeaderProps> = ({ role = 'Admin' }) => {
  return (
    <header className="header">
      <div className="header-title">
        {role}
        <img 
          src="https://via.placeholder.com/32x32?text=👩" 
          alt="Profile" 
          className="avatar-small" 
        />
      </div>
      <div className="header-search">
        <Icons.Search size={16} />
        <span>Oal Regind</span>
        <img 
          src="https://via.placeholder.com/24x24?text=👩" 
          alt="Avatar" 
          className="avatar-small" 
          style={{ width: '24px', height: '24px', borderWidth: '1px' }} 
        />
      </div>
      <div className="header-icons">
        <Icons.Bell size={18} />
        <Icons.Settings size={18} />
      </div>
    </header>
  );
};

export default Header;