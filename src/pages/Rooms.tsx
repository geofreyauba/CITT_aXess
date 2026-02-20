// src/pages/Rooms.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/icons';
import { roomsAPI } from '../lib/api';
import { Lock, Globe, MapPin, X, ImagePlus } from 'lucide-react';

// ── Point to your backend server so /uploads/* images load correctly ────────
const BACKEND = 'http://localhost:5000';

interface Room {
  _id: string;
  name: string;
  code: string;
  status: 'available' | 'occupied' | 'requested' | 'maintenance';
  floorLabel?: 'basement' | 'ground' | 'first' | 'second';
  direction?: string;
  directionImage?: string;
  coordinator?: string;
  capacity?: number | null;
  equipment?: string[];
  isPrivate?: boolean;
}

const EQUIPMENT_OPTIONS = [
  'Projector', 'Whiteboard', 'AC', 'WiFi', 'Smart Board',
  'TV Screen', 'Sound System', 'Desktop PCs', 'Printer',
  'Lab Equipment', 'Conference Phone', 'Webcam', 'Microphone', 'Lighting System',
];

const CAPACITY_OPTIONS: number[] = [
  ...Array.from({ length: 10 }, (_, i) => i + 1),
  ...Array.from({ length: 14 }, (_, i) => (i + 1) * 10 + 10),
];

/** Turn a server path like /uploads/rooms/x.jpg into a full URL */
const toFullUrl = (path?: string) =>
  path ? `${BACKEND}${path}` : '';

const Rooms: React.FC = () => {
  const [rooms, setRooms]                 = useState<Room[]>([]);
  const [loading, setLoading]             = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingRoom, setEditingRoom]     = useState<Room | null>(null);
  const [isEditing, setIsEditing]         = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Read user role from localStorage ───────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        setIsAdmin(u.role === 'admin');
      }
    } catch {}
  }, []);

  // Form text fields
  const [newName,        setNewName]        = useState('');
  const [newCode,        setNewCode]        = useState('');
  const [newStatus,      setNewStatus]      = useState<Room['status']>('available');
  const [newFloor,       setNewFloor]       = useState<Room['floorLabel'] | ''>('');
  const [newLocation,    setNewLocation]    = useState('');
  const [newCoordinator, setNewCoordinator] = useState('');
  const [newCapacity,    setNewCapacity]    = useState<number | ''>('');
  const [newEquipment,   setNewEquipment]   = useState<string[]>([]);
  const [newIsPrivate,   setNewIsPrivate]   = useState(false);

  // Image state
  const [existingImagePath, setExistingImagePath] = useState('');
  const [imageFile,         setImageFile]         = useState<File | null>(null);
  const [imagePreview,      setImagePreview]       = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch (err: any) {
      alert('Failed to load rooms: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewName(''); setNewCode(''); setNewStatus('available');
    setNewFloor(''); setNewLocation(''); setNewCoordinator('');
    setNewCapacity(''); setNewEquipment([]); setNewIsPrivate(false);
    setExistingImagePath(''); setImageFile(null); setImagePreview('');
  };

  const populateForm = (room: Room) => {
    setNewName(room.name);
    setNewCode(room.code);
    setNewStatus(room.status);
    setNewFloor(room.floorLabel ?? '');
    setNewLocation(room.direction ?? '');
    setNewCoordinator(room.coordinator ?? '');
    setNewCapacity(room.capacity ?? '');
    setNewEquipment(room.equipment ?? []);
    setNewIsPrivate(room.isPrivate ?? false);
    setExistingImagePath(room.directionImage ?? '');
    setImageFile(null);
    setImagePreview('');
  };

  // ── Admin-only actions ─────────────────────────────────────────────────
  const handleAddRoom  = ()        => { setEditingRoom(null); resetForm();     setIsEditing(true);  setIsModalOpen(true); };
  const handleViewRoom = (r: Room) => { setEditingRoom(r);   populateForm(r); setIsEditing(false); setIsModalOpen(true); };
  const handleEditRoom = (r: Room) => { setEditingRoom(r);   populateForm(r); setIsEditing(true);  setIsModalOpen(true); };
  const closeModal     = ()        => { setIsModalOpen(false); setIsEditing(false); setEditingRoom(null); };

  const toggleEquipment = (tag: string) =>
    setNewEquipment(prev => prev.includes(tag) ? prev.filter(e => e !== tag) : [...prev, tag]);

  // ── File picker ────────────────────────────────────────────────────────
  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be smaller than 10 MB.');
      return;
    }
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setExistingImagePath('');
  };

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSaveRoom = async () => {
    if (!newName.trim() || !newCode.trim()) { alert('Name and code are required'); return; }
    try {
      setActionLoading(true);
      const roomData: Record<string, any> = {
        name:        newName.trim(),
        code:        newCode.trim().toUpperCase(),
        status:      newStatus,
        floorLabel:  newFloor        || undefined,
        direction:   newLocation     || undefined,
        coordinator: newCoordinator.trim() || undefined,
        capacity:    newCapacity !== '' ? Number(newCapacity) : null,
        equipment:   newEquipment,
        isPrivate:   newIsPrivate,
      };

      if (editingRoom) {
        const updated = await roomsAPI.update(editingRoom._id, roomData, imageFile ?? undefined);
        setRooms(prev => prev.map(r => r._id === editingRoom._id ? updated : r));
      } else {
        const created = await roomsAPI.create(roomData, imageFile ?? undefined);
        setRooms(prev => [...prev, created]);
      }
      closeModal();
    } catch (err: any) {
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
      alert('Failed to delete room: ' + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      available:   { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
      occupied:    { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      requested:   { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      maintenance: { bg: '#e5e7eb', text: '#374151', border: '#d1d5db' },
    };
    const s = colors[status] || colors.available;
    return (
      <span style={{
        display: 'inline-block', padding: '4px 10px', borderRadius: '8px',
        fontSize: '11px', fontWeight: 600, backgroundColor: s.bg,
        color: s.text, border: `1px solid ${s.border}`, textTransform: 'capitalize',
      }}>
        {status}
      </span>
    );
  };

  const previewSrc = imagePreview || toFullUrl(existingImagePath);

  if (loading) return <div style={{ padding: '2rem' }}>Loading rooms...</div>;

  return (
    <>
      {/* File input — lives at page root, admin only uses it */}
      {isAdmin && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          style={{ display: 'none', position: 'fixed', top: -9999, left: -9999 }}
          onChange={handleFileChange}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════
          PAGE HEADER
          Admin sees: title + Add Room button
          User  sees: title only
      ════════════════════════════════════════════════════════════════ */}
      <div className="rooms-header">
        <h1 className="section-title">Rooms</h1>
        {isAdmin && (
          <button className="add-room-btn" onClick={handleAddRoom}>
            <Icons.Plus size={18} /> Add Room
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          ROOM CARDS
          Admin: clickable card → opens detail modal + Edit / Delete buttons
          User:  static card (no click, no action buttons)
      ════════════════════════════════════════════════════════════════ */}
      <div className="rooms-grid">
        {rooms.map(room => (
          <div
            key={room._id}
            className="room-card"
            // Only admins can click a card to open the detail modal
            role={isAdmin ? 'button' : undefined}
            onClick={isAdmin ? () => handleViewRoom(room) : undefined}
            tabIndex={isAdmin ? 0 : undefined}
            onKeyDown={isAdmin ? (e) => { if (e.key === 'Enter') handleViewRoom(room); } : undefined}
            style={{ cursor: isAdmin ? 'pointer' : 'default' }}
          >
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ marginBottom: '0.5rem' }}>{getStatusBadge(room.status)}</div>
              <h3 className="room-name" style={{ margin: '0.4rem 0 0.2rem 0' }}>{room.name}</h3>
              <p className="room-code"  style={{ margin: 0 }}>{room.code}</p>
            </div>

            {/* Edit / Delete buttons — admin only */}
            {isAdmin && (
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
            )}
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL — admin only (view / edit / add)
      ════════════════════════════════════════════════════════════════ */}
      {isAdmin && isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2>{editingRoom ? (isEditing ? 'Edit Room' : 'Room Details') : 'Add New Room'}</h2>

            {/* Name */}
            <label>Room Name *
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. DataScien Hub" readOnly={!isEditing} />
            </label>

            {/* Code */}
            <label>Room Code *
              <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
                placeholder="e.g. C-108" readOnly={!isEditing} />
            </label>

            {/* Status */}
            <label>Status
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Room['status'])} disabled={!isEditing}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="requested">Requested</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>

            {/* Floor */}
            <label>Floor
              <select value={newFloor} onChange={e => setNewFloor(e.target.value as Room['floorLabel'] | '')} disabled={!isEditing}>
                <option value="">Select floor</option>
                <option value="basement">Basement</option>
                <option value="ground">Ground</option>
                <option value="first">First</option>
                <option value="second">Second</option>
              </select>
            </label>

            {/* Location text */}
            <label>Location Description
              <input type="text" value={newLocation} onChange={e => setNewLocation(e.target.value)}
                placeholder="e.g. South Wing – Ground Floor – Corner C, near the stairwell"
                readOnly={!isEditing} />
            </label>

            {/* Direction Route Image */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <MapPin size={14} color="var(--soft-blue)" />
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--soft-blue-dark)' }}>
                  Direction Route Image
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--muted-text)' }}>
                Upload a photo or map of the route to this room. Users see a "View Direction" button that reveals it.
              </p>

              {previewSrc ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={previewSrc}
                    alt="Direction route preview"
                    style={{
                      width: '100%', maxHeight: '200px', objectFit: 'cover',
                      borderRadius: '10px', border: '2px solid var(--glass-border)',
                      display: 'block',
                    }}
                  />
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(); }}
                        style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#ef4444', border: 'none', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', zIndex: 10,
                        }}
                      >
                        <X size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
                        style={{
                          marginTop: 8, padding: '6px 14px', borderRadius: '8px',
                          border: '1px solid var(--glass-border)', background: 'var(--gray-light)',
                          color: 'var(--soft-blue-dark)', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        <ImagePlus size={14} /> Change Image
                      </button>
                    </>
                  )}
                </div>
              ) : (
                isEditing ? (
                  <div
                    onClick={(e) => { e.stopPropagation(); openFilePicker(); }}
                    style={{
                      border: '2px dashed var(--glass-border)', borderRadius: '10px',
                      padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                      background: 'var(--gray-light)', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--soft-blue)';
                      e.currentTarget.style.background  = 'rgba(79,70,229,0.04)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.background  = 'var(--gray-light)';
                    }}
                  >
                    <ImagePlus size={36} color="var(--soft-blue)" style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--soft-blue-dark)', fontSize: '14px' }}>
                      Click here to upload direction image
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted-text)' }}>
                      JPG · PNG · GIF · WEBP — max 10 MB
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--muted-text)', margin: 0 }}>
                    No direction image uploaded yet.
                  </p>
                )
              )}
            </div>

            {/* Coordinator */}
            <label>Room Coordinator
              <input type="text" value={newCoordinator} onChange={e => setNewCoordinator(e.target.value)}
                placeholder="e.g. Dr. Amina Hassan" readOnly={!isEditing} />
            </label>

            {/* Capacity */}
            <label>Capacity
              <select value={newCapacity}
                onChange={e => setNewCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={!isEditing}>
                <option value="">Select capacity</option>
                {CAPACITY_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                ))}
              </select>
            </label>

            {/* Equipment tags */}
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Equipment / Facilities
            </label>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px',
              border: '1px solid #ccc', borderRadius: '8px',
              background: isEditing ? '#fff' : '#f9fafb', marginBottom: '16px',
            }}>
              {EQUIPMENT_OPTIONS.map(tag => {
                const selected = newEquipment.includes(tag);
                return (
                  <button
                    key={tag} type="button"
                    onClick={(e) => { e.stopPropagation(); if (isEditing) toggleEquipment(tag); }}
                    disabled={!isEditing}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      cursor: isEditing ? 'pointer' : 'default',
                      border: selected ? '2px solid #4f46e5' : '1px solid #d1d5db',
                      background: selected ? '#ede9fe' : '#f3f4f6',
                      color: selected ? '#4f46e5' : '#6b7280', transition: 'all 0.15s',
                    }}
                  >
                    {selected && '✓ '}{tag}
                  </button>
                );
              })}
            </div>

            {/* Visibility */}
            <label>Room Visibility
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

            {/* View-mode private/public indicator */}
            {!isEditing && editingRoom && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                {editingRoom.isPrivate
                  ? <><Lock size={14} color="#991b1b" /><span style={{ color: '#991b1b', fontWeight: 600 }}>Private Room</span></>
                  : <><Globe size={14} color="#10b981" /><span style={{ color: '#10b981', fontWeight: 600 }}>Public Room</span></>}
              </div>
            )}

            <div className="modal-buttons">
              <button className="cancel-btn" onClick={closeModal} disabled={actionLoading}>Close</button>
              {isEditing ? (
                <button className="save-btn" onClick={handleSaveRoom} disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button className="save-btn" onClick={() => setIsEditing(true)}>Edit</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Rooms;