// src/pages/Members.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import IDCard from '../components/IDCard';
import { membersAPI, authAPI } from '../lib/api';

// ── Club membership options ───────────────────────────────────────────────────
const MEMBERSHIP_OPTIONS = [
  'None','Innovation & Tech Club','Entrepreneurship & Startup Club',
  'Environmental & Sustainability Club','Debate & Public Speaking Club',
  'Photography & Film Club','Music & Performing Arts Club','Gaming & Esports Club',
  'Literature & Book Club','Sports Analytics & Fitness Club','Community Service & Outreach Club',
];
const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },{ value: 'innovator', label: 'Innovator' },
  { value: 'member', label: 'Member' },{ value: 'guard', label: 'Guard' },
  { value: 'leader', label: 'Leader' },{ value: 'admin', label: 'Admin' },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  _id: string; fullName: string; email: string; phone: string;
  accountType: 'student' | 'non_student'; institution?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  membership?: string; role?: string; regNumber?: string;
  campus?: string; program?: string; level?: string; yearOfStudy?: string;
  educationBackground?: string; passportPhotoFile?: string;
  studentIdFile?: string; nationalIdFile?: string;
  educationProofFile?: string; centerFormFile?: string; createdAt?: string;
}

// All fields the QR encodes — used for scan result and attendance payload
interface QRPayload {
  _id: string;          // full Mongo ID — backend uses this to look up
  fullName: string;
  email: string;
  phone: string;
  institution?: string;
  membership?: string;
  campus?: string;
  program?: string;
  level?: string;
  yearOfStudy?: string;
  role?: string;
  accountType?: string;
  verificationStatus?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const EyeIcon  = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const KeyIcon  = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L21 2l-5.5 5.5"/></svg>;
const QrIcon   = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/><path d="M14 14h3v3h3v3h-3v-3h-3zM17 17v3"/></svg>;

// ── URL helpers ───────────────────────────────────────────────────────────────
function toFetchUrl(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored;
  return `/api/members/file/${encodeURIComponent(stored.replace(/^\/+/, '').replace(/^uploads\//, ''))}`;
}
function arrayBufferToBase64(buf: ArrayBuffer): string {
  let b = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.byteLength; i++) b += String.fromCharCode(u[i]);
  return window.btoa(b);
}

// ── QR payload builder — encodes as JSON so scanning is always reliable ───────
// The QR contains the full Mongo _id so the backend can look up the member and
// log attendance without any ambiguity. All visible fields are also included so
// the scan preview can show them to the admin before confirming.
function buildQRPayload(m: Member): string {
  const payload: QRPayload = {
    _id:               m._id,
    fullName:          m.fullName,
    email:             m.email,
    phone:             m.phone,
    institution:       m.institution,
    membership:        m.membership,
    campus:            m.campus,
    program:           m.program,
    level:             m.level,
    yearOfStudy:       m.yearOfStudy,
    role:              m.role,
    accountType:       m.accountType,
    verificationStatus:m.verificationStatus,
  };
  // Remove undefined keys to keep QR compact
  (Object.keys(payload) as (keyof QRPayload)[]).forEach(k => {
    if (payload[k] === undefined || payload[k] === '') delete payload[k];
  });
  return JSON.stringify(payload);
}

// ── Parse QR scan result — always JSON now, but fall back for old QR codes ───
function parseQRScan(raw: string): QRPayload | null {
  if (!raw) return null;

  // ── 1. JSON (new format) ──────────────────────────────────────────────────
  try {
    const j = JSON.parse(raw);
    if (j._id || j.email || j.fullName) return j as QRPayload;
  } catch {}

  // ── 2. Newline key:value (old format) ────────────────────────────────────
  const result: Partial<QRPayload> = {};
  const lines = raw.split(/[\n\r]+/).map(l => l.trim()).filter(l => l && l.includes(':'));
  for (const line of lines) {
    const colon = line.indexOf(':');
    const key   = line.slice(0, colon).trim().toLowerCase().replace(/\s+/g, '_');
    const val   = line.slice(colon + 1).trim();
    if (!val) continue;
    if (key === 'name')        result.fullName   = val;
    if (key === 'member_id')   result._id        = val;
    if (key === 'email')       result.email      = val;
    if (key === 'phone')       result.phone      = val;
    if (key === 'institution') result.institution= val;
    if (key === 'membership')  result.membership = val;
    if (key === 'campus')      result.campus     = val;
    if (key === 'program')     result.program    = val;
    if (key === 'level')       result.level      = val;
    if (key === 'year')        result.yearOfStudy= val.replace(/^year\s*/i,'');
    if (key === 'role')        result.role       = val;
  }
  if (result.fullName || result._id || result.email) return result as QRPayload;

  // ── 3. Flat concatenated (no separators) — last resort regex ─────────────
  const flat: Partial<QRPayload> = {};
  const TOKENS: [keyof QRPayload, RegExp][] = [
    ['_id',         /Member\s*ID\s*([A-Za-z0-9]+)/i],
    ['fullName',    /Name\s*([A-Za-zÀ-ÿ\s'-]+?)(?=Email|Phone|Institution|Membership|Campus|Program|Level|Year|Role|$)/i],
    ['email',       /Email\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i],
    ['phone',       /Phone\s*([\d+()\s-]{7,20})/i],
    ['institution', /Institution\s*([A-Za-z\s]+?)(?=Membership|Campus|Program|Level|Year|Role|Email|Phone|$)/i],
    ['membership',  /Membership\s*([A-Za-z\s&]+?)(?=Campus|Program|Level|Year|Role|Status|$)/i],
    ['campus',      /Campus\s*([A-Za-z\s]+?)(?=Program|Level|Year|Role|Status|$)/i],
    ['program',     /Program\s*([A-Za-z\s]+?)(?=Level|Year|Role|Status|$)/i],
    ['level',       /Level\s*([A-Za-z\s]+?)(?=Year|Role|Status|$)/i],
    ['yearOfStudy', /Year\s*(Year\s*\d+|\d+)/i],
    ['role',        /Role\s*([a-z]+)/i],
  ];
  for (const [field, rx] of TOKENS) {
    const m = raw.match(rx);
    if (m) (flat as any)[field] = m[1].trim();
  }
  if (flat.fullName || flat._id || flat.email) return flat as QRPayload;

  return null;
}

// ── jsQR CDN loader (avoids npm install + TS error) ───────────────────────────
type JsQRFn = (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null;
let _jsQR: JsQRFn | null = null;

function loadJsQR(): Promise<JsQRFn | null> {
  return new Promise(resolve => {
    if (_jsQR)                { resolve(_jsQR); return; }
    if ((window as any).jsQR) { _jsQR = (window as any).jsQR; resolve(_jsQR); return; }
    const s   = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    s.onload  = () => { _jsQR = (window as any).jsQR; resolve(_jsQR); };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

// ── QR Code canvas renderer ───────────────────────────────────────────────────
const QRCodeCanvas: React.FC<{ value: string; size?: number; className?: string }> = ({ value, size = 120, className }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(ref.current!, value, { width: size, margin: 1, color: { dark: '#1e40af', light: '#ffffff' } }, () => {});
    }).catch(() => {
      const ctx = ref.current!.getContext('2d'); if (!ctx) return;
      ref.current!.width = size; ref.current!.height = size;
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0,0,size,size);
      ctx.fillStyle = '#6b7280'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('npm i qrcode', size/2, size/2);
    });
  }, [value, size]);
  return <canvas ref={ref} width={size} height={size} className={className} style={{ borderRadius: 6 }} />;
};

// ── Camera QR Scanner ─────────────────────────────────────────────────────────
// Scans the camera feed using jsQR (loaded from CDN — no npm install needed).
// When a QR is detected it shows a preview of all decoded member details and
// waits for admin to tap "Confirm Entry" before posting to the backend.
const CameraQRScanner: React.FC<{
  onConfirm: (payload: QRPayload) => void;
  onClose:   () => void;
}> = ({ onConfirm, onClose }) => {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const doneRef   = useRef(false);

  const [libReady, setLibReady] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [error,    setError]    = useState('');
  const [preview,  setPreview]  = useState<QRPayload | null>(null);

  // Load jsQR from CDN + open camera simultaneously
  useEffect(() => {
    let cancelled = false;

    loadJsQR().then(lib => {
      if (!cancelled) setLibReady(!!lib);
      if (!lib) setError('Scanner library could not load. Check your internet connection.');
    });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        if (!cancelled) setCamReady(true);
      } catch (e: any) {
        if (!cancelled) setError('Camera unavailable: ' + (e.message || 'Permission denied'));
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Start scan loop when both camera and lib are ready
  useEffect(() => {
    if (!libReady || !camReady) return;
    const tick = () => {
      if (doneRef.current) return;
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick); return;
      }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = _jsQR!(img.data, img.width, img.height);
      if (code?.data) {
        doneRef.current = true;
        const parsed = parseQRScan(code.data);
        if (parsed) { setPreview(parsed); }
        else { setError('Could not read member details from this QR code. Try re-scanning.'); doneRef.current = false; }
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [libReady, camReady]);

  const confirmEntry = () => {
    if (!preview) return;
    streamRef.current?.getTracks().forEach(t => t.stop());
    onConfirm(preview);
  };

  const rescan = () => {
    doneRef.current = false;
    setPreview(null);
    setError('');
    rafRef.current = requestAnimationFrame(function tick() {
      if (doneRef.current) return;
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA || !_jsQR) {
        rafRef.current = requestAnimationFrame(tick); return;
      }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = _jsQR(img.data, img.width, img.height);
      if (code?.data) {
        doneRef.current = true;
        const parsed = parseQRScan(code.data);
        if (parsed) setPreview(parsed);
        else { setError('Could not parse QR. Try again.'); doneRef.current = false; }
      } else { rafRef.current = requestAnimationFrame(tick); }
    });
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:20 }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:480, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>

        {/* ── Header ── */}
        <div style={{ background:'linear-gradient(135deg,#1e40af,#3b82f6)', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ color:'white', fontWeight:800, fontSize:17 }}>📷 Scan Member ID Card</div>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:3 }}>
              {preview ? 'Review details then confirm entry' : 'Point camera at the QR code on the ID card'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'white', width:36, height:36, borderRadius:'50%', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>×</button>
        </div>

        {/* ── Camera viewport ── */}
        <div style={{ position:'relative', background:'#000', aspectRatio:'4/3' }}>
          <video ref={videoRef} playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', opacity: preview ? 0.3 : 1, transition:'opacity 0.25s' }} />
          <canvas ref={canvasRef} style={{ display:'none' }} />

          {/* scanning frame */}
          {camReady && !preview && !error && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:200, height:200, border:'3px solid #3b82f6', borderRadius:16, boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)', position:'relative' }}>
                {[{top:-3,left:-3,borderTop:'4px solid #60a5fa',borderLeft:'4px solid #60a5fa'},
                  {top:-3,right:-3,borderTop:'4px solid #60a5fa',borderRight:'4px solid #60a5fa'},
                  {bottom:-3,left:-3,borderBottom:'4px solid #60a5fa',borderLeft:'4px solid #60a5fa'},
                  {bottom:-3,right:-3,borderBottom:'4px solid #60a5fa',borderRight:'4px solid #60a5fa'},
                ].map((s,i) => <div key={i} style={{ position:'absolute', width:22, height:22, borderRadius:3, ...s }} />)}
                <style>{`@keyframes sl{0%{top:8px;opacity:1}50%{top:calc(100% - 8px);opacity:1}100%{top:8px;opacity:.4}}`}</style>
                <div style={{ position:'absolute', left:8, right:8, height:2, background:'linear-gradient(90deg,transparent,#3b82f6,transparent)', animation:'sl 1.8s ease-in-out infinite', borderRadius:2 }} />
              </div>
            </div>
          )}

          {/* loading spinner */}
          {(!libReady || !camReady) && !error && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:'rgba(0,0,0,0.6)' }}>
              <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
              <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'sp .7s linear infinite' }} />
              <div style={{ color:'white', fontSize:13 }}>Starting scanner…</div>
            </div>
          )}

          {/* error overlay */}
          {error && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:24, textAlign:'center' }}>
              <div style={{ fontSize:36 }}>⚠️</div>
              <div style={{ color:'white', fontWeight:700, fontSize:14 }}>{error}</div>
              <button onClick={rescan} style={{ marginTop:6, padding:'8px 20px', background:'#3b82f6', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>Try Again</button>
            </div>
          )}

          {/* success tick */}
          {preview && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(34,197,94,0.92)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'white', boxShadow:'0 0 0 14px rgba(34,197,94,0.2)' }}>✓</div>
            </div>
          )}
        </div>

        {/* ── Decoded member details — professional profile card ── */}
        {preview && (() => {
          const membershipColors: Record<string,{bg:string;color:string;border:string}> = {
            DigiTech: {bg:'#ede9fe',color:'#5b21b6',border:'#c4b5fd'},
            Premium:  {bg:'#fef3c7',color:'#92400e',border:'#fcd34d'},
            Gold:     {bg:'#fefce8',color:'#a16207',border:'#fde047'},
            Platinum: {bg:'#f1f5f9',color:'#334155',border:'#94a3b8'},
            Basic:    {bg:'#d1fae5',color:'#065f46',border:'#6ee7b7'},
          };
          const ms = membershipColors[preview.membership||''] || {bg:'#e0f2fe',color:'#0369a1',border:'#7dd3fc'};
          const statusMap: Record<string,{bg:string;color:string;icon:string}> = {
            approved: {bg:'#dcfce7',color:'#15803d',icon:'✓'},
            pending:  {bg:'#fef9c3',color:'#a16207',icon:'⏳'},
            rejected: {bg:'#fee2e2',color:'#dc2626',icon:'✗'},
          };
          const vs = statusMap[preview.verificationStatus||''] || {bg:'#f1f5f9',color:'#64748b',icon:'?'};
          const initials = (preview.fullName||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
          const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
          const avatarBg = avatarColors[(preview.fullName||'').charCodeAt(0)%avatarColors.length];

          const TableRow = ({label,value,accent}:{label:string;value:string;accent?:boolean}) => (
            <tr>
              <td style={{
                padding:'9px 14px', fontSize:12, fontWeight:700, color:'#64748b',
                background:'#f8fafc', border:'1px solid #e2e8f0',
                whiteSpace:'nowrap', width:'38%', verticalAlign:'top',
                letterSpacing:'0.3px',
              }}>{label}</td>
              <td style={{
                padding:'9px 14px', fontSize:13,
                fontWeight: accent ? 700 : 500,
                color: accent ? '#0f172a' : '#374151',
                border:'1px solid #e2e8f0', wordBreak:'break-word',
              }}>{value}</td>
            </tr>
          );

          return (
            <div style={{ padding:'0 0 4px' }}>

              {/* ── Name hero banner ── */}
              <div style={{
                background:'linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%)',
                padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{
                  width:56, height:56, borderRadius:'50%', flexShrink:0,
                  background:avatarBg, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:800,
                  boxShadow:'0 0 0 3px rgba(255,255,255,0.2)',
                }}>{initials}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:17, lineHeight:1.2, wordBreak:'break-word' }}>
                    {preview.fullName || '—'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:7 }}>
                    {preview.role && (
                      <span style={{ background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.9)', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', padding:'3px 9px', borderRadius:20 }}>
                        {preview.role}
                      </span>
                    )}
                    {preview.verificationStatus && (
                      <span style={{ background:vs.bg, color:vs.color, fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20 }}>
                        {vs.icon} {preview.verificationStatus.charAt(0).toUpperCase()+preview.verificationStatus.slice(1)}
                      </span>
                    )}
                    {preview.accountType && (
                      <span style={{ background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:20, textTransform:'capitalize' }}>
                        {preview.accountType==='non_student'?'Non-Student':preview.accountType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Membership tier pill ── */}
              {preview.membership && preview.membership !== 'None' && (
                <div style={{ margin:'12px 16px 0', background:ms.bg, border:`1.5px solid ${ms.border}`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:22 }}>🏆</span>
                  <div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, letterSpacing:1 }}>MEMBERSHIP TIER</div>
                    <div style={{ fontSize:15, fontWeight:800, color:ms.color, marginTop:1 }}>{preview.membership}</div>
                  </div>
                </div>
              )}

              {/* ── Details table ── */}
              <div style={{ margin:'12px 16px 0', borderRadius:10, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>

                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'38% 1fr', background:'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
                  <div style={{ padding:'8px 14px', fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:1.2, textTransform:'uppercase' }}>Field</div>
                  <div style={{ padding:'8px 14px', fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:1.2, textTransform:'uppercase', borderLeft:'1px solid rgba(255,255,255,0.2)' }}>Information</div>
                </div>

                {/* Table rows */}
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {preview.fullName    && <TableRow label="Full Name"    value={preview.fullName} accent />}
                    {preview._id         && <TableRow label="Member ID"    value={preview._id.slice(-12).toUpperCase()} />}
                    {preview.phone       && <TableRow label="Phone"        value={preview.phone} accent />}
                    {preview.email       && <TableRow label="Email"        value={preview.email} />}
                    {preview.institution && <TableRow label="Institution"  value={preview.institution} />}
                    {preview.campus      && <TableRow label="Campus"       value={preview.campus} />}
                    {preview.program     && <TableRow label="Programme"    value={preview.program} />}
                    {preview.level       && <TableRow label="Level"        value={preview.level} />}
                    {preview.yearOfStudy && <TableRow label="Year of Study" value={`Year ${preview.yearOfStudy}`} />}
                  </tbody>
                </table>
              </div>

              {/* ── Action buttons ── */}
              <div style={{ display:'flex', gap:10, padding:'14px 16px 16px' }}>
                <button onClick={confirmEntry} style={{ flex:1, padding:'13px 0', background:'linear-gradient(135deg,#10b981,#059669)', color:'white', border:'none', borderRadius:12, fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,0.35)', letterSpacing:0.3 }}>
                  ✓ Confirm Entry
                </button>
                <button onClick={rescan} style={{ padding:'13px 18px', background:'#f1f5f9', color:'#374151', border:'1px solid #e2e8f0', borderRadius:12, fontWeight:600, fontSize:13, cursor:'pointer' }}>
                  ↺ Re-scan
                </button>
              </div>
            </div>
          );
        })()}

        {/* bottom status */}
        {!preview && !error && (
          <div style={{ padding:'13px 20px', borderTop:'1px solid #f1f5f9', textAlign:'center', fontSize:13, color:'#64748b' }}>
            {libReady && camReady ? '🔍 Scanning… hold the ID card steady inside the frame' : '⏳ Starting camera and scanner…'}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Role badge colours ────────────────────────────────────────────────────────
const ROLE_COLOUR: Record<string, { bg: string; color: string }> = {
  admin:     { bg:'#ede9fe', color:'#5b21b6' }, innovator:{ bg:'#d1fae5', color:'#065f46' },
  member:    { bg:'#fef3c7', color:'#92400e' }, guard:    { bg:'#fee2e2', color:'#991b1b' },
  leader:    { bg:'#e0f2fe', color:'#075985' }, user:     { bg:'#f1f5f9', color:'#475569' },
};

// ═════════════════════════════════════════════════════════════════════════════
// IMPERSONATION BANNER
// ═════════════════════════════════════════════════════════════════════════════
export const ImpersonationBanner: React.FC = () => {
  const adminToken  = localStorage.getItem('adminToken');
  const adminUser   = (() => { try { return JSON.parse(localStorage.getItem('adminUser')  || '{}'); } catch { return {}; } })();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; } })();
  if (!adminToken || !currentUser.isImpersonating) return null;
  const handleReturn = () => {
    localStorage.setItem('authToken', adminToken);
    localStorage.setItem('currentUser', JSON.stringify(adminUser));
    localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); localStorage.removeItem('impersonating');
    window.location.href = '/members';
  };
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'white', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 12px rgba(220,38,38,0.4)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}><UserIcon /><span style={{ fontWeight:700, fontSize:'0.9rem' }}>👁 Viewing as: <strong>{currentUser.fullName}</strong> &nbsp;|&nbsp; Admin: <strong>{adminUser.fullName || 'Admin'}</strong></span></div>
      <button onClick={handleReturn} style={{ background:'white', color:'#dc2626', border:'none', borderRadius:6, padding:'6px 16px', fontWeight:700, cursor:'pointer', fontSize:'0.85rem' }}>← Return to Admin</button>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MEMBERS PAGE
// ═════════════════════════════════════════════════════════════════════════════
const Members: React.FC = () => {
  const [members,       setMembers]       = useState<Member[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [query,         setQuery]         = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [page,          setPage]          = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const perPage = 12;

  const [showAddModal,       setShowAddModal]       = useState(false);
  const [addPassportFile,    setAddPassportFile]    = useState<File | null>(null);
  const [addPassportPreview, setAddPassportPreview] = useState<string | null>(null);
  const [newMemberForm,      setNewMemberForm]      = useState({ fullName:'', email:'', phone:'', accountType:'non_student' as 'student'|'non_student', institution:'MUST', membership:'None', password:'', role:'user', setApproved:true });

  const [showDetails, setShowDetails] = useState(false);
  const [selected,    setSelected]    = useState<Member | null>(null);
  const [showQR,      setShowQR]      = useState(false);
  const [qrMember,    setQrMember]    = useState<Member | null>(null);
  const [showIDCard,  setShowIDCard]  = useState(false);
  const [idCardMember,setIdCardMember]= useState<Member | null>(null);

  // ── QR attendance scanner state ───────────────────────────────────────────
  const [showScanner,  setShowScanner]  = useState(false);
  const [scanBusy,     setScanBusy]     = useState(false);
  const [scanBanner,   setScanBanner]   = useState<{
    name: string; phone?: string; email?: string; time: string;
    ok: boolean; msg?: string;
  } | null>(null);

  const [passportLightbox, setPassportLightbox] = useState(false);
  const [passportSrc,      setPassportSrc]      = useState('');
  const [showEdit,    setShowEdit]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<Member | null>(null);
  const [editForm,    setEditForm]    = useState<Partial<Member>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg,     setEditMsg]     = useState('');
  const [showResetPw,  setShowResetPw]  = useState(false);
  const [resetTarget,  setResetTarget]  = useState<Member | null>(null);
  const [newPassword,  setNewPassword]  = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg,     setResetMsg]     = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewTitle,   setPreviewTitle]   = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState<string | null>(null);
  const [downloadUrl,    setDownloadUrl]    = useState<string | null>(null);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try { setLoading(true); const d = await membersAPI.getAll(); setMembers(Array.isArray(d) ? d : d?.data || d?.users || []); }
    catch (e: any) { alert('Failed to load members: ' + e.message); }
    finally { setLoading(false); }
  };

  const resetAddForm = useCallback(() => {
    setNewMemberForm({ fullName:'', email:'', phone:'', accountType:'non_student', institution:'MUST', membership:'None', password:'', role:'user', setApproved:true });
    setAddPassportFile(null); setAddPassportPreview(null);
  }, []);

  const handleNewMemberChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setNewMemberForm(p => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleAddPassportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setAddPassportFile(f); setAddPassportPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName.trim() || !newMemberForm.email.trim() || !newMemberForm.phone.trim()) { alert('Full name, email and phone are required.'); return; }
    try {
      const fd = new FormData();
      Object.entries(newMemberForm).forEach(([k,v]) => { if (k !== 'setApproved') fd.append(k, String(v)); });
      fd.append('verificationStatus', newMemberForm.setApproved ? 'approved' : 'pending');
      if (addPassportFile) fd.append('passportPhotoFile', addPassportFile);
      const res = await fetch('/api/members/manual', { method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('authToken')||''}` }, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Server error (${res.status})`);
      alert('Member created!'); await loadMembers(); setShowAddModal(false); resetAddForm();
    } catch (e: any) { alert('Failed: ' + e.message); }
  };

  const handleViewFile = async (storedPath: string, title: string) => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setPreviewDataUrl(null); setDownloadUrl(null); setPreviewError(null); setPreviewTitle(title); setPreviewLoading(true);
    try {
      const token = localStorage.getItem('authToken')||'';
      const res   = await fetch(toFetchUrl(storedPath), { headers: token ? { Authorization:`Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) throw new Error('Empty file');
      setPreviewDataUrl(`data:application/pdf;base64,${arrayBufferToBase64(buf)}`);
      setDownloadUrl(URL.createObjectURL(new Blob([buf], { type:'application/pdf' })));
    } catch (e: any) { setPreviewError(e.message); }
    finally { setPreviewLoading(false); }
  };

  const closePreview = () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); setPreviewDataUrl(null); setDownloadUrl(null); setPreviewTitle(''); setPreviewError(null); };

  const openPassportLightbox = (p: string) => { setPassportSrc(toFetchUrl(p)); setPassportLightbox(true); };

  // ── QR ATTENDANCE: called when admin confirms after scan ──────────────────
  // Posts to /api/attendance/check-in-by-qr with ALL scanned fields so both
  // Dashboard and Reports/Attendance receive the full member details.
  const handleQRConfirm = async (payload: QRPayload) => {
    setShowScanner(false);
    setScanBusy(true);
    const time = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    try {
      const token = localStorage.getItem('authToken')||'';

      // Resolve the actual Mongo _id — the QR should always contain it,
      // but if not (old QR codes) fall back to matching by email in the loaded list.
      let userId = payload._id;
      if (!userId && payload.email) {
        const match = members.find(m => m.email.toLowerCase() === payload.email!.toLowerCase());
        if (match) userId = match._id;
      }

      if (!userId) throw new Error('Member ID not found in QR. Please re-generate the member QR code.');

      const body = {
        userId,
        authMethod:   'qr',
        // Pass all visible fields so the backend (and the dashboard's
        // todayAttendance.recent array) can populate every column
        scannedName:        payload.fullName,
        scannedPhone:       payload.phone,
        scannedEmail:       payload.email,
        scannedInstitution: payload.institution,
        scannedMembership:  payload.membership,
        scannedCampus:      payload.campus,
        scannedProgram:     payload.program,
        scannedLevel:       payload.level,
        scannedYearOfStudy: payload.yearOfStudy,
        scannedRole:        payload.role,
        scannedAccountType: payload.accountType,
      };

      const res  = await fetch('/api/attendance/check-in-by-qr', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Check-in failed');

      setScanBanner({ name: payload.fullName || 'Member', phone: payload.phone, email: payload.email, time, ok: true });
    } catch (e: any) {
      setScanBanner({ name: payload.fullName || 'Member', phone: payload.phone, email: payload.email, time, ok: false, msg: e.message });
    } finally {
      setScanBusy(false);
      // Auto-dismiss after 8 s
      setTimeout(() => setScanBanner(null), 8000);
    }
  };

  // Quick row-level entry (no scan needed — admin taps entry on a known member)
  const handleDirectEntry = async (m: Member) => {
    await handleQRConfirm({ _id: m._id, fullName: m.fullName, email: m.email, phone: m.phone, institution: m.institution, membership: m.membership, campus: m.campus, program: m.program, level: m.level, yearOfStudy: m.yearOfStudy, role: m.role, accountType: m.accountType, verificationStatus: m.verificationStatus });
  };

  const handleDownloadPhoto = async (storedPath: string, memberName: string) => {
    try {
      const token = localStorage.getItem('authToken')||'';
      const res   = await fetch(toFetchUrl(storedPath), { headers: token ? { Authorization:`Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob(); const ext = storedPath.split('.').pop()?.toLowerCase()||'jpg';
      const filename = `passport-${memberName.replace(/\s+/g,'-')}.${ext}`;
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) { alert('Download failed: ' + e.message); }
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Approve ${name}?`)) return;
    try { setActionLoading(id); await membersAPI.approve(id); setMembers(p => p.map(m => m._id===id ? {...m,verificationStatus:'approved'} : m)); if (selected?._id===id) setSelected(p => p ? {...p,verificationStatus:'approved'} : p); alert(`${name} approved!`); }
    catch (e: any) { alert(`Approve failed: ${e.message}`); } finally { setActionLoading(null); }
  };

  const handleReject = async (id: string, name: string) => {
    if (!window.confirm(`Reject ${name}?`)) return;
    try { setActionLoading(id); await membersAPI.reject(id); setMembers(p => p.map(m => m._id===id ? {...m,verificationStatus:'rejected'} : m)); if (selected?._id===id) setSelected(p => p ? {...p,verificationStatus:'rejected'} : p); }
    catch (e: any) { alert(`Reject failed: ${e.message}`); } finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete ${name}?`)) return;
    try { setActionLoading(id); await membersAPI.delete(id); setMembers(p => p.filter(m => m._id!==id)); setShowDetails(false); }
    catch (e: any) { alert(`Delete failed: ${e.message}`); } finally { setActionLoading(null); }
  };

  const handleImpersonate = async (member: Member) => {
    if (!window.confirm(`Log in as ${member.fullName}?`)) return;
    setActionLoading(member._id);
    try {
      const at = localStorage.getItem('authToken'); const au = localStorage.getItem('currentUser');
      const d  = await authAPI.impersonate(member._id);
      localStorage.setItem('adminToken', at||''); localStorage.setItem('adminUser', au||'{}'); localStorage.setItem('impersonating','true');
      localStorage.setItem('authToken', d.token); localStorage.setItem('currentUser', JSON.stringify(d.user));
      window.location.href = '/requests';
    } catch (e: any) { alert('Failed: ' + e.message); } finally { setActionLoading(null); }
  };

  const openResetPw = (m: Member) => { setResetTarget(m); setNewPassword(''); setResetMsg(''); setShowResetPw(true); };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (!resetTarget||!newPassword) return;
    if (newPassword.length < 6) { setResetMsg('Min 6 characters.'); return; }
    setResetLoading(true); setResetMsg('');
    try { await authAPI.adminResetPassword(resetTarget._id, newPassword); setResetMsg(`✅ Password reset for ${resetTarget.fullName}.`); setNewPassword(''); }
    catch (e: any) { setResetMsg(`❌ ${e.message}`); } finally { setResetLoading(false); }
  };

  const openEdit = (m: Member) => {
    setEditTarget(m);
    setEditForm({ fullName:m.fullName, email:m.email, phone:m.phone, institution:m.institution||'', membership:m.membership||'None', accountType:m.accountType, campus:m.campus||'', program:m.program||'', level:m.level||'', yearOfStudy:m.yearOfStudy||'', educationBackground:m.educationBackground||'', role:m.role||'user', verificationStatus:m.verificationStatus });
    setEditMsg(''); setShowEdit(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editTarget) return;
    if (!editForm.fullName?.trim()||!editForm.email?.trim()||!editForm.phone?.trim()) { setEditMsg('❌ Name, email, phone required.'); return; }
    setEditLoading(true); setEditMsg('');
    try {
      const res = await fetch(`/api/members/${editTarget._id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('authToken')||''}` }, body:JSON.stringify(editForm) });
      const d   = await res.json(); if (!res.ok) throw new Error(d?.message||`Server error ${res.status}`);
      const updated = {...editTarget,...editForm} as Member;
      setMembers(p => p.map(m => m._id===editTarget._id ? updated : m)); setSelected(updated);
      setEditMsg('✅ Saved!'); setTimeout(() => { setShowEdit(false); setEditMsg(''); }, 1200);
    } catch (e: any) { setEditMsg(`❌ ${e.message}`); } finally { setEditLoading(false); }
  };

  // Filter + paginate
  const filtered = useMemo(() => {
    let r = [...members]; const q = query.trim().toLowerCase();
    if (q) r = r.filter(m => m.fullName.toLowerCase().includes(q)||m.email.toLowerCase().includes(q)||(m.institution||'').toLowerCase().includes(q));
    if (statusFilter!=='all') r = r.filter(m => m.verificationStatus===statusFilter);
    if (typeFilter!=='all')   r = r.filter(m => m.accountType===typeFilter);
    return r;
  }, [members, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown      = filtered.slice((page-1)*perPage, page*perPage);

  // Style helpers
  const StatusBadge = ({ s }: { s: string }) => <span style={{ padding:'3px 10px', borderRadius:999, fontSize:'0.78rem', fontWeight:700, background:s==='approved'?'#d1fae5':s==='rejected'?'#fee2e2':'#fef3c7', color:s==='approved'?'#065f46':s==='rejected'?'#991b1b':'#92400e' }}>{s}</span>;
  const RolePill    = ({ role }: { role?: string }) => { const r=role||'user'; const c=ROLE_COLOUR[r]||ROLE_COLOUR.user; return <span style={{ padding:'3px 10px', borderRadius:999, fontSize:'0.78rem', fontWeight:700, background:c.bg, color:c.color, textTransform:'capitalize' }}>{r}</span>; };
  const DocRow      = ({ storedPath, label }: { storedPath:string; label:string }) => <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #e5e7eb' }}><span style={{ flex:1, fontWeight:500, fontSize:'0.9rem' }}>{label}</span><button onClick={() => handleViewFile(storedPath,label)} disabled={previewLoading} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#6366f1', color:'white', border:'none', borderRadius:6, padding:'7px 14px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}><EyeIcon /> View PDF</button></div>;
  const MissingDoc  = ({ label }: { label:string }) => <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #e5e7eb' }}><span style={{ flex:1, fontWeight:500, fontSize:'0.9rem' }}>{label}</span><span style={{ color:'#9ca3af', fontStyle:'italic', fontSize:'0.85rem' }}>Not uploaded</span></div>;
  const abtn = (bg: string, disabled=false): React.CSSProperties => ({ background:bg, color:'white', border:'none', borderRadius:6, padding:'6px 11px', cursor:disabled?'not-allowed':'pointer', fontSize:'0.8rem', fontWeight:600, opacity:disabled?0.5:1, display:'inline-flex', alignItems:'center', gap:5 });
  const inputSt: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:8, boxSizing:'border-box' };
  const labelSt: React.CSSProperties = { display:'block', marginBottom:4, fontWeight:600, fontSize:'0.82rem', color:'#374151' };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="axpage" style={{ background:'#f8fafc', minHeight:'100vh' }}>

      {/* Header */}
      <div className="members-page-header">
        <h1>Members</h1>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={() => setShowScanner(true)} disabled={scanBusy} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', background:scanBusy?'#bae6fd':'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'white', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:scanBusy?'not-allowed':'pointer', boxShadow:'0 2px 8px rgba(14,165,233,0.3)' }} title="Scan member ID card QR to log building entry">
            <QrIcon /> {scanBusy ? 'Logging…' : 'Scan ID Card'}
          </button>
          <button className="members-add-btn" onClick={() => setShowAddModal(true)}>+ Add Member</button>
        </div>
      </div>

      {/* ── Scan result banner ── */}
      {scanBanner && (
        <div style={{ margin:'0 0 18px', padding:'14px 18px', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, background:scanBanner.ok?'linear-gradient(135deg,#f0fdf4,#dcfce7)':'linear-gradient(135deg,#fff1f2,#fee2e2)', border:`2px solid ${scanBanner.ok?'#22c55e':'#f87171'}`, boxShadow:`0 2px 12px ${scanBanner.ok?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:scanBanner.ok?'linear-gradient(135deg,#22c55e,#16a34a)':'linear-gradient(135deg,#ef4444,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'white', fontWeight:800, flexShrink:0 }}>{scanBanner.ok?'✓':'✕'}</div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:scanBanner.ok?'#15803d':'#991b1b' }}>{scanBanner.ok?`Entry Logged — ${scanBanner.name}`:`Check-in Failed — ${scanBanner.name}`}</div>
              <div style={{ fontSize:13, marginTop:3, display:'flex', alignItems:'center', gap:12, color:scanBanner.ok?'#166534':'#b91c1c', flexWrap:'wrap' }}>
                <span>🕐 {scanBanner.time}</span>
                {scanBanner.phone && <span>📞 {scanBanner.phone}</span>}
                {scanBanner.email && <span>✉️ {scanBanner.email}</span>}
                {scanBanner.ok
                  ? <span style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:6, padding:'1px 8px', fontSize:11, fontWeight:700 }}>📷 QR SCAN</span>
                  : <span style={{ fontSize:12, opacity:0.85 }}>{scanBanner.msg}</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setScanBanner(null)} style={{ background:'none', border:'none', color:'#64748b', fontSize:20, cursor:'pointer', flexShrink:0 }}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="members-filters">
        <input type="text" placeholder="Search name, email, institution…" value={query} onChange={e => setQuery(e.target.value)} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option><option value="student">Student</option><option value="non_student">Non-Student</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <p style={{ color:'#6b7280' }}>Loading…</p> : shown.length===0 ? <p style={{ color:'#6b7280' }}>No members found.</p> : (
        <div className="members-table-wrap">
          <table className="members-table">
            <thead><tr>{['Photo','Name','Email','Phone','Role','Type','Status','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map(m => {
                const busy = actionLoading===m._id;
                return (
                  <tr key={m._id}>
                    <td data-label="Photo">
                      {m.passportPhotoFile
                        ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}><img src={toFetchUrl(m.passportPhotoFile)} alt={m.fullName} onClick={() => openPassportLightbox(m.passportPhotoFile!)} style={{ width:40, height:50, objectFit:'cover', borderRadius:6, cursor:'zoom-in', border:'1px solid #e5e7eb' }} /><button onClick={() => handleDownloadPhoto(m.passportPhotoFile!,m.fullName)} style={{ background:'none', border:'none', cursor:'pointer', color:'#6366f1', fontSize:14 }}>⬇</button></div>
                        : <div style={{ width:40, height:50, borderRadius:6, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#94a3b8', border:'1px dashed #cbd5e1' }}>👤</div>
                      }
                    </td>
                    <td data-label="Name" style={{ fontWeight:500 }}>{m.fullName}</td>
                    <td data-label="Email">{m.email}</td>
                    <td data-label="Phone">{m.phone}</td>
                    <td data-label="Role"><RolePill role={m.role} /></td>
                    <td data-label="Type" style={{ textTransform:'capitalize' }}>{m.accountType.replace('_',' ')}</td>
                    <td data-label="Status"><StatusBadge s={m.verificationStatus} /></td>
                    <td data-label="Actions">
                      <div className="members-actions">
                        <button onClick={() => { setSelected(m); setShowDetails(true); }} style={abtn('#6366f1')}>View</button>
                        <button onClick={() => { setIdCardMember(m); setShowIDCard(true); }} style={abtn('#b8860b')} title="View &amp; Download ID Card">🪪 ID Card</button>
                        <button onClick={() => handleDirectEntry(m)} disabled={busy} style={abtn('#0ea5e9',busy)} title="Log building entry"><QrIcon /> Entry</button>
                        {m.verificationStatus==='pending' && <><button onClick={() => handleApprove(m._id,m.fullName)} disabled={busy} style={abtn('#10b981',busy)}>Approve</button><button onClick={() => handleReject(m._id,m.fullName)} disabled={busy} style={abtn('#ef4444',busy)}>Reject</button></>}
                        {m.verificationStatus==='approved' && m.role!=='admin' && <button onClick={() => handleImpersonate(m)} disabled={busy} style={abtn('#0891b2',busy)}><UserIcon /> Login as</button>}
                        <button onClick={() => openResetPw(m)} style={abtn('#f59e0b')}><KeyIcon /> Reset</button>
                        <button onClick={() => handleDelete(m._id,m.fullName)} disabled={busy} style={abtn('#6b7280',busy)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div className="members-pagination">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ opacity:page===1?0.5:1 }}>← Prev</button>
          <span style={{ padding:'7px 12px', color:'#6b7280', fontSize:14 }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ opacity:page===totalPages?0.5:1 }}>Next →</button>
        </div>
      )}

      {/* ═══════════════════ CAMERA QR SCANNER ═══════════════════ */}
      {showScanner && <CameraQRScanner onConfirm={handleQRConfirm} onClose={() => setShowScanner(false)} />}

      {/* ═══════════════════ ADD MEMBER MODAL ═══════════════════ */}
      {showAddModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'white', borderRadius:12, width:'100%', maxWidth:540, maxHeight:'92vh', overflowY:'auto', padding:24 }}>
            <h2 style={{ margin:'0 0 20px', color:'#1e40af' }}>Add New Member</h2>
            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', marginBottom:6, fontWeight:600, fontSize:'0.9rem' }}>Passport Photo (JPG/PNG)</label>
                {addPassportPreview && <img src={addPassportPreview} alt="Preview" style={{ width:80, height:100, objectFit:'cover', borderRadius:8, border:'2px solid #c7d2fe', marginBottom:8, display:'block' }} />}
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handleAddPassportChange} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:13 }}>
                <div><label style={labelSt}>Full Name *</label><input name="fullName" value={newMemberForm.fullName} onChange={handleNewMemberChange} required style={inputSt} /></div>
                <div><label style={labelSt}>Phone *</label><input name="phone" value={newMemberForm.phone} onChange={handleNewMemberChange} required style={inputSt} /></div>
              </div>
              <div style={{ marginBottom:13 }}><label style={labelSt}>Email *</label><input type="email" name="email" value={newMemberForm.email} onChange={handleNewMemberChange} required style={inputSt} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:13 }}>
                <div><label style={labelSt}>Institution</label><input name="institution" value={newMemberForm.institution} onChange={handleNewMemberChange} style={inputSt} /></div>
                <div><label style={labelSt}>Account Type</label><select name="accountType" value={newMemberForm.accountType} onChange={handleNewMemberChange} style={inputSt}><option value="non_student">Non-Student</option><option value="student">Student</option></select></div>
              </div>
              <div style={{ marginBottom:13 }}><label style={labelSt}>Membership</label><select name="membership" value={newMemberForm.membership} onChange={handleNewMemberChange} style={inputSt}>{MEMBERSHIP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div style={{ marginBottom:13 }}><label style={labelSt}>Role</label><select name="role" value={newMemberForm.role} onChange={handleNewMemberChange} style={inputSt}>{ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div style={{ marginBottom:13 }}><label style={{ display:'flex', alignItems:'center', gap:8, fontWeight:500, fontSize:'0.9rem', cursor:'pointer' }}><input type="checkbox" name="setApproved" checked={newMemberForm.setApproved} onChange={handleNewMemberChange} /> Approve immediately</label></div>
              <div style={{ marginBottom:18 }}><label style={labelSt}>Temporary Password (optional)</label><input type="text" name="password" value={newMemberForm.password} onChange={handleNewMemberChange} style={inputSt} /></div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" onClick={() => { setShowAddModal(false); resetAddForm(); }} style={{ padding:'9px 18px', border:'1px solid #9ca3af', borderRadius:8, background:'transparent', cursor:'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding:'9px 22px', background:'#6366f1', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:'pointer' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ MEMBER DETAILS MODAL ═══════════════════ */}
      {showDetails && selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'white', borderRadius:12, width:'100%', maxWidth:700, maxHeight:'92vh', overflowY:'auto', padding:28 }}>
            <div style={{ display:'flex', gap:20, marginBottom:22, alignItems:'flex-start' }}>
              {/* Photo */}
              <div style={{ flexShrink:0, textAlign:'center' }}>
                {selected.passportPhotoFile
                  ? <><img src={toFetchUrl(selected.passportPhotoFile)} alt="Photo" onClick={() => openPassportLightbox(selected.passportPhotoFile!)} style={{ width:90, height:110, objectFit:'cover', borderRadius:10, border:'2px solid #c7d2fe', cursor:'zoom-in', boxShadow:'0 4px 12px rgba(0,0,0,0.12)' }} /><div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}><div style={{ fontSize:11, color:'#6366f1', cursor:'pointer' }} onClick={() => openPassportLightbox(selected.passportPhotoFile!)}>🔍 Enlarge</div><button onClick={() => handleDownloadPhoto(selected.passportPhotoFile!,selected.fullName)} style={{ background:'#6366f1', color:'white', border:'none', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>⬇ Download</button></div></>
                  : <div style={{ width:90, height:110, borderRadius:10, background:'#f1f5f9', border:'2px dashed #cbd5e1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, color:'#94a3b8', fontSize:13 }}><span style={{ fontSize:28 }}>👤</span>No photo</div>
                }
              </div>
              {/* Name */}
              <div style={{ flex:1 }}>
                <h2 style={{ margin:'0 0 8px', color:'#1e40af', fontSize:22 }}>{selected.fullName}</h2>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}><span style={{ fontSize:'0.85rem', color:'#6b7280' }}>{selected.accountType==='student'?'🎓 Student':'👤 Non-Student'}</span><StatusBadge s={selected.verificationStatus} /><RolePill role={selected.role} /></div>
              </div>
              {/* QR preview */}
              <div style={{ flexShrink:0, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <div style={{ background:'#f0f4ff', border:'1.5px solid #c7d2fe', borderRadius:10, padding:8 }}>
                  <QRCodeCanvas value={buildQRPayload(selected)} size={90} />
                </div>
                <button onClick={() => { setQrMember(selected); setShowQR(true); }} style={{ fontSize:11, color:'#6366f1', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0 }}>🔍 Enlarge / Download</button>
              </div>
              <button onClick={() => setShowDetails(false)} style={{ background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#6b7280', flexShrink:0 }}>×</button>
            </div>

            {/* Info grid */}
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'14px 16px', marginBottom:18, display:'grid', gridTemplateColumns:'160px 1fr', gap:'9px 18px', fontSize:'0.88rem' }}>
              <strong style={{ color:'#6b7280' }}>Member ID</strong>   <span>{selected.regNumber||selected._id.slice(-8).toUpperCase()}</span>
              <strong style={{ color:'#6b7280' }}>Email</strong>       <span>{selected.email}</span>
              <strong style={{ color:'#6b7280' }}>Phone</strong>       <span>{selected.phone}</span>
              <strong style={{ color:'#6b7280' }}>Institution</strong> <span>{selected.institution||'—'}</span>
              <strong style={{ color:'#6b7280' }}>Membership</strong>  <span>{selected.membership||'—'}</span>
              {selected.accountType==='student' && <>{selected.campus && <><strong style={{ color:'#6b7280' }}>Campus</strong><span>{selected.campus}</span></>}{selected.program && <><strong style={{ color:'#6b7280' }}>Program</strong><span>{selected.program}</span></>}{selected.level && <><strong style={{ color:'#6b7280' }}>Level</strong><span>{selected.level}</span></>}{selected.yearOfStudy && <><strong style={{ color:'#6b7280' }}>Year</strong><span>Year {selected.yearOfStudy}</span></>}</>}
              {selected.accountType==='non_student' && selected.educationBackground && <><strong style={{ color:'#6b7280' }}>Education</strong><span style={{ whiteSpace:'pre-wrap' }}>{selected.educationBackground}</span></>}
            </div>

            {/* Documents */}
            <h3 style={{ margin:'0 0 10px', color:'#1e40af', fontSize:'1rem' }}>Uploaded Documents</h3>
            <div style={{ background:'#f8fafc', borderRadius:8, padding:'0 16px', marginBottom:20 }}>
              {selected.accountType==='student'
                ? (selected.studentIdFile ? <DocRow storedPath={selected.studentIdFile} label="Student ID" /> : <MissingDoc label="Student ID" />)
                : <>{selected.nationalIdFile ? <DocRow storedPath={selected.nationalIdFile} label="National ID" /> : <MissingDoc label="National ID" />}{selected.educationProofFile ? <DocRow storedPath={selected.educationProofFile} label="Residence Proof" /> : <MissingDoc label="Residence Proof" />}{selected.centerFormFile ? <DocRow storedPath={selected.centerFormFile} label="Registration Form" /> : <MissingDoc label="Registration Form" />}</>
              }
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={() => { setQrMember(selected); setShowQR(true); }} style={{ padding:'9px 18px', background:'#6366f1', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>📱 QR Code</button>
              <button onClick={() => { setShowDetails(false); handleDirectEntry(selected); }} style={{ padding:'9px 18px', background:'#0ea5e9', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><QrIcon /> Log Entry</button>
              <button onClick={() => openEdit(selected)} style={{ padding:'9px 18px', background:'#0f766e', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>✏️ Edit</button>
              {selected.verificationStatus==='pending' && <><button onClick={() => handleApprove(selected._id,selected.fullName)} style={{ padding:'9px 18px', background:'#10b981', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>✓ Approve</button><button onClick={() => handleReject(selected._id,selected.fullName)} style={{ padding:'9px 18px', background:'#ef4444', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>✕ Reject</button></>}
              {selected.verificationStatus==='approved' && selected.role!=='admin' && <button onClick={() => { setShowDetails(false); handleImpersonate(selected); }} style={{ padding:'9px 18px', background:'#0891b2', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><UserIcon /> Login as</button>}
              <button onClick={() => { setShowDetails(false); openResetPw(selected); }} style={{ padding:'9px 18px', background:'#f59e0b', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}><KeyIcon /> Reset PW</button>
              <button onClick={() => handleDelete(selected._id,selected.fullName)} style={{ padding:'9px 18px', background:'#ef4444', color:'white', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>🗑 Delete</button>
              <button onClick={() => setShowDetails(false)} style={{ marginLeft:'auto', padding:'9px 22px', background:'#6b7280', color:'white', border:'none', borderRadius:8, cursor:'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ EDIT MODAL ═══════════════════ */}
      {showEdit && editTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:20 }}>
          <div style={{ background:'white', borderRadius:14, width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', padding:28, boxShadow:'0 24px 64px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
              <div><h2 style={{ margin:'0 0 2px', color:'#0f766e', fontSize:'1.2rem' }}>✏️ Edit Member</h2><p style={{ margin:0, color:'#6b7280', fontSize:'0.85rem' }}>{editTarget.fullName}</p></div>
              <button onClick={() => setShowEdit(false)} style={{ background:'#f1f5f9', border:'none', width:32, height:32, borderRadius:'50%', fontSize:16, cursor:'pointer' }}>×</button>
            </div>
            {editMsg && <div style={{ padding:'11px 14px', borderRadius:8, marginBottom:16, fontSize:'0.88rem', fontWeight:600, background:editMsg.startsWith('✅')?'#d1fae5':'#fee2e2', color:editMsg.startsWith('✅')?'#065f46':'#991b1b' }}>{editMsg}</div>}
            <form onSubmit={handleEditSave}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={labelSt}>Full Name *</label><input style={inputSt} value={editForm.fullName||''} onChange={e => setEditForm(p=>({...p,fullName:e.target.value}))} required /></div>
                <div><label style={labelSt}>Phone *</label><input style={inputSt} value={editForm.phone||''} onChange={e => setEditForm(p=>({...p,phone:e.target.value}))} required /></div>
              </div>
              <div style={{ marginBottom:12 }}><label style={labelSt}>Email *</label><input type="email" style={inputSt} value={editForm.email||''} onChange={e => setEditForm(p=>({...p,email:e.target.value}))} required /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={labelSt}>Institution</label><input style={inputSt} value={editForm.institution||''} onChange={e => setEditForm(p=>({...p,institution:e.target.value}))} /></div>
                <div><label style={labelSt}>Account Type</label><select style={inputSt} value={editForm.accountType} onChange={e => setEditForm(p=>({...p,accountType:e.target.value as any}))}><option value="student">Student</option><option value="non_student">Non-Student</option></select></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label style={labelSt}>Membership</label><select style={inputSt} value={editForm.membership||'None'} onChange={e => setEditForm(p=>({...p,membership:e.target.value}))}>{MEMBERSHIP_OPTIONS.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
                <div><label style={labelSt}>Role</label><select style={inputSt} value={editForm.role||'user'} onChange={e => setEditForm(p=>({...p,role:e.target.value}))}>{ROLE_OPTIONS.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:12 }}><label style={labelSt}>Status</label><select style={inputSt} value={editForm.verificationStatus} onChange={e => setEditForm(p=>({...p,verificationStatus:e.target.value as any}))}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
              {editForm.accountType==='student' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div><label style={labelSt}>Campus</label><input style={inputSt} value={editForm.campus||''} onChange={e => setEditForm(p=>({...p,campus:e.target.value}))} /></div>
                  <div><label style={labelSt}>Program</label><input style={inputSt} value={editForm.program||''} onChange={e => setEditForm(p=>({...p,program:e.target.value}))} /></div>
                  <div><label style={labelSt}>Level</label><input style={inputSt} value={editForm.level||''} onChange={e => setEditForm(p=>({...p,level:e.target.value}))} /></div>
                  <div><label style={labelSt}>Year</label><input style={inputSt} value={editForm.yearOfStudy||''} onChange={e => setEditForm(p=>({...p,yearOfStudy:e.target.value}))} /></div>
                </div>
              )}
              {editForm.accountType==='non_student' && (
                <div style={{ marginBottom:12 }}><label style={labelSt}>Education Background</label><textarea rows={3} style={{ ...inputSt, resize:'vertical', fontFamily:'inherit' }} value={editForm.educationBackground||''} onChange={e => setEditForm(p=>({...p,educationBackground:e.target.value}))} /></div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" onClick={() => setShowEdit(false)} style={{ padding:'10px 20px', border:'1px solid #9ca3af', borderRadius:8, background:'transparent', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={editLoading} style={{ padding:'10px 26px', background:editLoading?'#99f6e4':'#0f766e', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:editLoading?'wait':'pointer' }}>{editLoading?'Saving…':'💾 Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ PASSPORT LIGHTBOX ═══════════════════ */}
      {passportLightbox && (
        <div onClick={() => setPassportLightbox(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1300, cursor:'zoom-out' }}>
          <button onClick={() => setPassportLightbox(false)} style={{ position:'absolute', top:20, right:24, background:'rgba(255,255,255,0.12)', border:'none', color:'white', width:40, height:40, borderRadius:'50%', fontSize:18, cursor:'pointer' }}>✕</button>
          <img src={passportSrc} alt="Passport" onClick={e => e.stopPropagation()} style={{ maxWidth:'80vw', maxHeight:'80vh', borderRadius:12, objectFit:'contain', cursor:'default' }} />
          <div onClick={e => e.stopPropagation()} style={{ position:'absolute', bottom:28, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <button onClick={() => { const m=selected||members.find(m => toFetchUrl(m.passportPhotoFile||'')===passportSrc); if (m?.passportPhotoFile) handleDownloadPhoto(m.passportPhotoFile,m.fullName); else window.open(passportSrc,'_blank'); }} style={{ background:'#6366f1', color:'white', border:'none', borderRadius:8, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer' }}>⬇ Download Photo</button>
            <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>Click outside or ✕ to close</span>
          </div>
        </div>
      )}

      {/* ═══════════════════ RESET PASSWORD ═══════════════════ */}
      {showResetPw && resetTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:20 }}>
          <div style={{ background:'white', borderRadius:12, width:'100%', maxWidth:420, padding:28 }}>
            <h2 style={{ margin:'0 0 6px', color:'#b45309' }}>🔑 Reset Password</h2>
            <p style={{ margin:'0 0 20px', color:'#6b7280', fontSize:'0.9rem' }}>Set new password for <strong>{resetTarget.fullName}</strong></p>
            {resetMsg && <div style={{ padding:'12px 14px', borderRadius:8, marginBottom:16, background:resetMsg.startsWith('✅')?'#d1fae5':'#fee2e2', color:resetMsg.startsWith('✅')?'#065f46':'#991b1b', fontSize:'0.88rem' }}>{resetMsg}</div>}
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom:20 }}><label style={{ display:'block', marginBottom:6, fontWeight:600 }}>New Password (min 6 chars)</label><input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:8, boxSizing:'border-box', fontSize:'1rem' }} /></div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" onClick={() => { setShowResetPw(false); setResetMsg(''); }} style={{ padding:'9px 18px', border:'1px solid #9ca3af', borderRadius:8, background:'transparent', cursor:'pointer' }}>{resetMsg.startsWith('✅')?'Done':'Cancel'}</button>
                {!resetMsg.startsWith('✅') && <button type="submit" disabled={resetLoading||!newPassword} style={{ padding:'9px 22px', background:'#f59e0b', color:'white', border:'none', borderRadius:8, fontWeight:600, cursor:resetLoading?'wait':'pointer', opacity:resetLoading||!newPassword?0.6:1 }}>{resetLoading?'Resetting…':'Reset'}</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ PDF PREVIEW ═══════════════════ */}
      {(previewLoading||previewDataUrl||previewError) && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200, padding:16 }} onClick={closePreview}>
          <div style={{ background:'white', borderRadius:12, width:'96%', maxWidth:1080, height:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'12px 20px', background:'#1e40af', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <span style={{ color:'white', fontWeight:600 }}>📄 {previewTitle}</span>
              <button onClick={closePreview} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:30, height:30, borderRadius:6, fontSize:'1.2rem', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ flex:1, position:'relative', background:'#404040', overflow:'hidden' }}>
              {previewLoading && <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', gap:16 }}><style>{`@keyframes sp2{to{transform:rotate(360deg)}}`}</style><div style={{ width:44, height:44, border:'4px solid rgba(255,255,255,0.25)', borderTopColor:'white', borderRadius:'50%', animation:'sp2 0.75s linear infinite' }} /><p style={{ margin:0 }}>Loading PDF…</p></div>}
              {previewError && <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', gap:12, padding:32, textAlign:'center' }}><span style={{ fontSize:'2.5rem' }}>⚠️</span><p style={{ margin:0, fontWeight:700 }}>Could not load document</p><p style={{ margin:0, opacity:0.75, fontSize:'0.85rem' }}>{previewError}</p></div>}
              {previewDataUrl && !previewLoading && <iframe src={previewDataUrl} title={previewTitle} style={{ width:'100%', height:'100%', border:'none' }} />}
            </div>
            {downloadUrl && <div style={{ padding:'10px 20px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}><span style={{ color:'#9ca3af', fontSize:'0.78rem' }}>Click outside to close</span><a href={downloadUrl} download={`${previewTitle}.pdf`} style={{ padding:'8px 18px', background:'#6366f1', color:'white', borderRadius:6, textDecoration:'none', fontWeight:600, fontSize:'0.875rem' }}>⬇ Download PDF</a></div>}
          </div>
        </div>
      )}

      {/* ═══════════════════ QR CODE MODAL (display/download) ═══════════════════ */}
      {showQR && qrMember && (
        <div onClick={() => setShowQR(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1400, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, padding:32, maxWidth:400, width:'100%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.4)', position:'relative' }}>
            <button onClick={() => setShowQR(false)} style={{ position:'absolute', top:12, right:14, background:'#f1f5f9', border:'none', color:'#374151', width:30, height:30, borderRadius:'50%', fontSize:16, cursor:'pointer', fontWeight:700 }}>×</button>
            <h2 style={{ margin:'0 0 4px', color:'#1e40af', fontSize:'1.2rem' }}>📱 Member QR Code</h2>
            <p style={{ margin:'0 0 16px', color:'#6b7280', fontSize:'0.85rem' }}>Scan to log entry for <strong>{qrMember.fullName}</strong></p>
            <div style={{ display:'inline-block', background:'white', border:'3px solid #1e40af', borderRadius:12, padding:12, marginBottom:16 }}>
              <QRCodeCanvas value={buildQRPayload(qrMember)} size={220} className="qr-modal-canvas" />
            </div>

            {/* Show all encoded fields */}
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 16px', marginBottom:20, textAlign:'left', fontSize:'0.83rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'6px 12px', color:'#374151' }}>
                <strong style={{ color:'#6b7280' }}>Name</strong>        <span style={{ fontWeight:700, color:'#1e40af' }}>{qrMember.fullName}</span>
                <strong style={{ color:'#6b7280' }}>Member ID</strong>   <span style={{ fontFamily:'monospace', fontSize:11 }}>{qrMember.regNumber||qrMember._id}</span>
                <strong style={{ color:'#6b7280' }}>Email</strong>       <span style={{ wordBreak:'break-all' }}>{qrMember.email}</span>
                <strong style={{ color:'#6b7280' }}>Phone</strong>       <span>{qrMember.phone}</span>
                {qrMember.institution && <><strong style={{ color:'#6b7280' }}>Institution</strong><span>{qrMember.institution}</span></>}
                {qrMember.membership && qrMember.membership!=='None' && <><strong style={{ color:'#6b7280' }}>Membership</strong><span>{qrMember.membership}</span></>}
                {qrMember.campus   && <><strong style={{ color:'#6b7280' }}>Campus</strong><span>{qrMember.campus}</span></>}
                {qrMember.program  && <><strong style={{ color:'#6b7280' }}>Program</strong><span>{qrMember.program}</span></>}
                {qrMember.level    && <><strong style={{ color:'#6b7280' }}>Level</strong><span>{qrMember.level}</span></>}
                {qrMember.yearOfStudy && <><strong style={{ color:'#6b7280' }}>Year</strong><span>Year {qrMember.yearOfStudy}</span></>}
                <strong style={{ color:'#6b7280' }}>Status</strong>
                <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:'0.75rem', fontWeight:700, background:qrMember.verificationStatus==='approved'?'#d1fae5':qrMember.verificationStatus==='rejected'?'#fee2e2':'#fef3c7', color:qrMember.verificationStatus==='approved'?'#065f46':qrMember.verificationStatus==='rejected'?'#991b1b':'#92400e' }}>{qrMember.verificationStatus}</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => { const c = document.querySelector<HTMLCanvasElement>('.qr-modal-canvas'); if (!c||!qrMember) return; const a=document.createElement('a'); a.download=`qr-${qrMember.fullName.replace(/\s+/g,'-')}.png`; a.href=c.toDataURL('image/png'); a.click(); }} style={{ padding:'10px 22px', background:'#1e40af', color:'white', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>⬇ Download QR</button>
              <button onClick={() => setShowQR(false)} style={{ padding:'10px 18px', border:'1px solid #9ca3af', borderRadius:8, background:'transparent', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ CITT ID CARD MODAL ═══════════════════ */}
      {showIDCard && idCardMember && (
        <IDCard member={idCardMember} onClose={() => { setShowIDCard(false); setIdCardMember(null); }} />
      )}
    </div>
  );
};
export default Members;