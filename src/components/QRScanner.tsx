// src/components/QRScanner.tsx
// Reusable QR scanner — after scanning shows a full formatted member profile
// card (name, all fields, membership tier, verification status) before confirming.
//
// Props:
//   onScan(result)  — called when user taps "Confirm" after reviewing details
//   onClose()       — called when user cancels (no scan / skip)
//   title           — header title (default "Scan ID Card")
//   subtitle        — header subtitle
//   skipLabel       — text for the skip/close button (default "Cancel")

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ── Full member payload — matches Members.tsx buildQRPayload / IDCard.tsx ─────
export interface QRScanResult {
  userId?:             string;   // = _id from QR
  fullName?:           string;
  email?:              string;
  phone?:              string;
  membership?:         string;
  institution?:        string;
  campus?:             string;
  program?:            string;
  level?:              string;
  yearOfStudy?:        string;
  role?:               string;
  accountType?:        string;
  verificationStatus?: string;
  raw:                 string;   // original QR string — always present
}

interface QRScannerProps {
  onScan:     (result: QRScanResult) => void;
  onClose:    () => void;
  title?:     string;
  subtitle?:  string;
  skipLabel?: string;
}

// ── jsQR CDN loader ───────────────────────────────────────────────────────────
const loadJsQR = (): Promise<any> =>
  new Promise((resolve, reject) => {
    if ((window as any).jsQR) { resolve((window as any).jsQR); return; }
    const s = document.createElement('script');
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js';
    s.onload  = () => resolve((window as any).jsQR);
    s.onerror = () => reject(new Error('Failed to load jsQR'));
    document.head.appendChild(s);
  });

// ── Parse raw QR string → QRScanResult ───────────────────────────────────────
const parseQR = (raw: string): QRScanResult => {
  try {
    const p = JSON.parse(raw);
    if (p._id || p.email || p.fullName) {
      return {
        raw,
        userId:             p._id        || p.userId   || p.id        || undefined,
        fullName:           p.fullName   || p.name     || undefined,
        email:              p.email      || undefined,
        phone:              p.phone      || p.phoneNumber || undefined,
        membership:         p.membership || undefined,
        institution:        p.institution|| undefined,
        campus:             p.campus     || undefined,
        program:            p.program    || undefined,
        level:              p.level      || undefined,
        yearOfStudy:        p.yearOfStudy|| undefined,
        role:               p.role       || undefined,
        accountType:        p.accountType|| undefined,
        verificationStatus: p.verificationStatus || undefined,
      };
    }
  } catch { /* not JSON */ }
  if (/^[a-f\d]{24}$/i.test(raw.trim())) return { raw, userId: raw.trim() };
  return { raw };
};

// ── Colour helpers ─────────────────────────────────────────────────────────────
const avatarBg = (name?: string) => {
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  return colors[(name?.charCodeAt(0) || 0) % colors.length];
};
const membershipStyle = (m?: string): { bg: string; color: string } => {
  const map: Record<string, { bg: string; color: string }> = {
    DigiTech: { bg: '#ede9fe', color: '#5b21b6' },
    Premium:  { bg: '#fef3c7', color: '#92400e' },
    Basic:    { bg: '#d1fae5', color: '#065f46' },
    Gold:     { bg: '#fefce8', color: '#a16207' },
    Platinum: { bg: '#f1f5f9', color: '#334155' },
  };
  return map[m || ''] || { bg: '#e0f2fe', color: '#0369a1' };
};
const statusStyle = (s?: string) => ({
  approved: { bg: '#d1fae5', color: '#065f46', label: '✓ Verified'  },
  pending:  { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending'  },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: '✗ Rejected'  },
}[s || ''] || { bg: '#e2e8f0', color: '#475569', label: s || '' });

// ── Single info row ────────────────────────────────────────────────────────────
const Row: React.FC<{ icon: string; label: string; value: string; accent?: boolean }> = ({
  icon, label, value, accent,
}) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '8px 0', borderBottom: '1px solid #f1f5f9',
  }}>
    <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0, marginTop: 1 }}>{icon}</span>
    <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 700, minWidth: 98, flexShrink: 0, paddingTop: 2 }}>
      {label}
    </span>
    <span style={{
      fontSize: 13, fontWeight: accent ? 700 : 500,
      color: accent ? '#0f172a' : '#374151',
      wordBreak: 'break-word', flex: 1,
    }}>
      {value}
    </span>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 10.5, color: '#94a3b8', fontWeight: 700, letterSpacing: 1.2,
    textTransform: 'uppercase', marginTop: 14, marginBottom: 2, paddingLeft: 2,
  }}>
    {children}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const QRScanner: React.FC<QRScannerProps> = ({
  onScan, onClose,
  title     = 'Scan ID Card',
  subtitle  = 'Point the camera at the QR code on the ID card',
  skipLabel = 'Cancel',
}) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const jsQRRef   = useRef<any>(null);

  const [status,  setStatus]  = useState<'loading' | 'active' | 'error'>('loading');
  const [errMsg,  setErrMsg]  = useState('');
  const [preview, setPreview] = useState<QRScanResult | null>(null);
  const [lastRaw, setLastRaw] = useState('');

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current as any);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        rafRef.current = requestAnimationFrame(scanFrame) as any;
      }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanFrame = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || !jsQRRef.current || v.readyState !== v.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame) as any; return;
    }
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img  = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQRRef.current(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (code?.data && code.data !== lastRaw) {
      setLastRaw(code.data);
      stopCamera();
      setPreview(parseQR(code.data));
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame) as any;
  }, [lastRaw, stopCamera]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        jsQRRef.current = await loadJsQR();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setStatus('active');
        rafRef.current = requestAnimationFrame(scanFrame) as any;
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(
          e.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access and try again.' :
          e.name === 'NotFoundError'   ? 'No camera found on this device.' :
          `Camera error: ${e.message}`
        );
        setStatus('error');
      }
    })();
    return () => { alive = false; stopCamera(); };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (status === 'active' && !preview) {
      cancelAnimationFrame(rafRef.current as any);
      rafRef.current = requestAnimationFrame(scanFrame) as any;
    }
  }, [scanFrame, status, preview]);

  // ── DETAIL CARD (shown after successful scan) ─────────────────────────────
  if (preview) {
    const ms = membershipStyle(preview.membership);
    const ss = statusStyle(preview.verificationStatus);
    const initials = (preview.fullName || '?')
      .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    const hasContact  = preview.phone || preview.email;
    const hasAcademic = preview.institution || preview.campus || preview.program || preview.level || preview.yearOfStudy;
    const hasAccount  = preview.accountType || preview.userId;
    const hasAnyData  = preview.fullName || preview.email || preview.phone;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10002,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: '96vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* ── Success banner ── */}
          <div style={{
            background: 'linear-gradient(135deg,#059669,#10b981)',
            padding: '13px 18px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>✅</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>QR Code Scanned Successfully</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 1 }}>
                Review details below then tap Confirm
              </div>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div style={{ overflowY: 'auto', flex: 1 }}>

            {/* Name hero */}
            <div style={{
              background: 'linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%)',
              padding: '18px 18px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
                background: avatarBg(preview.fullName),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 0 3px rgba(255,255,255,0.18)',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.2, wordBreak: 'break-word' }}>
                  {preview.fullName || '—'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
                  {preview.role && (
                    <span style={{
                      background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)',
                      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: 20,
                    }}>{preview.role}</span>
                  )}
                  {preview.verificationStatus && (
                    <span style={{
                      background: ss.bg, color: ss.color,
                      fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    }}>{ss.label}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Membership tier */}
            {preview.membership && preview.membership !== 'None' && (
              <div style={{
                margin: '12px 16px 0',
                background: ms.bg, border: `1.5px solid ${ms.color}44`,
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>🏆</span>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>MEMBERSHIP TIER</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ms.color, marginTop: 2 }}>
                    {preview.membership}
                  </div>
                </div>
              </div>
            )}

            {/* Data rows */}
            <div style={{ padding: '6px 16px 8px' }}>

              {hasContact && (
                <>
                  <SectionLabel>Contact</SectionLabel>
                  {preview.phone && <Row icon="📞" label="Phone"  value={preview.phone}  accent />}
                  {preview.email && <Row icon="✉️" label="Email"  value={preview.email} />}
                </>
              )}

              {hasAcademic && (
                <>
                  <SectionLabel>Academic Info</SectionLabel>
                  {preview.institution  && <Row icon="🏛️" label="Institution"   value={preview.institution} />}
                  {preview.campus       && <Row icon="📍" label="Campus"        value={preview.campus} />}
                  {preview.program      && <Row icon="📚" label="Programme"     value={preview.program} />}
                  {preview.level        && <Row icon="🎓" label="Level"         value={preview.level} />}
                  {preview.yearOfStudy  && <Row icon="📅" label="Year of Study" value={`Year ${preview.yearOfStudy}`} />}
                </>
              )}

              {hasAccount && (
                <>
                  <SectionLabel>Account</SectionLabel>
                  {preview.accountType && (
                    <Row icon="👤" label="Account Type" value={
                      preview.accountType === 'student'     ? 'Student' :
                      preview.accountType === 'non_student' ? 'Non-Student' :
                      preview.accountType
                    } />
                  )}
                  {preview.userId && (
                    <Row icon="🔑" label="Member ID" value={preview.userId.slice(-12).toUpperCase()} />
                  )}
                </>
              )}

              {/* Unrecognised QR fallback */}
              {!hasAnyData && (
                <div style={{
                  marginTop: 12, padding: '12px 14px',
                  background: '#fef9c3', borderRadius: 10, border: '1px solid #fde68a',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                    ⚠️ Unrecognised QR format — not a CITT ID card
                  </div>
                  <div style={{ fontSize: 11, color: '#78350f', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.6 }}>
                    {preview.raw.slice(0, 200)}{preview.raw.length > 200 ? '…' : ''}
                  </div>
                </div>
              )}

              <div style={{ height: 6 }} />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #f1f5f9',
            display: 'flex', gap: 10, flexShrink: 0, background: '#fff',
          }}>
            <button
              onClick={() => { stopCamera(); onScan(preview); }}
              style={{
                flex: 1, padding: '13px 0',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              }}
            >
              ✓ Confirm
            </button>
            <button
              onClick={() => { setPreview(null); setLastRaw(''); startCamera(); }}
              style={{
                padding: '13px 16px', borderRadius: 12,
                border: '1px solid #e2e8f0', background: '#f8fafc',
                color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              ↺ Re-scan
            </button>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              style={{
                padding: '13px 16px', borderRadius: 12,
                border: '1px solid #fecaca', background: '#fff5f5',
                color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scanner view ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        overflow: 'hidden', boxShadow: '0 28px 70px rgba(0,0,0,0.55)',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>📷</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>

        {/* Camera */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', overflow: 'hidden' }}>
          <video ref={videoRef} playsInline muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'active' ? 'block' : 'none' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {status === 'active' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 200, height: 200 }}>
                {([
                  { top: 0,    left: 0,  borderTop:    '3px solid #22d3ee', borderLeft:   '3px solid #22d3ee' },
                  { top: 0,    right: 0, borderTop:    '3px solid #22d3ee', borderRight:  '3px solid #22d3ee' },
                  { bottom: 0, left: 0,  borderBottom: '3px solid #22d3ee', borderLeft:   '3px solid #22d3ee' },
                  { bottom: 0, right: 0, borderBottom: '3px solid #22d3ee', borderRight:  '3px solid #22d3ee' },
                ] as React.CSSProperties[]).map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 3, ...s }} />
                ))}
                <div style={{
                  position: 'absolute', left: 4, right: 4, height: 2,
                  background: 'linear-gradient(90deg,transparent,#22d3ee,transparent)',
                  animation: 'qrscan 2s ease-in-out infinite', top: '50%',
                }} />
              </div>
              <style>{`
                @keyframes qrscan {
                  0%,100% { transform:translateY(-90px); opacity:.4; }
                  50%     { transform:translateY(90px);  opacity:1; }
                }
                @keyframes spin { to { transform:rotate(360deg); } }
              `}</style>
            </div>
          )}

          {status === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0, background: '#1e293b',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#22d3ee',
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Starting camera…</div>
            </div>
          )}

          {status === 'error' && (
            <div style={{
              position: 'absolute', inset: 0, background: '#1e293b',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ color: '#f87171', fontWeight: 600, fontSize: 15 }}>Camera Unavailable</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{errMsg}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18 }}>💳</span>
            <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Hold the <strong>ID card QR code</strong> steady — scan is automatic.
            </span>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            style={{
              flexShrink: 0, padding: '8px 16px', borderRadius: 8,
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;