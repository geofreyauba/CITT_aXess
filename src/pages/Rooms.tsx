// src/pages/Rooms.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';

// Sample initial rooms (replace with real data/API later)
interface Room {
  id: number;
  name: string;
  code: string;
  // descriptive fields shown only inside the modal (not on the card)
  floorLabel?: 'basement' | 'ground' | 'first' | 'second';
  direction?: string; // Location description (e.g. "South Wing — Basement — Corner C")
  description?: string; // Notes (e.g. "Sector E, near stairwell.")
}

const initialRooms: Room[] = [
  { id: 1, name: 'DataScien Hub', code: 'C-108', floorLabel: 'ground', direction: 'North Wing — Ground — Corner A', description: 'Sector A, near main entrance.' },
  { id: 2, name: 'AI Innovation Lab', code: 'B-205', floorLabel: 'first', direction: 'East Wing — 1st Floor — Corner B', description: 'Restricted access for research.' },
  { id: 3, name: 'Maker Studio', code: 'A-012', floorLabel: 'ground', direction: 'West Wing — Ground — By Lift', description: 'Tools available: CNC, Laser.' },
  { id: 4, name: 'Robotics Arena', code: 'D-315', floorLabel: 'second', direction: 'North Wing — 2nd Floor — Corner C', description: 'Large open testing area.' },
  // ... more can be added as needed
  { id: 60, name: 'Quantum Bay', code: 'J-450', floorLabel: 'second', direction: 'North Wing — 2nd Floor — Corner D', description: 'High security area.' },
  { id: 61, name: 'Bio Lab', code: 'K-320', floorLabel: 'first', direction: 'South Wing — 1st Floor — Corner C', description: 'Bio-safety level 2.' },
  { id: 62, name: 'Media Room', code: 'L-115', floorLabel: 'basement', direction: 'South Wing — Basement — Corner C', description: 'A/V studio and editing bays.' },
];

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // editingRoom is the room being added/edited/viewed in the modal
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // isEditing toggles whether modal fields are editable (true for add/edit, false for view)
  const [isEditing, setIsEditing] = useState(false);

  // form fields
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newFloor, setNewFloor] = useState<Room['floorLabel'] | ''>('');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Open modal in "add" mode
  const handleAddRoom = () => {
    setEditingRoom(null);
    setNewName('');
    setNewCode('');
    setNewFloor('');
    setNewLocation('');
    setNewNotes('');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Open modal in "view" mode (clicking a card)
  const handleViewRoom = (room: Room) => {
    setEditingRoom(room);
    setNewName(room.name);
    setNewCode(room.code);
    setNewFloor(room.floorLabel ?? '');
    setNewLocation(room.direction ?? '');
    setNewNotes(room.description ?? '');
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open modal in "edit" mode (from card action)
  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setNewName(room.name);
    setNewCode(room.code);
    setNewFloor(room.floorLabel ?? '');
    setNewLocation(room.direction ?? '');
    setNewNotes(room.description ?? '');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Save (add or update)
  const handleSaveRoom = () => {
    if (!newName.trim() || !newCode.trim()) {
      // simple validation: require name & code
      return;
    }

    if (editingRoom) {
      // Update existing
      setRooms(prev =>
        prev.map(r =>
          r.id === editingRoom.id
            ? {
                ...r,
                name: newName,
                code: newCode,
                floorLabel: (newFloor as Room['floorLabel']) || undefined,
                direction: newLocation || undefined,
                description: newNotes || undefined,
              }
            : r
        )
      );
    } else {
      // Add new
      const newRoom: Room = {
        id: Math.max(...rooms.map(r => r.id), 0) + 1,
        name: newName,
        code: newCode,
        floorLabel: (newFloor as Room['floorLabel']) || undefined,
        direction: newLocation || undefined,
        description: newNotes || undefined,
      };
      setRooms(prev => [...prev, newRoom]);
    }

    // close modal
    setIsModalOpen(false);
    setEditingRoom(null);
    setIsEditing(false);
  };

  // Delete room
  const handleDeleteRoom = (id: number) => {
    if (window.confirm('Delete this room?')) {
      setRooms(prev => prev.filter(r => r.id !== id));
    }
  };

  // helper: human readable floor label
  const humanFloor = (label?: Room['floorLabel']) =>
    label === 'basement' ? 'Basement' :
    label === 'ground' ? 'Ground' :
    label === 'first' ? 'First' :
    label === 'second' ? 'Second' : '';

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
          <div key={room.id} className="room-card" role="button" onClick={() => handleViewRoom(room)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleViewRoom(room); }}>
            {/* Card content: only name and code (no status) */}
            <div style={{ width: '100%', textAlign: 'center' }}>
              <h3 className="room-name" style={{ margin: '0.6rem 0 0.2rem 0' }}>{room.name}</h3>
              <p className="room-code" style={{ margin: 0 }}>{room.code}</p>
            </div>

            {/* Admin controls (edit/delete) appear on hover via CSS .room-actions */}
            <div className="room-actions" onClick={(e) => e.stopPropagation()}>
              <button className="action-btn edit" onClick={() => handleEditRoom(room)} aria-label={`Edit ${room.name}`}>
                <Icons.Edit size={16} />
              </button>
              <button className="action-btn delete" onClick={() => handleDeleteRoom(room.id)} aria-label={`Delete ${room.name}`}>
                <Icons.Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for add/view/edit */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); setIsEditing(false); setEditingRoom(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRoom ? (isEditing ? 'Edit Room' : 'Room Details') : 'Add New Room'}</h2>

            {/* When viewing (isEditing === false) show read-only details */}
            <label>
              Room Name
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. DataScien Hub"
                readOnly={!isEditing}
              />
            </label>

            <label>
              Room Code
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="e.g. C-108"
                readOnly={!isEditing}
              />
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
              Location (e.g. South Wing — Basement — Corner C)
              <input
                type="text"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="e.g. South Wing — Basement — Corner C"
                readOnly={!isEditing}
              />
            </label>

            <label>
              Notes
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="e.g. Sector E, near stairwell."
                rows={3}
                readOnly={!isEditing}
              />
            </label>

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => { setIsModalOpen(false); setIsEditing(false); setEditingRoom(null); }}>
                Close
              </button>

              {isEditing ? (
                <button className="save-btn" onClick={handleSaveRoom}>
                  Save
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