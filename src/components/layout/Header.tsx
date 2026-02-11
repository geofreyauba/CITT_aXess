import React from 'react';
import { Icons } from '../icons';
import { FaReact } from 'react-icons/fa';

interface HeaderProps {
  role?: string;
  userName?: string;
  userId?: string;
}

const Header: React.FC<HeaderProps> = ({
  role = 'Admin',
  userName = 'Oal Regind',
  userId = 'REG-000123',
}) => {
  return (
    <header className="header">
      {/* Left: role badge with person icon */}
      <div className="header-left">
        <div className="role-badge" title={`Role: ${role}`}>
          <span className="role-icon" aria-hidden>
            <Icons.Users size={18} />
          </span>
          <span className="role-text">Your {role}</span>
        </div>
      </div>

      {/* Right: welcome panel with React icon and user info (replaces search + notif + settings) */}
      <div className="header-user" role="region" aria-label="User info">
        <div className="user-icon" aria-hidden>
          <FaReact />
        </div>

        <div className="user-text">
          <div className="welcome">
            Welcome, <span className="user-name">{userName}</span>
          </div>
          <div className="user-id">ID: {userId}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;