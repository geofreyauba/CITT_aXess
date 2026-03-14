// src/pages/Dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import { dashboardAPI } from '../lib/api';
import Badge from '../components/ui/Badge';
import { Icons } from '../components/icons';
import {
  BarChart2, Inbox, QrCode, Fingerprint, Hand, KeyRound,
  LogIn, LogOut, CheckCircle2, CircleDot, ClipboardList, ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceEntry {
  _id: string;
  fullName: string;
  phone?: string;
  email?: string;
  membership?: string;
  role?: string;
  accountType?: string;
  checkInTime: string;
  checkOutTime?: string | null;
  authMethod: string;
  status: 'checked_in' | 'checked_out';
}

interface DashboardStats {
  totalMembers: number;
  pendingVerifications: number;
  totalRooms: number;
  availableRooms: number;
  totalRequests: number;
  pendingRequests: number;
  totalReports: number;
  openReports: number;
  weeklyRequests: Array<{ name: string; value: number }>;
  monthlyData: Array<{ name: string; requests: number; users: number }>;
  topRooms: Array<{ name: string; code: string; count: number }>;
  requestStatusBreakdown: { pending: number; approved: number; returned: number };
  todayAttendance: {
    total: number;
    checkedIn: number;
    checkedOut: number;
    viaQR: number;
    recent: AttendanceEntry[];
  };
}

type AttendancePeriod = 'daily' | 'weekly' | 'monthly';

interface AttendanceChartPoint {
  label: string;
  entries: number;
  checkouts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso?: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return iso; }
};

const roleColor = (role?: string) => {
  switch (role) {
    case 'admin':     return { bg: '#fef3c7', color: '#92400e' };
    case 'guard':     return { bg: '#fee2e2', color: '#991b1b' };
    case 'leader':    return { bg: '#ede9fe', color: '#5b21b6' };
    case 'innovator': return { bg: '#d1fae5', color: '#065f46' };
    default:          return { bg: '#f1f5f9', color: '#475569' };
  }
};

// ─── Canvas bar chart ─────────────────────────────────────────────────────────
const AttendanceChart: React.FC<{ data: AttendanceChartPoint[]; period: AttendancePeriod }> = ({ data, period }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 28, right: 16, bottom: 46, left: 46 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;
    const maxVal = Math.max(...data.flatMap(d => [d.entries, d.checkouts]), 1);
    const step   = cW / data.length;
    const barW   = Math.max(6, Math.min(22, step * 0.28));

    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + cH - (i / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round((i / 4) * maxVal)), pad.left - 6, y + 4);
    }
    ctx.setLineDash([]);

    // Bars
    data.forEach((d, i) => {
      const cx   = pad.left + i * step + step / 2;
      const entH = (d.entries  / maxVal) * cH;
      const outH = (d.checkouts / maxVal) * cH;

      // Entries (blue)
      const g1 = ctx.createLinearGradient(0, pad.top + cH - entH, 0, pad.top + cH);
      g1.addColorStop(0, '#3b82f6'); g1.addColorStop(1, '#bfdbfe');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.roundRect(cx - barW - 2, pad.top + cH - entH, barW, entH, [4, 4, 0, 0]);
      ctx.fill();

      // Check-outs (teal)
      const g2 = ctx.createLinearGradient(0, pad.top + cH - outH, 0, pad.top + cH);
      g2.addColorStop(0, '#14b8a6'); g2.addColorStop(1, '#99f6e4');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.roundRect(cx + 2, pad.top + cH - outH, barW, outH, [4, 4, 0, 0]);
      ctx.fill();

      // Value label on entries bar
      if (d.entries > 0) {
        ctx.fillStyle = '#2563eb'; ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(d.entries), cx - barW / 2 - 2, pad.top + cH - entH - 5);
      }

      // X label
      ctx.fillStyle = '#64748b'; ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'center';
      const lbl = d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label;
      ctx.fillText(lbl, cx, pad.top + cH + 16);
    });

    // Legend
    const ly = H - 8;
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(pad.left, ly - 9, 10, 9);
    ctx.fillStyle = '#374151'; ctx.font = '11px system-ui,sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Entries', pad.left + 14, ly);
    ctx.fillStyle = '#14b8a6'; ctx.fillRect(pad.left + 76, ly - 9, 10, 9);
    ctx.fillStyle = '#374151'; ctx.fillText('Check-outs', pad.left + 90, ly);

  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

// ─── Data builders ────────────────────────────────────────────────────────────

function buildDailyData(recent: AttendanceEntry[]): AttendanceChartPoint[] {
  const hours: Record<number, { entries: number; checkouts: number }> = {};
  recent.forEach(r => {
    const h = new Date(r.checkInTime).getHours();
    if (!hours[h]) hours[h] = { entries: 0, checkouts: 0 };
    hours[h].entries++;
    if (r.checkOutTime) hours[h].checkouts++;
  });
  const result: AttendanceChartPoint[] = [];
  for (let h = 6; h <= 22; h++) {
    if (hours[h]) result.push({ label: `${h}:00`, entries: hours[h].entries, checkouts: hours[h].checkouts });
  }
  return result.length ? result : [{ label: 'Now', entries: 0, checkouts: 0 }];
}

async function fetchHistory(token: string, from: string, to: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/attendance/history?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const d = await res.json();
    return d.attendances || [];
  } catch { return []; }
}

function buildWeeklyData(records: any[]): AttendanceChartPoint[] {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const map: Record<string, { entries: number; checkouts: number }> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    map[d.toISOString().slice(0, 10)] = { entries: 0, checkouts: 0 };
  }
  records.forEach(r => { if (map[r.date]) { map[r.date].entries++; if (r.checkOutTime) map[r.date].checkouts++; } });
  return Object.entries(map).map(([ds, v]) => ({ label: days[new Date(ds + 'T00:00:00').getDay()], ...v }));
}

function buildMonthlyData(records: any[]): AttendanceChartPoint[] {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const map: Record<string, { entries: number; checkouts: number }> = {};
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    map[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = { entries: 0, checkouts: 0 };
  }
  records.forEach(r => { const k = r.date?.slice(0,7); if (k && map[k]) { map[k].entries++; if (r.checkOutTime) map[k].checkouts++; } });
  return Object.entries(map).map(([k, v]) => ({ label: months[parseInt(k.split('-')[1]) - 1], ...v }));
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats,        setStats]        = useState<DashboardStats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [isGuard,      setIsGuard]      = useState(false);
  const [currentUser,  setCurrentUser]  = useState<any>(null);
  const [chartPeriod,  setChartPeriod]  = useState<AttendancePeriod>('daily');
  const [chartData,    setChartData]    = useState<AttendanceChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Personal attendance for regular users
  const [myAttendance,        setMyAttendance]        = useState<any>(null);
  const [myAttendanceLoading, setMyAttendanceLoading] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      setIsAdmin(u.role === 'admin');
      setIsGuard(u.role === 'guard');
      setCurrentUser(u);
    } catch {}
  }, []);

  useEffect(() => { loadStats(); }, []);

  // Fetch personal attendance for regular users
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (u.role === 'admin' || u.role === 'guard') return;
    const fetchMyAttendance = async () => {
      setMyAttendanceLoading(true);
      try {
        const token = localStorage.getItem('authToken') || '';
        const res = await fetch('/api/attendance/my-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMyAttendance(await res.json());
      } catch {} finally { setMyAttendanceLoading(false); }
    };
    fetchMyAttendance();
  }, []);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getStats();
      setStats(data); setError(null);
    } catch (err: any) { setError(err.message || 'Failed to load dashboard data'); }
    finally { setLoading(false); }
  };

  // Rebuild chart on period/stats change
  useEffect(() => {
    if (!stats) return;
    const token = localStorage.getItem('authToken') || '';

    if (chartPeriod === 'daily') {
      setChartData(buildDailyData(stats.todayAttendance.recent));
      return;
    }

    setChartLoading(true);
    const today = new Date();
    const from  = chartPeriod === 'weekly'
      ? (() => { const d = new Date(today); d.setDate(d.getDate() - 6); return d.toISOString().slice(0,10); })()
      : new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0,10);
    const to    = today.toISOString().slice(0,10);

    fetchHistory(token, from, to).then(records => {
      setChartData(chartPeriod === 'weekly' ? buildWeeklyData(records) : buildMonthlyData(records));
    }).finally(() => setChartLoading(false));
  }, [stats, chartPeriod]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Loading dashboard...</p></div>;
  if (error)   return <div style={{ padding: '2rem' }}><div className="form-error" role="alert">{error}</div><button onClick={loadStats} className="save-btn" style={{ marginTop: '1rem' }}>Retry</button></div>;
  if (!stats)  return <div style={{ padding: '2rem' }}>No data available</div>;

  // Computed chart summaries
  const totalEntries   = chartData.reduce((s, d) => s + d.entries,   0);
  const totalCheckouts = chartData.reduce((s, d) => s + d.checkouts, 0);
  const peakLabel = (() => {
    const max = Math.max(...chartData.map(d => d.entries));
    return chartData.find(d => d.entries === max)?.label || '—';
  })();

  const isPrivileged = isAdmin || isGuard;

  return (
    <>
      <h1 className="section-title">
        {isPrivileged ? 'Overview' : `Welcome, ${currentUser?.fullName?.split(' ')[0] || 'User'} 👋`}
      </h1>

      {/* ══════════════════════════════════════════════════════════════════
          PRIVILEGED VIEW — admin & guard see full system stats
      ══════════════════════════════════════════════════════════════════ */}
      {isPrivileged && (
        <>
          {/* ── Stat Cards ── */}
          <div className="stat-cards">
            <StatCard type="users"    value={stats.totalMembers.toLocaleString()}  label="Total Users"    color="blue"   notifications={stats.pendingVerifications}              onClick={isAdmin ? () => navigate('/members') : undefined} />
            <StatCard type="rooms"    value={stats.totalRooms.toLocaleString()}    label="Total Rooms"    color="green"  notifications={stats.totalRooms - stats.availableRooms} onClick={isAdmin ? () => navigate('/rooms')   : undefined} />
            <StatCard type="requests" value={stats.totalRequests.toLocaleString()} label="Total Requests" color="orange" notifications={stats.pendingRequests}                   onClick={() => navigate('/requests')} />
            <StatCard type="reports"  value={stats.totalReports.toLocaleString()}  label="Total Reports"  color="gray"   notifications={stats.openReports}                       onClick={() => navigate('/reports')} />
            <StatCard type="requests" value={stats.requestStatusBreakdown.approved} label="Pending Returns" color="orange" notifications={stats.requestStatusBreakdown.approved} onClick={() => navigate('/pending-returns')} />
          </div>

          {/* ── Weekly / Monthly charts ── */}
          <div className="chart-cards">
            <ChartCard type="bar"  title="Weekly Requests"  data={stats.weeklyRequests} dropdown="Last 7 Days"   />
            <ChartCard type="line" title="Monthly Overview" data={stats.monthlyData}    dropdown="Last 6 Months" />
          </div>

          {/* ── Attendance Trends Chart ── */}
          <div className="role-section" style={{ marginTop: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="role-title" style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Users size={18} /> Attendance Trends
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {chartPeriod === 'daily'   && `Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
                  {chartPeriod === 'weekly'  && 'Last 7 days — entries vs check-outs per day'}
                  {chartPeriod === 'monthly' && 'Last 6 months — entries vs check-outs per month'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 10, padding: 3, border: '1px solid #e2e8f0', flexShrink: 0 }}>
                {(['daily', 'weekly', 'monthly'] as AttendancePeriod[]).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: chartPeriod === p ? 700 : 500, fontSize: 13, background: chartPeriod === p ? 'white' : 'transparent', color: chartPeriod === p ? '#1e40af' : '#64748b', boxShadow: chartPeriod === p ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { label: 'Total Entries',    value: totalEntries,   color: '#3b82f6', bg: '#eff6ff' },
                { label: 'Total Check-outs', value: totalCheckouts, color: '#14b8a6', bg: '#f0fdfa' },
                { label: 'Peak Period',      value: peakLabel,      color: '#8b5cf6', bg: '#f5f3ff' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ flex: '1 1 110px', background: bg, border: `1px solid ${color}33`, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: typeof value === 'number' ? 22 : 18, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ position: 'relative', height: 240, background: '#fafbfd', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', padding: '6px 4px 4px' }}>
              {chartLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <div style={{ textAlign: 'center' }}><BarChart2 size={30} color="#94a3b8" style={{ marginBottom: 8 }} /><div style={{ fontSize: 13 }}>Loading…</div></div>
                </div>
              ) : chartData.every(d => d.entries === 0) ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <div style={{ textAlign: 'center' }}><Inbox size={32} color="#94a3b8" style={{ marginBottom: 8 }} /><div style={{ fontSize: 13, fontWeight: 500 }}>No attendance data for this period</div></div>
                </div>
              ) : (
                <AttendanceChart data={chartData} period={chartPeriod} />
              )}
            </div>
          </div>

          {/* ── Analytics ── */}
          <div className="role-previews">
            {/* Request Status */}
            <div className="role-section">
              <div className="role-title">Request Status Overview <Icons.Info size={16} /></div>
              <div className="status-cards">
                {[
                  { label: 'Pending',  value: stats.requestStatusBreakdown.pending,  variant: 'pending'    as const, sub: 'Awaiting Approval', cls: 'orange' },
                  { label: 'Approved', value: stats.requestStatusBreakdown.approved, variant: 'approved'   as const, sub: 'Currently Active',  cls: 'green'  },
                  { label: 'Returned', value: stats.requestStatusBreakdown.returned, variant: 'returned'   as const, sub: 'Completed',         cls: 'blue'   },
                  { label: 'Total',    value: stats.totalRequests,                   variant: 'restricted' as const, sub: 'All Requests',      cls: 'gray'   },
                ].map(({ label, value, variant, sub, cls }) => (
                  <div key={label} className={`status-card ${cls}`}>
                    <Badge variant={variant}>{label}</Badge>
                    <div className="status-detail" style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{value}</div>
                    <div className="status-detail" style={{ color: 'var(--muted-text)' }}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Rooms */}
            <div className="role-section">
              <div className="role-title">Most Requested Rooms</div>
              {stats.topRooms.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>No room requests yet</div>
              ) : (
                <table className="innovator-table">
                  <thead><tr><th>#</th><th>Room Name</th><th>Code</th><th>Total Requests</th><th>Popularity</th></tr></thead>
                  <tbody>
                    {stats.topRooms.map((room, index) => {
                      const pct = Math.round((room.count / (stats.topRooms[0]?.count || 1)) * 100);
                      return (
                        <tr key={index}>
                          <td style={{ fontWeight: 'bold', color: 'var(--soft-blue-dark)' }}>{index + 1}</td>
                          <td>{room.name}</td>
                          <td><Badge variant="available">{room.code}</Badge></td>
                          <td style={{ fontWeight: 'bold' }}>{room.count}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--soft-blue-dark)', transition: 'width 0.3s ease' }} />
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--muted-text)', minWidth: '40px' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Room Availability */}
            <div className="role-section">
              <div className="role-title">Room Availability</div>
              <div className="guard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '4px' }}>Available Rooms</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{stats.availableRooms}</div></div>
                  <Icons.CheckCircle size={48} color="#10b981" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '4px' }}>Occupied Rooms</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.totalRooms - stats.availableRooms}</div></div>
                  <Icons.Lock size={48} color="#f59e0b" />
                </div>
                <div style={{ marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Availability Rate</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--soft-blue-dark)' }}>
                    {stats.totalRooms > 0 ? Math.round((stats.availableRooms / stats.totalRooms) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Today's Attendance Table (full — privileged only) ── */}
          {stats.todayAttendance && (
            <div className="role-section" style={{ marginTop: '24px' }}>
              <div className="role-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icons.Users size={18} /> Today's Attendance</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '3px 12px', border: '1px solid #86efac' }}>
                    {stats.todayAttendance.total} entered today
                  </span>
                  <button onClick={loadStats} style={{ padding: '4px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>↺ Refresh</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, padding: '0 4px' }}>
                {[
                  { label: 'Currently In',  value: stats.todayAttendance.checkedIn,  color: '#10b981', bg: '#f0fdf4' },
                  { label: 'Checked Out',   value: stats.todayAttendance.checkedOut, color: '#3b82f6', bg: '#eff6ff' },
                  { label: 'Via QR Scan',   value: stats.todayAttendance.viaQR,      color: '#0ea5e9', bg: '#f0f9ff' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ flex: '1 1 120px', background: bg, border: `1px solid ${color}33`, borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
              {stats.todayAttendance.recent.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted-text)', background: '#f8fafc', borderRadius: 12 }}>
                  No members have entered the building today yet
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="innovator-table" style={{ minWidth: 900 }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: 36 }}>#</th>
                        <th style={{ minWidth: 180 }}>Name</th>
                        <th style={{ minWidth: 130 }}>Phone</th>
                        <th style={{ minWidth: 200 }}>Email</th>
                        <th style={{ minWidth: 100 }}>Membership</th>
                        <th style={{ minWidth: 100 }}>Role</th>
                        <th style={{ minWidth: 110 }}>Account Type</th>
                        <th style={{ minWidth: 100 }}>Check-in</th>
                        <th style={{ minWidth: 100 }}>Check-out</th>
                        <th style={{ minWidth: 90 }}>Status</th>
                        <th style={{ minWidth: 110 }}>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.todayAttendance.recent.map((entry, i) => {
                        const rc = roleColor(entry.role);
                        return (
                          <tr key={entry._id}
                            onMouseOver={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseOut={e  => (e.currentTarget.style.background = '')}
                            style={{ transition: 'background 0.1s' }}
                          >
                            <td style={{ fontWeight: 700, color: 'var(--soft-blue-dark)' }}>{i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: entry.authMethod === 'qr' ? 'linear-gradient(135deg,#0ea5e9,#0284c7)' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(entry.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{entry.fullName}</div>
                                  {entry.authMethod === 'qr' && <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600, marginTop: 1 }}><QrCode size={11} style={{ marginRight: 3 }} />QR Entry</div>}
                                </div>
                              </div>
                            </td>
                            <td>{entry.phone ? <a href={`tel:${entry.phone}`} style={{ color: '#0284c7', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>📞 {entry.phone}</a> : <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>}</td>
                            <td style={{ fontSize: 13 }}>{entry.email ? <a href={`mailto:${entry.email}`} style={{ color: '#6366f1', textDecoration: 'none' }}>{entry.email}</a> : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                            <td>{entry.membership ? <span style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: 20, padding: '2px 10px', fontWeight: 600, fontSize: 12 }}>{entry.membership}</span> : <span style={{ color: '#cbd5e1', fontSize: 13 }}>None</span>}</td>
                            <td>{entry.role ? <span style={{ background: rc.bg, color: rc.color, borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>{entry.role}</span> : <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>}</td>
                            <td style={{ fontSize: 13, color: '#475569' }}>{entry.accountType ? entry.accountType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                            <td><span style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}><LogIn size={13} style={{ marginRight: 4 }} />{fmtTime(entry.checkInTime)}</span></td>
                            <td>{entry.checkOutTime ? <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}><LogOut size={13} style={{ marginRight: 4 }} />{fmtTime(entry.checkOutTime)}</span> : <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>}</td>
                            <td>{entry.status === 'checked_in' ? <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>✓ In</span> : <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>↑ Out</span>}</td>
                            <td>
                              {entry.authMethod === 'qr'          && <span style={{ background: '#e0f2fe', color: '#0284c7', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}><QrCode size={12} style={{ marginRight: 4 }} />QR Scan</span>}
                              {entry.authMethod === 'fingerprint' && <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}><Fingerprint size={12} style={{ marginRight: 4 }} />Fingerprint</span>}
                              {entry.authMethod === 'manual'      && <span style={{ color: '#64748b', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}><Hand size={13} style={{ marginRight: 4 }} />Manual</span>}
                              {entry.authMethod === 'password'    && <span style={{ color: '#64748b', fontSize: 13, display: 'inline-flex', alignItems: 'center' }}><KeyRound size={13} style={{ marginRight: 4 }} />Password</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          REGULAR USER VIEW — personal stats only
      ══════════════════════════════════════════════════════════════════ */}
      {!isPrivileged && (
        <>
          {/* Personal quick-stat cards */}
          <div className="stat-cards">
            <StatCard type="requests" value={stats.totalRequests.toLocaleString()} label="My Total Requests" color="orange" notifications={stats.pendingRequests} onClick={() => navigate('/requests')} />
            <StatCard type="rooms"    value={stats.availableRooms.toLocaleString()} label="Available Rooms"   color="green"  onClick={() => navigate('/requests')} />
            <StatCard type="reports"  value={stats.openReports.toLocaleString()}    label="Open Reports"      color="gray" />
          </div>

          {/* Today's personal sign-in status */}
          <div className="role-section" style={{ marginTop: 24, marginBottom: 24 }}>
            <div className="role-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icons.Users size={18} /> My Attendance Today
            </div>

            {myAttendanceLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading your attendance…</div>
            ) : myAttendance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: myAttendance.status === 'checked_in' ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${myAttendance.status === 'checked_in' ? '#86efac' : '#e2e8f0'}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: myAttendance.status === 'checked_in' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    myAttendance.status === 'checked_in' ? <CheckCircle2 size={22} color='#fff' /> : <CircleDot size={22} color='#fff' />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                      {myAttendance.status === 'checked_in' ? 'You are checked in' : 'You have checked out'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                      {myAttendance.status === 'checked_in'
                        ? `Checked in at ${fmtTime(myAttendance.checkInTime)}`
                        : `Checked out at ${fmtTime(myAttendance.checkOutTime)}`}
                    </div>
                  </div>
                </div>

                {/* Time details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Check-in Time</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: '#166534', fontVariantNumeric: 'tabular-nums' }}><LogIn size={16} style={{ marginRight: 6 }} />{fmtTime(myAttendance.checkInTime)}</div>
                  </div>
                  <div style={{ background: myAttendance.checkOutTime ? '#eff6ff' : '#f8fafc', borderRadius: 12, padding: '14px 16px', border: `1px solid ${myAttendance.checkOutTime ? '#bfdbfe' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: myAttendance.checkOutTime ? '#1d4ed8' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Check-out Time</div>
                    <div style={{ fontWeight: 800, fontSize: 20, color: myAttendance.checkOutTime ? '#1e40af' : '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                      {myAttendance.checkOutTime ? <><LogOut size={16} style={{ marginRight: 6 }} />{fmtTime(myAttendance.checkOutTime)}</> : '— Not yet'}
                    </div>
                  </div>
                </div>

                {/* Auth method */}
                <div style={{ background: '#fafbfd', borderRadius: 10, padding: '10px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                  <span style={{ fontWeight: 600 }}>Entry method:</span>
                  {myAttendance.authMethod === 'qr'          && <span style={{ background: '#e0f2fe', color: '#0284c7', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}><QrCode size={12} style={{ marginRight: 4 }} />QR Scan</span>}
                  {myAttendance.authMethod === 'fingerprint' && <span style={{ background: '#f5f3ff', color: '#7c3aed', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}><Fingerprint size={12} style={{ marginRight: 4 }} />Fingerprint</span>}
                  {myAttendance.authMethod === 'manual'      && <span style={{ fontWeight: 700 }}><Hand size={13} style={{ marginRight: 4 }} />Manual</span>}
                  {myAttendance.authMethod === 'password'    && <span style={{ fontWeight: 700 }}><KeyRound size={13} style={{ marginRight: 4 }} />Password</span>}
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', background: '#fef9f0', borderRadius: 14, border: '1.5px dashed #fbbf24' }}>
                <ClipboardList size={36} color="#f59e0b" style={{ marginBottom: 10 }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', marginBottom: 6 }}>Not signed in yet today</div>
                <div style={{ fontSize: 13, color: '#b45309' }}>Visit the reception desk or scan your ID card to sign in.</div>
              </div>
            )}
          </div>

          {/* Personal attendance trend chart */}
          <div className="role-section" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="role-title" style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icons.Users size={18} /> My Attendance History
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {chartPeriod === 'daily'   && `Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`}
                  {chartPeriod === 'weekly'  && 'Last 7 days'}
                  {chartPeriod === 'monthly' && 'Last 6 months'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 0, background: '#f1f5f9', borderRadius: 10, padding: 3, border: '1px solid #e2e8f0', flexShrink: 0 }}>
                {(['daily', 'weekly', 'monthly'] as AttendancePeriod[]).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: chartPeriod === p ? 700 : 500, fontSize: 13, background: chartPeriod === p ? 'white' : 'transparent', color: chartPeriod === p ? '#1e40af' : '#64748b', boxShadow: chartPeriod === p ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s', textTransform: 'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative', height: 220, background: '#fafbfd', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', padding: '6px 4px 4px' }}>
              {chartLoading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <div style={{ textAlign: 'center' }}><BarChart2 size={30} color="#94a3b8" style={{ marginBottom: 8 }} /><div style={{ fontSize: 13 }}>Loading…</div></div>
                </div>
              ) : chartData.every(d => d.entries === 0) ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <div style={{ textAlign: 'center' }}><Inbox size={32} color="#94a3b8" style={{ marginBottom: 8 }} /><div style={{ fontSize: 13, fontWeight: 500 }}>No attendance data for this period</div></div>
                </div>
              ) : (
                <AttendanceChart data={chartData} period={chartPeriod} />
              )}
            </div>
          </div>

          {/* Room availability info — useful for user to know before requesting */}
          <div className="role-section">
            <div className="role-title">Room Availability</div>
            <div className="guard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '4px' }}>Available Rooms</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{stats.availableRooms}</div></div>
                <Icons.CheckCircle size={48} color="#10b981" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: '14px', color: 'var(--muted-text)', marginBottom: '4px' }}>Occupied Rooms</div><div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{stats.totalRooms - stats.availableRooms}</div></div>
                <Icons.Lock size={48} color="#f59e0b" />
              </div>
              <button onClick={() => navigate('/requests')} style={{ padding: '12px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
                Request a Room <ArrowRight size={16} style={{ marginLeft: 6 }} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Dashboard;