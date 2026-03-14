// src/pages/PendingReturns.tsx
// Admin page — two sections:
//   1. Manual return requests (user clicked "Return Key")
//   2. Overdue requests — approved keys held for MORE than 24 hours with no return
//
// RETURN VERIFICATION FLOW (per spec):
//   Admin clicks "Approve" → QR scanner opens immediately →
//   Scan member's ID card → confirmation card shown (name, phone, timestamp, QR badge) →
//   Admin clicks "Confirm & Approve" → return is logged and room freed.
//   A "Skip Scan / Manual" escape hatch is always available inside the scanner.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/icons';
import Badge from '../components/ui/Badge';
import { requestsAPI } from '../lib/api';
import QRScanner, { QRScanResult } from '../components/QRScanner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReturnRequest {
  _id: string;
  userId: {
    _id:      string;
    fullName: string;
    phone?:   string;
    email?:   string;
  };
  roomId: {
    _id:  string;
    name: string;
    code: string;
  };
  carriedItems?:        string;
  membership?:          string;
  status:               string;
  returnApprovalStatus: string;
  returnRequestedAt?:   string;
  requestedAt:          string;
  returnedAt?:          string;
}

interface VerificationRecord {
  requestId:         string;
  memberId:          string;
  memberName:        string;
  memberPhone?:      string;
  roomName:          string;
  roomCode:          string;
  returnedAt:        string;   // ISO
  returnedAtDisplay: string;   // human-readable
  verifiedByQR:      boolean;
  identityMatch:     boolean;
  scannedName?:      string;
  scannedPhone?:     string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso?: string): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const fmtNow = (): string =>
  new Date().toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const hoursAgo = (iso?: string) =>
  iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : 0;

const fmtDuration = (iso?: string): string => {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mn = m % 60;
  if (d > 0) return `${d}d ${h}h ${mn}m`;
  if (h > 0) return `${h}h ${mn}m`;
  return `${mn}m`;
};

const urgency = (h: number) => {
  if (h >= 72) return { label: 'CRITICAL', colour: '#7f1d1d', bg: '#fee2e2' };
  if (h >= 48) return { label: 'HIGH',     colour: '#991b1b', bg: '#fecaca' };
  if (h >= 24) return { label: 'OVERDUE',  colour: '#c2410c', bg: '#ffedd5' };
  return         { label: 'PENDING',   colour: '#92400e', bg: '#fef3c7' };
};

// ─── Confirmation Card (shown after scan) ────────────────────────────────────
interface ConfirmCardProps {
  req:        ReturnRequest;
  scan:       QRScanResult | null;   // null = manual (no scan)
  returnTime: string;
  adminName:  string;
  processing: boolean;
  onApprove:  () => void;
  onRescan:   () => void;
  onClose:    () => void;
}

const ConfirmCard: React.FC<ConfirmCardProps> = ({
  req, scan, returnTime, adminName, processing, onApprove, onRescan, onClose,
}) => {
  const byQR       = scan !== null;
  const nameMatch  = byQR && (
    (!!scan!.userId   && scan!.userId   === req.userId._id) ||
    (!!scan!.fullName && scan!.fullName.toLowerCase() === req.userId.fullName?.toLowerCase())
  );
  const mismatch   = byQR && !nameMatch;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget && !processing) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
        overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: mismatch
            ? 'linear-gradient(135deg,#9a3412,#c2410c)'
            : byQR
            ? 'linear-gradient(135deg,#15803d,#16a34a)'
            : 'linear-gradient(135deg,#0f172a,#1e3a5f)',
          padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>
              {mismatch ? '⚠️' : byQR ? '✅' : '✋'}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                {mismatch ? 'ID Mismatch Detected' : byQR ? 'Identity Verified via QR' : 'Manual Return Confirmation'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                {mismatch
                  ? 'Scanned card does not match this member'
                  : byQR
                  ? 'QR code matched — confirm to complete'
                  : 'No scan — confirm you verified in person'}
              </div>
            </div>
          </div>
          {!processing && (
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', border: 'none',
              color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          )}
        </div>

        <div style={{ padding: '20px' }}>

          {/* ── QR Verification Badge ── */}
          {byQR && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: mismatch ? '#fff7ed' : '#f0fdf4',
              border: `1.5px solid ${mismatch ? '#fb923c' : '#22c55e'}`,
              borderRadius: 999, padding: '5px 14px',
              marginBottom: 16, fontSize: 12, fontWeight: 700,
              color: mismatch ? '#9a3412' : '#15803d',
            }}>
              <span style={{ fontSize: 14 }}>{mismatch ? '⚠️' : '📷'}</span>
              {mismatch
                ? `QR SCANNED · MISMATCH · Expected: ${req.userId.fullName}`
                : `QR VERIFIED · ID CARD SCANNED`}
            </div>
          )}

          {/* ── Member card ── */}
          <div style={{
            background: '#f8fafc', borderRadius: 14, padding: 16,
            border: '1px solid #e2e8f0', marginBottom: 16,
          }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: mismatch
                  ? 'linear-gradient(135deg,#f97316,#ea580c)'
                  : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 22,
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              }}>
                {(req.userId?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {req.userId?.fullName || 'Unknown'}
                </div>
                {req.membership && req.membership !== 'No Membership' && (
                  <div style={{
                    display: 'inline-block', marginTop: 3,
                    background: '#ede9fe', color: '#5b21b6',
                    borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                  }}>{req.membership}</div>
                )}
              </div>
            </div>

            {/* ── Phone — prominent for easy tracking ── */}
            <div style={{
              background: '#fff', borderRadius: 12, padding: '12px 14px',
              border: '2px solid #e0f2fe', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#0ea5e9,#0284c7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>📞</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Phone Number
                </div>
                {req.userId?.phone ? (
                  <a href={`tel:${req.userId.phone}`} style={{
                    fontWeight: 800, fontSize: 17, color: '#0284c7',
                    textDecoration: 'none', letterSpacing: '0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {req.userId.phone}
                  </a>
                ) : (
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#ef4444' }}>
                    ⚠ No phone on file
                  </div>
                )}
              </div>
            </div>

            {/* Room + items */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Room</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{req.roomId?.name}</div>
                <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{req.roomId?.code}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Time Held</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{fmtDuration(req.requestedAt)}</div>
              </div>
              {req.carriedItems && (
                <div style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Items Carried</div>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{req.carriedItems}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Return timestamp ── */}
          <div style={{
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border: '1.5px solid #86efac', borderRadius: 12,
            padding: '12px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🕐</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Return Timestamp
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#15803d', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {returnTime}
              </div>
              <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                Verified by: <strong>{adminName}</strong>
                {byQR && !mismatch && <> · <span style={{ color: '#15803d' }}>📷 QR Scanned</span></>}
                {!byQR && <> · <span style={{ color: '#b45309' }}>✋ Manual</span></>}
              </div>
            </div>
          </div>

          {/* Mismatch warning extra detail */}
          {mismatch && scan && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>Scanned card belongs to:</div>
              <div style={{ color: '#c2410c' }}>{scan.fullName || scan.userId || 'Unknown'}</div>
              {scan.phone && <div style={{ color: '#c2410c' }}>📞 {scan.phone}</div>}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary confirm */}
            <button
              onClick={onApprove}
              disabled={processing}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: processing
                  ? '#cbd5e1'
                  : mismatch
                  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                  : 'linear-gradient(135deg,#22c55e,#16a34a)',
                color: '#fff', fontSize: 15, fontWeight: 800,
                cursor: processing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: processing ? 'none' : '0 4px 16px rgba(22,163,74,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {processing ? (
                <Spin />
              ) : mismatch ? (
                '⚠ Approve Anyway (Mismatch Noted)'
              ) : (
                `✓ Confirm Return — ${req.userId?.fullName}`
              )}
            </button>

            {/* Rescan */}
            {byQR && (
              <button
                onClick={onRescan}
                disabled={processing}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#0f172a,#1e3a5f)',
                  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                📷 Scan Again
              </button>
            )}

            {/* Cancel */}
            <button
              onClick={onClose}
              disabled={processing}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Spin: React.FC = () => (
  <span style={{
    display: 'inline-block', width: 18, height: 18, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  }} />
);

// ─── Main Component ───────────────────────────────────────────────────────────
const PendingReturns: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token   = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('currentUser');
      if (!token || !userStr) { navigate('/login', { replace: true }); return; }
      const u = JSON.parse(userStr);
      if (u.role !== 'admin' && u.role !== 'guard') { navigate('/dashboard', { replace: true }); return; }
    } catch { navigate('/login', { replace: true }); }
  }, [navigate]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [pendingReturns,   setPendingReturns]   = useState<ReturnRequest[]>([]);
  const [overdueItems,     setOverdueItems]     = useState<ReturnRequest[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [processing,       setProcessing]       = useState<string | null>(null);
  const [activeTab,        setActiveTab]        = useState<'pending' | 'overdue'>('pending');
  const [searchTerm,       setSearchTerm]       = useState('');
  const [adminName,        setAdminName]        = useState('Admin');
  const [, setTick] = useState(0);

  // Approve flow state machine
  // Phase: null → 'scanning' → 'confirming'
  type Phase = null | 'scanning' | 'confirming';
  const [approvePhase,   setApprovePhase]   = useState<Phase>(null);
  const [activeRequest,  setActiveRequest]  = useState<ReturnRequest | null>(null);
  const [scanResult,     setScanResult]     = useState<QRScanResult | null>(null);
  const [returnTime,     setReturnTime]     = useState('');
  const tickerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (u.fullName) setAdminName(u.fullName);
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const pending: ReturnRequest[] = await requestsAPI.getPendingReturns();
      setPendingReturns(pending);
      const all: ReturnRequest[] = await requestsAPI.getAllRequests();
      setOverdueItems(all.filter(r =>
        r.status === 'approved' &&
        r.returnApprovalStatus !== 'pending_approval' &&
        hoursAgo(r.requestedAt) >= 24
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Approve flow ──────────────────────────────────────────────────────────

  // Step 1: admin clicks Approve → scanner opens immediately
  const startApprove = (req: ReturnRequest) => {
    setActiveRequest(req);
    setScanResult(null);
    setReturnTime(fmtNow());
    setApprovePhase('scanning');
    // Tick the returnTime every second while confirming
    clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => setReturnTime(fmtNow()), 1000);
  };

  // Step 2a: QR scan succeeded → go to confirmation card
  const handleScanned = (result: QRScanResult) => {
    setScanResult(result);
    setReturnTime(fmtNow());
    setApprovePhase('confirming');
  };

  // Step 2b: admin dismisses scanner without scanning → manual confirmation card
  const handleSkipScan = () => {
    setScanResult(null);
    setReturnTime(fmtNow());
    setApprovePhase('confirming');
  };

  // Step 3: admin clicks confirm on the card → approve in backend
  const handleConfirm = async () => {
    if (!activeRequest) return;
    try {
      setProcessing(activeRequest._id);
      await requestsAPI.approveReturn(activeRequest._id);

      // Build verification record for logging / future backend endpoint
      const record: VerificationRecord = {
        requestId:         activeRequest._id,
        memberId:          activeRequest.userId._id,
        memberName:        activeRequest.userId.fullName,
        memberPhone:       activeRequest.userId.phone,
        roomName:          activeRequest.roomId.name,
        roomCode:          activeRequest.roomId.code,
        returnedAt:        new Date().toISOString(),
        returnedAtDisplay: returnTime,
        verifiedByQR:      scanResult !== null,
        identityMatch:     scanResult !== null && (
          scanResult.userId   === activeRequest.userId._id ||
          scanResult.fullName?.toLowerCase() === activeRequest.userId.fullName?.toLowerCase()
        ),
        scannedName:       scanResult?.fullName,
        scannedPhone:      scanResult?.phone,
      };
      console.log('[RETURN VERIFIED]', record);

      resetFlow();
      await loadData();
    } catch (err: any) {
      alert('Failed to approve: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const resetFlow = () => {
    clearInterval(tickerRef.current);
    setApprovePhase(null);
    setActiveRequest(null);
    setScanResult(null);
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async (id: string) => {
    if (!confirm('Reject this return request?')) return;
    try {
      setProcessing(id);
      await requestsAPI.rejectReturn(id);
      resetFlow();
      await loadData();
    } catch (err: any) {
      alert('Failed to reject: ' + err.message);
    } finally { setProcessing(null); }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filter = (rows: ReturnRequest[]) => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      r.userId?.fullName?.toLowerCase().includes(q) ||
      r.roomId?.name?.toLowerCase().includes(q)     ||
      r.roomId?.code?.toLowerCase().includes(q)     ||
      r.userId?.phone?.includes(q)                  ||
      r.userId?.email?.toLowerCase().includes(q)
    );
  };

  if (loading) return (
    <div className="pr-loading"><div className="pr-spinner" /><p>Loading…</p></div>
  );
  if (error)   return (
    <div className="pr-error-box">
      <Icons.Lock size={32} color="#ef4444" />
      <h3>Failed to load</h3><p>{error}</p>
      <button className="save-btn" onClick={loadData} style={{ width: 'auto', marginTop: '1rem' }}>Retry</button>
    </div>
  );

  const filteredPending = filter(pendingReturns);
  const filteredOverdue = filter(overdueItems);

  return (
    <div className="pr-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ══ STEP 1 — QR Scanner opens immediately when approve clicked ══ */}
      {approvePhase === 'scanning' && activeRequest && (
        <QRScanner
          onScan={handleScanned}
          onClose={handleSkipScan}   /* closing scanner = skip to manual confirm */
          title={`Verify: ${activeRequest.userId?.fullName}`}
          subtitle="Scan the member's ID card QR code to verify identity"
          skipLabel="Skip — Confirm Manually"
        />
      )}

      {/* ══ STEP 2 — Confirmation card (after scan or manual skip) ══ */}
      {approvePhase === 'confirming' && activeRequest && (
        <ConfirmCard
          req={activeRequest}
          scan={scanResult}
          returnTime={returnTime}
          adminName={adminName}
          processing={processing === activeRequest._id}
          onApprove={handleConfirm}
          onRescan={() => setApprovePhase('scanning')}
          onClose={resetFlow}
        />
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="pr-page-header">
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Pending Returns</h1>
          <p style={{ color: 'var(--muted-text)', fontSize: 14, margin: 0 }}>
            Manage return approvals and follow up on overdue key holders
          </p>
        </div>
        <button onClick={loadData} className="pr-refresh-btn" title="Refresh">
          <Icons.CheckCircle size={16} /> Refresh
        </button>
      </div>

      {/* ── Stat pills ─────────────────────────────────────────────────── */}
      <div className="pr-stat-row">
        <div className="pr-stat-pill orange">
          <span className="pr-stat-number">{pendingReturns.length}</span>
          <span className="pr-stat-label">Awaiting Approval</span>
        </div>
        <div className="pr-stat-pill red">
          <span className="pr-stat-number">{overdueItems.length}</span>
          <span className="pr-stat-label">Overdue (&gt;24 hrs)</span>
        </div>
        <div className="pr-stat-pill purple">
          <span className="pr-stat-number">
            {overdueItems.filter(r => hoursAgo(r.requestedAt) >= 48).length}
          </span>
          <span className="pr-stat-label">Critical (&gt;48 hrs)</span>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="pr-tabs">
        <button
          className={`pr-tab ${activeTab === 'pending' ? 'pr-tab-active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <Icons.Clock size={16} />
          Return Requests
          {pendingReturns.length > 0 && (
            <span className="pr-tab-badge pr-tab-badge-orange">{pendingReturns.length}</span>
          )}
        </button>
        <button
          className={`pr-tab ${activeTab === 'overdue' ? 'pr-tab-active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          <Icons.Bell size={16} />
          Overdue Keys
          {overdueItems.length > 0 && (
            <span className="pr-tab-badge pr-tab-badge-red">{overdueItems.length}</span>
          )}
        </button>
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="pr-search-bar">
        <Icons.Users size={16} color="var(--muted-text)" />
        <input
          type="text"
          placeholder="Search by name, room, phone or email…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pr-search-input"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="pr-search-clear">✕</button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB 1 — RETURN REQUESTS
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        filteredPending.length === 0 ? (
          <div className="pr-empty">
            <Icons.CheckCircle size={52} color="var(--green-success)" />
            <h3>No pending return requests</h3>
            <p>Users will appear here when they request to return a key.</p>
          </div>
        ) : (
          <div className="pr-table-wrap">
            <table className="history-table pr-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Room</th>
                  <th>Items Carried</th>
                  <th>Key Taken</th>
                  <th>Return Requested</th>
                  <th>Time Held</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map(req => {
                  const h = hoursAgo(req.requestedAt);
                  const u = urgency(h);
                  return (
                    <tr key={req._id} className={h >= 24 ? 'pr-row-overdue' : ''}>
                      <td>
                        <div className="pr-member-cell">
                          <div className="pr-avatar">
                            {(req.userId?.fullName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--soft-blue-dark)' }}>
                              {req.userId?.fullName || 'Unknown'}
                            </div>
                            {req.membership && req.membership !== 'No Membership' && (
                              <div style={{ fontSize: 11, color: 'var(--muted-text)' }}>{req.membership}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>
                          {req.userId?.phone
                            ? <a href={`tel:${req.userId.phone}`} className="pr-contact-link">📞 {req.userId.phone}</a>
                            : <span style={{ color: 'var(--muted-text)' }}>No phone</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 2 }}>
                          {req.userId?.email || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.roomId?.name || '—'}</div>
                        <Badge variant="available">{req.roomId?.code || '—'}</Badge>
                      </td>
                      <td style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.carriedItems || <span style={{ color: 'var(--muted-text)' }}>None listed</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{fmt(req.requestedAt)}</td>
                      <td style={{ fontSize: 13 }}>{fmt(req.returnRequestedAt)}</td>
                      <td>
                        <span className="pr-duration-badge" style={{ background: u.bg, color: u.colour }}>
                          {fmtDuration(req.requestedAt)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {/* ← This opens QR scanner immediately */}
                          <button
                            onClick={() => startApprove(req)}
                            disabled={processing === req._id}
                            className="pr-approve-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            {processing === req._id
                              ? <Spin />
                              : <><span style={{ fontSize: 13 }}>📷</span> Approve</>}
                          </button>
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={processing === req._id}
                            className="pr-reject-btn"
                          >Reject</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════
          TAB 2 — OVERDUE KEYS
      ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'overdue' && (
        <>
          {filteredOverdue.length > 0 && (
            <div className="pr-overdue-banner">
              <Icons.Bell size={18} color="#c2410c" />
              <span>
                <strong>{filteredOverdue.length} key{filteredOverdue.length > 1 ? 's have' : ' has'} been held for over 24 hours.</strong>
                {' '}Contact the holders immediately to confirm safety and schedule a return.
              </span>
            </div>
          )}
          {filteredOverdue.length === 0 ? (
            <div className="pr-empty">
              <Icons.CheckCircle size={52} color="var(--green-success)" />
              <h3>No overdue keys</h3>
              <p>All approved key requests are within the 24-hour window.</p>
            </div>
          ) : (
            <div className="pr-table-wrap">
              <table className="history-table pr-table">
                <thead>
                  <tr>
                    <th>Urgency</th><th>Member</th><th>Contact</th><th>Room</th>
                    <th>Items Carried</th><th>Key Taken At</th><th>Time Overdue</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOverdue
                    .sort((a, b) => hoursAgo(b.requestedAt) - hoursAgo(a.requestedAt))
                    .map(req => {
                      const h = hoursAgo(req.requestedAt);
                      const u = urgency(h);
                      return (
                        <tr key={req._id} className="pr-row-overdue">
                          <td>
                            <span className="pr-urgency-badge" style={{ background: u.bg, color: u.colour }}>
                              {u.label}
                            </span>
                          </td>
                          <td>
                            <div className="pr-member-cell">
                              <div className="pr-avatar pr-avatar-red">
                                {(req.userId?.fullName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--soft-blue-dark)' }}>
                                  {req.userId?.fullName || 'Unknown'}
                                </div>
                                {req.membership && req.membership !== 'No Membership' && (
                                  <div style={{ fontSize: 11, color: 'var(--muted-text)' }}>{req.membership}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13 }}>
                              {req.userId?.phone
                                ? <a href={`tel:${req.userId.phone}`} className="pr-contact-link pr-contact-urgent">📞 {req.userId.phone}</a>
                                : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 12 }}>⚠ No phone on file</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 2 }}>
                              {req.userId?.email
                                ? <a href={`mailto:${req.userId.email}`} className="pr-contact-link">✉ {req.userId.email}</a>
                                : '—'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{req.roomId?.name || '—'}</div>
                            <Badge variant="available">{req.roomId?.code || '—'}</Badge>
                          </td>
                          <td style={{ maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.carriedItems || <span style={{ color: 'var(--muted-text)' }}>None listed</span>}
                          </td>
                          <td style={{ fontSize: 13 }}>{fmt(req.requestedAt)}</td>
                          <td>
                            <span className="pr-duration-badge pr-duration-pulse" style={{ background: u.bg, color: u.colour }}>
                              {fmtDuration(req.requestedAt)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {req.userId?.phone && (
                                <a href={`tel:${req.userId.phone}`} className="pr-call-btn">📞 Call Now</a>
                              )}
                              {req.userId?.email && (
                                <a
                                  href={`mailto:${req.userId.email}?subject=Key Return Required – ${req.roomId?.name}&body=Hi ${req.userId.fullName},%0A%0AYour key for ${req.roomId?.name} (${req.roomId?.code}) has been held for over 24 hours. Please return it immediately.%0A%0AThank you.`}
                                  className="pr-email-btn"
                                >✉ Email</a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingReturns;