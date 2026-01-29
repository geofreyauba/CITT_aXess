// src/pages/Members.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Icons } from '../components/icons';
import Badge from '../components/ui/Badge';

interface Member {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  accountType?: 'student' | 'non_student' | string;
  institution?: string;
  membership?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected' | string;
}

const sampleMembers: Member[] = [
  { id: 'REG-1001', fullName: 'Alice Mwanga', email: 'alice@example.edu', phone: '+255700111222', accountType: 'student', institution: 'MUST', membership: 'AI Innovation Lab', verificationStatus: 'approved' },
  { id: 'REG-1002', fullName: 'Bob Kamau', email: 'bob@example.com', phone: '+255700111333', accountType: 'non_student', institution: 'ACME Ltd', membership: 'Robotics Club', verificationStatus: 'pending' },
  { id: 'REG-1003', fullName: 'Carol Ndege', email: 'carol@example.edu', phone: '+255700111444', accountType: 'student', institution: 'MUST', membership: 'Data Science Hub', verificationStatus: 'approved' },
  { id: 'REG-1004', fullName: 'David Maliki', email: 'david@example.edu', phone: '+255700111555', accountType: 'student', institution: 'UDSM', membership: 'Quantum Computing Group', verificationStatus: 'rejected' },
  { id: 'REG-1005', fullName: 'Emma Hassan', email: 'emma@example.com', phone: '+255700111666', accountType: 'non_student', institution: 'Tech Corp', membership: 'Bio Lab Team', verificationStatus: 'approved' },
];

const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);

  // Load members from localStorage or fallback to sample
  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('demoUsers') || '[]');
    if (savedUsers.length > 0) {
      setMembers(savedUsers);
    } else {
      setMembers(sampleMembers);
    }
  }, []);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editedFullName, setEditedFullName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedInstitution, setEditedInstitution] = useState('');
  const [editedMembership, setEditedMembership] = useState('');
  const [editedStatus, setEditedStatus] = useState('');

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setEditedFullName(member.fullName || '');
    setEditedEmail(member.email || '');
    setEditedPhone(member.phone || '');
    setEditedInstitution(member.institution || '');
    setEditedMembership(member.membership || '');
    setEditedStatus(member.verificationStatus || 'pending');
    setEditModalOpen(true);
  };

  const saveEdit = () => {
    if (!editingMember || !editingMember.id) return;

    const updatedMembers = members.map(m =>
      m.id === editingMember.id
        ? {
            ...m,
            fullName: editedFullName,
            email: editedEmail,
            phone: editedPhone,
            institution: editedInstitution,
            membership: editedMembership,
            verificationStatus: editedStatus as Member['verificationStatus'],
          }
        : m
    );

    setMembers(updatedMembers);
    localStorage.setItem('demoUsers', JSON.stringify(updatedMembers)); // Save to localStorage (demo mode)
    setEditModalOpen(false);
    setEditingMember(null);
  };

  // Delete functionality
  const handleDelete = (id?: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete member ${id}?`)) return;

    const updatedMembers = members.filter(m => m.id !== id);
    setMembers(updatedMembers);
    localStorage.setItem('demoUsers', JSON.stringify(updatedMembers)); // Update localStorage
  };

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');

  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let result = [...members];

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(m =>
        (m.fullName?.toLowerCase() || '').includes(q) ||
        (m.email?.toLowerCase() || '').includes(q) ||
        (m.phone?.includes(q)) ||
        (m.id?.toLowerCase() || '').includes(q) ||
        (m.institution?.toLowerCase() || '').includes(q) ||
        (m.membership?.toLowerCase() || '').includes(q)
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

  const totalPages = Math.ceil(filtered.length / perPage);
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <h1 className="section-title">Members</h1>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email, ID, institution, membership..."
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 200 }}
          className="auth-input"
        />

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="auth-input"
          style={{ minWidth: 160 }}
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={accountTypeFilter}
          onChange={e => { setAccountTypeFilter(e.target.value); setPage(1); }}
          className="auth-input"
          style={{ minWidth: 160 }}
        >
          <option value="all">All Types</option>
          <option value="student">Student</option>
          <option value="non_student">Non-Student</option>
        </select>
      </div>

      {/* Table */}
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Account Type</th>
              <th>Institution</th>
              <th>Membership</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(m => (
              <tr key={m.id || Math.random()}>
                <td>{m.id || '—'}</td>
                <td>{m.fullName || '—'}</td>
                <td>{m.email || '—'}</td>
                <td>{m.phone || '—'}</td>
                <td>{m.accountType ? m.accountType.charAt(0).toUpperCase() + m.accountType.slice(1).replace('_', ' ') : '—'}</td>
                <td>{m.institution || '—'}</td>
                <td>{m.membership || '—'}</td>
                <td>
                  <Badge
                    variant={
                      m.verificationStatus === 'approved'
                        ? 'available'
                        : m.verificationStatus === 'pending'
                        ? 'pending'
                        : 'restricted'
                    }
                  >
                    {m.verificationStatus
                      ? m.verificationStatus.charAt(0).toUpperCase() + m.verificationStatus.slice(1)
                      : '—'}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="action-btn edit" onClick={() => openEditModal(m)}>
                      <Icons.Edit size={16} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(m.id)}>
                      <Icons.Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="empty-table">
                  {query || statusFilter !== 'all' || accountTypeFilter !== 'all'
                    ? 'No matching members found'
                    : 'No members found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editingMember && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <h2>Edit Member</h2>

            <label>
              Full Name
              <input
                type="text"
                value={editedFullName}
                onChange={e => setEditedFullName(e.target.value)}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={editedEmail}
                onChange={e => setEditedEmail(e.target.value)}
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                value={editedPhone}
                onChange={e => setEditedPhone(e.target.value)}
              />
            </label>

            <label>
              Institution
              <input
                type="text"
                value={editedInstitution}
                onChange={e => setEditedInstitution(e.target.value)}
              />
            </label>

            <label>
              Membership / Hub / Club
              <input
                type="text"
                value={editedMembership}
                onChange={e => setEditedMembership(e.target.value)}
              />
            </label>

            <label>
              Status
              <select value={editedStatus} onChange={e => setEditedStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div className="modal-buttons" style={{ marginTop: 20 }}>
              <button className="cancel-btn" onClick={() => setEditModalOpen(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={saveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

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
            style={{ opacity: page === 1 ? 0.5 : 1 }}
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
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
};

export default Members;