// src/pages/Reports.tsx
import React, { useMemo, useState } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';

type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

interface Report {
  id: number;
  title: string;
  roomName: string;
  roomCode: string;
  reportedBy: string;
  dateReportedIso: string;
  status: ReportStatus;
  priority: 'low' | 'medium' | 'high';
  description?: string;
  attachments?: string[]; // urls (sample)
}

// Sample reports data (replace with API in real app)
const sampleReports: Report[] = [
  {
    id: 9001,
    title: 'Broken door lock',
    roomName: 'Maker Studio',
    roomCode: 'A-012',
    reportedBy: 'alice',
    dateReportedIso: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: 'open',
    priority: 'high',
    description: 'The lock is loose and does not latch properly.',
  },
  {
    id: 9002,
    title: 'Projector flickering',
    roomName: 'Media Room',
    roomCode: 'L-115',
    reportedBy: 'bob',
    dateReportedIso: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: 'in_progress',
    priority: 'medium',
    description: 'Intermittent flicker while presenting slides.',
  },
  {
    id: 9003,
    title: '3D printer jam',
    roomName: '3D Printing Zone',
    roomCode: 'G-303',
    reportedBy: 'carol',
    dateReportedIso: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    status: 'resolved',
    priority: 'high',
    description: 'Filament jam in extruder. Cleared by maintenance.',
  },
  {
    id: 9004,
    title: 'Air conditioning noise',
    roomName: 'Collaboration Lounge',
    roomCode: 'I-001',
    reportedBy: 'dan',
    dateReportedIso: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    status: 'open',
    priority: 'low',
    description: 'Humming noise near the ceiling vents.',
  },
  {
    id: 9005,
    title: 'Broken chair',
    roomName: 'AI Innovation Lab',
    roomCode: 'B-205',
    reportedBy: 'eve',
    dateReportedIso: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'open',
    priority: 'low',
    description: 'Swivel mechanism broken, seat tilts forward.',
  },
];

// helper to format date/time nicely
const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

// map report status to badge variant (re-uses BadgeVariant)
const statusToBadge = (s: ReportStatus): BadgeVariant => {
  switch (s) {
    case 'open':
      return 'pending';
    case 'in_progress':
      return 'requested';
    case 'resolved':
      return 'returned';
    case 'dismissed':
      return 'restricted';
    default:
      return 'restricted';
  }
};

// map priority to small label color class (simple)
const priorityLabel = (p: Report['priority']) =>
  p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>(sampleReports);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Report['priority']>('all');
  const [page, setPage] = useState(1);
  const perPage = 8;

  // modal state for viewing details
  const [selected, setSelected] = useState<Report | null>(null);

  // Date range filters (simple ISO inputs)
  const [fromIso, setFromIso] = useState<string>('');
  const [toIso, setToIso] = useState<string>('');

  // Derived filtered list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (q) {
        const hay = `${r.title} ${r.roomName} ${r.roomCode} ${r.reportedBy} ${r.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (fromIso && new Date(r.dateReportedIso) < new Date(fromIso)) return false;
      if (toIso && new Date(r.dateReportedIso) > new Date(toIso)) return false;
      return true;
    }).sort((a, b) => new Date(b.dateReportedIso).getTime() - new Date(a.dateReportedIso).getTime());
  }, [reports, query, statusFilter, priorityFilter, fromIso, toIso]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  const openDetails = (r: Report) => setSelected(r);
  const closeDetails = () => setSelected(null);

  const markResolved = (id: number) => {
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status: 'resolved' } : r)));
  };

  const assignInProgress = (id: number) => {
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status: 'in_progress' } : r)));
  };

  const dismissReport = (id: number) => {
    if (!window.confirm('Dismiss this report?')) return;
    setReports(prev => prev.map(r => (r.id === id ? { ...r, status: 'dismissed' } : r)));
  };

  const exportCSV = () => {
    const headers = ['ID', 'Title', 'Room', 'Code', 'Reported By', 'Date', 'Status', 'Priority', 'Description'];
    const rows = filtered.map(r => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      r.roomName,
      r.roomCode,
      r.reportedBy,
      r.dateReportedIso,
      r.status,
      r.priority,
      `"${(r.description || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="section-title">Admin Reports</h1>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="save-btn" onClick={exportCSV} title="Export filtered reports as CSV">
            <Icons.BarChart size={14} /> Export
          </button>
        </div>
      </div>

      {/* Filters - nicer layout */}
      <div
        className="filters-card"
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 12,
          alignItems: 'center',
          padding: 12,
          borderRadius: 10,
          background: 'var(--card-bg, #fff)',
          boxShadow: 'var(--shadow-soft)',
          border: '1px solid rgba(15,23,42,0.04)'
        }}
      >
        <input
          className="modal-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search reports, rooms, reporter..."
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.08)',
            minWidth: 260,
            flex: '1 1 260px'
          }}
        />

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
          style={{
            padding: '8px',
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.08)',
            minWidth: 160,
            background: '#fff'
          }}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value as any); setPage(1); }}
          style={{
            padding: '8px',
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.08)',
            minWidth: 140,
            background: '#fff'
          }}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--gray-neutral)' }}>
            From
            <input
              type="date"
              value={fromIso ? fromIso.slice(0,10) : ''}
              onChange={e => { setFromIso(e.target.value ? new Date(e.target.value).toISOString() : ''); setPage(1); }}
              style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)' }}
              placeholder="mm/dd/yyyy"
            />
          </label>

          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--gray-neutral)' }}>
            To
            <input
              type="date"
              value={toIso ? toIso.slice(0,10) : ''}
              onChange={e => { setToIso(e.target.value ? new Date(e.target.value).toISOString() : ''); setPage(1); }}
              style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)' }}
              placeholder="mm/dd/yyyy"
            />
          </label>
        </div>

        {/* simple counts on the right */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--muted-bg, #fff)', boxShadow: 'var(--shadow-soft)', border: '1px solid rgba(15,23,42,0.04)', textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{reports.length}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-neutral)' }}>total reports</div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--muted-bg, #fff)', boxShadow: 'var(--shadow-soft)', border: '1px solid rgba(15,23,42,0.04)', textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{filtered.length}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-neutral)' }}>matching filters</div>
          </div>
        </div>
      </div>

      {/* Reports grid / table */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {/* responsive: show cards for small screens, table for larger screens */}
          <div style={{ display: 'block', overflowX: 'auto' }}>
            <table className="history-table" style={{ width: '100%', minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Title</th>
                  <th>Room</th>
                  <th>Reported By</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td style={{ color: '#111827', fontWeight: 600 }}>{r.title}</td>
                    <td>{r.roomName} <span style={{ color: '#6b7280' }}>({r.roomCode})</span></td>
                    <td>{r.reportedBy}</td>
                    <td>{formatDateTime(r.dateReportedIso)}</td>
                    <td>{priorityLabel(r.priority)}</td>
                    <td>
                      <Badge variant={statusToBadge(r.status)}>{r.status.replace('_', ' ').replace(/\b\w/g, s => s.toUpperCase())}</Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="save-btn"
                          onClick={() => openDetails(r)}
                          title="View details"
                        >
                          <Icons.Info size={14} /> Details
                        </button>

                        {r.status !== 'in_progress' && r.status !== 'resolved' && r.status !== 'dismissed' && (
                          <button
                            className="save-btn"
                            onClick={() => assignInProgress(r.id)}
                            title="Assign / mark in progress"
                          >
                            <Icons.Edit size={14} /> Assign
                          </button>
                        )}

                        {r.status !== 'resolved' && (
                          <button
                            className="save-btn"
                            onClick={() => markResolved(r.id)}
                            title="Mark resolved"
                          >
                            <Icons.Lock size={14} /> Resolve
                          </button>
                        )}

                        <button
                          className="cancel-btn"
                          onClick={() => dismissReport(r.id)}
                          title="Dismiss"
                        >
                          <Icons.Trash size={14} /> Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-table">No reports found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ color: '#6b7280' }}>Page {page} of {totalPages}</div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="cancel-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
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
      </div>

      {/* Details modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{selected.title}</span>
              <Badge variant={statusToBadge(selected.status)}>{selected.status.replace('_', ' ').replace(/\b\w/g, s => s.toUpperCase())}</Badge>
            </h2>

            <p style={{ color: '#6b7280', marginTop: 8 }}><strong>Room:</strong> {selected.roomName} ({selected.roomCode})</p>
            <p style={{ color: '#6b7280', marginTop: 6 }}><strong>Reported by:</strong> {selected.reportedBy}</p>
            <p style={{ color: '#6b7280', marginTop: 6 }}><strong>Date:</strong> {formatDateTime(selected.dateReportedIso)}</p>
            <p style={{ color: '#6b7280', marginTop: 6 }}><strong>Priority:</strong> {priorityLabel(selected.priority)}</p>

            {selected.description && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ color: '#111827' }}>Description</strong>
                <p style={{ color: '#374151', marginTop: 6 }}>{selected.description}</p>
              </div>
            )}

            {selected.attachments && selected.attachments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong style={{ color: '#111827' }}>Attachments</strong>
                <ul style={{ marginTop: 8 }}>
                  {selected.attachments.map((a, i) => (
                    <li key={i}><a href={a} target="_blank" rel="noreferrer">Attachment {i + 1}</a></li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="cancel-btn" onClick={closeDetails}>Close</button>
              {selected.status !== 'in_progress' && selected.status !== 'resolved' && selected.status !== 'dismissed' && (
                <button className="save-btn" onClick={() => { assignInProgress(selected.id); closeDetails(); }}>Assign</button>
              )}
              {selected.status !== 'resolved' && (
                <button className="save-btn" onClick={() => { markResolved(selected.id); closeDetails(); }}>Resolve</button>
              )}
              <button className="cancel-btn" onClick={() => { dismissReport(selected.id); closeDetails(); }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;