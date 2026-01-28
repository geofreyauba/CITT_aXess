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
  carriedItems?: string; // items the user declared when requesting
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

// ────────────────────────────────────────────────
// Data generation
// ────────────────────────────────────────────────

const floorOrder: Room['floorLabel'][] = ['basement', 'ground', 'first', 'second'];
const wings = ['North Wing', 'East Wing', 'South Wing', 'West Wing'];
const corners = ['Corner A', 'Corner B', 'Corner C', 'Corner D'];

const statusForIndex = (i: number): Room['status'] => {
  if (i % 11 === 0) return 'maintenance';
  if (i % 7 === 0) return 'occupied';
  if (i % 5 === 0) return 'requested';
  return 'available';
};

let idCounter = 1;
const sampleRooms: Room[] = floorOrder.flatMap((floorLabel) => {
  return Array.from({ length: 20 }).map((_, idx) => {
    const globalIndex = idCounter++;
    const wing = wings[(globalIndex - 1) % wings.length];
    const corner = corners[(globalIndex - 1) % corners.length];
    const code = `R-${(100 + globalIndex).toString().slice(-3)}`;
    return {
      id: globalIndex,
      name: `${floorLabel === 'basement' ? 'Basement' : floorLabel === 'ground' ? 'Lobby' : floorLabel === 'first' ? 'First' : 'Second'} Room ${globalIndex}`,
      code,
      status: statusForIndex(globalIndex),
      floorLabel,
      direction: `${wing} — ${floorLabel === 'basement' ? 'Basement' : floorLabel === 'ground' ? 'Ground' : floorLabel === 'first' ? '1st Floor' : '2nd Floor'} — ${corner}`,
      description: `Sector ${String.fromCharCode(65 + ((globalIndex - 1) % 6))}, near stairwell.`,
    } as Room;
  });
});

// Sample history (few entries to demonstrate history UI)
const sampleHistory: RequestHistory[] = [
  {
    id: 1001,
    roomName: sampleRooms[0].name,
    roomCode: sampleRooms[0].code,
    dateRequested: new Date().toLocaleDateString(),
    status: 'pending',
    timeTaken: '',
    requestedAtIso: new Date().toISOString(),
    carriedItems: 'Laptop, phone'
  },
  {
    id: 1002,
    roomName: sampleRooms[5].name,
    roomCode: sampleRooms[5].code,
    dateRequested: new Date(Date.now() - 1000 * 60 * 60 * 24).toLocaleDateString(),
    status: 'returned',
    timeTaken: '2h 15m',
    returnedDate: new Date(Date.now() - 1000 * 60 * 60 * 20).toLocaleString(),
    requestedAtIso: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    returnedAtIso: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    carriedItems: 'Camera'
  },
];

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

const Requests: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(sampleRooms);
  const [history, setHistory] = useState<RequestHistory[]>(sampleHistory);

  // modal state for room details
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // new: carried items text the user must fill before requesting
  const [carriedItems, setCarriedItems] = useState<string>('');

  const openRoom = (room: Room) => {
    setSelectedRoom(room);
    setCarriedItems(''); // reset when opening
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
    setCarriedItems('');
  };

  const handleRequestKey = (room: Room | null) => {
    if (!room) return;
    if (room.status !== 'available') return;

    if (!carriedItems || !carriedItems.trim()) {
      // require the user to declare items they're carrying
      alert('Please list the items you will bring (e.g. laptop, phone, camera) before requesting the key.');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // update room status to requested & mark as current user's request
    setRooms(prev =>
      prev.map(r => (r.id === room.id ? { ...r, status: 'requested', isYours: true } : r))
    );

    // add to history (include carried items)
    const newEntry: RequestHistory = {
      id: Date.now(),
      roomName: room.name,
      roomCode: room.code,
      dateRequested: now.toLocaleDateString(),
      status: 'pending',
      timeTaken: '',
      requestedAtIso: nowIso,
      carriedItems: carriedItems.trim(),
    };
    setHistory(prev => [newEntry, ...prev]);

    closeModal();
    alert(`Request submitted for ${room.name} (${room.code})\nDeclared items: ${carriedItems.trim()}\nStatus: Pending Coordinator approval`);
  };

  const handleSignOut = (historyId: number) => {
    const entry = history.find(h => h.id === historyId);
    if (!entry) return;
    if (!window.confirm('Mark this request as returned / signed out?')) return;

    const now = new Date();
    const nowIso = now.toISOString();

    // update history entry
    setHistory(prev =>
      prev.map(h => {
        if (h.id !== historyId) return h;
        const newTimeTaken = h.requestedAtIso ? computeDuration(h.requestedAtIso, nowIso) : h.timeTaken;
        return {
          ...h,
          status: 'returned',
          returnedDate: now.toLocaleString(),
          returnedAtIso: nowIso,
          timeTaken: newTimeTaken || h.timeTaken,
        };
      })
    );

    // update associated room to available again
    setRooms(prev =>
      prev.map(r => {
        if (r.code === entry.roomCode) {
          return {
            ...r,
            status: 'available',
            isYours: false,
            returned: now.toLocaleString(),
            timeTaken: computeDuration(entry.requestedAtIso, nowIso) || r.timeTaken,
          };
        }
        return r;
      })
    );

    alert(`Request #${historyId} marked as returned at ${now.toLocaleString()}`);
  };

  // Badge variant mappers
  const getBadgeVariant = (status: string): BadgeVariant => {
    const roomStatusMap: Record<string, BadgeVariant> = {
      available: 'available',
      occupied: 'occupied',
      requested: 'requested',
      maintenance: 'maintenance',
    };
    return roomStatusMap[status as keyof typeof roomStatusMap] || 'restricted';
  };

  const getHistoryBadgeVariant = (status: RequestHistory['status']): BadgeVariant => {
    const historyStatusMap: Record<RequestHistory['status'], BadgeVariant> = {
      pending: 'pending',
      approved: 'approved',
      returned: 'returned',
    };
    return historyStatusMap[status];
  };

  // Group rooms by floor in specific order
  const groupedRooms = floorOrder.map(label => ({
    label,
    rooms: rooms.filter(r => (r.floorLabel ?? 'ground') === label).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const floorHeading = (label?: Room['floorLabel']) =>
    label === 'basement' ? 'Basement' :
    label === 'ground' ? 'Ground Floor' :
    label === 'first' ? 'First Floor' :
    label === 'second' ? 'Second Floor' : 'Floor';

  return (
    <>
      <h1 className="section-title">Request Room Key</h1>

      {/* Render groups: Basement, Ground, First, Second */}
      {groupedRooms.map(group => (
        <section key={group.label} style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '1.1rem', color: 'var(--soft-blue-dark)' }}>
            {floorHeading(group.label)} ({group.rooms.length})
          </h2>

          <div className="request-grid">
            {group.rooms.map(room => (
              <div
                key={room.id}
                className={`request-card ${room.status}`}
                role="button"
                onClick={() => openRoom(room)}
                onKeyDown={(e) => { if (e.key === 'Enter') openRoom(room); }}
                tabIndex={0}
                aria-label={`${room.name} ${room.code} status ${room.status}`}
              >
                {/* badge top-left, small so it won't overlap with room title */}
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

                {/* Only the three lines visible on the card: status via badge (above), name, and code */}
                <div style={{ width: '100%', textAlign: 'center', marginTop: '0.6rem' }}>
                  <h3 className="room-name" style={{ margin: '0.6rem 0 0.2rem 0' }}>{room.name}</h3>
                  <p className="room-code" style={{ margin: 0 }}>{room.code}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Room Detail Modal (details only inside modal) */}
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

            {/* Hidden until modal: floor, location, description */}
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

            {/* New: Items text area (required) */}
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Items you will bring (required)</label>
              <textarea
                value={carriedItems}
                onChange={e => setCarriedItems(e.target.value)}
                placeholder="E.g. Laptop, phone, external HDD, camera..."
                rows={3}
                style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(15,23,42,0.08)' }}
              />
              <p style={{ margin: '6px 0 0 0', color: 'var(--gray-neutral)', fontSize: 12 }}>
                Please declare items to help management prevent loss/theft.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="cancel-btn" onClick={closeModal}>Close</button>

              <button
                className="save-btn"
                onClick={() => handleRequestKey(selectedRoom)}
                disabled={selectedRoom.status !== 'available'}
                aria-disabled={selectedRoom.status !== 'available'}
                title={selectedRoom.status !== 'available' ? 'Key not available' : 'Request key'}
                style={{
                  opacity: selectedRoom.status === 'available' ? 1 : 0.6,
                  cursor: selectedRoom.status === 'available' ? 'pointer' : 'not-allowed'
                }}
              >
                {selectedRoom.status === 'available' ? (
                  <>
                    <Icons.Key size={14} /> Request Key
                  </>
                ) : (
                  selectedRoom.status === 'occupied' ? 'Not Available' : 'Unavailable'
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
                <th>Date Requested</th>
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
                  <td colSpan={8} className="empty-table">
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