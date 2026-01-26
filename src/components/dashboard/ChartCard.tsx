import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface ChartDataPoint {
  name: string;
  value?: number;
  pv?: number;
  uv?: number;
}

interface ChartCardProps {
  type: 'bar' | 'line';
  title: string;
  data: ChartDataPoint[];
  dropdown: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ type, title, data, dropdown }) => {
  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>{title}</span>
        <select className="chart-dropdown" defaultValue={dropdown}>
          <option>{dropdown}</option>
        </select>
      </div>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          {type === 'bar' && (
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" background={{ fill: '#f0f8ff' }} />
            </BarChart>
          )}
          {type === 'line' && (
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pv" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="uv" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;