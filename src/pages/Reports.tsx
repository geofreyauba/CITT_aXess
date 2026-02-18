// src/pages/Reports.tsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { requestsAPI } from '../lib/api';

// --- Interfaces ---

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
  requestedBy?: {
    _id: string;
    fullName: string;
    role?: string;
  };
  isAdminRequest?: boolean;
  carriedItems?: string;
  membership?: string;
  phone?: string;
  status: 'pending' | 'approved' | 'returned';
  returnApprovalStatus?: 'none' | 'pending_approval' | 'approved' | 'rejected';
  requestedAt: string;
  returnedAt?: string;
  returnRequestedAt?: string;
  createdAt: string;
}

// --- Helpers ---

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDateTime = (iso?: string) => {
  if (!iso) return '\u2014';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const statusToBadge = (status: string): BadgeVariant => {
  switch (status) {
    case 'pending':  return 'pending';
    case 'approved': return 'returned';
    case 'returned': return 'returned';
    default:         return 'restricted';
  }
};

// --- Pulsing notification dot ---

const PulsingDot: React.FC = () => (
  <>
    <style>{`
      @keyframes rp-ping {
        0%   { transform: scale(1);   opacity: 0.8; }
        70%  { transform: scale(2.4); opacity: 0; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes rp-solid {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.55; }
      }
      .rp-wrap  { position:absolute; top:10px; right:10px; width:14px; height:14px; }
      .rp-ping  { position:absolute; inset:0; border-radius:50%; background:#ef4444; animation:rp-ping 1.3s cubic-bezier(0,0,0.2,1) infinite; }
      .rp-solid { position:absolute; inset:2px; border-radius:50%; background:#ef4444; animation:rp-solid 1.3s ease-in-out infinite; }
    `}</style>
    <span className="rp-wrap" title="Action required urgently!">
      <span className="rp-ping" />
      <span className="rp-solid" />
    </span>
  </>
);

// --- Component ---

const Reports: React.FC = () => {
  const [requests, setRequests]         = useState<KeyRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [query, setQuery]               = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'returned'>('all');
  const [page, setPage]                 = useState(1);
  const perPage = 10;

  const [showModal, setShowModal]           = useState(false);
  const [pendingList, setPendingList]       = useState<KeyRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actioningId, setActioningId]       = useState<string | null>(null);

  // Data loading

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser.role !== 'admin') {
        throw new Error('You must be an admin to view all requests. Your current role: ' + (currentUser.role || 'unknown'));
      }
      const data = await requestsAPI.getAllRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      alert((err.message || 'Failed to load requests') + '\n\nPlease contact an administrator to update your role in the database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Pending modal

  const openPendingModal = useCallback(async () => {
    setShowModal(true);
    setPendingLoading(true);
    try {
      const data = await requestsAPI.getPendingReturns();
      setPendingList(data);
    } catch (err: any) {
      alert('Failed to load pending returns: ' + err.message);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this return?\n\nThe key will be marked as returned and the room will become available again.')) return;
    setActioningId(id);
    try {
      await requestsAPI.approveReturn(id);
      setPendingList(prev => prev.filter(r => r._id !== id));
      const data = await requestsAPI.getAllRequests();
      setRequests(data);
    } catch (err: any) {
      alert('Failed to approve return: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this return request?\n\nThe user will need to re-submit their sign-out.')) return;
    setActioningId(id);
    try {
      await requestsAPI.rejectReturn(id);
      setPendingList(prev => prev.filter(r => r._id !== id));
      const data = await requestsAPI.getAllRequests();
      setRequests(data);
    } catch (err: any) {
      alert('Failed to reject return: ' + err.message);
    } finally {
      setActioningId(null);
    }
  };

  // Filtering

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
  const shown      = filtered.slice((page - 1) * perPage, page * perPage);

  // Analytics

  const totalRequests = requests.length;
  const pendingCount  = requests.filter(r => r.returnApprovalStatus === 'pending_approval').length;
  const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'returned').length;
  const approvalRate  = totalRequests ? Math.round((approvedCount / totalRequests) * 100) : 0;

  const roomUsage = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number }>();
    requests.forEach(r => {
      if (!r.roomId) return;
      const ex = map.get(r.roomId._id);
      if (ex) { ex.count++; }
      else { map.set(r.roomId._id, { name: r.roomId.name, code: r.roomId.code, count: 1 }); }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [requests]);

  const maxUsage = roomUsage.length ? Math.max(...roomUsage.map(r => r.count)) : 1;

  // CSV export

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
      r.requestedAt, r.status, r.returnedAt || '',
    ]);
    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `key-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading requests...</div>;

  return (
    <>
      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h1 className="section-title">Key Requests &amp; Analytics</h1>
        <button className="reports-export" onClick={exportCSV}>
          <Icons.BarChart size={18} /> Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="stat-cards" style={{ marginBottom:'2rem' }}>

        <div className="stat-card blue">
          <div className="stat-card-icon"><Icons.FileText size={28} /></div>
          <div className="stat-card-value">{totalRequests}</div>
          <div className="stat-card-label">Total Requests</div>
        </div>

        {/* PENDING APPROVAL - clickable with pulsing red dot */}
        <div
          className="stat-card orange"
          onClick={openPendingModal}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openPendingModal(); }}
          style={{ cursor:'pointer', transition:'transform 0.15s, box-shadow 0.15s', position:'relative' }}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 28px rgba(245,158,11,0.3)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
          title="Click to review pending return approvals"
        >
          {pendingCount > 0 && <PulsingDot />}
          <div className="stat-card-icon"><Icons.Clock size={28} /></div>
          <div className="stat-card-value">{pendingCount}</div>
          <div className="stat-card-label">Pending Approval</div>
          {pendingCount > 0 && (
            <div style={{
              marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              fontSize:11, fontWeight:700, color:'#92400e', background:'#fef3c7',
              borderRadius:20, padding:'3px 10px',
            }}>
              <Icons.AlertTriangle size={11} />
              Action Required
            </div>
          )}
        </div>

        <div className="stat-card green">
          <div className="stat-card-icon"><Icons.CheckCircle size={28} /></div>
          <div className="stat-card-value">{approvedCount}</div>
          <div className="stat-card-label">Approved</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon"><Icons.BarChart size={28} /></div>
          <div className="stat-card-value">{approvalRate}%</div>
          <div className="stat-card-label">Approval Rate</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="reports-grid">

        {/* Table */}
        <div className="help-card">
          <div className="card-header">
            <Icons.FileText size={22} />
            <h2>All Key Requests</h2>
          </div>

          <div className="filters-card">
            <input
              className="modal-input"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, email, phone, room, items, or membership..."
            />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="returned">Returned</option>
            </select>
          </div>

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
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <strong>{r.userId?.fullName || 'Unknown'}</strong>
                        {r.isAdminRequest && r.requestedBy && (
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:4,
                            background:'#ede9fe', color:'#5b21b6',
                            borderRadius:6, padding:'2px 7px', fontSize:10, fontWeight:700,
                          }}>
                            <Icons.Shield size={9} />
                            Admin ({r.requestedBy.fullName})
                          </span>
                        )}
                      </div>
                      {r.userId?.email && (
                        <div style={{ fontSize:'11px', color:'var(--muted-text)', marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                          <Icons.Mail size={10} />
                          {r.userId.email}
                        </div>
                      )}
                    </td>
                    <td>
                      {(r.phone || r.userId?.phone) ? (
                        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <Icons.Phone size={12} color="var(--muted-text)" />
                          {r.phone || r.userId?.phone}
                        </span>
                      ) : '\u2014'}
                    </td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Icons.Key size={12} color="var(--muted-text)" />
                        {r.roomId?.name || 'Unknown'}
                        <span style={{ color:'var(--muted-text)' }}>({r.roomId?.code || ''})</span>
                      </span>
                    </td>
                    <td style={{ maxWidth:'200px' }}>{r.carriedItems || '\u2014'}</td>
                    <td>{r.membership || '\u2014'}</td>
                    <td>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Icons.Calendar size={12} color="var(--muted-text)" />
                        {formatDate(r.requestedAt)}
                      </span>
                    </td>
                    <td>
                      <Badge variant={statusToBadge(r.status)}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={7} className="empty-table">No matching requests</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1rem' }}>
            <div>Page {page} of {totalPages}</div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button className="cancel-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>Previous</button>
              <button className="save-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next</button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="analytics-panel">

          <div className="help-card">
            <div className="card-header"><Icons.BarChart size={22} /><h2>Most Used Rooms</h2></div>
            <div className="top-rooms-list">
              {roomUsage.length === 0
                ? <div style={{ padding:'1rem', textAlign:'center', color:'var(--muted-text)' }}>No data yet</div>
                : roomUsage.map((room, i) => (
                  <div key={i} className="room-usage-item">
                    <div className="room-name">{room.name} ({room.code})</div>
                    <div className="usage-bar-container">
                      <div className="usage-bar" style={{ width:`${(room.count/maxUsage)*100}%` }} />
                    </div>
                    <div className="room-count">{room.count} requests</div>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="help-card" style={{ marginTop:'1.5rem' }}>
            <div className="card-header"><Icons.Users size={22} /><h2>Most Active Users</h2></div>
            <div className="top-rooms-list">
              {(() => {
                const userMap = new Map<string,{name:string;count:number}>();
                requests.forEach(r => {
                  if (!r.userId) return;
                  const ex = userMap.get(r.userId._id);
                  if (ex) { ex.count++; } else { userMap.set(r.userId._id,{name:r.userId.fullName||'Unknown',count:1}); }
                });
                const top = Array.from(userMap.values()).sort((a,b)=>b.count-a.count).slice(0,5);
                const mx  = top.length ? Math.max(...top.map(u=>u.count)) : 1;
                return top.length===0
                  ? <div style={{ padding:'1rem', textAlign:'center', color:'var(--muted-text)' }}>No data yet</div>
                  : top.map((u,i) => (
                    <div key={i} className="room-usage-item">
                      <div className="room-name">{u.name}</div>
                      <div className="usage-bar-container">
                        <div className="usage-bar" style={{ width:`${(u.count/mx)*100}%`, backgroundColor:'#3b82f6' }} />
                      </div>
                      <div className="room-count">{u.count} requests</div>
                    </div>
                  ));
              })()}
            </div>
          </div>

          <div className="help-card" style={{ marginTop:'1.5rem' }}>
            <div className="card-header"><Icons.Activity size={22} /><h2>Recent Activity</h2></div>
            <div style={{ padding:'0.5rem 0' }}>
              {requests.slice(0,5).map((r,i) => (
                <div key={r._id} style={{ padding:'0.75rem', borderBottom:i<4?'1px solid rgba(15,23,42,0.06)':'none', fontSize:'13px' }}>
                  <div style={{ fontWeight:600, marginBottom:'4px', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <Icons.User size={12} color="var(--muted-text)" />
                    {r.userId?.fullName || 'Unknown'}
                    {r.isAdminRequest && r.requestedBy && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#ede9fe', color:'#5b21b6', borderRadius:6, padding:'2px 7px', fontSize:10, fontWeight:700 }}>
                        <Icons.Shield size={9} />
                        Admin ({r.requestedBy.fullName})
                      </span>
                    )}
                  </div>
                  <div style={{ color:'var(--muted-text)', marginBottom:'4px', display:'flex', alignItems:'center', gap:5 }}>
                    <Icons.Key size={11} />
                    {r.roomId?.name||'Unknown'} ({r.roomId?.code||'\u2014'})
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'11px', color:'var(--muted-text)', display:'flex', alignItems:'center', gap:4 }}>
                      <Icons.Calendar size={11} />
                      {formatDate(r.requestedAt)}
                    </span>
                    <Badge variant={statusToBadge(r.status)}>{r.status}</Badge>
                  </div>
                </div>
              ))}
              {requests.length===0 && (
                <div style={{ padding:'1rem', textAlign:'center', color:'var(--muted-text)' }}>No recent activity</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PENDING RETURN APPROVALS MODAL */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'var(--white-glass,#fff)', borderRadius:18, width:'100%', maxWidth:820, maxHeight:'88vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(15,23,42,0.22)', border:'1px solid var(--glass-border,rgba(15,23,42,0.08))' }}
          >
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 28px 18px', borderBottom:'1px solid var(--glass-border,rgba(15,23,42,0.08))', position:'sticky', top:0, background:'var(--white-glass,#fff)', zIndex:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ background:'#fef3c7', borderRadius:12, width:46, height:46, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icons.Clock size={24} color="#d97706" />
                </div>
                <div>
                  <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:'var(--text,#0f172a)' }}>Pending Return Approvals</h2>
                  <p style={{ margin:'2px 0 0', fontSize:13, color:'var(--muted-text,#64748b)' }}>Verify the key is physically back, then approve or reject</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {pendingList.length > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fee2e2', color:'#991b1b', borderRadius:20, padding:'5px 14px', fontSize:13, fontWeight:700, border:'1px solid #fca5a5' }}>
                    <Icons.AlertTriangle size={14} />
                    {pendingList.length} Urgent
                  </div>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  style={{ width:36, height:36, borderRadius:'50%', border:'1px solid var(--glass-border,rgba(15,23,42,0.1))', background:'var(--surface,#f8fafc)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted-text,#64748b)' }}
                >
                  <Icons.X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding:'22px 28px' }}>
              {pendingLoading && (
                <div style={{ textAlign:'center', padding:'3rem', color:'var(--muted-text,#64748b)' }}>
                  <Icons.RefreshCw size={32} style={{ opacity:0.4, marginBottom:12 }} />
                  <p style={{ fontSize:14, marginTop:8 }}>Loading pending approvals...</p>
                </div>
              )}

              {!pendingLoading && pendingList.length === 0 && (
                <div style={{ textAlign:'center', padding:'3rem', color:'var(--muted-text,#64748b)' }}>
                  <div style={{ width:68, height:68, borderRadius:'50%', background:'#d1fae5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <Icons.CheckCircle size={34} color="#10b981" />
                  </div>
                  <p style={{ fontWeight:700, fontSize:17, margin:'0 0 6px', color:'var(--text,#0f172a)' }}>All clear!</p>
                  <p style={{ margin:0, fontSize:14 }}>No pending return approvals at the moment.</p>
                </div>
              )}

              {!pendingLoading && pendingList.length > 0 && (
                <>
                  <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#92400e' }}>
                    <Icons.AlertTriangle size={16} color="#d97706" />
                    <span>
                      <strong>{pendingList.length} return{pendingList.length!==1?'s':''}</strong> waiting for your approval. Please verify the key is physically back before approving.
                    </span>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {pendingList.map(req => (
                      <div
                        key={req._id}
                        style={{ background:'var(--surface,#f8fafc)', border:'1px solid var(--glass-border,rgba(15,23,42,0.08))', borderRadius:14, padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}
                      >
                        {/* Info row */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:20 }}>
                          <div style={{ flex:1, minWidth:170 }}>
                            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--muted-text,#94a3b8)', textTransform:'uppercase', marginBottom:5 }}>Member</div>
                            <div style={{ fontWeight:700, fontSize:15, color:'var(--text,#0f172a)', display:'flex', alignItems:'center', gap:6 }}>
                              <Icons.User size={14} color="var(--muted-text,#94a3b8)" />
                              {req.userId?.fullName || 'Unknown'}
                            </div>
                            {req.userId?.email && (
                              <div style={{ fontSize:12, color:'var(--muted-text,#64748b)', marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                                <Icons.Mail size={11} /> {req.userId.email}
                              </div>
                            )}
                            {(req.phone || req.userId?.phone) && (
                              <div style={{ fontSize:12, color:'var(--muted-text,#64748b)', marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                                <Icons.Phone size={11} /> {req.phone || req.userId?.phone}
                              </div>
                            )}
                          </div>
                          <div style={{ flex:1, minWidth:140 }}>
                            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--muted-text,#94a3b8)', textTransform:'uppercase', marginBottom:5 }}>Room</div>
                            <div style={{ fontWeight:700, fontSize:15, color:'var(--text,#0f172a)', display:'flex', alignItems:'center', gap:6 }}>
                              <Icons.Key size={14} color="var(--muted-text,#94a3b8)" />
                              {req.roomId?.name || 'Unknown'}
                            </div>
                            <div style={{ fontSize:12, color:'var(--muted-text,#64748b)', marginTop:3 }}>Code: <strong>{req.roomId?.code || '\u2014'}</strong></div>
                          </div>
                          <div style={{ flex:1, minWidth:120 }}>
                            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'var(--muted-text,#94a3b8)', textTransform:'uppercase', marginBottom:5 }}>Membership</div>
                            <div style={{ fontSize:14, color:'var(--text,#0f172a)' }}>{req.membership || '\u2014'}</div>
                          </div>
                        </div>

                        {req.carriedItems && (
                          <div style={{ background:'rgba(99,102,241,0.06)', borderRadius:8, padding:'9px 14px', fontSize:13, color:'var(--text,#0f172a)', display:'flex', alignItems:'flex-start', gap:8 }}>
                            <Icons.FileText size={14} color="#4f46e5" style={{ marginTop:1, flexShrink:0 }} />
                            <span><span style={{ fontWeight:700, color:'#4f46e5' }}>Items carried: </span>{req.carriedItems}</span>
                          </div>
                        )}

                        <div style={{ display:'flex', flexWrap:'wrap', gap:18, fontSize:12, color:'var(--muted-text,#64748b)' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <Icons.Calendar size={12} />
                            Key requested: <strong>{formatDateTime(req.requestedAt)}</strong>
                          </span>
                          {req.returnRequestedAt && (
                            <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <Icons.RefreshCw size={12} />
                              Return requested: <strong>{formatDateTime(req.returnRequestedAt)}</strong>
                            </span>
                          )}
                        </div>

                        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:6, borderTop:'1px solid var(--glass-border,rgba(15,23,42,0.07))' }}>
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={actioningId === req._id}
                            style={{ padding:'9px 22px', borderRadius:9, border:'1.5px solid #fca5a5', background:'#fff', color:'#dc2626', fontSize:13, fontWeight:700, cursor:actioningId===req._id?'not-allowed':'pointer', opacity:actioningId===req._id?0.5:1, transition:'all 0.15s', display:'flex', alignItems:'center', gap:7 }}
                          >
                            <Icons.XCircle size={15} />
                            {actioningId === req._id ? 'Processing...' : 'Reject Return'}
                          </button>
                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={actioningId === req._id}
                            style={{ padding:'9px 26px', borderRadius:9, border:'none', background:actioningId===req._id?'#d1d5db':'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor:actioningId===req._id?'not-allowed':'pointer', boxShadow:actioningId===req._id?'none':'0 3px 12px rgba(16,185,129,0.32)', transition:'all 0.15s', display:'flex', alignItems:'center', gap:7 }}
                          >
                            <Icons.CheckCircle size={15} />
                            {actioningId === req._id ? 'Processing...' : 'Approve Return'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Reports;