// src/pages/Rooms.tsx
import React, { useState } from 'react';
import { Icons } from '../components/icons';
import Badge from '../components/ui/Badge';

// Sample initial rooms (replace with real data/API later)
interface Room {
  id: number;
  name: string;
  code: string;
  status?: 'available' | 'occupied' | 'maintenance'; // optional for future
}

const initialRooms: Room[] = [
  { id: 1, name: 'DataScien Hub', code: 'C-108' },
  { id: 2, name: 'AI Innovation Lab', code: 'B-205' },
  { id: 3, name: 'Maker Studio', code: 'A-012' },
  { id: 4, name: 'Robotics Arena', code: 'D-315' },
  // ... imagine 60+ more
  { id: 60, name: 'Quantum Bay', code: 'J-450' },
  { id: 61, name: 'Bio Lab', code: 'K-320' },
  { id: 62, name: 'Media Room', code: 'L-115' },
];

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  // Open modal for add new
  const handleAddRoom = () => {
    setEditingRoom(null);
    setNewName('');
    setNewCode('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setNewName(room.name);
    setNewCode(room.code);
    setIsModalOpen(true);
  };

  // Save (add or update)
  const handleSaveRoom = () => {
    if (!newName.trim() || !newCode.trim()) return;

    if (editingRoom) {
      // Update existing
      setRooms(rooms.map(r =>
        r.id === editingRoom.id ? { ...r, name: newName, code: newCode } : r
      ));
    } else {
      // Add new
      const newRoom: Room = {
        id: Math.max(...rooms.map(r => r.id), 0) + 1,
        name: newName,
        code: newCode,
      };
      setRooms([...rooms, newRoom]);
    }

    setIsModalOpen(false);
  };

  // Delete room
  const handleDeleteRoom = (id: number) => {
    if (window.confirm('Delete this room?')) {
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

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
          <div key={room.id} className="room-card">
            <h3 className="room-name">{room.name}</h3>
            <p className="room-code">{room.code}</p>

            {/* Admin controls */}
            <div className="room-actions">
              <button className="action-btn edit" onClick={() => handleEditRoom(room)}>
                <Icons.Edit size={16} />
              </button>
              <button className="action-btn delete" onClick={() => handleDeleteRoom(room.id)}>
                <Icons.Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for add/edit */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
            <label>
              Room Name
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. DataScien Hub"
              />
            </label>
            <label>
              Room Code
              <input
                type="text"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="e.g. C-108"
              />
            </label>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveRoom}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Rooms;