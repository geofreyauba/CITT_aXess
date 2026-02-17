// src/pages/Reports.tsx - Actually shows KEY REQUESTS from database
import React, { useMemo, useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { requestsAPI } from '../lib/api';

interface KeyRequest {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    phone?: string;
    email?: string;
  };
  roomId: {
    _id: string;
    name: string;
    code: string;
  };
  carriedItems?: string;
  membership?: string;
  phone?: string;
  status: 'pending' | 'approved' | 'returned';
  requestedAt: string;
  returnedAt?: string;
  createdAt: string;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { 
  day: '2-digit', 
  month: 'short', 
  year: 'numeric' 
});

const statusToBadge = (status: string): BadgeVariant => {
  switch (status) {
    case 'pending': return 'pending';
    case 'approved': return 'returned';
    case 'returned': return 'returned';
    default: return 'restricted';
  }
};

const Reports: React.FC = () => {
  const [requests, setRequests] = useState<KeyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'returned'>('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await requestsAPI.getAllRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      alert('Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return requests
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (q) {
          return (
            r.userId?.fullName?.toLowerCase().includes(q) ||
            r.userId?.email?.toLowerCase().includes(q) ||
            r.userId?.phone?.toLowerCase().includes(q) ||
            r.phone?.toLowerCase().includes(q) ||
            r.roomId?.name?.toLowerCase().includes(q) ||
            r.roomId?.code?.toLowerCase().includes(q) ||
            (r.carriedItems || '').toLowerCase().includes(q) ||
            (r.membership || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }, [requests, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  // Analytics calculations
  const totalRequests = requests.length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'returned').length;
  const approvalRate = totalRequests ? Math.round((approvedCount / totalRequests) * 100) : 0;

  // Most used rooms
  const roomUsage = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number }>();
    requests.forEach(r => {
      if (!r.roomId) return;
      const key = r.roomId._id;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, {
          name: r.roomId.name,
          code: r.roomId.code,
          count: 1
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [requests]);

  const maxUsage = roomUsage.length ? Math.max(...roomUsage.map(r => r.count)) : 1;

  const exportCSV = () => {
    const headers = ['ID', 'Requested By', 'Email', 'Phone', 'Room', 'Carried Items', 'Membership', 'Date', 'Status', 'Returned At'];
    const rows = filtered.map(r => [
      r._id,
      `"${r.userId?.fullName || 'Unknown'}"`,
      `"${r.userId?.email || ''}"`,
      `"${r.phone || r.userId?.phone || ''}"`,
      `"${r.roomId?.name || 'Unknown'} (${r.roomId?.code || ''})"`,
      `"${(r.carriedItems || '').replace(/"/g, '""')}"`,
      `"${r.membership || ''}"`,
      r.requestedAt,
      r.status,
      r.returnedAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading requests...</div>;
  }

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
              placeholder="Search by name, email, phone, room, items, or membership..."
            />

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          {/* Table */}
          <div className="history-table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Requested By</th>
                  <th>Phone</th>
                  <th>Room</th>
                  <th>Carried Items</th>
                  <th>Membership</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.userId?.fullName || 'Unknown'}</strong>
                      {r.userId?.email && (
                        <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                          {r.userId.email}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.phone || r.userId?.phone || '—'}
                    </td>
                    <td>
                      {r.roomId?.name || 'Unknown'}{' '}
                      <span style={{ color: 'var(--muted-text)' }}>
                        ({r.roomId?.code || ''})
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      {r.carriedItems || '—'}
                    </td>
                    <td>
                      {r.membership || '—'}
                    </td>
                    <td>{formatDate(r.requestedAt)}</td>
                    <td>
                      <Badge variant={statusToBadge(r.status)}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-table">
                      No matching requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <div>Page {page} of {totalPages}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="cancel-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                className="save-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
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
              {roomUsage.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No data yet
                </div>
              ) : (
                roomUsage.map((room, i) => (
                  <div key={i} className="room-usage-item">
                    <div className="room-name">
                      {room.name} ({room.code})
                    </div>
                    <div className="usage-bar-container">
                      <div
                        className="usage-bar"
                        style={{ width: `${(room.count / maxUsage) * 100}%` }}
                      />
                    </div>
                    <div className="room-count">{room.count} requests</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Most Active Users */}
          <div className="help-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <Icons.Users size={22} />
              <h2>Most Active Users</h2>
            </div>

            <div className="top-rooms-list">
              {(() => {
                const userMap = new Map<string, { name: string; count: number }>();
                requests.forEach(r => {
                  if (!r.userId) return;
                  const key = r.userId._id;
                  const existing = userMap.get(key);
                  if (existing) {
                    existing.count++;
                  } else {
                    userMap.set(key, {
                      name: r.userId.fullName || 'Unknown',
                      count: 1
                    });
                  }
                });
                const topUsers = Array.from(userMap.values())
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5);
                const maxUserCount = topUsers.length ? Math.max(...topUsers.map(u => u.count)) : 1;

                return topUsers.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-text)' }}>
                    No data yet
                  </div>
                ) : (
                  topUsers.map((user, i) => (
                    <div key={i} className="room-usage-item">
                      <div className="room-name">{user.name}</div>
                      <div className="usage-bar-container">
                        <div
                          className="usage-bar"
                          style={{ 
                            width: `${(user.count / maxUserCount) * 100}%`,
                            backgroundColor: '#3b82f6'
                          }}
                        />
                      </div>
                      <div className="room-count">{user.count} requests</div>
                    </div>
                  ))
                );
              })()}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="help-card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <Icons.Clock size={22} />
              <h2>Recent Activity</h2>
            </div>

            <div style={{ padding: '0.5rem 0' }}>
              {requests.slice(0, 5).map((r, i) => (
                <div 
                  key={r._id} 
                  style={{
                    padding: '0.75rem',
                    borderBottom: i < 4 ? '1px solid rgba(15,23,42,0.06)' : 'none',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {r.userId?.fullName || 'Unknown'}
                  </div>
                  <div style={{ color: 'var(--muted-text)', marginBottom: '4px' }}>
                    {r.roomId?.name || 'Unknown'} ({r.roomId?.code || '—'})
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
                      {formatDate(r.requestedAt)}
                    </span>
                    <Badge variant={statusToBadge(r.status)}>
                      {r.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-text)' }}>
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reports;