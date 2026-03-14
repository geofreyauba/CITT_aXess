// src/pages/Rooms.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icons } from '../components/icons';
import { roomsAPI } from '../lib/api';
import {
  Lock, Globe, MapPin, X, ImagePlus,
  Search, SlidersHorizontal, Building2, Users, UserPlus,
  Zap, ChevronDown, LayoutGrid, List, Navigation,
} from 'lucide-react';

const BACKEND = 'http://localhost:5000';
const toFullUrl = (p?: string) => (p ? `${BACKEND}${p}` : '');

interface Room {
  _id: string;
  name: string;
  code: string;
  status: 'available' | 'occupied' | 'requested' | 'maintenance';
  floorLabel?: 'basement' | 'ground' | 'first' | 'second';
  direction?: string;
  directionImage?: string;
  directionImages?: string[];   // ordered array of route-image server paths
  coordinator?: string;
  capacity?: number | null;
  equipment?: string[];
  isPrivate?: boolean;
  members?: RoomMember[];
}

interface RoomMember {
  _id: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  addedAt?: string;
}

// Each image slot in the editor
interface ImgSlot {
  existing: string;   // server path if already saved, '' if new
  file: File | null;  // newly selected file, null if only existing
  preview: string;    // object URL for preview, '' if none
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

const FLOOR_LABELS: Record<string, string> = {
  basement: 'Basement', ground: 'Ground Floor',
  first: 'First Floor', second: 'Second Floor',
};

const SC = {
  available:   { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0', dot: '#22c55e', lbl: 'Available' },
  occupied:    { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444', lbl: 'Occupied' },
  requested:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a', dot: '#f59e0b', lbl: 'Requested' },
  maintenance: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb', dot: '#9ca3af', lbl: 'Maintenance' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
const Rooms: React.FC = () => {
  const [rooms, setRooms]             = useState<Room[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isEditing, setIsEditing]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');

  // Search / Filter
  const [query, setQuery]                 = useState('');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterFloor, setFilterFloor]     = useState('all');
  const [filterPrivacy, setFilterPrivacy] = useState('all');
  const [filterEquip, setFilterEquip]     = useState<string[]>([]);
  const [showPanel, setShowPanel]         = useState(false);
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');

  // Form text fields
  const [newName, setNewName]               = useState('');
  const [newCode, setNewCode]               = useState('');
  const [newStatus, setNewStatus]           = useState<Room['status']>('available');
  const [newFloor, setNewFloor]             = useState<Room['floorLabel'] | ''>('');
  const [newLocation, setNewLocation]       = useState('');
  const [newCoordinator, setNewCoordinator] = useState('');
  const [newCapacity, setNewCapacity]       = useState<number | ''>('');
  const [newEquipment, setNewEquipment]     = useState<string[]>([]);
  const [newIsPrivate, setNewIsPrivate]     = useState(false);

  // Multi-image direction slots
  const [imgSlots, setImgSlots] = useState<ImgSlot[]>([]);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Members state
  const [showMembers, setShowMembers]         = useState(false);
  const [roomMembers, setRoomMembers]         = useState<RoomMember[]>([]);
  const [membersLoading, setMembersLoading]   = useState(false);
  const [addMemberName, setAddMemberName]     = useState('');
  const [addMemberRole, setAddMemberRole]     = useState('');
  const [addMemberPhone, setAddMemberPhone]   = useState('');
  const [addMemberEmail, setAddMemberEmail]   = useState('');
  const [addingMember, setAddingMember]       = useState(false);

  useEffect(() => {
    try {
      const u = localStorage.getItem('currentUser');
      if (u) setIsAdmin(JSON.parse(u).role === 'admin');
    } catch {}
  }, []);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      setRooms(await roomsAPI.getAll());
    } catch (e: any) {
      alert('Failed to load rooms: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered / stats ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rooms.filter(r => {
      if (q &&
        !r.name.toLowerCase().includes(q) &&
        !r.code.toLowerCase().includes(q) &&
        !(r.direction?.toLowerCase().includes(q)) &&
        !(r.coordinator?.toLowerCase().includes(q))) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterFloor  !== 'all' && r.floorLabel !== filterFloor) return false;
      if (filterPrivacy === 'public'  && r.isPrivate)  return false;
      if (filterPrivacy === 'private' && !r.isPrivate) return false;
      if (filterEquip.length > 0 && !filterEquip.every(e => r.equipment?.includes(e))) return false;
      return true;
    });
  }, [rooms, query, filterStatus, filterFloor, filterPrivacy, filterEquip]);

  const stats = useMemo(() => ({
    total:       rooms.length,
    available:   rooms.filter(r => r.status === 'available').length,
    occupied:    rooms.filter(r => r.status === 'occupied').length,
    requested:   rooms.filter(r => r.status === 'requested').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  }), [rooms]);

  const activeFilters = [
    filterStatus !== 'all', filterFloor !== 'all',
    filterPrivacy !== 'all', filterEquip.length > 0,
  ].filter(Boolean).length;

  const clearAll = () => {
    setQuery(''); setFilterStatus('all'); setFilterFloor('all');
    setFilterPrivacy('all'); setFilterEquip([]);
  };

  // ── Image slot helpers ────────────────────────────────────────────────────
  const freeSlotPreviews = (slots: ImgSlot[]) =>
    slots.forEach(s => { if (s.preview) URL.revokeObjectURL(s.preview); });

  const addSlot = () =>
    setImgSlots(prev => [...prev, { existing: '', file: null, preview: '' }]);

  const removeSlot = (i: number) => {
    setImgSlots(prev => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview);
      next.splice(i, 1);
      return next;
    });
  };

  const moveSlot = (i: number, dir: -1 | 1) => {
    setImgSlots(prev => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSlotFile = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { alert('Image files only'); return; }
    if (f.size > 10 * 1024 * 1024) { alert('Max 10 MB per image'); return; }
    setImgSlots(prev => {
      const next = [...prev];
      if (next[i].preview) URL.revokeObjectURL(next[i].preview);
      next[i] = { existing: '', file: f, preview: URL.createObjectURL(f) };
      return next;
    });
    e.target.value = '';
  };

  // ── Form reset / populate ─────────────────────────────────────────────────
  const resetForm = () => {
    setNewName(''); setNewCode(''); setNewStatus('available'); setNewFloor('');
    setNewLocation(''); setNewCoordinator(''); setNewCapacity('');
    setNewEquipment([]); setNewIsPrivate(false);
    setImgSlots(prev => { freeSlotPreviews(prev); return []; });
  };

  const populateForm = (r: Room) => {
    setNewName(r.name); setNewCode(r.code); setNewStatus(r.status);
    setNewFloor(r.floorLabel ?? ''); setNewLocation(r.direction ?? '');
    setNewCoordinator(r.coordinator ?? ''); setNewCapacity(r.capacity ?? '');
    setNewEquipment(r.equipment ?? []); setNewIsPrivate(r.isPrivate ?? false);
    // Build slots from saved data — prefer directionImages[], fall back to single directionImage
    const paths: string[] =
      r.directionImages && r.directionImages.length > 0
        ? r.directionImages
        : r.directionImage ? [r.directionImage] : [];
    setImgSlots(prev => {
      freeSlotPreviews(prev);
      return paths.map(p => ({ existing: p, file: null, preview: '' }));
    });
  };

  // ── Save ─ sends FormData with ALL images + slotOrder ────────────────────
  // ── Members helpers ──────────────────────────────────────────────────────
  const fetchMembers = async (roomId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/rooms/${roomId}/members`);
      const data = await res.json();
      setRoomMembers(Array.isArray(data) ? data : []);
    } catch { setRoomMembers([]); }
    finally { setMembersLoading(false); }
  };

  const openMembersPanel = (room: typeof editingRoom) => {
    if (!room) return;
    setShowMembers(true);
    setRoomMembers([]);
    setAddMemberName(''); setAddMemberRole(''); setAddMemberPhone(''); setAddMemberEmail('');
    fetchMembers(room._id);
  };

  const handleAddMember = async () => {
    if (!addMemberName.trim() || !editingRoom) return;
    setAddingMember(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${BACKEND}/api/rooms/${editingRoom._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: addMemberName.trim(), role: addMemberRole.trim(), phone: addMemberPhone.trim(), email: addMemberEmail.trim() }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.msg || 'Failed'); }
      setAddMemberName(''); setAddMemberRole(''); setAddMemberPhone(''); setAddMemberEmail('');
      fetchMembers(editingRoom._id);
      // Update rooms list to reflect member count
      const updated = await res.json().catch(() => null);
      if (updated) setRooms(p => p.map(r => r._id === editingRoom._id ? { ...r, members: [...(r.members || []), updated] } : r));
    } catch (e: any) { alert(e.message); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!editingRoom || !confirm('Remove this member?')) return;
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${BACKEND}/api/rooms/${editingRoom._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchMembers(editingRoom._id);
    } catch (e: any) { alert(e.message); }
  };

  const handleSave = async () => {
    if (!newName.trim() || !newCode.trim()) { alert('Name and code required'); return; }

    try {
      setActionLoading(true);

      const fd = new FormData();
      fd.append('name',      newName.trim());
      fd.append('code',      newCode.trim().toUpperCase());
      fd.append('status',    newStatus);
      fd.append('isPrivate', String(newIsPrivate));
      if (newFloor)              fd.append('floorLabel',   newFloor);
      if (newLocation.trim())    fd.append('direction',    newLocation.trim());
      if (newCoordinator.trim()) fd.append('coordinator',  newCoordinator.trim());
      fd.append('capacity', newCapacity !== '' ? String(newCapacity) : 'null');
      newEquipment.forEach(e => fd.append('equipment', e));

      // slotOrder tells the backend the exact intended position of each image.
      // 'existing:<serverPath>' → keep this already-saved image here.
      // 'new'                  → a new uploaded file goes here (appended in order below).
      imgSlots.forEach(slot => {
        if (slot.existing && !slot.file) {
          fd.append('slotOrder', `existing:${slot.existing}`);
          fd.append('existingDirectionImages', slot.existing);
        } else {
          fd.append('slotOrder', 'new');
        }
      });

      // Append new files in slot order so multer index matches slotOrder 'new' positions
      imgSlots
        .filter(s => s.file !== null)
        .forEach(s => fd.append('directionImages', s.file as File));

      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url    = editingRoom ? `${BACKEND}/api/rooms/${editingRoom._id}` : `${BACKEND}/api/rooms`;
      const method = editingRoom ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ msg: 'Unknown error' }));
        throw new Error(err.msg || `HTTP ${res.status}`);
      }
      const saved: Room = await res.json();

      if (editingRoom) {
        setRooms(p => p.map(r => r._id === editingRoom._id ? saved : r));
      } else {
        setRooms(p => [...p, saved]);
      }
      closeModal();
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Modal open / close ────────────────────────────────────────────────────
  const openAdd  = () => { resetForm(); setEditingRoom(null); setIsEditing(true);  setIsModalOpen(true); };
  const openView = (r: Room) => { populateForm(r); setEditingRoom(r); setIsEditing(false); setIsModalOpen(true); };
  const openEdit = (r: Room) => { populateForm(r); setEditingRoom(r); setIsEditing(true);  setIsModalOpen(true); };
  const closeModal = () => {
    setIsModalOpen(false); setIsEditing(false); setEditingRoom(null);
    setShowMembers(false); setRoomMembers([]);
  };

  const toggleEquip = (t: string) =>
    setNewEquipment(p => p.includes(t) ? p.filter(e => e !== t) : [...p, t]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await roomsAPI.delete(id); setRooms(p => p.filter(r => r._id !== id)); }
    catch (e: any) { alert('Delete failed: ' + e.message); }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:14 }}>
      <div style={{ width:44, height:44, border:'4px solid #e2e8f0', borderTopColor:'#6366f1', borderRadius:'50%', animation:'rm-spin 0.8s linear infinite' }}/>
      <p style={{ color:'#64748b', fontWeight:500 }}>Loading rooms…</p>
      <style>{`@keyframes rm-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
        .rp { font-family:'DM Sans',system-ui,sans-serif; padding-bottom:32px; }
        .rp-hdr { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:22px; gap:12px; flex-wrap:wrap; }
        .rp-title { font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-.03em; margin:0; line-height:1; }
        .rp-sub { font-size:13px; color:#94a3b8; margin:4px 0 0; font-weight:500; }
        .rp-add-btn { display:flex; align-items:center; gap:7px; background:linear-gradient(135deg,#6366f1,#4338ca); color:#fff; border:none; padding:11px 20px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 4px 16px rgba(99,102,241,.4); transition:all .2s; white-space:nowrap; }
        .rp-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 22px rgba(99,102,241,.5); }
        .rp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
        .rp-stat { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .rp-stat-n { font-size:24px; font-weight:800; font-family:'DM Mono',monospace; line-height:1; margin-bottom:3px; }
        .rp-stat-l { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; }
        .rp-toolbar { display:flex; align-items:center; gap:9px; flex-wrap:wrap; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:11px 14px; margin-bottom:14px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .rp-search-wrap { flex:1; min-width:180px; position:relative; }
        .rp-search { width:100%; padding:9px 12px 9px 36px; border:1.5px solid #e2e8f0; border-radius:10px; font-size:14px; font-family:inherit; background:#f8fafc; outline:none; transition:all .2s; color:#1e293b; box-sizing:border-box; }
        .rp-search:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
        .rp-search::placeholder { color:#94a3b8; }
        .rp-search-ico { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:#94a3b8; pointer-events:none; display:flex; }
        .rp-sel { padding:9px 12px; border-radius:10px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:13px; font-weight:600; color:#475569; font-family:inherit; cursor:pointer; outline:none; transition:all .2s; }
        .rp-sel:focus { border-color:#6366f1; background:#fff; }
        .rp-fbtn { display:flex; align-items:center; gap:6px; padding:9px 13px; border-radius:10px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:13px; font-weight:600; color:#475569; cursor:pointer; font-family:inherit; transition:all .2s; white-space:nowrap; }
        .rp-fbtn:hover, .rp-fbtn.on { border-color:#6366f1; background:#eef2ff; color:#6366f1; }
        .rp-fbadge { background:#6366f1; color:#fff; border-radius:20px; width:17px; height:17px; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; }
        .rp-vtoggle { display:flex; gap:3px; background:#f1f5f9; border-radius:9px; padding:3px; }
        .rp-vbtn { width:31px; height:31px; border-radius:7px; border:none; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#94a3b8; transition:all .15s; }
        .rp-vbtn.on { background:#fff; color:#6366f1; box-shadow:0 1px 4px rgba(0,0,0,.08); }
        .rp-fpanel { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; margin-bottom:14px; box-shadow:0 4px 20px rgba(0,0,0,.06); animation:rp-fd .18s ease; }
        @keyframes rp-fd { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .rp-fg label { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#94a3b8; margin-bottom:5px; }
        .rp-fg select { width:100%; padding:8px 10px; border-radius:8px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:13px; font-family:inherit; color:#1e293b; outline:none; cursor:pointer; }
        .rp-fg select:focus { border-color:#6366f1; background:#fff; }
        .rp-ewrap { display:flex; flex-wrap:wrap; gap:5px; }
        .rp-echip { padding:4px 10px; border-radius:20px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; transition:all .15s; font-family:inherit; }
        .rp-echip:hover { border-color:#6366f1; color:#6366f1; background:#eef2ff; }
        .rp-echip.on { border-color:#6366f1; background:#6366f1; color:#fff; }
        .rp-results { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
        .rp-rcount { font-size:13px; font-weight:600; color:#64748b; }
        .rp-rcount strong { color:#1e293b; }
        .rp-clear { font-size:12px; font-weight:600; color:#6366f1; background:#eef2ff; border:none; border-radius:8px; padding:5px 10px; cursor:pointer; font-family:inherit; transition:background .15s; }
        .rp-clear:hover { background:#e0e7ff; }
        .rp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(215px,1fr)); gap:13px; }
        .rp-card { background:#fff; border-radius:18px; padding:18px 15px 14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,.04); transition:all .22s cubic-bezier(.34,1.56,.64,1); position:relative; overflow:hidden; display:flex; flex-direction:column; gap:9px; }
        .rp-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#6366f1,#818cf8); opacity:0; transition:opacity .2s; }
        .rp-card:hover { transform:translateY(-4px); box-shadow:0 14px 36px rgba(99,102,241,.16); border-color:#a5b4fc; }
        .rp-card:hover::before { opacity:1; }
        .rp-card.clickable { cursor:pointer; }
        .rp-card-name { font-size:14px; font-weight:800; color:#1e293b; line-height:1.3; }
        .rp-card-code { font-family:'DM Mono',monospace; font-size:11px; font-weight:500; color:#94a3b8; letter-spacing:.04em; }
        .rp-lock { position:absolute; top:10px; right:10px; display:flex; align-items:center; gap:3px; background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:6px; font-size:10px; font-weight:700; }
        .rp-sbadge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; }
        .rp-sdot { width:6px; height:6px; border-radius:50%; display:inline-block; flex-shrink:0; }
        .rp-pills { display:flex; gap:5px; flex-wrap:wrap; }
        .rp-pill { display:inline-flex; align-items:center; gap:3px; background:#f1f5f9; color:#475569; border-radius:6px; padding:2px 8px; font-size:10px; font-weight:600; }
        .rp-loc { display:flex; align-items:flex-start; gap:5px; }
        .rp-loc-txt { font-size:11px; color:#374151; line-height:1.4; flex:1; }
        .rp-edots { display:flex; flex-wrap:wrap; gap:4px; }
        .rp-edot { padding:2px 7px; border-radius:5px; font-size:10px; font-weight:600; background:#f1f5f9; color:#64748b; }
        .rp-cactions { display:flex; gap:6px; margin-top:auto; }
        .rp-abtn { flex:1; display:flex; align-items:center; justify-content:center; gap:4px; padding:7px; border-radius:9px; border:none; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
        .rp-edit { background:#eef2ff; color:#6366f1; }
        .rp-edit:hover { background:#e0e7ff; }
        .rp-del { background:#fff1f2; color:#e11d48; }
        .rp-del:hover { background:#ffe4e6; }
        .rp-list { display:flex; flex-direction:column; gap:8px; }
        .rp-li { background:#fff; border-radius:13px; padding:13px 16px; border:1.5px solid #e2e8f0; display:flex; align-items:center; gap:12px; transition:all .18s; box-shadow:0 1px 4px rgba(0,0,0,.03); }
        .rp-li:hover { border-color:#a5b4fc; box-shadow:0 4px 16px rgba(99,102,241,.1); }
        .rp-li.clickable { cursor:pointer; }
        .rp-li-ico { width:44px; height:44px; border-radius:11px; flex-shrink:0; background:linear-gradient(135deg,#eef2ff,#e0e7ff); display:flex; align-items:center; justify-content:center; color:#6366f1; }
        .rp-li-main { flex:1; min-width:0; }
        .rp-li-name { font-size:14px; font-weight:700; color:#1e293b; }
        .rp-li-sub { font-size:11px; color:#94a3b8; margin-top:2px; font-family:'DM Mono',monospace; }
        .rp-li-loc { font-size:11px; color:#374151; margin-top:4px; display:flex; align-items:flex-start; gap:4px; line-height:1.4; }
        .rp-li-right { display:flex; gap:8px; align-items:center; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end; }
        .rp-li-acts { display:flex; gap:5px; flex-shrink:0; }
        .rp-li-btn { width:32px; height:32px; border-radius:8px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s; }
        .rp-empty { text-align:center; padding:56px 20px; background:#fff; border-radius:18px; border:2px dashed #e2e8f0; }
        .rp-empty-ico { width:60px; height:60px; background:#f1f5f9; border-radius:14px; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; color:#94a3b8; }
        .rp-overlay { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.6); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:16px 20px; animation:rp-oin .18s ease; }
        @keyframes rp-oin { from{opacity:0} to{opacity:1} }
        .rp-modal { background:#fff; border-radius:24px; padding:32px; width:100%; max-width:780px; max-height:92vh; overflow-y:auto; box-shadow:0 24px 64px rgba(0,0,0,.18); animation:rp-min .22s cubic-bezier(.34,1.56,.64,1); }
        @keyframes rp-min { from{opacity:0;transform:scale(.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        
        .rp-modal::-webkit-scrollbar { width:4px; }
        .rp-modal::-webkit-scrollbar-track { background:transparent; }
        .rp-modal::-webkit-scrollbar-thumb { background:rgba(99,102,241,.25); border-radius:4px; }
        .rp-modal::-webkit-scrollbar-thumb:hover { background:rgba(99,102,241,.45); }
        .rp-modal { scrollbar-width:thin; scrollbar-color:rgba(99,102,241,.25) transparent; }
        .rp-modal h2 { font-size:19px; font-weight:800; color:#0f172a; margin:0 0 22px; font-family:inherit; }
        .rp-lbl { display:block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#64748b; margin-bottom:16px; }
        .rp-lbl input, .rp-lbl select { display:block; width:100%; margin-top:5px; padding:10px 12px; border-radius:10px; border:1.5px solid #e2e8f0; background:#f8fafc; font-size:14px; font-family:inherit; color:#1e293b; outline:none; transition:all .2s; box-sizing:border-box; }
        .rp-lbl input:focus, .rp-lbl select:focus { border-color:#6366f1; background:#fff; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
        .rp-lbl input[readonly] { background:#f1f5f9; color:#64748b; cursor:default; }
        .rp-loccard { display:flex; align-items:flex-start; gap:10px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:11px 14px; margin-bottom:16px; }
        .rp-loccard-lbl { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#15803d; margin-bottom:3px; }
        .rp-loccard-val { font-size:13px; color:#166534; font-weight:500; line-height:1.45; }
        .rp-sec-lbl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#64748b; display:flex; align-items:center; gap:6px; margin-bottom:7px; }
        .rp-modal-btns { display:flex; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid #f1f5f9; }
        .rp-save { flex:1; padding:11px; border-radius:10px; border:none; background:linear-gradient(135deg,#6366f1,#4338ca); color:#fff; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .18s; }
        .rp-save:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(99,102,241,.35); }
        .rp-save:disabled { opacity:.6; cursor:not-allowed; transform:none; }
        .rp-cancel { padding:11px 20px; border-radius:10px; background:#f1f5f9; color:#64748b; border:none; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .18s; }
        .rp-cancel:hover { background:#e2e8f0; }
        .rp-lb { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.9); display:flex; align-items:center; justify-content:center; padding:20px; animation:rp-oin .18s ease; cursor:zoom-out; }
        .rp-lb img { max-width:92vw; max-height:88vh; border-radius:12px; object-fit:contain; box-shadow:0 24px 80px rgba(0,0,0,.6); cursor:default; }
        .rp-lb-x { position:absolute; top:16px; right:16px; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.15); border:none; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; }
        @media(max-width:680px){
          .rp-stats { grid-template-columns:repeat(2,1fr); }
          .rp-grid { grid-template-columns:repeat(2,1fr); }
          .rp-toolbar { gap:7px; }
          .rp-sel { display:none; }
        }
      `}</style>

      {/* Hidden file inputs — one per slot */}
      {isAdmin && isModalOpen && imgSlots.map((_, i) => (
        <input
          key={i}
          ref={el => { fileRefs.current[i] = el; }}
          type="file" accept="image/*"
          style={{ display:'none', position:'fixed', top:-9999, left:-9999 }}
          onChange={e => handleSlotFile(i, e)}
        />
      ))}

      <div className="rp">

        {/* PAGE HEADER */}
        <div className="rp-hdr">
          <div>
            <h1 className="rp-title">Rooms</h1>
            <p className="rp-sub">{rooms.length} rooms · {stats.available} available right now</p>
          </div>
          {isAdmin && <button className="rp-add-btn" onClick={openAdd}><Icons.Plus size={16}/> Add Room</button>}
        </div>

        {/* STAT CARDS */}
        <div className="rp-stats">
          {[
            { n: stats.total,       l: 'Total',       c: '#6366f1' },
            { n: stats.available,   l: 'Available',   c: '#22c55e' },
            { n: stats.occupied,    l: 'Occupied',    c: '#ef4444' },
            { n: stats.maintenance, l: 'Maintenance', c: '#f59e0b' },
          ].map(s => (
            <div className="rp-stat" key={s.l}>
              <div className="rp-stat-n" style={{ color: s.c }}>{s.n}</div>
              <div className="rp-stat-l">{s.l}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="rp-toolbar">
          <div className="rp-search-wrap">
            <span className="rp-search-ico"><Search size={14}/></span>
            <input className="rp-search" placeholder="Search by name, code, location…" value={query} onChange={e => setQuery(e.target.value)}/>
          </div>
          <select className="rp-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="requested">Requested</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <select className="rp-sel" value={filterFloor} onChange={e => setFilterFloor(e.target.value)}>
            <option value="all">All Floors</option>
            <option value="basement">Basement</option>
            <option value="ground">Ground Floor</option>
            <option value="first">First Floor</option>
            <option value="second">Second Floor</option>
          </select>
          <button className={`rp-fbtn ${showPanel || activeFilters > 0 ? 'on' : ''}`} onClick={() => setShowPanel(p => !p)}>
            <SlidersHorizontal size={14}/> More Filters
            {activeFilters > 0 && <span className="rp-fbadge">{activeFilters}</span>}
            <ChevronDown size={12} style={{ transform: showPanel ? 'rotate(180deg)' : 'none', transition:'.2s' }}/>
          </button>
          <div className="rp-vtoggle">
            <button className={`rp-vbtn ${viewMode==='grid'?'on':''}`} onClick={() => setViewMode('grid')} title="Grid"><LayoutGrid size={14}/></button>
            <button className={`rp-vbtn ${viewMode==='list'?'on':''}`} onClick={() => setViewMode('list')} title="List"><List size={14}/></button>
          </div>
        </div>

        {/* FILTER PANEL */}
        {showPanel && (
          <div className="rp-fpanel">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:14 }}>
              <div className="rp-fg">
                <label>Privacy</label>
                <select value={filterPrivacy} onChange={e => setFilterPrivacy(e.target.value)}>
                  <option value="all">All Rooms</option>
                  <option value="public">Public Only</option>
                  <option value="private">Private Only</option>
                </select>
              </div>
            </div>
            <div className="rp-sec-lbl" style={{ marginBottom:8 }}><Zap size={12}/> Must have equipment</div>
            <div className="rp-ewrap" style={{ marginBottom:14 }}>
              {EQUIPMENT_OPTIONS.map(t => (
                <button key={t} className={`rp-echip ${filterEquip.includes(t)?'on':''}`}
                  onClick={() => setFilterEquip(p => p.includes(t) ? p.filter(e => e!==t) : [...p,t])}>{t}</button>
              ))}
            </div>
            {activeFilters > 0 && <button className="rp-clear" onClick={clearAll}>✕ Clear all filters</button>}
          </div>
        )}

        {/* RESULTS BAR */}
        <div className="rp-results">
          <p className="rp-rcount">
            Showing <strong>{filtered.length}</strong> of <strong>{rooms.length}</strong> rooms
            {query && <> for &ldquo;<strong>{query}</strong>&rdquo;</>}
          </p>
          {(activeFilters > 0 || query) && <button className="rp-clear" onClick={clearAll}>✕ Clear</button>}
        </div>

        {/* ROOM DISPLAY */}
        {filtered.length === 0 ? (
          <div className="rp-empty">
            <div className="rp-empty-ico"><Building2 size={26}/></div>
            <p style={{ fontWeight:700, color:'#1e293b', fontSize:15, marginBottom:6 }}>No rooms found</p>
            <p style={{ color:'#94a3b8', fontSize:13, marginBottom:14 }}>Try adjusting your search or filters</p>
            <button className="rp-clear" style={{ fontSize:13 }} onClick={clearAll}>Clear all filters</button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="rp-grid">
            {filtered.map(room => {
              const s = SC[room.status as keyof typeof SC] || SC.available;
              return (
                <div key={room._id} className={`rp-card ${isAdmin ? 'clickable' : ''}`} onClick={isAdmin ? () => openView(room) : undefined}>
                  {room.isPrivate && <div className="rp-lock"><Lock size={9}/> Private</div>}
                  <span className="rp-sbadge" style={{ background:s.bg, color:s.text, border:`1px solid ${s.border}` }}>
                    <span className="rp-sdot" style={{ background:s.dot }}/>{s.lbl}
                  </span>
                  <div>
                    <div className="rp-card-name">{room.name}</div>
                    <div className="rp-card-code">{room.code}</div>
                  </div>
                  <div className="rp-pills">
                    {room.floorLabel && <span className="rp-pill"><Building2 size={9}/> {FLOOR_LABELS[room.floorLabel]}</span>}
                    {room.capacity != null && <span className="rp-pill"><Users size={9}/> {room.capacity} people</span>}
                  </div>
                  {room.direction && (
                    <div className="rp-loc"><MapPin size={11} color="#16a34a" style={{ flexShrink:0, marginTop:1 }}/><span className="rp-loc-txt">{room.direction}</span></div>
                  )}
                  {room.equipment && room.equipment.length > 0 && (
                    <div className="rp-edots">
                      {room.equipment.slice(0, 3).map(e => <span key={e} className="rp-edot">{e}</span>)}
                      {room.equipment.length > 3 && <span className="rp-edot">+{room.equipment.length - 3} more</span>}
                    </div>
                  )}
                  {isAdmin && (
                    <div className="rp-cactions" onClick={e => e.stopPropagation()}>
                      <button className="rp-abtn rp-edit" onClick={() => openEdit(room)}><Icons.Edit size={13}/> Edit</button>
                      <button className="rp-abtn rp-del" onClick={() => handleDelete(room._id, room.name)}><Icons.Trash size={13}/> Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rp-list">
            {filtered.map(room => {
              const s = SC[room.status as keyof typeof SC] || SC.available;
              return (
                <div key={room._id} className={`rp-li ${isAdmin ? 'clickable' : ''}`} onClick={isAdmin ? () => openView(room) : undefined}>
                  <div className="rp-li-ico"><Building2 size={20}/></div>
                  <div className="rp-li-main">
                    <div className="rp-li-name">{room.name}{room.isPrivate && <Lock size={11} color="#b91c1c" style={{ marginLeft:6, verticalAlign:'middle' }}/>}</div>
                    <div className="rp-li-sub">{room.code}{room.floorLabel ? ` · ${FLOOR_LABELS[room.floorLabel]}` : ''}{room.capacity != null ? ` · ${room.capacity} people` : ''}</div>
                    {room.direction && (
                      <div className="rp-li-loc"><MapPin size={10} color="#16a34a" style={{ flexShrink:0, marginTop:1 }}/>{room.direction}</div>
                    )}
                  </div>
                  <div className="rp-li-right">
                    {room.equipment && room.equipment.length > 0 && (
                      <span style={{ fontSize:11, color:'#94a3b8', display:'flex', alignItems:'center', gap:3 }}><Zap size={10}/> {room.equipment.length}</span>
                    )}
                    <span className="rp-sbadge" style={{ background:s.bg, color:s.text, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>
                      <span className="rp-sdot" style={{ background:s.dot }}/>{s.lbl}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="rp-li-acts" onClick={e => e.stopPropagation()}>
                      <button className="rp-li-btn" style={{ background:'#eef2ff', color:'#6366f1' }} onClick={() => openEdit(room)}><Icons.Edit size={14}/></button>
                      <button className="rp-li-btn" style={{ background:'#fff1f2', color:'#e11d48' }} onClick={() => handleDelete(room._id, room.name)}><Icons.Trash size={14}/></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════ MODAL ════════ */}
      {isAdmin && isModalOpen && (
        <div className="rp-overlay" onClick={closeModal}>
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <h2>{editingRoom ? (isEditing ? '✏️ Edit Room' : '🏢 Room Details') : '➕ Add New Room'}</h2>

            <label className="rp-lbl">Room Name *
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. DataScience Hub" readOnly={!isEditing}/>
            </label>
            <label className="rp-lbl">Room Code *
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. C-108" readOnly={!isEditing}/>
            </label>
            <label className="rp-lbl">Status
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as Room['status'])} disabled={!isEditing}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="requested">Requested</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
            <label className="rp-lbl">Floor
              <select value={newFloor} onChange={e => setNewFloor(e.target.value as Room['floorLabel'] | '')} disabled={!isEditing}>
                <option value="">Select floor</option>
                <option value="basement">Basement</option>
                <option value="ground">Ground Floor</option>
                <option value="first">First Floor</option>
                <option value="second">Second Floor</option>
              </select>
            </label>

            {isEditing ? (
              <label className="rp-lbl">Location Description
                <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="e.g. South Wing – Ground Floor – Corner C, near stairwell"/>
              </label>
            ) : (
              <div style={{ marginBottom:16 }}>
                <div className="rp-sec-lbl" style={{ marginBottom:8 }}><MapPin size={12}/> Location</div>
                {newLocation ? (
                  <div className="rp-loccard">
                    <MapPin size={16} color="#16a34a" style={{ flexShrink:0, marginTop:2 }}/>
                    <div>
                      <div className="rp-loccard-lbl">Where to find this room</div>
                      <div className="rp-loccard-val">{newLocation}</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize:13, color:'#94a3b8', marginBottom:0 }}>No location set for this room.</p>
                )}
              </div>
            )}

            {/* ── Direction Images ── */}
            <div style={{ marginBottom:18 }}>
              <div className="rp-sec-lbl" style={{ marginBottom:10 }}>
                <Navigation size={12}/> Direction Route Images
                {imgSlots.length > 0 && (
                  <span style={{ marginLeft:6, background:'#6366f1', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:800 }}>
                    {imgSlots.length} {imgSlots.length === 1 ? 'step' : 'steps'}
                  </span>
                )}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {imgSlots.map((slot, i) => {
                  const src = slot.preview || (slot.existing ? toFullUrl(slot.existing) : '');
                  return (
                    <div key={i} style={{ border:'1.5px solid #e2e8f0', borderRadius:12, padding:'10px 12px', background:'#f8fafc', display:'flex', gap:12, alignItems:'center' }}>
                      {/* Step badge */}
                      <div style={{ flexShrink:0, width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#4338ca)', color:'#fff', fontWeight:800, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>{i + 1}</div>

                      {/* Thumbnail */}
                      {src ? (
                        <img src={src} alt={`Step ${i + 1}`} onClick={() => setLightboxSrc(src)}
                          style={{ width:64, height:52, objectFit:'cover', borderRadius:8, border:'1px solid #e2e8f0', cursor:'zoom-in', flexShrink:0 }}/>
                      ) : (
                        <div onClick={() => isEditing && fileRefs.current[i]?.click()}
                          style={{ width:64, height:52, borderRadius:8, border:'2px dashed #c7d2fe', background:'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', cursor: isEditing ? 'pointer' : 'default', flexShrink:0 }}>
                          <ImagePlus size={20} color="#6366f1"/>
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex:1, fontSize:12, color:'#64748b', fontWeight:500 }}>
                        {src ? (slot.file ? slot.file.name : 'Saved image') : 'No image yet'}
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>Step {i + 1} of {imgSlots.length}</div>
                      </div>

                      {/* Controls */}
                      {isEditing && (
                        <div style={{ display:'flex', gap:4, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                          <button onClick={e => { e.stopPropagation(); fileRefs.current[i]?.click(); }}
                            style={{ padding:'5px 9px', borderRadius:7, border:'1px solid #c7d2fe', background:'#eef2ff', color:'#6366f1', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'inherit' }}>
                            <ImagePlus size={12}/>{src ? 'Change' : 'Upload'}
                          </button>
                          <button onClick={e => { e.stopPropagation(); moveSlot(i, -1); }} disabled={i === 0}
                            style={{ width:28, height:28, borderRadius:7, border:'1px solid #e2e8f0', background: i===0?'#f1f5f9':'#fff', color: i===0?'#cbd5e1':'#475569', fontSize:14, cursor: i===0?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>↑</button>
                          <button onClick={e => { e.stopPropagation(); moveSlot(i, 1); }} disabled={i === imgSlots.length-1}
                            style={{ width:28, height:28, borderRadius:7, border:'1px solid #e2e8f0', background: i===imgSlots.length-1?'#f1f5f9':'#fff', color: i===imgSlots.length-1?'#cbd5e1':'#475569', fontSize:14, cursor: i===imgSlots.length-1?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>↓</button>
                          <button onClick={e => { e.stopPropagation(); removeSlot(i); }}
                            style={{ width:28, height:28, borderRadius:7, border:'1px solid #fecaca', background:'#fff1f2', color:'#e11d48', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>
                            <X size={12}/>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isEditing && (
                <button onClick={e => { e.stopPropagation(); addSlot(); }}
                  style={{ marginTop:10, width:'100%', padding:'11px', borderRadius:10, border:'2px dashed #c7d2fe', background:'#f5f3ff', color:'#6366f1', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', transition:'all .2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#eef2ff'; (e.currentTarget as HTMLButtonElement).style.borderColor='#6366f1'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#f5f3ff'; (e.currentTarget as HTMLButtonElement).style.borderColor='#c7d2fe'; }}>
                  <ImagePlus size={15}/> Add Direction Step
                </button>
              )}

              {!isEditing && imgSlots.length === 0 && (
                <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>No direction images uploaded.</p>
              )}
            </div>

            <label className="rp-lbl">Room Coordinator
              <input value={newCoordinator} onChange={e => setNewCoordinator(e.target.value)} placeholder="e.g. Dr. Amina Hassan" readOnly={!isEditing}/>
            </label>
            <label className="rp-lbl">Capacity
              <select value={newCapacity} onChange={e => setNewCapacity(e.target.value===''?'':Number(e.target.value))} disabled={!isEditing}>
                <option value="">Select capacity</option>
                {CAPACITY_OPTIONS.map(n => <option key={n} value={n}>{n} {n===1?'person':'people'}</option>)}
              </select>
            </label>

            {/* Equipment */}
            <div style={{ marginBottom:18 }}>
              <div className="rp-sec-lbl"><Zap size={12}/> Equipment / Facilities</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:11, border:'1.5px solid #e2e8f0', borderRadius:10, background: isEditing?'#fff':'#f8fafc' }}>
                {EQUIPMENT_OPTIONS.map(tag => {
                  const sel = newEquipment.includes(tag);
                  return (
                    <button key={tag} type="button" onClick={e => { e.stopPropagation(); if (isEditing) toggleEquip(tag); }} disabled={!isEditing}
                      style={{ padding:'4px 11px', borderRadius:20, fontSize:12, fontWeight:600, cursor: isEditing?'pointer':'default', border: sel?'2px solid #6366f1':'1.5px solid #e2e8f0', background: sel?'#eef2ff':'#f8fafc', color: sel?'#6366f1':'#64748b', transition:'all .15s', fontFamily:'inherit' }}>
                      {sel && '✓ '}{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility */}
            <label className="rp-lbl">Room Visibility
              <select value={newIsPrivate?'private':'public'} onChange={e => setNewIsPrivate(e.target.value==='private')} disabled={!isEditing}>
                <option value="public">Public — anyone can request the key</option>
                <option value="private">Private — authorized members only</option>
              </select>
            </label>

            {!isEditing && editingRoom && (
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:8 }}>
                {editingRoom.isPrivate
                  ? <><Lock size={13} color="#b91c1c"/><span style={{ color:'#b91c1c', fontWeight:700 }}>Private Room</span></>
                  : <><Globe size={13} color="#16a34a"/><span style={{ color:'#16a34a', fontWeight:700 }}>Public Room</span></>
                }
              </div>
            )}

            {/* ══ MEMBERS SECTION ══ */}
            <div style={{ marginBottom:18, borderTop:'1.5px solid #f1f5f9', paddingTop:18 }}>
              {/* Header row with toggle */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showMembers ? 14 : 0 }}>
                <div className="rp-sec-lbl" style={{ marginBottom:0 }}>
                  <Users size={12} color="#6366f1"/> Room Members
                  {editingRoom && (editingRoom.members?.length ?? roomMembers.length) > 0 && (
                    <span style={{ marginLeft:6, background:'#6366f1', color:'#fff', borderRadius:20, padding:'1px 8px', fontSize:10, fontWeight:800 }}>
                      {showMembers ? roomMembers.length : (editingRoom.members?.length ?? 0)}
                    </span>
                  )}
                </div>
                {editingRoom && (
                  <button
                    onClick={e => { e.stopPropagation(); if (!showMembers) openMembersPanel(editingRoom); else setShowMembers(false); }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, border:'1.5px solid', borderColor: showMembers ? '#e2e8f0' : '#6366f1', background: showMembers ? '#f1f5f9' : '#eef2ff', color: showMembers ? '#64748b' : '#6366f1', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}>
                    <Users size={12}/>{showMembers ? 'Hide Members' : 'View / Manage Members'}
                  </button>
                )}
              </div>

              {showMembers && (
                <>
                  {/* Member list */}
                  {membersLoading ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[1,2].map(i => <div key={i} style={{ height:50, borderRadius:10, background:'#f1f5f9', animation:'rp-pulse 1.5s ease infinite' }}/>)}
                    </div>
                  ) : roomMembers.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'16px 0', color:'#94a3b8', fontSize:13, background:'#f8fafc', borderRadius:10, border:'1.5px dashed #e2e8f0' }}>
                      No members added yet.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:240, overflowY:'auto', scrollbarWidth:'thin', scrollbarColor:'rgba(99,102,241,.2) transparent', marginBottom:12 }}>
                      {roomMembers.map((m, idx) => (
                        <div key={m._id} style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:10, padding:'10px 12px', border:'1.5px solid #e2e8f0' }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b'][idx%5]},${['#4338ca','#7c3aed','#0891b2','#059669','#d97706'][idx%5]})`, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize:11, color:'#64748b', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {[m.role, m.phone, m.email].filter(Boolean).join(' · ') || 'No details'}
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); handleRemoveMember(m._id); }}
                            style={{ background:'#fff1f2', border:'1px solid #fecaca', color:'#e11d48', borderRadius:7, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                            <X size={12}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member form */}
                  <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12, padding:'14px 16px', marginTop:8 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#15803d', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                      <Users size={12}/> Add New Member
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                      <input placeholder="Full name *" value={addMemberName} onChange={e => setAddMemberName(e.target.value)}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1.5px solid #bbf7d0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff', gridColumn:'1 / -1' }}/>
                      <input placeholder="Role (e.g. Student, Staff)" value={addMemberRole} onChange={e => setAddMemberRole(e.target.value)}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1.5px solid #bbf7d0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff' }}/>
                      <input placeholder="Phone" value={addMemberPhone} onChange={e => setAddMemberPhone(e.target.value)}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1.5px solid #bbf7d0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff' }}/>
                      <input placeholder="Email" value={addMemberEmail} onChange={e => setAddMemberEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddMember(); }}
                        style={{ padding:'8px 10px', borderRadius:8, border:'1.5px solid #bbf7d0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff', gridColumn:'1 / -1' }}/>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleAddMember(); }}
                      disabled={addingMember || !addMemberName.trim()}
                      style={{ width:'100%', padding:'10px', borderRadius:9, border:'none', background: addingMember || !addMemberName.trim() ? '#d1fae5' : 'linear-gradient(135deg,#16a34a,#15803d)', color: addingMember || !addMemberName.trim() ? '#6b7280' : '#fff', fontWeight:700, fontSize:13, cursor: addingMember || !addMemberName.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .18s' }}>
                      <Users size={13}/>{addingMember ? 'Adding…' : 'Add Member'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="rp-modal-btns">
              <button className="rp-cancel" onClick={closeModal} disabled={actionLoading}>Close</button>
              {isEditing
                ? <button className="rp-save" onClick={handleSave} disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save Room'}</button>
                : <button className="rp-save" onClick={() => setIsEditing(true)}>✏️ Edit</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="rp-lb" onClick={() => setLightboxSrc('')}>
          <button className="rp-lb-x" onClick={() => setLightboxSrc('')}>✕</button>
          <img src={lightboxSrc} alt="Direction route" onClick={e => e.stopPropagation()}/>
        </div>
      )}
    </>
  );
};

export default Rooms;