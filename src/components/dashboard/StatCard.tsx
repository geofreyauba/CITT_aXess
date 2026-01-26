import { Icons } from '../icons';

type StatType = 'users' | 'rooms' | 'requests' | 'reports';

interface StatCardProps {
  type: StatType;
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'orange' | 'gray';
}

const StatCard: React.FC<StatCardProps> = ({ type, value, label, color }) => {
  const icons = {
    users: <Icons.Users />,
    rooms: <Icons.Lock />,
    requests: <Icons.FileText />,
    reports: <Icons.BarChart />,
  };

  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-icon">{icons[type]}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
};

export default StatCard;