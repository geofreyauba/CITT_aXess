// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import RolePreview from '../components/dashboard/RolePreview';
import { dashboardAPI } from '../lib/api';

// Sample chart data (replace with real data from backend if available)
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

interface DashboardStats {
  totalMembers: number;
  pendingVerifications: number;
  totalRooms: number;
  availableRooms: number;
  totalRequests: number;
  pendingRequests: number;
  totalReports: number;
  openReports: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="form-error" role="alert">
          {error}
        </div>
        <button onClick={loadStats} className="save-btn" style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div style={{ padding: '2rem' }}>No data available</div>;
  }

  return (
    <>
      <h1 className="section-title">Overview</h1>

      <div className="stat-cards">
        <StatCard
          type="users"
          value={stats.totalMembers.toLocaleString()}
          label="Total Users"
          color="blue"
          notifications={stats.pendingVerifications}
          onClick={() => navigate('/members')}
        />
        <StatCard
          type="rooms"
          value={stats.totalRooms.toLocaleString()}
          label="Total Rooms"
          color="green"
          notifications={stats.totalRooms - stats.availableRooms}
          onClick={() => navigate('/rooms')}
        />
        <StatCard
          type="requests"
          value={stats.totalRequests.toLocaleString()}
          label="Total Requests"
          color="orange"
          notifications={stats.pendingRequests}
          onClick={() => navigate('/requests')}
        />
        <StatCard
          type="reports"
          value={stats.totalReports.toLocaleString()}
          label="Total Reports"
          color="gray"
          notifications={stats.openReports}
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