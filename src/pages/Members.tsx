// src/pages/Members.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Icons } from '../components/icons';
import { membersAPI } from '../lib/api';

interface Member {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  accountType: 'student' | 'non_student';
  institution?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  membership?: string;
  createdAt?: string;
}

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const perPage = 12;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await membersAPI.getAll();
      setMembers(data);
    } catch (err: any) {
      console.error('Failed to load members:', err);
      alert('Failed to load members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Approve ${name}?`)) return;
    
    try {
      setActionLoading(id);
      await membersAPI.approve(id);
      // Update local state
      setMembers(prev =>
        prev.map(m => (m._id === id ? { ...m, verificationStatus: 'approved' as const } : m))
      );
      alert(`${name} has been approved and notified via email!`);
    } catch (err: any) {
      console.error('Approve error:', err);
      alert('Failed to approve: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Reject ${name}? They will be notified via email.`)) return;
    
    try {
      setActionLoading(id);
      await membersAPI.reject(id);
      setMembers(prev =>
        prev.map(m => (m._id === id ? { ...m, verificationStatus: 'rejected' as const } : m))
      );
      alert(`${name} has been rejected and notified.`);
    } catch (err: any) {
      console.error('Reject error:', err);
      alert('Failed to reject: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}?`)) return;
    
    try {
      setActionLoading(id);
      await membersAPI.delete(id);
      setMembers(prev => prev.filter(m => m._id !== id));
      alert('Member deleted successfully');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    let result = members;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.institution || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(m => m.verificationStatus === statusFilter);
    }

    if (accountTypeFilter !== 'all') {
      result = result.filter(m => m.accountType === accountTypeFilter);
    }

    return result;
  }, [members, query, statusFilter, accountTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  const exportCSV = () => {
    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Account Type', 'Institution', 'Verification'];
    const rows = filtered.map(m => [
      m._id,
      `"${m.fullName.replace(/"/g, '""')}"`,
      m.email,
      m.phone,
      m.accountType,
      `"${(m.institution || '').replace(/"/g, '""')}"`,
      m.verificationStatus,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      approved: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
      pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    };
    const style = colors[status as keyof typeof colors] || colors.pending;
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        textTransform: 'capitalize'
      }}>
        {status}
      </span>
    );
  };

  const getAccountTypeBadge = (type: string) => {
    const isStudent = type === 'student';
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: isStudent ? '#dbeafe' : '#f3e8ff',
        color: isStudent ? '#1e40af' : '#6b21a8',
        textTransform: 'capitalize'
      }}>
        {type === 'student' ? 'Student' : 'Non-Student'}
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading members...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Members</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: 14 }}>
            Manage and view all registered members ({filtered.length} total)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="save-btn" onClick={exportCSV}>
            <Icons.BarChart size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        marginBottom: 20, 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        padding: '16px',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <input
          className="auth-input"
          placeholder="Search by name, email, or institution..."
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          style={{ minWidth: 300, maxWidth: 480, flex: 1 }}
        />
        
        <select
          className="auth-input"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 150 }}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="auth-input"
          value={accountTypeFilter}
          onChange={e => { setAccountTypeFilter(e.target.value); setPage(1); }}
          style={{ minWidth: 150 }}
        >
          <option value="all">All Types</option>
          <option value="student">Student</option>
          <option value="non_student">Non-Student</option>
        </select>

        {(query || statusFilter !== 'all' || accountTypeFilter !== 'all') && (
          <button 
            className="cancel-btn"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
              setAccountTypeFilter('all');
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ 
          padding: 16, 
          backgroundColor: 'var(--card-bg)', 
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--muted-text)', marginBottom: 4 }}>Total Members</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{members.length}</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: 'var(--card-bg)', 
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--muted-text)', marginBottom: 4 }}>Approved</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
            {members.filter(m => m.verificationStatus === 'approved').length}
          </div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: 'var(--card-bg)', 
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--muted-text)', marginBottom: 4 }}>Pending</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>
            {members.filter(m => m.verificationStatus === 'pending').length}
          </div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: 'var(--card-bg)', 
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--muted-text)', marginBottom: 4 }}>Students</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
            {members.filter(m => m.accountType === 'student').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 16 }}>
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Account Type</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m._id}>
                  <td style={{ color: 'var(--text)', fontWeight: 600 }}>{m.fullName}</td>
                  <td style={{ color: 'var(--muted-text)' }}>{m.email}</td>
                  <td style={{ color: 'var(--muted-text)' }}>{m.phone}</td>
                  <td>{getAccountTypeBadge(m.accountType)}</td>
                  <td>{m.institution || '—'}</td>
                  <td>{getStatusBadge(m.verificationStatus)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {m.verificationStatus === 'pending' && (
                        <>
                          <button 
                            style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              border: 'none',
                              borderRadius: 4,
                              background: '#059669',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleApprove(m._id, m.fullName)}
                            disabled={actionLoading === m._id}
                          >
                            {actionLoading === m._id ? '...' : 'Approve'}
                          </button>
                          <button 
                            style={{
                              padding: '4px 8px',
                              fontSize: 12,
                              border: 'none',
                              borderRadius: 4,
                              background: '#dc2626',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleReject(m._id, m.fullName)}
                            disabled={actionLoading === m._id}
                          >
                            {actionLoading === m._id ? '...' : 'Reject'}
                          </button>
                        </>
                      )}
                      <button 
                        style={{
                          padding: '4px 8px',
                          fontSize: 12,
                          border: '1px solid var(--border)',
                          borderRadius: 4,
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                        onClick={() => handleDelete(m._id, m.fullName)}
                        disabled={actionLoading === m._id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-table" style={{ padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, color: 'var(--muted-text)' }}>
                      {query || statusFilter !== 'all' || accountTypeFilter !== 'all' 
                        ? 'No members match your filters' 
                        : 'No members found'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: 16,
          padding: '12px 16px',
          backgroundColor: 'var(--card-bg)',
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <div style={{ color: 'var(--muted-text)', fontSize: 14 }}>
            Showing {shown.length > 0 ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} members
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="cancel-btn" 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
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
    </>
  );
};

export default Members;