import React from 'react';
import { Icons } from '../icons';

type StatType = 'users' | 'rooms' | 'requests' | 'reports';

interface StatCardProps {
  type: StatType;
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'orange' | 'gray';
  onClick?: () => void; // new optional click handler
}

const StatCard: React.FC<StatCardProps> = ({ type, value, label, color, onClick }) => {
  const icons = {
    users: <Icons.Users />,
    rooms: <Icons.Lock />,
    requests: <Icons.FileText />,
    reports: <Icons.BarChart />,
  };

  const clickable = typeof onClick === 'function';

  return (
    <div
      className={`stat-card ${color} ${clickable ? 'clickable' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
      aria-pressed={clickable ? false : undefined}
    >
      <div className="stat-card-icon">{icons[type]}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
};

export default StatCard;