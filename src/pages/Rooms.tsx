// src/pages/Rooms.tsx
import React, { useState, useEffect } from 'react';
import { Icons } from '../components/icons';
import { roomsAPI } from '../lib/api';
import { Lock, Globe } from 'lucide-react';   // ← React Icons (no emoji)

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

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form fields
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newStatus, setNewStatus] = useState<Room['status']>('available');
  const [newFloor, setNewFloor] = useState<Room['floorLabel'] | ''>('');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newIsPrivate, setNewIsPrivate] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch (err: any) {
      console.error('Failed to load rooms:', err);
      alert('Failed to load rooms: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    setNewName('');
    setNewCode('');
    setNewStatus('available');
    setNewFloor('');
    setNewLocation('');
    setNewNotes('');
    setNewIsPrivate(false);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleViewRoom = (room: Room) => {
    setEditingRoom(room);
    setNewName(room.name);
    setNewCode(room.code);
    setNewStatus(room.status);
    setNewFloor(room.floorLabel ?? '');
    setNewLocation(room.direction ?? '');
    setNewNotes(room.description ?? '');
    setNewIsPrivate(room.isPrivate ?? false);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setNewName(room.name);
    setNewCode(room.code);
    setNewStatus(room.status);
    setNewFloor(room.floorLabel ?? '');
    setNewLocation(room.direction ?? '');
    setNewNotes(room.description ?? '');
    setNewIsPrivate(room.isPrivate ?? false);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!newName.trim() || !newCode.trim()) {
      alert('Name and code are required');
      return;
    }

    try {
      setActionLoading(true);
      
      const roomData = {
        name: newName.trim(),
        code: newCode.trim().toUpperCase(),
        status: newStatus,
        floorLabel: newFloor || undefined,
        direction: newLocation || undefined,
        description: newNotes || undefined,
        isPrivate: newIsPrivate,        // ← Saved to database
      };

      if (editingRoom) {
        const updated = await roomsAPI.update(editingRoom._id, roomData);
        setRooms(prev => prev.map(r => (r._id === editingRoom._id ? updated : r)));
      } else {
        const created = await roomsAPI.create(roomData);
        setRooms(prev => [...prev, created]);
      }

      setIsModalOpen(false);
      setEditingRoom(null);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save room error:', err);
      alert('Failed to save room: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!confirm(`Delete room "${name}"?`)) return;

    try {
      await roomsAPI.delete(id);
      setRooms(prev => prev.filter(r => r._id !== id));
    } catch (err: any) {
      console.error('Delete room error:', err);
      alert('Failed to delete room: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      available: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
      occupied: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      requested: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      maintenance: { bg: '#e5e7eb', text: '#374151', border: '#d1d5db' },
    };
    const style = colors[status] || colors.available;
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
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

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading rooms...</div>;
  }

  return (
    <>
      <div className="rooms-header">
        <h1 className="section-title">Rooms</h1>
        <button className="add-room-btn" onClick={handleAddRoom}>
          <Icons.Plus size={18} /> Add Room
        </button>
      </div>

      <div className="rooms-grid">
        {rooms.map(room => (
          <div
            key={room._id}
            className="room-card"
            role="button"
            onClick={() => handleViewRoom(room)}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleViewRoom(room); }}
          >
            <div style={{ width: '100%', textAlign: 'center' }}>
              <h3 className="room-name" style={{ margin: '0.6rem 0 0.2rem 0' }}>
                {room.name}
              </h3>
              <p className="room-code" style={{ margin: 0 }}>{room.code}</p>
              <div style={{ marginTop: '0.5rem' }}>
                {getStatusBadge(room.status)}
              </div>

              {room.isPrivate ? (
                <div style={{ marginTop: '0.25rem', fontSize: '11px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <Lock size={14} /> Private
                </div>
              ) : (
                <div style={{ marginTop: '0.25rem', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <Globe size={14} /> Public
                </div>
              )}
            </div>

            <div className="room-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="action-btn edit"
                onClick={() => handleEditRoom(room)}
                aria-label={`Edit ${room.name}`}
              >
                <Icons.Edit size={16} />
              </button>
              <button
                className="action-btn delete"
                onClick={() => handleDeleteRoom(room._id, room.name)}
                aria-label={`Delete ${room.name}`}
              >
                <Icons.Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for add/view/edit */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsModalOpen(false);
            setIsEditing(false);
            setEditingRoom(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {editingRoom ? (isEditing ? 'Edit Room' : 'Room Details') : 'Add New Room'}
            </h2>

            <label>
              Room Name *
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. DataScien Hub"
                readOnly={!isEditing}
              />
            </label>

            <label>
              Room Code *
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="e.g. C-108"
                readOnly={!isEditing}
              />
            </label>

            <label>
              Status
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as Room['status'])}
                disabled={!isEditing}
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="requested">Requested</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>

            <label>
              Floor
              <select
                value={newFloor}
                onChange={e => setNewFloor(e.target.value as Room['floorLabel'] || '')}
                disabled={!isEditing}
              >
                <option value="">Select floor</option>
                <option value="basement">Basement</option>
                <option value="ground">Ground</option>
                <option value="first">First</option>
                <option value="second">Second</option>
              </select>
            </label>

            <label>
              Location
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="e.g. South Wing – Basement – Corner C"
                readOnly={!isEditing}
              />
            </label>

            <label>
              Notes
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="e.g. Sector E, near stairwell"
                rows={3}
                readOnly={!isEditing}
              />
            </label>

            {/* Public / Private Dropdown */}
            <label>
              Room Visibility
              <select
                value={newIsPrivate ? 'private' : 'public'}
                onChange={e => setNewIsPrivate(e.target.value === 'private')}
                disabled={!isEditing}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
              >
                <option value="public">Public (Anyone can request the key)</option>
                <option value="private">Private (Only authorized members can request)</option>
              </select>
            </label>

            <div className="modal-buttons">
              <button
                className="cancel-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEditing(false);
                  setEditingRoom(null);
                }}
                disabled={actionLoading}
              >
                Close
              </button>

              {isEditing ? (
                <button className="save-btn" onClick={handleSaveRoom} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button className="save-btn" onClick={() => setIsEditing(true)}>
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Rooms;