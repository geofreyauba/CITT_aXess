// src/components/IDCard.tsx
// Download: pure Canvas 2D — no html2canvas, zero capture bugs.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  FiCreditCard, FiMapPin, FiBook, FiCalendar,
  FiPhone, FiMail, FiUser, FiAward,
} from 'react-icons/fi';

interface Member {
  _id: string; fullName: string; email: string; phone: string;
  accountType: 'student' | 'non_student'; institution?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  membership?: string; role?: string; regNumber?: string;
  campus?: string; program?: string; level?: string; yearOfStudy?: string;
  passportPhotoFile?: string;
}
interface IDCardProps { member: Member; onClose: () => void; }

function toFetchUrl(s: string): string {
  if (!s) return '';
  if (s.startsWith('http')) return s;
  return `/api/members/file/${encodeURIComponent(s.replace(/^\/+/, '').replace(/^uploads\//, ''))}`;
}

async function buildQRDataUrl(value: string, size: number): Promise<string> {
  const QRCode = await import('qrcode');
  // errorCorrectionLevel 'H' = 30% damage tolerance — most scannable
  // Render at 4× then display at target size for crisp pixels
  return QRCode.toDataURL(value, {
    width: size * 4,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#ffffff' },
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const PURPLE  = '#9C80C6';   // main accent — all formerly-blue elements
const PURPLE2 = '#B49ED8';   // lighter purple for icons/labels
const PURPLED = '#6B4FA8';   // darker purple for header gradient end
const NAVY    = '#1A0A2E';   // very dark purple-navy for header top
const GOLD    = '#C9A84C';
const GOLD2   = '#F0C040';
const GOLD3   = '#7A5C1E';
const WHITE   = '#FFFFFF';
const OFFWH   = '#F5F2FC';   // very light purple tint for panels
const DARK    = '#2A1A4A';   // dark text

// ─────────────────────────────────────────────────────────────────────────────
// PURE CANVAS DRAW (used for download)
// ─────────────────────────────────────────────────────────────────────────────
function drawWave(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, ch: number) {
  const wh = 38, wy = oy + ch - wh;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ox, wy + 20);
  ctx.bezierCurveTo(ox + w * 0.12, wy + 5,  ox + w * 0.26, wy + 34, ox + w * 0.42, wy + 17);
  ctx.bezierCurveTo(ox + w * 0.58, wy + 2,  ox + w * 0.70, wy + 32, ox + w * 0.85, wy + 15);
  ctx.bezierCurveTo(ox + w * 0.91, wy + 8,  ox + w * 0.97, wy + 20, ox + w, wy + 13);
  ctx.lineTo(ox + w, oy + ch); ctx.lineTo(ox, oy + ch); ctx.closePath();
  ctx.fillStyle = NAVY; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ox, wy + 20);
  ctx.bezierCurveTo(ox + w * 0.12, wy + 5,  ox + w * 0.26, wy + 34, ox + w * 0.42, wy + 17);
  ctx.bezierCurveTo(ox + w * 0.58, wy + 2,  ox + w * 0.70, wy + 32, ox + w * 0.85, wy + 15);
  ctx.bezierCurveTo(ox + w * 0.91, wy + 8,  ox + w * 0.97, wy + 20, ox + w, wy + 13);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.restore();
}

async function drawCard(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number, cw: number, ch: number,
  side: 'front' | 'back',
  member: Member,
  photoImg: HTMLImageElement | null,
  qrImg: HTMLImageElement,
) {
  const r = 24;
  ctx.save();

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  roundRect(ctx, ox, oy, cw, ch, r); ctx.fillStyle = '#000'; ctx.fill();
  ctx.shadowColor = 'transparent';

  // Clip to card
  roundRect(ctx, ox, oy, cw, ch, r); ctx.clip();

  // White body
  ctx.fillStyle = WHITE; ctx.fillRect(ox, oy, cw, ch);

  // Purple side stripe
  const sg = ctx.createLinearGradient(0, oy, 0, oy + ch);
  sg.addColorStop(0, PURPLE); sg.addColorStop(1, PURPLED);
  ctx.fillStyle = sg;
  if (side === 'front') ctx.fillRect(ox, oy, 7, ch);
  else ctx.fillRect(ox + cw - 7, oy, 7, ch);

  // Header
  const hx = side === 'front' ? ox + 7 : ox;
  const hw = cw - 7, headerH = 96;
  const hg = ctx.createLinearGradient(0, oy, 0, oy + headerH);
  hg.addColorStop(0, NAVY); hg.addColorStop(1, PURPLED);
  ctx.fillStyle = hg; ctx.fillRect(hx, oy, hw, headerH);

  // Gold top rule
  const tg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  tg.addColorStop(0, 'transparent'); tg.addColorStop(0.3, GOLD2);
  tg.addColorStop(0.5, GOLD); tg.addColorStop(0.7, GOLD2); tg.addColorStop(1, 'transparent');
  ctx.fillStyle = tg; ctx.fillRect(hx, oy, hw, 5);

  // Gold bottom border header
  const bg = ctx.createLinearGradient(hx, 0, hx + hw, 0);
  bg.addColorStop(0, 'transparent'); bg.addColorStop(0.2, GOLD);
  bg.addColorStop(0.8, GOLD); bg.addColorStop(1, 'transparent');
  ctx.strokeStyle = bg; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hx, oy + headerH); ctx.lineTo(hx + hw, oy + headerH); ctx.stroke();

  // Header text
  const hcx = hx + hw / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD2; ctx.font = 'bold 13px Georgia';
  ctx.fillText('MBEYA UNIVERSITY OF SCIENCE AND TECHNOLOGY', hcx, oy + 32);
  ctx.fillStyle = GOLD; ctx.font = '600 10px "Segoe UI",Arial';
  ctx.fillText('CENTER OF INNOVATION TECHNOLOGY TRANSFER', hcx, oy + 52);
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.moveTo(hx + 30, oy + 60); ctx.lineTo(hx + hw - 30, oy + 60); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.font = '600 9.5px "Segoe UI",Arial';
  ctx.fillText('MEMBER IDENTITY CARD', hcx, oy + 76);

  // Gold inner border
  ctx.strokeStyle = GOLD3; ctx.lineWidth = 1.5;
  roundRect(ctx, ox + 3, oy + 3, cw - 6, ch - 6, r - 2); ctx.stroke();

  const bodyY = oy + headerH + 2;

  if (side === 'front') {
    const rightW = 158;
    // Off-white right panel
    ctx.fillStyle = OFFWH; ctx.fillRect(ox + cw - rightW, bodyY, rightW, ch - headerH);

    // Vertical gold divider
    const vg = ctx.createLinearGradient(0, bodyY, 0, oy + ch - 40);
    vg.addColorStop(0, 'transparent'); vg.addColorStop(0.5, GOLD); vg.addColorStop(1, 'transparent');
    ctx.strokeStyle = vg; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.moveTo(ox + cw - rightW, bodyY + 10); ctx.lineTo(ox + cw - rightW, oy + ch - 46); ctx.stroke();
    ctx.globalAlpha = 1;

    // Info rows
    const rows = [
      { label: 'Member ID',   value: member.regNumber || member._id.slice(-15).toUpperCase() },
      { label: 'Institution', value: member.institution || 'MUST' },
      { label: 'Membership',  value: member.membership && member.membership !== 'None' ? member.membership : 'DigiTech', bold: true },
      { label: 'Campus',      value: member.campus || 'Mbeya' },
      { label: 'Level',       value: member.level || 'Undergraduate' },
      { label: 'Year',        value: member.yearOfStudy ? `Year ${member.yearOfStudy}` : 'Year 3' },
    ];
    const infoX = (side === 'front' ? ox + 7 : ox) + 20;
    rows.forEach((row, i) => {
      const ry = bodyY + 22 + i * 24;
      ctx.textAlign = 'left';
      ctx.fillStyle = PURPLE; ctx.font = 'bold 13px "Segoe UI",Arial';
      ctx.fillText(`${row.label}:`, infoX, ry);
      ctx.fillStyle = row.bold ? PURPLED : DARK;
      ctx.font = row.bold ? 'bold 13px "Segoe UI",Arial' : '500 13px "Segoe UI",Arial';
      ctx.fillText(row.value, infoX + 90, ry);
    });

    // Signature area
    const sigY = oy + ch - 52;
    const dg = ctx.createLinearGradient(infoX, 0, infoX + 180, 0);
    dg.addColorStop(0, GOLD); dg.addColorStop(1, 'transparent');
    ctx.strokeStyle = dg; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(infoX, sigY - 8); ctx.lineTo(ox + cw - rightW - 8, sigY - 8); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PURPLE; ctx.font = 'bold 10px "Segoe UI",Arial'; ctx.textAlign = 'left';
    ctx.fillText('MEMBER SIGNATURE', infoX, sigY);
    const ulg = ctx.createLinearGradient(infoX, 0, infoX + 160, 0);
    ulg.addColorStop(0, GOLD); ulg.addColorStop(1, 'transparent');
    ctx.strokeStyle = ulg; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(infoX, sigY + 8); ctx.lineTo(infoX + 160, sigY + 8); ctx.stroke();

    // Photo
    const px = ox + cw - rightW + 28, py = bodyY + 12, pw = 102, ph = 122;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 3;
    ctx.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
    if (photoImg) {
      ctx.save();
      ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
      ctx.drawImage(photoImg, px, py, pw, ph);
      ctx.restore();
    } else {
      ctx.fillStyle = PURPLED; ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '42px "Segoe UI"';
      ctx.textAlign = 'center'; ctx.fillText('👤', px + pw / 2, py + ph / 2 + 14);
    }

    // QR
    const qs = 110;
    const qx = ox + cw - rightW + (rightW - qs) / 2;
    const qy = py + ph + 8;
    ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
    ctx.strokeRect(qx - 6, qy - 6, qs + 12, qs + 12);
    ctx.fillStyle = WHITE; ctx.fillRect(qx - 5, qy - 5, qs + 10, qs + 10);
    ctx.drawImage(qrImg, qx, qy, qs, qs);
    ctx.fillStyle = PURPLE; ctx.font = 'bold 8px "Segoe UI",Arial'; ctx.textAlign = 'center';
    ctx.fillText('SCAN FOR VERIFICATION', ox + cw - rightW + rightW / 2, qy + qs + 14);

  } else {
    // BACK
    const bx = ox + 18, bw = cw - 36;

    // Emergency heading
    ctx.fillStyle = GOLD; ctx.fillRect(bx, bodyY + 14, 4, 16);
    ctx.fillStyle = PURPLE; ctx.font = 'bold 14px "Segoe UI",Arial'; ctx.textAlign = 'left';
    ctx.fillText('EMERGENCY CONTACT', bx + 12, bodyY + 27);

    // Contact panel
    ctx.fillStyle = OFFWH;
    roundRect(ctx, bx, bodyY + 35, bw, 48, 7); ctx.fill();
    ctx.strokeStyle = `rgba(156,128,198,0.25)`; ctx.lineWidth = 1;
    roundRect(ctx, bx, bodyY + 35, bw, 48, 7); ctx.stroke();
    ctx.fillStyle = DARK; ctx.font = '13px "Segoe UI",Arial';
    ctx.fillText('📞  +255 25 295 7544, +255 25 295 7542', bx + 14, bodyY + 56);
    ctx.fillText('✉️   support@citt.ac.tz', bx + 14, bodyY + 74);

    // Divider
    const dg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    dg2.addColorStop(0, 'transparent'); dg2.addColorStop(0.5, GOLD); dg2.addColorStop(1, 'transparent');
    ctx.strokeStyle = dg2; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(bx, bodyY + 92); ctx.lineTo(bx + bw, bodyY + 92); ctx.stroke();
    ctx.globalAlpha = 1;

    // Property notice — word wrap
    ctx.fillStyle = DARK; ctx.font = '12px "Segoe UI",Arial'; ctx.textAlign = 'left';
    const full = 'This identity card is the property of Mbeya University of Science and Technology. If lost and found, please return it to the above address or the nearest police station.';
    const words2 = full.split(' '); let ln = '', ly = bodyY + 112;
    for (const w of words2) {
      const test = ln ? ln + ' ' + w : w;
      if (ctx.measureText(test).width > bw - 8 && ln) {
        ctx.fillStyle = DARK; ctx.font = '12px "Segoe UI",Arial';
        if (ln.includes('Mbeya University')) {
          const [pre, ...rest] = ln.split('Mbeya University of Science and Technology.');
          ctx.fillText(pre || '', bx, ly);
          const pw2 = ctx.measureText(pre || '').width;
          ctx.font = 'bold 12px "Segoe UI",Arial'; ctx.fillStyle = PURPLE;
          ctx.fillText('Mbeya University of Science and Technology.', bx + pw2, ly);
          const bw2 = ctx.measureText('Mbeya University of Science and Technology.').width;
          ctx.font = '12px "Segoe UI",Arial'; ctx.fillStyle = DARK;
          ctx.fillText(rest.join(''), bx + pw2 + bw2, ly);
        } else ctx.fillText(ln, bx, ly);
        ln = w; ly += 17;
      } else ln = test;
    }
    if (ln) ctx.fillText(ln, bx, ly);

    // Divider 2
    const d2y = ly + 14;
    ctx.strokeStyle = dg2; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(bx, d2y); ctx.lineTo(bx + bw, d2y); ctx.stroke();
    ctx.globalAlpha = 1;

    // VC signature
    ctx.fillStyle = DARK; ctx.font = 'italic 30px Georgia';
    ctx.fillText('Ql~', bx, d2y + 30);
    ctx.fillStyle = PURPLE; ctx.font = 'bold 10px "Segoe UI",Arial';
    ctx.fillText('VICE CHANCELLOR', bx, d2y + 46);

    // Address box
    const aw = 210, ah = 72;
    const ax = bx + bw - aw, ay = d2y + 4;
    ctx.fillStyle = OFFWH;
    roundRect(ctx, ax, ay, aw, ah, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(156,128,198,0.25)'; ctx.lineWidth = 1;
    roundRect(ctx, ax, ay, aw, ah, 7); ctx.stroke();
    ctx.fillStyle = DARK; ctx.font = '11.5px "Segoe UI",Arial'; ctx.textAlign = 'right';
    ['📍  P.O.Box 131 Mbeya, Tanzania', '📞  +255 25 295 7544', '✉️   vc@must.ac.tz', '✉️   must@must.ac.tz'].forEach((line, i) => {
      ctx.fillText(line, ax + aw - 12, ay + 18 + i * 15);
    });
  }

  drawWave(ctx, ox, oy, cw, ch);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// REACT UI COMPONENTS (preview only)
// ─────────────────────────────────────────────────────────────────────────────
const CW = 650, CH = 420;

const CardHeader: React.FC = () => (
  <div style={{
    textAlign: 'center', padding: '14px 18px 10px',
    background: `linear-gradient(180deg, ${NAVY} 0%, ${PURPLED} 100%)`,
    borderBottom: `2.5px solid ${GOLD}`, position: 'relative',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: `linear-gradient(90deg,transparent,${GOLD2},${GOLD},${GOLD2},transparent)` }} />
    <div style={{ color: GOLD2, fontSize: 12, fontWeight: 800, letterSpacing: 1.8, fontFamily: 'Georgia,serif', lineHeight: 1.4 }}>
      MBEYA UNIVERSITY OF SCIENCE AND TECHNOLOGY
    </div>
    <div style={{ color: GOLD, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.4, marginTop: 3, lineHeight: 1.4 }}>
      CENTER OF INNOVATION TECHNOLOGY TRANSFER
    </div>
    <div style={{
      height: 1, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`,
      margin: '5px 30px 4px', opacity: 0.3,
    }} />
    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 600, letterSpacing: 2.2, marginTop: 2 }}>
      MEMBER IDENTITY CARD
    </div>
  </div>
);

const GoldLine: React.FC<{ mt?: number; mb?: number }> = ({ mt = 0, mb = 0 }) => (
  <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, marginTop: mt, marginBottom: mb, opacity: 0.4 }} />
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string; bold?: boolean }> = ({ icon, label, value, bold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
    <span style={{ color: PURPLE, width: 18, flexShrink: 0, display: 'flex', alignItems: 'center', fontSize: 13 }}>{icon}</span>
    <span style={{ color: PURPLE, fontSize: 13, fontWeight: 700, minWidth: 84, flexShrink: 0 }}>{label}:</span>
    <span style={{ color: bold ? PURPLED : DARK, fontSize: 13, fontWeight: bold ? 800 : 500 }}>{value}</span>
  </div>
);

const BottomWave: React.FC = () => (
  <svg viewBox="0 0 650 38" preserveAspectRatio="none"
    style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 38, zIndex: 3, display: 'block' }}>
    <path d="M0,20 C80,5 160,34 270,17 C370,2 450,32 550,16 C595,8 625,20 650,13 L650,38 L0,38 Z" fill={NAVY} />
    <path d="M0,20 C80,5 160,34 270,17 C370,2 450,32 550,16 C595,8 625,20 650,13" fill="none" stroke={GOLD} strokeWidth="2.5" />
    <path d="M0,26 C80,11 160,40 270,23 C370,8 450,38 550,22 C595,14 625,26 650,19" fill="none" stroke={GOLD2} strokeWidth="0.8" opacity="0.4" />
  </svg>
);

const CardFrontPreview: React.FC<{ member: Member; photoSrc: string; qrUrl: string }> = ({ member, photoSrc, qrUrl }) => {
  const memberId   = member.regNumber || member._id.slice(-15).toUpperCase();
  const membership = member.membership && member.membership !== 'None' ? member.membership : 'DigiTech';
  return (
    <div style={{
      width: CW, height: CH, position: 'relative', overflow: 'hidden',
      borderRadius: 22, flexShrink: 0,
      fontFamily: '"Segoe UI",Arial,sans-serif',
      boxShadow: `0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px ${GOLD3}`,
      background: WHITE,
    }}>
      {/* Purple left stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 7, bottom: 0, background: `linear-gradient(180deg,${PURPLE},${PURPLED})`, zIndex: 1 }} />
      {/* Gold inner border */}
      <div style={{ position: 'absolute', inset: 3, borderRadius: 19, border: `1.5px solid ${GOLD3}`, zIndex: 4, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 2, marginLeft: 7 }}><CardHeader /></div>

      <div style={{ position: 'absolute', top: 98, left: 7, right: 0, bottom: 38, display: 'flex', zIndex: 2 }}>
        {/* Left info */}
        <div style={{ flex: 1, padding: '14px 0 12px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: WHITE }}>
          <div>
            <InfoRow icon={<FiCreditCard />} label="Member ID"   value={memberId} />
            <InfoRow icon={<FiUser />}       label="Institution"  value={member.institution || 'MUST'} />
            <InfoRow icon={<FiAward />}      label="Membership"   value={membership} bold />
            <InfoRow icon={<FiMapPin />}     label="Campus"       value={member.campus || 'Mbeya'} />
            <InfoRow icon={<FiBook />}       label="Level"        value={member.level || 'Undergraduate'} />
            <InfoRow icon={<FiCalendar />}   label="Year"         value={member.yearOfStudy ? `Year ${member.yearOfStudy}` : 'Year 3'} />
          </div>
          <div>
            <GoldLine mb={7} />
            <div style={{ color: PURPLE, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.3, marginBottom: 6 }}>MEMBER SIGNATURE</div>
            <div style={{ width: 160, height: 1.5, background: `linear-gradient(90deg,${GOLD},transparent)` }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, margin: '10px 0', background: `linear-gradient(180deg,transparent,${GOLD},transparent)`, opacity: 0.3 }} />

        {/* Right photo + QR */}
        <div style={{
          width: 158, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 14px', background: OFFWH,
        }}>
          {/* Photo */}
          <div style={{
            width: 102, height: 122,
            border: `3px solid ${GOLD}`,
            borderRadius: 7, overflow: 'hidden',
            background: `linear-gradient(160deg,${PURPLE},${PURPLED})`,
            boxShadow: `0 0 0 1px ${GOLD3}, 0 6px 18px rgba(0,0,0,0.2)`,
            flexShrink: 0,
          }}>
            {photoSrc
              ? <img src={photoSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiUser style={{ color: 'rgba(255,255,255,0.4)', fontSize: 40 }} />
                </div>
            }
          </div>

          {/* QR */}
          <div style={{
            background: WHITE, padding: 6, borderRadius: 5,
            border: `2.5px solid ${GOLD}`,
            boxShadow: `0 2px 12px rgba(0,0,0,0.12)`,
            lineHeight: 0,
          }}>
            {qrUrl
              ? <img src={qrUrl} alt="QR" width={110} height={110} style={{ display: 'block', imageRendering: 'pixelated' }} />
              : <div style={{ width: 110, height: 110, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999' }}>Loading…</div>
            }
          </div>
          <div style={{ color: PURPLE, fontSize: 8, fontWeight: 700, letterSpacing: 1.3 }}>SCAN FOR VERIFICATION</div>
        </div>
      </div>
      <BottomWave />
    </div>
  );
};

const CardBackPreview: React.FC = () => (
  <div style={{
    width: CW, height: CH, position: 'relative', overflow: 'hidden',
    borderRadius: 22, flexShrink: 0,
    fontFamily: '"Segoe UI",Arial,sans-serif',
    boxShadow: `0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px ${GOLD3}`,
    background: WHITE,
  }}>
    {/* Purple right stripe */}
    <div style={{ position: 'absolute', top: 0, right: 0, width: 7, bottom: 0, background: `linear-gradient(180deg,${PURPLE},${PURPLED})`, zIndex: 1 }} />
    <div style={{ position: 'absolute', inset: 3, borderRadius: 19, border: `1.5px solid ${GOLD3}`, zIndex: 4, pointerEvents: 'none' }} />
    <div style={{ position: 'relative', zIndex: 2, marginRight: 7 }}><CardHeader /></div>

    <div style={{ position: 'absolute', top: 98, left: 16, right: 16, bottom: 42, zIndex: 2, display: 'flex', flexDirection: 'column' }}>
      {/* Emergency Contact */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10, marginBottom: 9 }}>
        <div style={{ width: 4, height: 16, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ color: PURPLE, fontWeight: 800, fontSize: 13.5, letterSpacing: 1.5 }}>EMERGENCY CONTACT</span>
      </div>

      <div style={{
        background: OFFWH, border: `1px solid rgba(156,128,198,0.25)`,
        borderRadius: 9, padding: '10px 14px', marginBottom: 11,
      }}>
        {[
          { Icon: FiPhone, t: '+255 25 295 7544, +255 25 295 7542' },
          { Icon: FiMail,  t: 'support@citt.ac.tz' },
        ].map(({ Icon, t }) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Icon style={{ color: PURPLE, fontSize: 14, flexShrink: 0 }} />
            <span style={{ color: DARK, fontSize: 12 }}>{t}</span>
          </div>
        ))}
      </div>

      <GoldLine mb={9} />

      <p style={{ color: DARK, fontSize: 11.5, lineHeight: 1.8, margin: '0 0 9px', flex: 1 }}>
        This identity card is the property of{' '}
        <strong style={{ color: PURPLE }}>Mbeya University of Science and Technology.</strong>
        {' '}If lost and found, please return it to the above address or the nearest police station.
      </p>

      <GoldLine mb={9} />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: '"Brush Script MT","Segoe Script",cursive', fontSize: 32, color: NAVY, lineHeight: 1, marginBottom: 4 }}>Ql~</div>
          <div style={{ color: PURPLE, fontWeight: 700, fontSize: 10.5, letterSpacing: 1.8 }}>VICE CHANCELLOR</div>
        </div>
        <div style={{
          background: OFFWH, border: `1px solid rgba(156,128,198,0.25)`,
          borderRadius: 7, padding: '8px 12px', textAlign: 'right',
        }}>
          {[
            { Icon: FiMapPin, t: 'P.O.Box 131 Mbeya, Tanzania' },
            { Icon: FiPhone,  t: '+255 25 295 7544' },
            { Icon: FiMail,   t: 'vc@must.ac.tz' },
            { Icon: FiMail,   t: 'must@must.ac.tz' },
          ].map(({ Icon, t }) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
              <Icon style={{ color: PURPLE, fontSize: 11, flexShrink: 0 }} />
              <span style={{ color: DARK, fontSize: 11 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <BottomWave />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────────────────────
const IDCard: React.FC<IDCardProps> = ({ member, onClose }) => {
  const [photoSrc,    setPhotoSrc]    = useState('');
  const [qrUrl,       setQrUrl]       = useState('');
  const [downloading, setDownloading] = useState(false);
  const scaleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!member.passportPhotoFile) return;
    const token = localStorage.getItem('authToken') || '';
    fetch(toFetchUrl(member.passportPhotoFile), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject())
      .then(blob => setPhotoSrc(URL.createObjectURL(blob)))
      .catch(() => setPhotoSrc(''));
  }, [member.passportPhotoFile]);

  useEffect(() => {
    // Match Members.tsx buildQRPayload exactly — _id is required for attendance check-in
    const raw: Record<string, string | undefined> = {
      _id:        member._id,
      fullName:   member.fullName,
      email:      member.email,
      phone:      member.phone,
      institution:member.institution,
      membership: member.membership,
      campus:     member.campus,
      program:    member.program,
      level:      member.level,
      yearOfStudy:member.yearOfStudy,
      role:       member.role,
      accountType:member.accountType,
      verificationStatus: member.verificationStatus,
    };
    // Strip undefined/empty — keeps QR compact and scannable
    (Object.keys(raw) as (keyof typeof raw)[]).forEach(k => {
      if (raw[k] === undefined || raw[k] === '') delete raw[k];
    });
    // Encode raw payload directly — no extra keys, matches Members.tsx buildQRPayload exactly
    buildQRDataUrl(JSON.stringify(raw), 200).then(setQrUrl).catch(() => setQrUrl(''));
  }, [member]);

  useEffect(() => {
    const el = scaleRef.current;
    if (!el) return;
    const resize = () => {
      const avail  = (el.parentElement?.clientWidth ?? 900) - 48;
      const needed = CW * 2 + 24;
      const scale  = Math.min(1, avail / needed);
      el.style.transform       = `scale(${scale})`;
      el.style.transformOrigin = 'top center';
      el.style.marginBottom    = `${CH * (scale - 1)}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!qrUrl) { alert('QR is still generating, please wait a moment.'); return; }
    setDownloading(true);
    try {
      const qrImg = await loadImg(qrUrl);
      let photoImg: HTMLImageElement | null = null;
      if (photoSrc) { try { photoImg = await loadImg(photoSrc); } catch { photoImg = null; } }

      // ── 3× DPI scale for crisp, print-ready HD output ─────────────────
      const DPI   = 3;
      const gap   = 40, pad = 50;
      const logW  = CW * 2 + gap + pad * 2;
      const logH  = CH + pad * 2;
      const out   = document.createElement('canvas');
      out.width   = logW  * DPI;
      out.height  = logH  * DPI;
      const ctx   = out.getContext('2d')!;
      ctx.scale(DPI, DPI);          // all drawCard coords stay the same

      // Soft gradient background
      const bg = ctx.createLinearGradient(0, 0, 0, logH);
      bg.addColorStop(0, '#D8D0E8'); bg.addColorStop(1, '#C0B8D4');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, logW, logH);

      await drawCard(ctx, pad,            pad, CW, CH, 'front', member, photoImg, qrImg);
      await drawCard(ctx, pad + CW + gap, pad, CW, CH, 'back',  member, photoImg, qrImg);

      const a = document.createElement('a');
      a.download = `CITT-ID-${member.fullName.replace(/\s+/g, '-')}.png`;
      a.href = out.toDataURL('image/png', 1.0);
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (err: any) {
      alert('Download failed: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  }, [member, photoSrc, qrUrl]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,4,22,0.93)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 16, backdropFilter: 'blur(10px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: `linear-gradient(160deg, #120828 0%, #0A0418 100%)`,
        borderRadius: 28, padding: '26px 30px 20px',
        width: '98vw', maxWidth: 1460,
        boxShadow: `0 48px 120px rgba(0,0,0,0.9), 0 0 0 1px ${GOLD3}`,
        border: `1px solid rgba(156,128,198,0.2)`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, color: GOLD2, fontFamily: 'Georgia,serif', fontSize: 21, letterSpacing: 1 }}>
              MUST · CITT Identity Card
            </h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>{member.fullName}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(156,128,198,0.1)', border: `1px solid ${GOLD3}`,
            color: '#9ca3af', width: 38, height: 38, borderRadius: '50%',
            fontSize: 20, cursor: 'pointer', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Cards */}
        <div style={{ background: '#D0C8E0', borderRadius: 18, padding: '28px 24px', overflowX: 'auto' }}>
          <div ref={scaleRef} style={{ display: 'flex', gap: 24, width: 'fit-content' }}>
            <CardFrontPreview member={member} photoSrc={photoSrc} qrUrl={qrUrl} />
            <CardBackPreview />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 22 }}>
          <button onClick={handleDownload} disabled={downloading || !qrUrl} style={{
            padding: '13px 38px',
            background: `linear-gradient(135deg, ${GOLD3}, ${GOLD2}, ${GOLD})`,
            color: '#1A0E00', border: 'none', borderRadius: 12,
            fontWeight: 800, fontSize: 15,
            cursor: (downloading || !qrUrl) ? 'wait' : 'pointer',
            letterSpacing: 0.5,
            boxShadow: `0 4px 24px rgba(201,168,76,0.5)`,
            opacity: (downloading || !qrUrl) ? 0.65 : 1,
            transition: 'opacity 0.2s',
          }}>
            {downloading ? '⏳ Preparing…' : !qrUrl ? '⏳ Generating QR…' : '⬇  Download ID Card'}
          </button>
          <button onClick={onClose} style={{
            padding: '13px 28px', background: 'transparent',
            border: `1px solid rgba(201,168,76,0.3)`,
            color: 'rgba(255,255,255,0.5)', borderRadius: 12,
            fontWeight: 600, fontSize: 15, cursor: 'pointer',
          }}>Close</button>
        </div>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, margin: '12px 0 0' }}>
          CR80 standard · 86 × 54 mm · Print at 100% scale on PVC card stock
        </p>
      </div>
    </div>
  );
};

export default IDCard;