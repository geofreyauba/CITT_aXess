// src/pages/Reports.tsx
import React, { useMemo, useState } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';

type RequestStatus = 'pending' | 'approved' | 'completed';

interface KeyRequest {
  id: number;
  requestedBy: string;      // student/staff name or ID
  roomName: string;
  roomCode: string;
  purpose: string;
  devices: string;
  requestedDate: string;    // ISO
  startTime: string;
  durationHours: number;
  status: RequestStatus;
}

// Sample data - COMPLETELY REMOVED #1004 rejected entry
const sampleRequests: KeyRequest[] = [
  {
    id: 1001,
    requestedBy: "Alice Johnson (STU-2341)",
    roomName: "Maker Studio",
    roomCode: "A-012",
    purpose: "3D printing workshop for final year project",
    devices: "Laptop, 3D printer filament",
    requestedDate: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    startTime: "10:00",
    durationHours: 3,
    status: "approved",
  },
  {
    id: 1002,
    requestedBy: "Bob Mwangi (STU-1890)",
    roomName: "AI Innovation Lab",
    roomCode: "B-205",
    purpose: "Team coding session for hackathon prep",
    devices: "2 laptops, external monitor",
    requestedDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    startTime: "14:30",
    durationHours: 4,
    status: "pending",
  },
  {
    id: 1003,
    requestedBy: "Carol Peter (STA-045)",
    roomName: "Media Room",
    roomCode: "L-115",
    purpose: "Guest lecture recording",
    devices: "Projector, camera equipment",
    requestedDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    startTime: "09:00",
    durationHours: 2,
    status: "completed",
  },
  {
    id: 1005,
    requestedBy: "Eva Santos (STU-4321)",
    roomName: "Maker Studio",
    roomCode: "A-012",
    purpose: "Prototype testing",
    devices: "Arduino kits, soldering tools",
    requestedDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    startTime: "15:00",
    durationHours: 3,
    status: "approved",
  },
];

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const statusToBadge = (status: RequestStatus): BadgeVariant => {
  switch (status) {
    case 'pending': return 'pending';
    case 'approved': return 'returned';
    case 'completed': return 'returned';
    default: return 'restricted';
  }
};

const Reports: React.FC = () => {
  const [requests, setRequests] = useState<KeyRequest[]>(sampleRequests);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return requests
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (q) {
          return (
            r.requestedBy.toLowerCase().includes(q) ||
            r.roomName.toLowerCase().includes(q) ||
            r.roomCode.toLowerCase().includes(q) ||
            r.purpose.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
  }, [requests, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  // Analytics calculations
  const totalRequests = requests.length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const approvalRate = totalRequests ? Math.round((approvedCount / totalRequests) * 100) : 0;

  // Most used rooms
  const roomUsage = useMemo(() => {
    const map = new Map<string, number>();
    requests.forEach(r => {
      const key = `${r.roomName} (${r.roomCode})`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [requests]);

  const maxUsage = roomUsage.length ? Math.max(...roomUsage.map(r => r.count)) : 1;

  const exportCSV = () => {
    const headers = ['ID', 'Requested By', 'Room', 'Purpose', 'Date', 'Start Time', 'Duration (hrs)', 'Status'];
    const rows = filtered.map(r => [
      r.id,
      `"${r.requestedBy}"`,
      `"${r.roomName} (${r.roomCode})"`,
      `"${r.purpose.replace(/"/g, '""')}"`,
      r.requestedDate,
      r.startTime,
      r.durationHours,
      r.status,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="section-title">Key Requests & Analytics</h1>
        <button className="reports-export" onClick={exportCSV}>
          <Icons.BarChart size={18} /> Export CSV
        </button>
      </div>

      {/* Top Stats */}
      <div className="stat-cards" style={{ marginBottom: '2rem' }}>
        <div className="stat-card blue">
          <div className="stat-card-icon">
            <Icons.FileText size={28} />
          </div>
          <div className="stat-card-value">{totalRequests}</div>
          <div className="stat-card-label">Total Requests</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-card-icon">
            <Icons.Clock size={28} />
          </div>
          <div className="stat-card-value">{pendingCount}</div>
          <div className="stat-card-label">Pending Approval</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon">
            <Icons.CheckCircle size={28} />
          </div>
          <div className="stat-card-value">{approvedCount}</div>
          <div className="stat-card-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon">
            <Icons.BarChart size={28} />
          </div>
          <div className="stat-card-value">{approvalRate}%</div>
          <div className="stat-card-label">Approval Rate</div>
        </div>
      </div>

      <div className="reports-grid">
        {/* Main Table Section */}
        <div className="help-card">
          <div className="card-header">
            <Icons.FileText size={22} />
            <h2>All Key Requests</h2>
          </div>

          {/* Filters */}
          <div className="filters-card">
            <input
              className="modal-input"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, room, or purpose..."
            />

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Table */}
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requested By</th>
                  <th>Room</th>
                  <th>Purpose</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.id}>
                    <td><strong>#{r.id}</strong></td>
                    <td>{r.requestedBy}</td>
                    <td>{r.roomName} <span style={{ color: 'var(--muted-text)' }}>({r.roomCode})</span></td>
                    <td>{r.purpose}</td>
                    <td>{formatDate(r.requestedDate)}</td>
                    <td>
                      <Badge variant={statusToBadge(r.status)}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="empty-table">No matching requests</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>Page {page} of {totalPages}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="cancel-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
              <button className="save-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          </div>
        </div>

        {/* Analytics Sidebar */}
        <div className="analytics-panel">
          <div className="help-card">
            <div className="card-header">
              <Icons.BarChart size={22} />
              <h2>Most Used Rooms</h2>
            </div>

            <div className="top-rooms-list">
              {roomUsage.map((room, i) => (
                <div key={i} className="room-usage-item">
                  <div className="room-name">{room.name}</div>
                  <div className="usage-bar-container">
                    <div
                      className="usage-bar"
                      style={{ width: `${(room.count / maxUsage) * 100}%` }}
                    />
                  </div>
                  <div className="room-count">{room.count} requests</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;