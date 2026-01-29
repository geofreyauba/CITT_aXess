// src/pages/Requests.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

interface Room {
  id: number;
  name: string;
  code: string;
  status: 'available' | 'occupied' | 'requested' | 'maintenance';
  timeTaken?: string;
  returned?: string;
  isYours?: boolean;
  floorLabel?: 'basement' | 'ground' | 'first' | 'second';
  direction?: string;
  description?: string;
}

interface RequestHistory {
  id: number;
  roomName: string;
  roomCode: string;
  dateRequested: string;
  status: 'pending' | 'approved' | 'returned';
  timeTaken: string;
  returnedDate?: string;
  requestedAtIso?: string;
  returnedAtIso?: string;
  carriedItems?: string;
  membership?: string; // added
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const computeDuration = (startIso?: string, endIso?: string) => {
  if (!startIso || !endIso) return '';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return '';
  let diff = Math.floor((end - start) / 1000); // seconds
  const hours = Math.floor(diff / 3600); diff %= 3600;
  const minutes = Math.floor(diff / 60); const seconds = diff % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getHistoryBadgeVariant = (status: RequestHistory['status']): BadgeVariant => {
  switch (status) {
    case 'pending':   return 'pending';
    case 'approved':  return 'approved';
    case 'returned':  return 'returned';
    default:          return 'restricted';
  }
};

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

const Requests: React.FC = () => {
  // Sample request history (replace with real data/API later)
  const [history, setHistory] = useState<RequestHistory[]>([
    {
      id: 1,
      roomName: 'AI Innovation Lab',
      roomCode: 'B-205',
      dateRequested: '2026-01-28',
      status: 'pending',
      timeTaken: '—',
      requestedAtIso: new Date().toISOString(),
      carriedItems: 'Laptop, Notebook, Charger',
      membership: 'AI Innovation Lab',
    },
    {
      id: 2,
      roomName: 'Maker Studio',
      roomCode: 'A-012',
      dateRequested: '2026-01-25',
      status: 'approved',
      timeTaken: '2h 45m',
      returnedDate: '2026-01-25',
      requestedAtIso: new Date(Date.now() - 86400000 * 3).toISOString(),
      returnedAtIso: new Date(Date.now() - 86400000 * 2).toISOString(),
      carriedItems: '3D Printer Filament, Safety Glasses',
      membership: 'Maker Studio',
    },
    {
      id: 3,
      roomName: 'Robotics Arena',
      roomCode: 'D-315',
      dateRequested: '2026-01-20',
      status: 'returned',
      timeTaken: '4h 10m',
      returnedDate: '2026-01-20',
      requestedAtIso: new Date(Date.now() - 86400000 * 9).toISOString(),
      returnedAtIso: new Date(Date.now() - 86400000 * 8).toISOString(),
      carriedItems: 'Robot chassis, Batteries',
      membership: 'Robotics Club',
    },
  ]);

  const handleSignOut = (id: number) => {
    if (window.confirm('Confirm sign out of this room?')) {
      setHistory(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, status: 'returned', returnedDate: new Date().toLocaleDateString(), returnedAtIso: new Date().toISOString() }
            : r
        )
      );
    }
  };

  return (
    <>
      <h1 className="section-title">My Requests & History</h1>

      <div className="history-section">
        <h2 className="history-title">Your Request History</h2>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Date Requested</th>
                <th>Items</th>
                <th>Requested At</th>
                <th>Status</th>
                <th>Time Taken</th>
                <th>Returned</th>
                <th>Membership</th>           {/* added */}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map(req => (
                <tr key={req.id}>
                  <td>{req.roomName} ({req.roomCode})</td>
                  <td>{req.dateRequested}</td>
                  <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.carriedItems || '—'}
                  </td>
                  <td>{formatDateTime(req.requestedAtIso)}</td>
                  <td>
                    <Badge variant={getHistoryBadgeVariant(req.status)}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>
                  </td>
                  <td>{req.timeTaken || computeDuration(req.requestedAtIso, req.returnedAtIso) || '—'}</td>
                  <td>{req.returnedDate || formatDateTime(req.returnedAtIso) || '—'}</td>
                  <td>{req.membership || '—'}</td> {/* added */}
                  <td>
                    {req.status === 'pending' && (
                      <button
                        className="signout-btn"
                        onClick={() => handleSignOut(req.id)}
                      >
                        Sign Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-table">
                    No request history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Requests;