/**
 * M55 Cryptic Artifact Export (SSOT-safe)
 * - Generates an abstract "stone" image locally (no text, no personal log content)
 * - Shares via Web Share API when available, otherwise downloads
 * - No new in-app background assets; export is offscreen-rendered
 */

import { hSel, hWeight } from './m55_haptics_bridge.js';

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(buf));
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, r) {
  return arr[Math.floor(r() * arr.length)];
}

function aquaPalette() {
  // Aqua Insight family (hue range fixed; only depth changes)
  return [
    { a: [ 94, 234, 255 ], b: [ 26, 184, 205 ] },
    { a: [ 78, 220, 245 ], b: [ 22, 168, 196 ] },
    { a: [ 68, 206, 238 ], b: [ 18, 154, 182 ] }
  ];
}

function rgba([r,g,b], alpha) {
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawStone(ctx, r, size) {
  const cx = size / 2;
  const cy = size / 2;
  const pal = pick(aquaPalette(), r);

  // Background: transparent
  ctx.clearRect(0, 0, size, size);

  // Stone silhouette (soft polygon)
  const pts = [];
  const n = 12;
  const baseR = size * 0.30;
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n;
    const jitter = (r() - 0.5) * (size * 0.04);
    const rr = baseR + jitter;
    pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[(i - 1 + n) % n];
      const mx = (px + x) / 2;
      const my = (py + y) / 2;
      ctx.quadraticCurveTo(px, py, mx, my);
    }
  }
  ctx.closePath();
  ctx.clip();

  // Inner gradient
  const g = ctx.createRadialGradient(cx - size*0.06, cy - size*0.08, size*0.05, cx, cy, size*0.42);
  g.addColorStop(0, rgba(pal.a, 0.92));
  g.addColorStop(1, rgba(pal.b, 0.92));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Subtle inner refraction lines (static, no loops)
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = rgba([255,255,255], 0.9);
  for (let i = 0; i < 6; i++) {
    const y = cy + (r() - 0.5) * size * 0.22;
    const tilt = (r() - 0.5) * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - size*0.28, y);
    ctx.bezierCurveTo(cx - size*0.12, y + tilt*18, cx + size*0.12, y - tilt*18, cx + size*0.28, y);
    ctx.stroke();
  }

  // Speckles (mineral)
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 220; i++) {
    const x = cx + (r() - 0.5) * size * 0.66;
    const y = cy + (r() - 0.5) * size * 0.66;
    const rr = r() * 1.1;
    ctx.fillStyle = rgba([255,255,255], 0.9);
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Highlight edge
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = rgba([255,255,255], 0.8);
  ctx.lineWidth = 2.0;
  ctx.shadowColor = rgba([0,0,0], 0.35);
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

async function generateStonePngBlob({ seedText }) {
  const hex = await sha256Hex(seedText);
  const seed = parseInt(hex.slice(0, 8), 16) >>> 0;
  const r = mulberry32(seed);

  const size = 768;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { alpha: true });
  drawStone(ctx, r, size);

  return new Promise((resolve) => {
    c.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

async function tryShareFile(file) {
  const nav = navigator;
  if (!nav?.share || !nav?.canShare) return false;
  try {
    if (!nav.canShare({ files: [file] })) return false;
    await nav.share({ files: [file] });
    return true;
  } catch (e) {
    return false;
  }
}

async function onExportTap() {
  await hSel();
  await hWeight();

  const userHash = (globalThis.M55_USER_HASH && String(globalThis.M55_USER_HASH)) || '';
  const day = new Date().toISOString().slice(0, 10);
  const seedText = `M55_STONE_V1|${day}|${userHash}`;

  const blob = await generateStonePngBlob({ seedText });
  if (!blob) return;

  const file = new File([blob], `m55_stone_${day}.png`, { type: 'image/png' });
  const shared = await tryShareFile(file);
  if (!shared) downloadBlob(blob, file.name);
}

function mountIfPresent() {
  const btn = document.getElementById('artifact-export-btn');
  if (!btn) return;
  btn.addEventListener('click', onExportTap);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountIfPresent);
} else {
  mountIfPresent();
}
