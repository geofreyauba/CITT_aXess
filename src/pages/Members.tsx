// src/pages/Members.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  role?: string;
  regNumber?: string;
  studentIdFile?: string;
  nationalIdFile?: string;
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

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    accountType: 'non_student' as 'student' | 'non_student',
    institution: 'MUST',
    membership: 'None',
    password: '',
    role: 'user' as 'user' | 'innovator' | 'coordinator' | 'admin',
    setApproved: true,
  });

  // View details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Document preview modal – kept for now, but not used from table anymore
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await membersAPI.getAll();
      setMembers(Array.isArray(data) ? data : data?.data || data?.users || []);
    } catch (err: any) {
      console.error('Failed to load members:', err);
      alert('Failed to load members: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const resetNewMemberForm = useCallback(() => {
    setNewMemberForm({
      fullName: '',
      email: '',
      phone: '',
      accountType: 'non_student',
      institution: 'MUST',
      membership: 'None',
      password: '',
      role: 'user',
      setApproved: true,
    });
  }, []);

  const handleNewMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setNewMemberForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMemberForm.fullName.trim() || !newMemberForm.email.trim() || !newMemberForm.phone.trim()) {
      alert('Full name, email and phone are required.');
      return;
    }

    try {
      const payload = {
        ...newMemberForm,
        verificationStatus: newMemberForm.setApproved ? 'approved' : 'pending',
      };

      const res = await fetch('/api/members/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server response was not valid JSON');
      }

      if (!res.ok) {
        throw new Error(data?.message || data?.error || `Server error (${res.status})`);
      }

      alert('Member created successfully!');
      const freshData = await membersAPI.getAll();
      setMembers(Array.isArray(freshData) ? freshData : []);

      setShowAddModal(false);
      resetNewMemberForm();
    } catch (err: any) {
      alert(`Failed to create member:\n${err.message}`);
    }
  };

  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewTitle('');
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Approve ${name}?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.approve(id);
      setMembers(prev => prev.map(m => m._id === id ? { ...m, verificationStatus: 'approved' } : m));
      alert(`${name} has been approved!`);
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Reject ${name}?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.reject(id);
      setMembers(prev => prev.map(m => m._id === id ? { ...m, verificationStatus: 'rejected' } : m));
      alert(`${name} has been rejected.`);
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name} permanently?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.delete(id);
      setMembers(prev => prev.filter(m => m._id !== id));
      alert('Member deleted successfully.');
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    if (!window.confirm(`Login as ${userName}?\n\nYou will access their account.`)) return;
    
    setActionLoading(userId);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to impersonate');

      const data = await response.json();
      
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('impersonating', 'true');
      
      alert(`Now logged in as: ${userName}`);
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert('Failed to login as user: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...members];
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.institution || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(m => m.verificationStatus === statusFilter);
    if (accountTypeFilter !== 'all') result = result.filter(m => m.accountType === accountTypeFilter);
    return result;
  }, [members, query, statusFilter, accountTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Members</h1>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#6366f1',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add New Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email, institution..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '10px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: '8px' }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={accountTypeFilter}
          onChange={(e) => setAccountTypeFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: '8px' }}
        >
          <option value="all">All Types</option>
          <option value="student">Student</option>
          <option value="non_student">Non-Student</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading members...</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Phone</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '14px 12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((member) => (
                <tr key={member._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px 12px' }}>{member.fullName}</td>
                  <td style={{ padding: '14px 12px' }}>{member.email}</td>
                  <td style={{ padding: '14px 12px' }}>{member.phone}</td>
                  <td style={{ padding: '14px 12px' }}>{member.accountType.replace('_', ' ')}</td>
                  <td style={{ padding: '14px 12px' }}>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        background:
                          member.verificationStatus === 'approved' ? '#d1fae5' :
                          member.verificationStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                        color:
                          member.verificationStatus === 'approved' ? '#065f46' :
                          member.verificationStatus === 'rejected' ? '#991b1b' : '#92400e',
                      }}
                    >
                      {member.verificationStatus}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleViewDetails(member)}
                        style={{
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                        }}
                      >
                        View
                      </button>

                      {member.verificationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(member._id, member.fullName)}
                            disabled={actionLoading === member._id}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              opacity: actionLoading === member._id ? 0.6 : 1,
                            }}
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => handleReject(member._id, member.fullName)}
                            disabled={actionLoading === member._id}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              opacity: actionLoading === member._id ? 0.6 : 1,
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleDelete(member._id, member.fullName)}
                        disabled={actionLoading === member._id}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 14px',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          opacity: actionLoading === member._id ? 0.6 : 1,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', color: '#1e40af' }}>
                Add New Member
              </h2>

              <form onSubmit={handleAddMember}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Full Name *
                  </label>
                  <input
                    name="fullName"
                    value={newMemberForm.fullName}
                    onChange={handleNewMemberChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newMemberForm.email}
                    onChange={handleNewMemberChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newMemberForm.phone}
                    onChange={handleNewMemberChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Account Type
                  </label>
                  <select
                    name="accountType"
                    value={newMemberForm.accountType}
                    onChange={handleNewMemberChange}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  >
                    <option value="student">Student</option>
                    <option value="non_student">Non-Student</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Institution
                  </label>
                  <input
                    name="institution"
                    value={newMemberForm.institution}
                    onChange={handleNewMemberChange}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Membership Type
                  </label>
                  <input
                    name="membership"
                    value={newMemberForm.membership}
                    onChange={handleNewMemberChange}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Role *
                  </label>
                  <select
                    name="role"
                    value={newMemberForm.role}
                    onChange={handleNewMemberChange}
                    required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  >
                    <option value="user">User / Innovator</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      name="setApproved"
                      checked={newMemberForm.setApproved}
                      onChange={handleNewMemberChange}
                    />
                    Approve immediately (skip verification)
                  </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                    Temporary Password (optional)
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={newMemberForm.password}
                    onChange={handleNewMemberChange}
                    placeholder="Leave blank → user must reset password later"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetNewMemberForm();
                    }}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #9ca3af',
                      borderRadius: '8px',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={{
                      padding: '10px 24px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Create Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#1e40af' }}>
              {selectedMember.fullName}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px 24px', margin: '20px 0' }}>
              <strong>Member ID:</strong> <span>{selectedMember.regNumber || selectedMember._id.slice(-8).toUpperCase()}</span>
              <strong>Email:</strong> <span>{selectedMember.email}</span>
              <strong>Phone:</strong> <span>{selectedMember.phone}</span>
              <strong>Type:</strong> <span>{selectedMember.accountType.replace('_', ' ')}</span>
              <strong>Status:</strong> <span>{selectedMember.verificationStatus}</span>
              <strong>Role:</strong> <span>{selectedMember.role || 'user'}</span>
              <strong>Institution:</strong> <span>{selectedMember.institution || '—'}</span>
            </div>

            <hr style={{ margin: '24px 0' }} />

            <h3>Uploaded Documents</h3>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedMember.studentIdFile ? (
                <p>
                  <strong>Student ID:</strong>{' '}
                  <a
                    href={`/uploads/${selectedMember.studentIdFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6366f1', textDecoration: 'underline' }}
                  >
                    View / Download
                  </a>
                </p>
              ) : (
                <p style={{ color: '#6b7280' }}>No student ID uploaded</p>
              )}

              {selectedMember.nationalIdFile ? (
                <p>
                  <strong>National ID:</strong>{' '}
                  <a
                    href={`/uploads/${selectedMember.nationalIdFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6366f1', textDecoration: 'underline' }}
                  >
                    View / Download
                  </a>
                </p>
              ) : (
                <p style={{ color: '#6b7280' }}>No national ID uploaded</p>
              )}
            </div>

            <div style={{ marginTop: '32px', textAlign: 'right' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '10px 24px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal – kept in case you want to use it later, but currently not triggered */}
      {previewFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={closePreview}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1100px',
              maxHeight: '92vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 24px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e40af' }}>
                {previewTitle}
              </h3>
              <button
                onClick={closePreview}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#f8fafc' }}>
              {previewFile.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewFile}
                  title={previewTitle}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <img
                  src={previewFile}
                  alt={previewTitle}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                    margin: '0 auto',
                    display: 'block',
                  }}
                />
              )}
            </div>

            <div
              style={{
                padding: '12px 24px',
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'right',
              }}
            >
              <a
                href={previewFile}
                download
                style={{
                  padding: '10px 20px',
                  background: '#6366f1',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;