// src/pages/Dashboard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import RolePreview from '../components/dashboard/RolePreview';

// Sample chart data (unchanged from your original)
const barData = [
  { name: 'Mon', value: 65 },
  { name: 'Tue', value: 59 },
  { name: 'Wed', value: 80 },
  { name: 'Thu', value: 81 },
  { name: 'Fri', value: 56 },
  { name: 'Sat', value: 55 },
  { name: 'Sun', value: 40 },
];

const lineData = [
  { name: 'Jun', uv: 4000, pv: 2400 },
  { name: 'Jul', uv: 3000, pv: 1398 },
  { name: 'Aug', uv: 2000, pv: 9800 },
  { name: 'Sep', uv: 2780, pv: 3908 },
  { name: 'Oct', uv: 1890, pv: 4800 },
  { name: 'Nov', uv: 2390, pv: 3800 },
  { name: 'Dec', uv: 3490, pv: 4300 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // These are example values — in a real app, fetch them from API or context
  const pendingNotifications = {
    users: 6,      // e.g. 6 new unapproved users
    rooms: 1,      // e.g. 1 room needs attention
    requests: 14,  // e.g. 14 pending requests
    reports: 5,    // e.g. 5 new/unresolved reports
  };

  return (
    <>
      <h1 className="section-title">Overview</h1>

      <div className="stat-cards">
        <StatCard
          type="users"
          value="129,983"
          label="Total Users"
          color="blue"
          notifications={pendingNotifications.users}
          onClick={() => navigate('/members')}
        />
        <StatCard
          type="rooms"
          value="731"
          label="Total Rooms"
          color="green"
          notifications={pendingNotifications.rooms}
          onClick={() => navigate('/rooms')}
        />
        <StatCard
          type="requests"
          value="393"
          label="Total Requests"
          color="orange"
          notifications={pendingNotifications.requests}
          onClick={() => navigate('/requests')}
        />
        <StatCard
          type="reports"
          value="19,697"
          label="Total Reports"
          color="gray"
          notifications={pendingNotifications.reports}
          onClick={() => navigate('/reports')}
        />
      </div>

      <div className="chart-cards">
        <ChartCard type="bar" title="Total Requests" data={barData} dropdown="Result" />
        <ChartCard type="line" title="Total Requests" data={lineData} dropdown="Detail" />
      </div>

      <RolePreview />
    </>
  );
};

export default Dashboard;