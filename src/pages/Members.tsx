// src/pages/Members.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { membersAPI, authAPI } from '../lib/api';

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
  campus?: string;
  program?: string;
  level?: string;
  yearOfStudy?: string;
  educationBackground?: string;
  studentIdFile?: string;
  nationalIdFile?: string;
  educationProofFile?: string;
  centerFormFile?: string;
  createdAt?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6M15.5 7.5l3 3L21 2l-5.5 5.5" />
  </svg>
);

// ── Resolve stored filename → fetch URL ──────────────────────────────────
function toFetchUrl(stored: string): string {
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored;
  const clean = stored.replace(/^\/+/, '').replace(/^uploads\//, '');
  return `/api/members/file/${encodeURIComponent(clean)}`;
}

// ── ArrayBuffer → base64 (for data URL PDF rendering) ────────────────────
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

// ══════════════════════════════════════════════════════════════════════════
// IMPERSONATION BANNER
// Shows on every page when admin has "logged in as" a user.
// Reads localStorage 'adminToken' / 'adminUser' set by handleImpersonate.
// ══════════════════════════════════════════════════════════════════════════
export const ImpersonationBanner: React.FC = () => {
  const adminToken = localStorage.getItem('adminToken');
  const adminUser  = (() => { try { return JSON.parse(localStorage.getItem('adminUser') || '{}'); } catch { return {}; } })();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; } })();

  if (!adminToken || !currentUser.isImpersonating) return null;

  const handleReturn = () => {
    // Restore admin session
    localStorage.setItem('authToken', adminToken);
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('impersonating');
    window.location.href = '/members';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #dc2626, #991b1b)',
      color: 'white', padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <UserIcon />
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          👁 Viewing as: <strong>{currentUser.fullName}</strong>
          &nbsp;|&nbsp;
          Logged in by admin: <strong>{currentUser.impersonatedByName || adminUser.fullName || 'Admin'}</strong>
        </span>
      </div>
      <button
        onClick={handleReturn}
        style={{
          background: 'white', color: '#dc2626', border: 'none',
          borderRadius: '6px', padding: '6px 16px', fontWeight: 700,
          cursor: 'pointer', fontSize: '0.85rem',
        }}
      >
        ← Return to Admin
      </button>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MEMBERS PAGE
// ══════════════════════════════════════════════════════════════════════════
const Members: React.FC = () => {
  const [members, setMembers]               = useState<Member[]>([]);
  const [loading, setLoading]               = useState(true);
  const [query, setQuery]                   = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [typeFilter, setTypeFilter]         = useState('all');
  const [page, setPage]                     = useState(1);
  const [actionLoading, setActionLoading]   = useState<string | null>(null);
  const perPage = 12;

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '', email: '', phone: '',
    accountType: 'non_student' as 'student' | 'non_student',
    institution: 'MUST', membership: 'None', password: '',
    role: 'user' as 'user' | 'innovator' | 'coordinator' | 'admin',
    setApproved: true,
  });

  // Details modal
  const [showDetails, setShowDetails]       = useState(false);
  const [selected, setSelected]             = useState<Member | null>(null);

  // Reset password modal
  const [showResetPw, setShowResetPw]       = useState(false);
  const [resetTarget, setResetTarget]       = useState<Member | null>(null);
  const [newPassword, setNewPassword]       = useState('');
  const [resetLoading, setResetLoading]     = useState(false);
  const [resetMsg, setResetMsg]             = useState('');

  // PDF preview
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle]     = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError]     = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl]       = useState<string | null>(null);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await membersAPI.getAll();
      setMembers(Array.isArray(data) ? data : data?.data || data?.users || []);
    } catch (err: any) {
      alert('Failed to load members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = useCallback(() => {
    setNewMemberForm({ fullName: '', email: '', phone: '', accountType: 'non_student', institution: 'MUST', membership: 'None', password: '', role: 'user', setApproved: true });
  }, []);

  const handleNewMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewMemberForm(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName.trim() || !newMemberForm.email.trim() || !newMemberForm.phone.trim()) {
      alert('Full name, email and phone are required.');
      return;
    }
    try {
      const payload = { ...newMemberForm, verificationStatus: newMemberForm.setApproved ? 'approved' : 'pending' };
      const res = await fetch('/api/members/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || `Server error (${res.status})`);
      alert('Member created successfully!');
      await loadMembers();
      setShowAddModal(false);
      resetAddForm();
    } catch (err: any) { alert(`Failed to create member:\n${err.message}`); }
  };

  // ── PDF viewer ────────────────────────────────────────────────────────
  const handleViewFile = async (storedPath: string, title: string) => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setPreviewDataUrl(null); setDownloadUrl(null);
    setPreviewError(null); setPreviewTitle(title); setPreviewLoading(true);

    try {
      const token = localStorage.getItem('authToken') || '';
      const res = await fetch(toFetchUrl(storedPath), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status} — file not found`);
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength === 0) throw new Error('Server returned an empty file');
      setPreviewDataUrl(`data:application/pdf;base64,${arrayBufferToBase64(buffer)}`);
      setDownloadUrl(URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' })));
    } catch (err: any) {
      setPreviewError(err.message || 'Unknown error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setPreviewDataUrl(null); setDownloadUrl(null); setPreviewTitle(''); setPreviewError(null);
  };

  // ── Approve / Reject / Delete ─────────────────────────────────────────
  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Approve ${name}?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.approve(id);
      setMembers(prev => prev.map(m => m._id === id ? { ...m, verificationStatus: 'approved' } : m));
      if (selected?._id === id) setSelected(p => p ? { ...p, verificationStatus: 'approved' } : p);
      alert(`${name} approved!`);
    } catch (err: any) { alert(`Approve failed: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Reject ${name}?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.reject(id);
      setMembers(prev => prev.map(m => m._id === id ? { ...m, verificationStatus: 'rejected' } : m));
      if (selected?._id === id) setSelected(p => p ? { ...p, verificationStatus: 'rejected' } : p);
      alert(`${name} rejected.`);
    } catch (err: any) { alert(`Reject failed: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete ${name}?`)) return;
    try {
      setActionLoading(id);
      await membersAPI.delete(id);
      setMembers(prev => prev.filter(m => m._id !== id));
      setShowDetails(false);
    } catch (err: any) { alert(`Delete failed: ${err.message}`); }
    finally { setActionLoading(null); }
  };

  // ── LOGIN AS USER (impersonate) ───────────────────────────────────────
  // Stores admin's original token as 'adminToken' so ImpersonationBanner
  // can restore it. Then switches session to target user and redirects.
  const handleImpersonate = async (member: Member) => {
    if (!window.confirm(`Log in as ${member.fullName}?\n\nYou will see their exact view. A banner will appear so you can return to your admin session.`)) return;
    setActionLoading(member._id);
    try {
      const adminToken = localStorage.getItem('authToken');
      const adminUser  = localStorage.getItem('currentUser');

      const data = await authAPI.impersonate(member._id);

      // Save admin session for restoration
      localStorage.setItem('adminToken', adminToken || '');
      localStorage.setItem('adminUser',  adminUser  || '{}');
      localStorage.setItem('impersonating', 'true');

      // Switch to impersonated session
      localStorage.setItem('authToken',    data.token);
      localStorage.setItem('currentUser',  JSON.stringify(data.user));

      window.location.href = '/requests'; // Send admin to user's requests page
    } catch (err: any) {
      alert('Failed to log in as user: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── RESET PASSWORD (admin) ────────────────────────────────────────────
  const openResetPw = (member: Member) => {
    setResetTarget(member);
    setNewPassword('');
    setResetMsg('');
    setShowResetPw(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !newPassword) return;
    if (newPassword.length < 6) { setResetMsg('Password must be at least 6 characters.'); return; }
    setResetLoading(true);
    setResetMsg('');
    try {
      await authAPI.adminResetPassword(resetTarget._id, newPassword);
      setResetMsg(`✅ Password reset for ${resetTarget.fullName}. They can now log in with the new password.`);
      setNewPassword('');
    } catch (err: any) {
      setResetMsg(`❌ Failed: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Filtering & pagination ────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = [...members];
    const q = query.trim().toLowerCase();
    if (q) r = r.filter(m => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.institution || '').toLowerCase().includes(q));
    if (statusFilter !== 'all') r = r.filter(m => m.verificationStatus === statusFilter);
    if (typeFilter !== 'all')   r = r.filter(m => m.accountType === typeFilter);
    return r;
  }, [members, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  // ── Reusable sub-components ───────────────────────────────────────────
  const StatusBadge = ({ s }: { s: string }) => (
    <span style={{
      padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
      background: s === 'approved' ? '#d1fae5' : s === 'rejected' ? '#fee2e2' : '#fef3c7',
      color:      s === 'approved' ? '#065f46' : s === 'rejected' ? '#991b1b' : '#92400e',
    }}>{s}</span>
  );

  const DocRow = ({ storedPath, label }: { storedPath: string; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{label}</span>
      <button onClick={() => handleViewFile(storedPath, label)} disabled={previewLoading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', opacity: previewLoading ? 0.6 : 1 }}>
        <EyeIcon /> View PDF
      </button>
    </div>
  );

  const MissingDoc = ({ label }: { label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
      <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{label}</span>
      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Not uploaded</span>
    </div>
  );

  // ── Action button style helper ────────────────────────────────────────
  const abtn = (bg: string, disabled = false): React.CSSProperties => ({
    background: bg, color: 'white', border: 'none', borderRadius: '6px',
    padding: '6px 11px', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.8rem', fontWeight: 600, opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', gap: '5px',
  });

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0 }}>Members</h1>
        <button onClick={() => setShowAddModal(true)}
          style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
          + Add Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search name, email, institution…" value={query} onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: '8px' }}>
          <option value="all">All Types</option>
          <option value="student">Student</option>
          <option value="non_student">Non-Student</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <p>Loading…</p> : shown.length === 0 ? <p style={{ color: '#6b7280' }}>No members found.</p> : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Name', 'Email', 'Phone', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '13px 12px', textAlign: h === 'Actions' ? 'center' : 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(m => {
                const busy = actionLoading === m._id;
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{m.fullName}</td>
                    <td style={{ padding: '12px' }}>{m.email}</td>
                    <td style={{ padding: '12px' }}>{m.phone}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{m.accountType.replace('_', ' ')}</td>
                    <td style={{ padding: '12px' }}><StatusBadge s={m.verificationStatus} /></td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* View details */}
                        <button onClick={() => { setSelected(m); setShowDetails(true); }} style={abtn('#6366f1')}>
                          View
                        </button>

                        {/* Approve/Reject for pending */}
                        {m.verificationStatus === 'pending' && (<>
                          <button onClick={() => handleApprove(m._id, m.fullName)} disabled={busy} style={abtn('#10b981', busy)}>Approve</button>
                          <button onClick={() => handleReject(m._id, m.fullName)}  disabled={busy} style={abtn('#ef4444', busy)}>Reject</button>
                        </>)}

                        {/* LOGIN AS USER — only for approved non-admin members */}
                        {m.verificationStatus === 'approved' && m.role !== 'admin' && (
                          <button onClick={() => handleImpersonate(m)} disabled={busy}
                            style={abtn('#0891b2', busy)} title="Log in as this user to see their view">
                            <UserIcon /> Login as User
                          </button>
                        )}

                        {/* Reset password */}
                        <button onClick={() => openResetPw(m)} style={abtn('#f59e0b')} title="Reset this user's password">
                          <KeyIcon /> Reset PW
                        </button>

                        {/* Delete */}
                        <button onClick={() => handleDelete(m._id, m.fullName)} disabled={busy} style={abtn('#6b7280', busy)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>Prev</button>
          <span style={{ padding: '7px 12px', color: '#6b7280' }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
        </div>
      )}

      {/* ═══════════════════ ADD MEMBER MODAL ═══════════════════ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px', color: '#1e40af' }}>Add New Member</h2>
            <form onSubmit={handleAddMember}>
              {([
                { label: 'Full Name *', name: 'fullName', type: 'text', req: true },
                { label: 'Email *', name: 'email', type: 'email', req: true },
                { label: 'Phone *', name: 'phone', type: 'tel', req: true },
                { label: 'Institution', name: 'institution', type: 'text', req: false },
                { label: 'Membership', name: 'membership', type: 'text', req: false },
              ] as any[]).map(f => (
                <div key={f.name} style={{ marginBottom: '13px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.9rem' }}>{f.label}</label>
                  <input name={f.name} type={f.type} value={(newMemberForm as any)[f.name]} onChange={handleNewMemberChange} required={f.req}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              ))}
              {[
                { label: 'Account Type', name: 'accountType', opts: [['student','Student'],['non_student','Non-Student']] },
                { label: 'Role *', name: 'role', opts: [['user','User / Innovator'],['coordinator','Coordinator'],['admin','Admin']] },
              ].map(f => (
                <div key={f.name} style={{ marginBottom: '13px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.9rem' }}>{f.label}</label>
                  <select name={f.name} value={(newMemberForm as any)[f.name]} onChange={handleNewMemberChange}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px' }}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                  <input type="checkbox" name="setApproved" checked={newMemberForm.setApproved} onChange={handleNewMemberChange} />
                  Approve immediately
                </label>
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.9rem' }}>Temporary Password (optional)</label>
                <input type="text" name="password" value={newMemberForm.password} onChange={handleNewMemberChange}
                  placeholder="Leave blank → user resets later"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowAddModal(false); resetAddForm(); }}
                  style={{ padding: '9px 18px', border: '1px solid #9ca3af', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
                <button type="submit"
                  style={{ padding: '9px 22px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ MEMBER DETAILS MODAL ═══════════════════ */}
      {showDetails && selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: '0 0 6px', color: '#1e40af' }}>{selected.fullName}</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {selected.accountType === 'student' ? '🎓 Student' : '👤 Non-Student'}
                  </span>
                  <StatusBadge s={selected.verificationStatus} />
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>Role: {selected.role || 'user'}</span>
                </div>
              </div>
              <button onClick={() => setShowDetails(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>

            {/* Info grid */}
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '9px 18px', fontSize: '0.88rem' }}>
              <strong style={{ color: '#6b7280' }}>Member ID</strong>    <span>{selected.regNumber || selected._id.slice(-8).toUpperCase()}</span>
              <strong style={{ color: '#6b7280' }}>Email</strong>        <span>{selected.email}</span>
              <strong style={{ color: '#6b7280' }}>Phone</strong>        <span>{selected.phone}</span>
              <strong style={{ color: '#6b7280' }}>Institution</strong>  <span>{selected.institution || '—'}</span>
              <strong style={{ color: '#6b7280' }}>Membership</strong>   <span>{selected.membership || '—'}</span>
              {selected.accountType === 'student' && (<>
                {selected.campus      && <><strong style={{ color: '#6b7280' }}>Campus</strong>  <span>{selected.campus}</span></>}
                {selected.program     && <><strong style={{ color: '#6b7280' }}>Program</strong> <span>{selected.program}</span></>}
                {selected.level       && <><strong style={{ color: '#6b7280' }}>Level</strong>   <span>{selected.level}</span></>}
                {selected.yearOfStudy && <><strong style={{ color: '#6b7280' }}>Year</strong>    <span>Year {selected.yearOfStudy}</span></>}
              </>)}
              {selected.accountType === 'non_student' && selected.educationBackground && (<>
                <strong style={{ color: '#6b7280' }}>Education</strong>
                <span style={{ whiteSpace: 'pre-wrap' }}>{selected.educationBackground}</span>
              </>)}
            </div>

            {/* Documents */}
            <h3 style={{ margin: '0 0 10px', color: '#1e40af', fontSize: '1rem' }}>Uploaded Documents</h3>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0 16px', marginBottom: '20px' }}>
              {selected.accountType === 'student' ? (
                selected.studentIdFile ? <DocRow storedPath={selected.studentIdFile} label="Student ID" /> : <MissingDoc label="Student ID" />
              ) : (<>
                {selected.nationalIdFile     ? <DocRow storedPath={selected.nationalIdFile}     label="National ID / Registration ID" />    : <MissingDoc label="National ID / Registration ID" />}
                {selected.educationProofFile ? <DocRow storedPath={selected.educationProofFile} label="Residence Proof (Village Chairman)" /> : <MissingDoc label="Residence Proof (Village Chairman)" />}
                {selected.centerFormFile     ? <DocRow storedPath={selected.centerFormFile}     label="Registration Form from Center" />      : <MissingDoc label="Registration Form from Center" />}
              </>)}
            </div>

            {/* Admin actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {selected.verificationStatus === 'pending' && (<>
                <button onClick={() => handleApprove(selected._id, selected.fullName)}
                  style={{ padding: '9px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>✓ Approve</button>
                <button onClick={() => handleReject(selected._id, selected.fullName)}
                  style={{ padding: '9px 18px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>✕ Reject</button>
              </>)}

              {/* Login as User */}
              {selected.verificationStatus === 'approved' && selected.role !== 'admin' && (
                <button onClick={() => { setShowDetails(false); handleImpersonate(selected); }}
                  style={{ padding: '9px 18px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserIcon /> Login as This User
                </button>
              )}

              {/* Reset password */}
              <button onClick={() => { setShowDetails(false); openResetPw(selected); }}
                style={{ padding: '9px 18px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyIcon /> Reset Password
              </button>

              <button onClick={() => setShowDetails(false)}
                style={{ marginLeft: 'auto', padding: '9px 22px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ RESET PASSWORD MODAL ═══════════════════ */}
      {showResetPw && resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '100%', maxWidth: '420px', padding: '28px' }}>
            <h2 style={{ margin: '0 0 6px', color: '#b45309' }}>🔑 Reset Password</h2>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '0.9rem' }}>
              Set a new password for <strong>{resetTarget.fullName}</strong> ({resetTarget.email}).
              They can then log in with this new password.
            </p>

            {resetMsg && (
              <div style={{
                padding: '12px 14px', borderRadius: '8px', marginBottom: '16px',
                background: resetMsg.startsWith('✅') ? '#d1fae5' : '#fee2e2',
                color:      resetMsg.startsWith('✅') ? '#065f46' : '#991b1b',
                fontSize: '0.88rem', lineHeight: '1.5',
              }}>
                {resetMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowResetPw(false); setResetMsg(''); }}
                  style={{ padding: '9px 18px', border: '1px solid #9ca3af', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>
                  {resetMsg.startsWith('✅') ? 'Done' : 'Cancel'}
                </button>
                {!resetMsg.startsWith('✅') && (
                  <button type="submit" disabled={resetLoading || !newPassword}
                    style={{ padding: '9px 22px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: resetLoading ? 'wait' : 'pointer', opacity: resetLoading || !newPassword ? 0.6 : 1 }}>
                    {resetLoading ? 'Resetting…' : 'Reset Password'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ PDF PREVIEW MODAL ═══════════════════ */}
      {(previewLoading || previewDataUrl || previewError) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px' }}
          onClick={closePreview}>
          <div style={{ background: 'white', borderRadius: '12px', width: '96%', maxWidth: '1080px', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 20px', background: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: 'white', fontWeight: 600 }}>📄 {previewTitle}</span>
              <button onClick={closePreview} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '6px', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#404040', overflow: 'hidden' }}>
              {previewLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '16px' }}>
                  <style>{`@keyframes axSpin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{ width: '44px', height: '44px', border: '4px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'axSpin 0.75s linear infinite' }} />
                  <p style={{ margin: 0 }}>Loading PDF…</p>
                </div>
              )}
              {previewError && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '12px', padding: '32px', textAlign: 'center' }}>
                  <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                  <p style={{ margin: 0, fontWeight: 700 }}>Could not load document</p>
                  <p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem', maxWidth: '480px' }}>{previewError}</p>
                </div>
              )}
              {previewDataUrl && !previewLoading && (
                <iframe src={previewDataUrl} title={previewTitle} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
              )}
            </div>
            {downloadUrl && (
              <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Click outside or × to close</span>
                <a href={downloadUrl} download={`${previewTitle}.pdf`}
                  style={{ padding: '8px 18px', background: '#6366f1', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                  ⬇ Download PDF
                </a>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Members;