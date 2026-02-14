// src/pages/Requests.tsx - User's request interface with real API
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { requestsAPI, roomsAPI } from '../lib/api';

interface Room {
  _id: string;
  name: string;
  code: string;
  status: 'available' | 'occupied' | 'requested' | 'maintenance';
  floorLabel?: 'basement' | 'ground' | 'first' | 'second';
  direction?: string;
  description?: string;
  isPrivate?: boolean;
}

interface RequestHistory {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    phone?: string;
  };
  roomId: {
    _id: string;
    name: string;
    code: string;
  };
  carriedItems?: string;
  membership?: string;
  status: 'pending' | 'approved' | 'returned';
  requestedAt: string;
  returnedAt?: string;
  createdAt: string;
}

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
  let diff = Math.floor((end - start) / 1000);
  const hours = Math.floor(diff / 3600); diff %= 3600;
  const minutes = Math.floor(diff / 60); const seconds = diff % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const floorOrder: Room['floorLabel'][] = ['basement', 'ground', 'first', 'second'];

const Requests: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carriedItems, setCarriedItems] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, historyData] = await Promise.all([
        roomsAPI.getAll(),
        requestsAPI.getAll(),
      ]);
      setRooms(roomsData.filter((r: Room) => !r.isPrivate)); // Only show non-private rooms
      setHistory(historyData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      alert('Failed to load rooms: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openRoom = (room: Room) => {
    setSelectedRoom(room);
    setCarriedItems('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
    setCarriedItems('');
  };

  const handleRequestKey = async (room: Room | null) => {
    if (!room) return;
    if (room.status !== 'available') return;

    if (!carriedItems || !carriedItems.trim()) {
      alert('Please list the items you will bring before requesting the key.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get current user info
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      const requestData = {
        roomId: room._id,
        carriedItems: carriedItems.trim(),
        phone: currentUser.phone || '',
        membership: currentUser.membership || 'None',
      };

      await requestsAPI.create(requestData);

      // Reload data to get updated rooms and history
      await loadData();

      closeModal();
      alert(`Request submitted for ${room.name} (${room.code})\nStatus: Pending approval`);
    } catch (err: any) {
      console.error('Request error:', err);
      alert('Failed to submit request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async (requestId: string) => {
    if (!confirm('Mark this request as returned / signed out?')) return;

    try {
      await requestsAPI.returnRequest(requestId);
      await loadData(); // Reload to update status
      alert('Key returned successfully!');
    } catch (err: any) {
      console.error('Return error:', err);
      alert('Failed to return key: ' + err.message);
    }
  };

  const getBadgeVariant = (status: string): BadgeVariant => {
    const roomStatusMap: Record<string, BadgeVariant> = {
      available: 'available',
      occupied: 'occupied',
      requested: 'requested',
      maintenance: 'maintenance',
    };
    return roomStatusMap[status as keyof typeof roomStatusMap] || 'restricted';
  };

  const getHistoryBadgeVariant = (status: string): BadgeVariant => {
    const historyStatusMap: Record<string, BadgeVariant> = {
      pending: 'pending',
      approved: 'approved',
      returned: 'returned',
    };
    return historyStatusMap[status as keyof typeof historyStatusMap] || 'pending';
  };

  const groupedRooms = floorOrder.map(label => ({
    label,
    rooms: rooms.filter(r => (r.floorLabel ?? 'ground') === label).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const floorHeading = (label?: Room['floorLabel']) =>
    label === 'basement' ? 'Basement' :
    label === 'ground' ? 'Ground Floor' :
    label === 'first' ? 'First Floor' :
    label === 'second' ? 'Second Floor' : 'Floor';

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading rooms...</div>;
  }

  return (
    <>
      <h1 className="section-title">Request Room Key</h1>

      {rooms.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
          No rooms available. Please contact administrator.
        </div>
      ) : (
        groupedRooms.map(group => {
          if (group.rooms.length === 0) return null;
          
          return (
            <section key={group.label} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '1.1rem', color: 'var(--soft-blue-dark)' }}>
                {floorHeading(group.label)} ({group.rooms.length})
              </h2>

              <div className="request-grid">
                {group.rooms.map(room => (
                  <div
                    key={room._id}
                    className={`request-card ${room.status}`}
                    role="button"
                    onClick={() => openRoom(room)}
                    onKeyDown={(e) => { if (e.key === 'Enter') openRoom(room); }}
                    tabIndex={0}
                    aria-label={`${room.name} ${room.code} status ${room.status}`}
                  >
                    <div
                      className="card-status"
                      style={{ top: 10, right: 'auto', left: 10 }}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      <Badge variant={getBadgeVariant(room.status)}>
                        {room.status === 'available' ? 'Available' :
                         room.status === 'occupied' ? 'Occupied' :
                         room.status === 'requested' ? 'Requested' :
                         'Maintenance'}
                      </Badge>
                    </div>

                    <div style={{ width: '100%', textAlign: 'center', marginTop: '0.6rem' }}>
                      <h3 className="room-name" style={{ margin: '0.6rem 0 0.2rem 0' }}>{room.name}</h3>
                      <p className="room-code" style={{ margin: 0 }}>{room.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Room Detail Modal */}
      {isModalOpen && selectedRoom && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>{selectedRoom.name}</span>
              <Badge variant={getBadgeVariant(selectedRoom.status)}>
                {selectedRoom.status === 'available' ? 'Available' :
                 selectedRoom.status === 'occupied' ? 'Occupied' :
                 selectedRoom.status === 'requested' ? 'Requested' :
                 'Maintenance'}
              </Badge>
            </h2>

            <p style={{ color: 'var(--gray-neutral)', marginTop: 6 }}>
              <strong>Room Code:</strong> {selectedRoom.code}
            </p>

            <p style={{ color: 'var(--gray-neutral)', marginTop: 6 }}>
              <strong>Floor:</strong> {selectedRoom.floorLabel ? floorHeading(selectedRoom.floorLabel) : '—'}
            </p>
            <p style={{ color: 'var(--gray-neutral)', marginTop: 6 }}>
              <strong>Location:</strong> {selectedRoom.direction ?? '—'}
            </p>
            {selectedRoom.description && (
              <p style={{ color: 'var(--gray-neutral)', marginTop: 6 }}>
                <strong>Notes:</strong> {selectedRoom.description}
              </p>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Items you will bring (required)
              </label>
              <textarea
                value={carriedItems}
                onChange={e => setCarriedItems(e.target.value)}
                placeholder="E.g. Laptop, phone, external HDD, camera..."
                rows={3}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 8, 
                  border: '1px solid rgba(15,23,42,0.08)' 
                }}
                disabled={submitting}
              />
              <p style={{ margin: '6px 0 0 0', color: 'var(--gray-neutral)', fontSize: 12 }}>
                Please declare items to help management prevent loss/theft.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="cancel-btn" onClick={closeModal} disabled={submitting}>
                Close
              </button>

              <button
                className="save-btn"
                onClick={() => handleRequestKey(selectedRoom)}
                disabled={selectedRoom.status !== 'available' || submitting}
                style={{
                  opacity: selectedRoom.status === 'available' && !submitting ? 1 : 0.6,
                  cursor: selectedRoom.status === 'available' && !submitting ? 'pointer' : 'not-allowed'
                }}
              >
                {submitting ? 'Submitting...' : (
                  selectedRoom.status === 'available' ? (
                    <>
                      <Icons.Key size={14} /> Request Key
                    </>
                  ) : (
                    'Unavailable'
                  )
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="history-section" style={{ marginTop: 32 }}>
        <h2 className="history-title">Your Request History</h2>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Items</th>
                <th>Requested at</th>
                <th>Status</th>
                <th>Time Taken</th>
                <th>Returned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map(req => (
                <tr key={req._id}>
                  <td>
                    {req.roomId?.name || 'Unknown'} ({req.roomId?.code || '—'})
                  </td>
                  <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {req.carriedItems || '—'}
                  </td>
                  <td>{formatDateTime(req.requestedAt)}</td>
                  <td>
                    <Badge variant={getHistoryBadgeVariant(req.status)}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>
                  </td>
                  <td>{computeDuration(req.requestedAt, req.returnedAt) || '—'}</td>
                  <td>{formatDateTime(req.returnedAt) || '—'}</td>
                  <td>
                    {req.status === 'pending' && (
                      <button
                        className="signout-btn"
                        onClick={() => handleSignOut(req._id)}
                      >
                        Sign Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-table">
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