import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import RolePreview from '../components/dashboard/RolePreview';

// Sample data for charts
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
  return (
    <>
      <h1 className="section-title">Overview</h1>

      <div className="stat-cards">
        <StatCard type="users" value="129,983" label="Total Users" color="blue" />
        <StatCard type="rooms" value="731" label="Total Rooms" color="green" />
        <StatCard type="requests" value="393" label="Total Requests" color="orange" />
        <StatCard type="reports" value="19,697" label="Total Reports" color="gray" />
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