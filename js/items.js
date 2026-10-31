/**
 * The growth chain (seed → melon) and its paper cutout sprites.
 * Each sprite is drawn once per resize into an offscreen canvas, in unit
 * space where the item's physics radius is 1.
 */

import { TAU, mulberry32, blob, ellipsePts, tracePts, getGrain } from './paper.js';

// Scalloped silhouette with `petals` bumps.
const flower = (petals, depth, phase = 0) => a => 1 - depth + depth * Math.abs(Math.cos((petals / 2) * a + phase));

export const TIERS = [
  { name: 'seed',      r: 13, points: 1,  color: '#8d5b38', draw: drawSeed },
  { name: 'sprout',    r: 18, points: 3,  color: '#6dbb4c', draw: drawSprout },
  { name: 'clover',    r: 24, points: 6,  color: '#5fb04f', draw: drawClover },
  { name: 'daisy',     r: 31, points: 10, color: '#f4c430', sil: flower(12, 0.1), draw: drawDaisy },
  { name: 'rose',      r: 38, points: 15, color: '#d23c48', draw: drawRose },
  { name: 'poppy',     r: 46, points: 21, color: '#ef6a2e', sil: flower(5, 0.1), draw: drawPoppy },
  { name: 'sunflower', r: 55, points: 28, color: '#f7c948', sil: flower(16, 0.08), draw: drawSunflower },
  { name: 'cabbage',   r: 65, points: 36, color: '#8fc56a', draw: drawCabbage },
  { name: 'pumpkin',   r: 77, points: 45, color: '#e9842a', draw: drawPumpkin },
  { name: 'melon',     r: 90, points: 55, color: '#c9b56b', draw: drawMelon },
];

const PAPER = '#fbf5e6';

export function buildSprite(tier, ppu, rimColor = PAPER) {
  const t = TIERS[tier];
  const Rpx = t.r * ppu;
  const pad = Math.ceil(Rpx * 0.14 + 2);
  const size = Math.ceil(Rpx * 2 + pad * 2);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.scale(Rpx, Rpx);

  const rng = mulberry32(911 + tier * 131);
  const p1 = rng() * TAU, p2 = rng() * TAU;
  const sil = t.sil || (() => 1);
  const shape = a => sil(a) * (1 + 0.012 * Math.sin(3 * a + p1) + 0.008 * Math.sin(5 * a + p2));
  const rim = Math.min(0.1, Math.max(0.035, 1.6 / t.r));
  const n = t.sil ? 120 : 44;

  // white paper margin left by the scissors, then the colored cutout
  fill(g, blob(rng, n, shape, 0.006), rimColor);
  t.draw(g, rng, blob(rng, n, a => shape(a) * (1 - rim), 0.006));

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.9;
  g.fillStyle = g.createPattern(getGrain(), 'repeat');
  g.fillRect(0, 0, size, size);
  return { canvas: c, size, ppu };
}

// --- drawing helpers (unit space) ---

function fill(ctx, pts, color) {
  tracePts(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
}

// A paper layer with a small drop shadow under it.
function piece(ctx, pts, color, sh = 0.035) {
  if (sh) {
    ctx.save();
    ctx.translate(sh * 0.5, sh);
    fill(ctx, pts, 'rgba(50,30,10,0.25)');
    ctx.restore();
  }
  fill(ctx, pts, color);
}

function circ(rng, cx, cy, r, jitter = 0.03, n = 22) {
  return ellipsePts(rng, cx, cy, r, r, 0, n, jitter);
}

function line(ctx, color, w, path) {
  ctx.beginPath();
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function clipTo(ctx, pts, fn) {
  ctx.save();
  tracePts(ctx, pts);
  ctx.clip();
  fn();
  ctx.restore();
}

function leafPts(bx, by, len, width, ang, n = 10) {
  const c = Math.cos(ang), s = Math.sin(ang), pts = [];
  const w = t => width * Math.sin(Math.PI * t) ** 0.8 * (1 - 0.3 * t);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([bx + c * len * t - s * w(t), by + s * len * t + c * w(t)]);
  }
  for (let i = n - 1; i > 0; i--) {
    const t = i / n;
    pts.push([bx + c * len * t + s * w(t), by + s * len * t - c * w(t)]);
  }
  return pts;
}

// Heart with its point aimed back along `ang` (toward the clover's center).
function heartPts(rng, cx, cy, size, ang, n = 32) {
  const rot = ang + Math.PI / 2, c = Math.cos(rot), s = Math.sin(rot), k = size / 17, pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, j = 1 + (rng() * 2 - 1) * 0.02;
    const x = 16 * Math.sin(t) ** 3 * k * j;
    const y = (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5) * k * j;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

function highlight(ctx, rng, x, y, rx, ry, alpha = 0.5) {
  fill(ctx, ellipsePts(rng, x, y, rx, ry, -0.75, 16, 0.04), `rgba(255,248,225,${alpha})`);
}

// --- tiers ---

function drawSeed(ctx, rng, body) {
  fill(ctx, body, '#8d5b38');
  piece(ctx, ellipsePts(rng, 0.2, 0.04, 0.2, 0.6, -0.35, 18), '#b5814f', 0.06);
  highlight(ctx, rng, -0.36, -0.38, 0.17, 0.1, 0.55);
}

function drawSprout(ctx, rng, body) {
  fill(ctx, body, '#ead49c');
  clipTo(ctx, body, () => piece(ctx, ellipsePts(rng, 0, 0.62, 1.05, 0.55, 0, 24), '#d2b26e', 0.05));
  line(ctx, '#4f9a3f', 0.13, () => { ctx.moveTo(0, 0.4); ctx.quadraticCurveTo(0.07, 0.1, 0, -0.1); });
  piece(ctx, leafPts(-0.02, -0.08, 0.72, 0.27, -Math.PI * 0.84), '#62b244', 0.06);
  piece(ctx, leafPts(0.02, -0.08, 0.72, 0.27, -Math.PI * 0.16), '#7cc95a', 0.06);
  line(ctx, 'rgba(220,245,190,0.7)', 0.035, () => {
    ctx.moveTo(-0.08, -0.13); ctx.lineTo(-0.5, -0.36);
    ctx.moveTo(0.08, -0.13); ctx.lineTo(0.5, -0.36);
  });
}

function drawClover(ctx, rng, body) {
  fill(ctx, body, '#2f6b34');
  const angles = [0, 1, 2, 3].map(i => Math.PI / 4 + (i * Math.PI) / 2);
  angles.forEach((a, i) => piece(ctx, heartPts(rng, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.46, a), i % 2 ? '#5fb04f' : '#6bbb57', 0.05));
  line(ctx, 'rgba(190,235,160,0.75)', 0.04, () => {
    for (const a of angles) {
      ctx.moveTo(Math.cos(a) * 0.12, Math.sin(a) * 0.12);
      ctx.lineTo(Math.cos(a) * 0.55, Math.sin(a) * 0.55);
    }
  });
  piece(ctx, circ(rng, 0, 0, 0.11), '#4a9442', 0.03);
}

function drawDaisy(ctx, rng, body) {
  fill(ctx, body, '#fffaf0');
  piece(ctx, blob(rng, 96, a => 0.7 * flower(12, 0.2, Math.PI / 2)(a), 0.01), '#f2e8d4', 0.03);
  line(ctx, '#e3d6bd', 0.035, () => {
    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      ctx.moveTo(Math.cos(a) * 0.44, Math.sin(a) * 0.44);
      ctx.lineTo(Math.cos(a) * 0.8, Math.sin(a) * 0.8);
    }
  });
  piece(ctx, circ(rng, 0, 0, 0.37), '#f4c430', 0.06);
  for (let i = 0; i < 14; i++) {
    const r = 0.26 * Math.sqrt((i + 0.5) / 14), a = i * 2.39996;
    fill(ctx, circ(rng, Math.cos(a) * r, Math.sin(a) * r, 0.04, 0.1, 8), '#d9981c');
  }
}

function drawRose(ctx, rng, body) {
  fill(ctx, body, '#c9343f');
  const layers = [[0.76, '#dc4a55'], [0.58, '#bf313d'], [0.42, '#e25c66'], [0.27, '#b82d39'], [0.13, '#e56b74']];
  let ox = 0, oy = 0;
  for (const [r, color] of layers) {
    ox += (rng() - 0.5) * 0.09;
    oy += (rng() - 0.5) * 0.09;
    piece(ctx, circ(rng, ox, oy, r, 0.06), color, 0.045);
  }
  line(ctx, 'rgba(140,25,40,0.55)', 0.035, () => {
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * TAU * 2.2, r = 0.08 + t * 0.6;
      i ? ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r) : ctx.moveTo(ox + r, oy);
    }
  });
  highlight(ctx, rng, -0.42, -0.44, 0.14, 0.08, 0.35);
}

function drawPoppy(ctx, rng, body) {
  fill(ctx, body, '#ec6629');
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    piece(ctx, ellipsePts(rng, Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.44, 0.34, a, 22), '#f6884a', 0.035);
  }
  line(ctx, 'rgba(200,70,20,0.6)', 0.03, () => {
    for (let i = 0; i < 5; i++) {
      for (const d of [-0.18, 0.18]) {
        const a = (i * TAU) / 5 + d;
        ctx.moveTo(Math.cos(a) * 0.34, Math.sin(a) * 0.34);
        ctx.lineTo(Math.cos(a) * 0.72, Math.sin(a) * 0.72);
      }
    }
  });
  for (let i = 0; i < 11; i++) {
    const a = (i * TAU) / 11 + rng() * 0.2, r = 0.33 + rng() * 0.04;
    fill(ctx, circ(rng, Math.cos(a) * r, Math.sin(a) * r, 0.045, 0.1, 8), '#3a3240');
  }
  piece(ctx, circ(rng, 0, 0, 0.26), '#2b2530', 0.05);
  line(ctx, '#7a7088', 0.03, () => {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 6;
      ctx.moveTo(Math.cos(a) * 0.17, Math.sin(a) * 0.17);
      ctx.lineTo(-Math.cos(a) * 0.17, -Math.sin(a) * 0.17);
    }
  });
}

function drawSunflower(ctx, rng, body) {
  fill(ctx, body, '#f7c948');
  piece(ctx, blob(rng, 120, a => 0.74 * flower(16, 0.18, Math.PI / 2)(a), 0.01), '#eba52a', 0.03);
  piece(ctx, circ(rng, 0, 0, 0.48, 0.03, 30), '#6b4423', 0.06);
  fill(ctx, circ(rng, 0, 0, 0.41, 0.03, 30), '#553419');
  for (let i = 0; i < 60; i++) {
    const r = 0.38 * Math.sqrt((i + 0.5) / 60), a = i * 2.39996;
    fill(ctx, circ(rng, Math.cos(a) * r, Math.sin(a) * r, 0.026, 0.1, 8), '#8f5e33');
  }
}

function drawCabbage(ctx, rng, body) {
  fill(ctx, body, '#6aa64a');
  clipTo(ctx, body, () => {
    for (let i = 0; i < 7; i++) {
      const a = (i * TAU) / 7;
      piece(ctx, circ(rng, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.5, 0.04, 26), i % 2 ? '#86bf62' : '#7cb658', 0.04);
    }
    line(ctx, 'rgba(225,245,200,0.55)', 0.028, () => {
      for (let i = 0; i < 7; i++) {
        const a = (i * TAU) / 7;
        ctx.moveTo(Math.cos(a) * 0.62, Math.sin(a) * 0.62);
        ctx.quadraticCurveTo(Math.cos(a + 0.12) * 0.8, Math.sin(a + 0.12) * 0.8, Math.cos(a + 0.08) * 0.98, Math.sin(a + 0.08) * 0.98);
      }
    });
  });
  piece(ctx, blob(rng, 60, a => 0.66 * flower(6, 0.12, 0.4)(a), 0.015), '#9dd176', 0.05);
  piece(ctx, blob(rng, 50, a => 0.44 * flower(5, 0.15, 1.1)(a), 0.02), '#b6de8c', 0.05);
  piece(ctx, circ(rng, -0.03, -0.02, 0.2, 0.06, 16), '#cdeaa6', 0.04);
  line(ctx, 'rgba(110,160,75,0.5)', 0.025, () => {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + 0.4;
      ctx.moveTo(Math.cos(a) * 0.46, Math.sin(a) * 0.46);
      ctx.lineTo(Math.cos(a) * 0.6, Math.sin(a) * 0.6);
    }
  });
  highlight(ctx, rng, -0.36, -0.4, 0.12, 0.07, 0.4);
}

function drawPumpkin(ctx, rng, body) {
  fill(ctx, body, '#de7620');
  clipTo(ctx, body, () => {
    piece(ctx, ellipsePts(rng, 0, 0.04, 0.8, 0.94, 0, 30, 0.015), '#ec8d34', 0.04);
    piece(ctx, ellipsePts(rng, 0, 0.04, 0.5, 0.96, 0, 30, 0.015), '#e27f22', 0.04);
    piece(ctx, ellipsePts(rng, 0, 0.04, 0.2, 0.97, 0, 26, 0.015), '#f19e48', 0.04);
  });
  const stem = [[-0.09, -0.72], [0.1, -0.74], [0.13, -0.96], [0.2, -1.04], [0.04, -1.06], [-0.07, -0.95]];
  piece(ctx, stem, '#6f7b30', 0.04);
  highlight(ctx, rng, -0.4, -0.46, 0.14, 0.08, 0.45);
}

function drawMelon(ctx, rng, body) {
  fill(ctx, body, '#cdb86c');
  clipTo(ctx, body, () => {
    for (const rx of [0.3, 0.64, 0.92]) {
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, 1.05, 0, 0, TAU);
      ctx.strokeStyle = 'rgba(115,135,55,0.4)';
      ctx.lineWidth = 0.06;
      ctx.stroke();
    }
    const step = 0.16, grid = [];
    for (let gy = -1.12; gy <= 1.12; gy += step) {
      const row = [];
      for (let gx = -1.12; gx <= 1.12; gx += step) row.push([gx + (rng() - 0.5) * step * 0.7, gy + (rng() - 0.5) * step * 0.7]);
      grid.push(row);
    }
    line(ctx, '#f1e7c0', 0.026, () => {
      grid.forEach((row, r) => row.forEach((p, c) => {
        if (row[c + 1]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(row[c + 1][0], row[c + 1][1]); }
        if (grid[r + 1]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(grid[r + 1][c][0], grid[r + 1][c][1]); }
      }));
    });
    fill(ctx, circ(rng, 0.3, 0.34, 0.95, 0.02, 30), 'rgba(90,75,25,0.12)');
    highlight(ctx, rng, -0.42, -0.45, 0.22, 0.12, 0.5);
  });
  line(ctx, '#7a6630', 0.09, () => { ctx.moveTo(0, -0.84); ctx.quadraticCurveTo(0.03, -0.96, 0.1, -1.02); });
  piece(ctx, leafPts(0.07, -0.92, 0.38, 0.13, -0.35), '#6aa84f', 0.03);
}
