// src/pages/Requests.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { requestsAPI, roomsAPI } from '../lib/api';
import { Lock } from 'lucide-react';   // ← React Icon for private rooms

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
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;

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
      setRooms(roomsData);                    // ← ALL rooms (public + private)
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
    setPhoneNumber('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
    setCarriedItems('');
    setPhoneNumber('');
  };

  const handleRequestKey = async (room: Room | null) => {
    if (!room) return;
    if (room.isPrivate) {
      alert('This room is private and can only be requested by authorized members.');
      return;
    }
    if (room.status !== 'available') return;

    // Check if user has any unreturned requests
    const hasUnreturnedRequest = history.some(req => 
      req.status === 'pending' || req.status === 'approved'
    );

    if (hasUnreturnedRequest) {
      const unreturnedRoom = history.find(req => 
        req.status === 'pending' || req.status === 'approved'
      );
      alert(
        `You have an unreturned room key!\n\n` +
        `Room: ${unreturnedRoom?.roomId?.name || 'Unknown'} (${unreturnedRoom?.roomId?.code || '—'})\n` +
        `Requested: ${formatDateTime(unreturnedRoom?.requestedAt)}\n\n` +
        `Please return/sign out the current key before requesting another room.`
      );
      return;
    }

    if (!carriedItems || !carriedItems.trim()) {
      alert('Please list the items you will bring before requesting the key.');
      return;
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      alert('Please provide a phone number before requesting the key.');
      return;
    }

    try {
      setSubmitting(true);
      
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      const requestData = {
        roomId: room._id,
        carriedItems: carriedItems.trim(),
        phone: phoneNumber.trim(),
        membership: currentUser.membership || 'None',
      };

      await requestsAPI.create(requestData);

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
      await loadData();
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

  // Check if user has any unreturned requests
  const unreturnedRequests = history.filter(req => 
    req.status === 'pending' || req.status === 'approved'
  );
  const hasUnreturnedRequest = unreturnedRequests.length > 0;

  return (
    <>
      <h1 className="section-title">Request Room Key</h1>

      {/* Unreturned Key Warning */}
      {hasUnreturnedRequest && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px'
        }}>
          <div style={{
            background: '#f59e0b',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>!</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#92400e', 
              fontSize: '16px',
              fontWeight: 600 
            }}>
              Unreturned Room Key
            </h3>
            {unreturnedRequests.map(req => (
              <p key={req._id} style={{ 
                margin: '4px 0', 
                color: '#78350f',
                fontSize: '14px',
                lineHeight: 1.5
              }}>
                <strong>{req.roomId?.name || 'Unknown'}</strong> ({req.roomId?.code || '—'}) • 
                Requested: {formatDateTime(req.requestedAt)} • 
                Status: <strong>{req.status === 'pending' ? 'Pending' : 'Approved'}</strong>
              </p>
            ))}
            <p style={{ 
              margin: '12px 0 0 0', 
              color: '#92400e',
              fontSize: '14px',
              fontWeight: 500
            }}>
              ⚠️ You must return this key before requesting another room.
            </p>
          </div>
        </div>
      )}

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
                {group.rooms.map(room => {
                  return (
                    <div
                      key={room._id}
                      className={`request-card ${room.status} ${room.isPrivate ? 'private' : ''}`}
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

                      {room.isPrivate && (
                        <div style={{ position: 'absolute', top: 10, right: 10 }}>
                          <Lock size={18} color="#991b1b" />
                        </div>
                      )}

                      <div style={{ width: '100%', textAlign: 'center', marginTop: '0.6rem' }}>
                        <h3 className="room-name" style={{ margin: '0.6rem 0 0.2rem 0' }}>{room.name}</h3>
                        <p className="room-code" style={{ margin: 0 }}>{room.code}</p>
                      </div>
                    </div>
                  );
                })}
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

            {selectedRoom.isPrivate && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Lock size={18} />
                This room is private and only available to authorized members.
              </div>
            )}

            {hasUnreturnedRequest && selectedRoom.status === 'available' && !selectedRoom.isPrivate && (
              <div style={{
                background: '#fef3c7',
                border: '2px solid #f59e0b',
                color: '#92400e',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontWeight: 500,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    background: '#f59e0b',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>!</span>
                  </div>
                  <strong>Cannot Request - Unreturned Key</strong>
                </div>
                {unreturnedRequests.map(req => (
                  <div key={req._id} style={{ marginLeft: '28px', fontSize: '14px', marginTop: '4px' }}>
                    You currently have <strong>{req.roomId?.name || 'a room'}</strong> ({req.roomId?.code || '—'}) unreturned.
                    <br />
                    Please return it first before requesting another room.
                  </div>
                ))}
              </div>
            )}

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
                disabled={submitting || selectedRoom.isPrivate || hasUnreturnedRequest}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                Phone Number (required)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="E.g. +255 123 456 789"
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 8, 
                  border: '1px solid rgba(15,23,42,0.08)' 
                }}
                disabled={submitting || selectedRoom.isPrivate || hasUnreturnedRequest}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="cancel-btn" onClick={closeModal} disabled={submitting}>
                Close
              </button>

              <button
                className="save-btn"
                onClick={() => handleRequestKey(selectedRoom)}
                disabled={selectedRoom.status !== 'available' || submitting || selectedRoom.isPrivate || hasUnreturnedRequest}
                style={{
                  opacity: (selectedRoom.status === 'available' && !selectedRoom.isPrivate && !submitting && !hasUnreturnedRequest) ? 1 : 0.6,
                  cursor: (selectedRoom.status === 'available' && !selectedRoom.isPrivate && !submitting && !hasUnreturnedRequest) ? 'pointer' : 'not-allowed'
                }}
              >
                {selectedRoom.isPrivate ? 'Private Room' :
                 hasUnreturnedRequest ? 'Return Key First' :
                 submitting ? 'Submitting...' : 'Request Key'}
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
                <th>Requester</th>
                <th>Phone</th>
                <th>Items</th>
                <th>Requested at</th>
                <th>Status</th>
                <th>Time Taken</th>
                <th>Returned</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table">
                    No request history yet
                  </td>
                </tr>
              ) : (
                history
                  .slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
                  .map(req => (
                    <tr key={req._id}>
                      <td>
                        {req.roomId?.name || 'Unknown'} ({req.roomId?.code || '—'})
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {req.userId?.fullName || 'Unknown User'}
                      </td>
                      <td>
                        {req.userId?.phone || '—'}
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
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {history.length > HISTORY_PER_PAGE && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            padding: '0 4px',
          }}>
            {/* Page info */}
            <span style={{ fontSize: '14px', color: 'var(--muted-text)' }}>
              Showing {(historyPage - 1) * HISTORY_PER_PAGE + 1}–{Math.min(historyPage * HISTORY_PER_PAGE, history.length)} of {history.length} requests
            </span>

            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setHistoryPage(p => p - 1)}
                disabled={historyPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: historyPage === 1 ? 'var(--gray-light)' : 'var(--white-glass)',
                  color: historyPage === 1 ? 'var(--muted-text)' : 'var(--soft-blue-dark)',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: historyPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: historyPage === 1 ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                ← Previous
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.ceil(history.length / HISTORY_PER_PAGE) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setHistoryPage(page)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: page === historyPage ? 'var(--soft-blue)' : 'var(--white-glass)',
                    color: page === historyPage ? 'white' : 'var(--soft-blue-dark)',
                    fontWeight: page === historyPage ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setHistoryPage(p => p + 1)}
                disabled={historyPage === Math.ceil(history.length / HISTORY_PER_PAGE)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: historyPage === Math.ceil(history.length / HISTORY_PER_PAGE) ? 'var(--gray-light)' : 'var(--white-glass)',
                  color: historyPage === Math.ceil(history.length / HISTORY_PER_PAGE) ? 'var(--muted-text)' : 'var(--soft-blue-dark)',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: historyPage === Math.ceil(history.length / HISTORY_PER_PAGE) ? 'not-allowed' : 'pointer',
                  opacity: historyPage === Math.ceil(history.length / HISTORY_PER_PAGE) ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Requests;