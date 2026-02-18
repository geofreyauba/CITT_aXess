// src/pages/PendingReturns.tsx - Admin page to approve/reject return requests
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import Badge from '../components/ui/Badge';
import { requestsAPI } from '../lib/api';

interface PendingReturn {
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
  status: string;
  returnApprovalStatus: string;
  returnRequestedAt: string;
  requestedAt: string;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const PendingReturns: React.FC = () => {
  const [returns, setReturns] = useState<PendingReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadPendingReturns();
  }, []);

  const loadPendingReturns = async () => {
    try {
      setLoading(true);
      const data = await requestsAPI.getPendingReturns();
      setReturns(data);
    } catch (err: any) {
      console.error('Failed to load pending returns:', err);
      alert('Failed to load pending returns: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this return request?')) return;

    try {
      setProcessing(id);
      await requestsAPI.approveReturn(id);
      alert('Return approved successfully!');
      await loadPendingReturns();
    } catch (err: any) {
      alert('Failed to approve return: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this return request?')) return;

    try {
      setProcessing(id);
      await requestsAPI.rejectReturn(id);
      alert('Return rejected.');
      await loadPendingReturns();
    } catch (err: any) {
      alert('Failed to reject return: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading pending returns...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="section-title">
        <Icons.Clock size={28} style={{ marginRight: '12px' }} />
        Pending Return Approvals
      </h1>

      {returns.length === 0 ? (
        <div style={{
          background: 'var(--white-glass)',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-glass)',
        }}>
          <Icons.CheckCircle size={48} color="var(--green-success)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--soft-blue-dark)', marginBottom: '8px' }}>
            No Pending Returns
          </h3>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
            All return requests have been processed.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            background: 'var(--white-glass)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--shadow-glass)',
          }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Room</th>
                  <th>Items</th>
                  <th>Key Taken</th>
                  <th>Return Requested</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map(req => (
                  <tr key={req._id}>
                    <td style={{ fontWeight: 600 }}>
                      {req.userId?.fullName || 'Unknown'}
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        <div>{req.userId?.phone || '—'}</div>
                        <div style={{ color: 'var(--muted-text)', fontSize: '12px' }}>
                          {req.userId?.email || '—'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {req.roomId?.name || 'Unknown'}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <Badge variant="available">
                          {req.roomId?.code || '—'}
                        </Badge>
                      </div>
                    </td>
                    <td style={{
                      maxWidth: 180,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {req.carriedItems || '—'}
                    </td>
                    <td>{formatDateTime(req.requestedAt)}</td>
                    <td>{formatDateTime(req.returnRequestedAt)}</td>
                    <td>
                      <Badge variant="pending">Pending Approval</Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApprove(req._id)}
                          disabled={processing === req._id}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#10b981',
                            color: 'white',
                            fontWeight: 500,
                            fontSize: '13px',
                            cursor: processing === req._id ? 'not-allowed' : 'pointer',
                            opacity: processing === req._id ? 0.6 : 1,
                          }}
                        >
                          {processing === req._id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(req._id)}
                          disabled={processing === req._id}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #ef4444',
                            background: 'transparent',
                            color: '#ef4444',
                            fontWeight: 500,
                            fontSize: '13px',
                            cursor: processing === req._id ? 'not-allowed' : 'pointer',
                            opacity: processing === req._id ? 0.6 : 1,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingReturns;