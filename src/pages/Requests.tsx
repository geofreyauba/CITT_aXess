// src/pages/Requests.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';  // ← changed: import BadgeVariant too

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
  isYours?: boolean; // whether the current user requested it
}

interface RequestHistory {
  id: number;
  roomName: string;
  roomCode: string;  // ← fixed: was 'code' in one place
  dateRequested: string;
  status: 'pending' | 'approved' | 'returned';
  timeTaken: string;
  returnedDate?: string;
}

// ────────────────────────────────────────────────
// Sample Data (replace with real API data later)
// ────────────────────────────────────────────────

const sampleRooms: Room[] = [
  { id: 1, name: 'DataScien Hub', code: 'C-108', status: 'available' },
  { id: 2, name: 'AI Innovation Lab', code: 'B-205', status: 'occupied', timeTaken: '2h 15m', returned: 'Jan 27, 2026 14:30' },
  { id: 3, name: 'Maker Studio', code: 'A-012', status: 'requested', timeTaken: '1h', isYours: true },
  { id: 4, name: 'Robotics Arena', code: 'D-315', status: 'available' },
  { id: 5, name: 'IoT Workshop', code: 'E-422', status: 'maintenance' },
  { id: 6, name: 'VR Experience Room', code: 'F-109', status: 'available' },
  { id: 7, name: '3D Printing Zone', code: 'G-303', status: 'occupied', timeTaken: '3h 40m' },
  { id: 8, name: 'Electronics Lab', code: 'H-210', status: 'available' },
  { id: 9, name: 'Collaboration Lounge', code: 'I-001', status: 'requested', isYours: true },
  { id: 10, name: 'Quantum Computing Bay', code: 'J-450', status: 'available' },
  // ... imagine 50+ more
];

const sampleHistory: RequestHistory[] = [
  { id: 101, roomName: 'DataScien Hub', roomCode: 'C-108', dateRequested: 'Jan 26, 2026', status: 'returned', timeTaken: '2h', returnedDate: 'Jan 26, 2026 18:30' },
  { id: 102, roomName: 'AI Innovation Lab', roomCode: 'B-205', dateRequested: 'Jan 25, 2026', status: 'pending', timeTaken: '1h 30m' },
  { id: 103, roomName: 'Maker Studio', roomCode: 'A-012', dateRequested: 'Jan 24, 2026', status: 'approved', timeTaken: '3h', returnedDate: 'Jan 24, 2026 20:00' },
  { id: 104, roomName: 'Robotics Arena', roomCode: 'D-315', dateRequested: 'Jan 23, 2026', status: 'returned', timeTaken: '4h 10m', returnedDate: 'Jan 23, 2026 22:45' },
];

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

const Requests: React.FC = () => {
  const [rooms] = useState<Room[]>(sampleRooms);
  const [history] = useState<RequestHistory[]>(sampleHistory);

  const handleRequestKey = (room: Room) => {
    if (room.status !== 'available') return;
    alert(`Request submitted for ${room.name} (${room.code})\n\nStatus: Pending Coordinator approval`);
    // In real app → send API request + optimistic update
  };

  const handleSignOut = (historyId: number) => {
    if (window.confirm('Mark this request as returned / signed out?')) {
      alert(`Request #${historyId} marked as returned`);
      // In real app → API call + update state
    }
  };

  // Helper to get badge variant (maps room statuses to BadgeVariant)
  const getBadgeVariant = (status: string): BadgeVariant => {
    const roomStatusMap: Record<string, BadgeVariant> = {
      available: 'available',
      occupied: 'occupied',
      requested: 'requested',
      maintenance: 'maintenance',
    };
    return roomStatusMap[status as keyof typeof roomStatusMap] || 'restricted';
  };

  // Helper for history status
  const getHistoryBadgeVariant = (status: RequestHistory['status']): BadgeVariant => {
    const historyStatusMap: Record<RequestHistory['status'], BadgeVariant> = {
      pending: 'pending',
      approved: 'approved',
      returned: 'returned',
    };
    return historyStatusMap[status];
  };

  return (
    <>
      <h1 className="section-title">Request Room Key</h1>

      {/* Room Cards Grid */}
      <div className="request-grid">
        {rooms.map(room => (
          <div key={room.id} className={`request-card ${room.status}`}>
            <div className="card-status">
              <Badge variant={getBadgeVariant(room.status)}>
                {room.status === 'available' ? 'Available' :
                 room.status === 'occupied' ? 'Occupied' :
                 room.status === 'requested' ? 'Requested' :
                 'Maintenance'}
              </Badge>
            </div>

            <h3 className="room-name">{room.name}</h3>
            <p className="room-code">{room.code}</p>

            {room.timeTaken && (
              <p className="room-meta">Time Taken: {room.timeTaken}</p>
            )}
            {room.returned && (
              <p className="room-meta">Returned: {room.returned}</p>
            )}

            {room.status === 'available' && (
              <button className="request-btn" onClick={() => handleRequestKey(room)}>
                <Icons.Key size={16} /> Request Key
              </button>
            )}

            {room.status === 'requested' && room.isYours && (
              <div className="pending-notice">
                Your Request – Pending Approval
              </div>
            )}
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="history-section">
        <h2 className="history-title">Your Request History</h2>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Date Requested</th>
                <th>Status</th>
                <th>Time Taken</th>
                <th>Returned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map(req => (
                <tr key={req.id}>
                  <td>{req.roomName} ({req.roomCode})</td>
                  <td>{req.dateRequested}</td>
                  <td>
                    <Badge variant={getHistoryBadgeVariant(req.status)}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>
                  </td>
                  <td>{req.timeTaken}</td>
                  <td>{req.returnedDate || '—'}</td>
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
                  <td colSpan={6} className="empty-table">
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