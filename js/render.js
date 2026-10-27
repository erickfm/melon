/**
 * Canvas setup and drawing: letterboxed world transform (DPR capped at 2),
 * sprite cache, camera (shake + zoom kicks), beat-synced background, jar,
 * squashing bodies with motion trails, held item, effects, HUD.
 */

import { WORLD_W, WORLD_H, JAR, DANGER_Y, DROP_Y, NEXT, BUTTONS, CHAIN_Y } from './constants.js';
import { TIERS, buildSprite } from './items.js';
import { TAU, mulberry32, rectPts, tracePoly, getGrain } from './paper.js';
import { fx, drawFx, drawBackFx, drawBanners } from './fx.js';
import { beatPhase } from './audio.js';

const BG = '#efe2c3';
const INK = '#4a3426';
const INK_SOFT = 'rgba(74,52,38,0.6)';
const PAPER = '#fbf5e6';
const SHADOW = 'rgba(60,35,15,0.22)';

export const view = { cssW: 0, cssH: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
let canvas, ctx, sprites = [], grainPattern = null, jar = null;

export const font = size => `700 ${size}px Gaegu, 'Comic Sans MS', sans-serif`;

export function initRender(c) {
  canvas = c;
  ctx = c.getContext('2d');
  const rng = mulberry32(42), W = 14;
  const { left: L, right: R, top: T, bottom: B } = JAR;
  jar = {
    back: rectPts(rng, L, T - 4, R - L, B - T + 4, 16, 0.8),
    left: rectPts(rng, L - W, T - 12, W, B - T + 12, 12, 0.9),
    right: rectPts(rng, R, T - 12, W, B - T + 12, 12, 0.9),
    floor: rectPts(rng, L - W - 3, B, R - L + 2 * W + 6, W, 12, 0.9),
    strip: rectPts(rng, L - 4, CHAIN_Y - 19, R - L + 8, 38, 14, 0.7),
  };
  resize();
}

export function resize() {
  view.dpr = Math.min(2, window.devicePixelRatio || 1);
  view.cssW = window.innerWidth;
  view.cssH = window.innerHeight;
  canvas.width = Math.round(view.cssW * view.dpr);
  canvas.height = Math.round(view.cssH * view.dpr);
  canvas.style.width = view.cssW + 'px';
  canvas.style.height = view.cssH + 'px';
  view.scale = Math.min(view.cssW / WORLD_W, view.cssH / WORLD_H);
  view.ox = (view.cssW - WORLD_W * view.scale) / 2;
  view.oy = (view.cssH - WORLD_H * view.scale) / 2;
  const ppu = view.scale * view.dpr;
  sprites = TIERS.map((_, i) => buildSprite(i, ppu));
  grainPattern = ctx.createPattern(getGrain(), 'repeat');
}

export function toWorld(clientX, clientY) {
  return { x: (clientX - view.ox) / view.scale, y: (clientY - view.oy) / view.scale };
}

export function render(s) {
  const beat = beatPhase();
  const pump = (1 - beat) ** 3;  // spikes on each beat

  // --- screen space background ---
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height * 0.45, big = Math.max(canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, big * 0.75);
  if (s.fever) {
    const h = (s.time * 90) % 360;
    glow.addColorStop(0, `hsla(${h},95%,75%,${0.45 + pump * 0.25})`);
    glow.addColorStop(0.5, `hsla(${(h + 60) % 360},90%,70%,0.3)`);
    glow.addColorStop(1, `hsla(${(h + 140) % 360},85%,60%,0.35)`);
  } else {
    glow.addColorStop(0, `rgba(255,248,225,${0.35 + pump * 0.18})`);
    glow.addColorStop(1, 'rgba(200,160,110,0.18)');
  }
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- camera: letterbox, shake, zoom kick around the jar ---
  const k = view.scale * view.dpr;
  const shake = fx.shake + (s.overflow > 0 ? 1.2 : 0);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  const z = 1 + fx.zoom + (s.fever ? pump * 0.006 : 0);
  const fx0 = WORLD_W / 2, fy0 = (JAR.top + JAR.bottom) / 2;
  ctx.setTransform(k * z, 0, 0, k * z,
    (view.ox + (sx + fx0 - fx0 * z) * view.scale) * view.dpr,
    (view.oy + (sy + fy0 - fy0 * z) * view.scale) * view.dpr);

  drawBackFx(ctx, s.fever, s.time, beat);
  drawJarBack(s, pump);
  if (s.phase === 'play' && s.current !== null) drawGuide(s);
  drawBodies(s);
  drawJarFront(s, pump);
  drawDanger(s);
  if (s.current !== null && s.phase === 'play') drawHeld(s, pump);
  if (!s.dropped && s.phase === 'play') {
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(s.time * 3);
    text('drag to aim, let go to drop', WORLD_W / 2, 440, 20, 'center', INK);
    ctx.globalAlpha = 1;
  }
  drawFx(ctx, font);
  drawHud(s, pump);
  drawBanners(ctx, font, s.time);

  // --- screen space overlays ---
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (s.near > 0.35 && s.phase === 'play') {
    const a = (s.near - 0.35) / 0.65 * (0.25 + 0.2 * Math.sin(s.time * (s.overflow > 0 ? 14 : 5)) ** 2) + (s.overflow > 0 ? 0.15 : 0);
    const v = ctx.createRadialGradient(cx, canvas.height / 2, big * 0.3, cx, canvas.height / 2, big * 0.75);
    v.addColorStop(0, 'rgba(200,40,40,0)');
    v.addColorStop(1, `rgba(200,40,40,${a})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (fx.whiteout > 0) {
    ctx.fillStyle = `rgba(255,252,240,${fx.whiteout ** 2 * 0.7})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// sq > 0 squashes along angle sqA (and bulges across it); sq < 0 stretches.
export function drawItem(tier, x, y, angle = 0, scale = 1, sq = 0, sqA = 0) {
  const sp = sprites[tier], w = sp.size / sp.ppu;
  ctx.save();
  ctx.translate(x, y);
  if (sq) {
    ctx.rotate(sqA);
    ctx.scale(1 - sq, 1 + sq * 0.8);
    ctx.rotate(-sqA);
  }
  if (angle) ctx.rotate(angle);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.drawImage(sp.canvas, -w / 2, -w / 2, w, w);
  ctx.restore();
}

function text(str, x, y, size, align = 'left', color = INK) {
  ctx.font = font(size);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function cutout(pts, color, dx = 2, dy = 3) {
  ctx.save();
  ctx.translate(dx, dy);
  tracePoly(ctx, pts);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.restore();
  tracePoly(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawJarBack(s, pump) {
  tracePoly(ctx, jar.back);
  ctx.fillStyle = s.fever ? `rgba(255,255,255,${0.16 + pump * 0.12})` : 'rgba(160,110,60,0.13)';
  ctx.fill();
}

function drawJarFront(s, pump) {
  const wall = s.fever ? `hsl(${(s.time * 90 + 30) % 360},55%,${55 + pump * 12}%)` : '#c08f58';
  const floor = s.fever ? `hsl(${(s.time * 90 + 50) % 360},50%,${50 + pump * 12}%)` : '#b5834d';
  cutout(jar.left, wall);
  cutout(jar.right, wall);
  cutout(jar.floor, floor);
  // corrugation dashes
  ctx.strokeStyle = 'rgba(120,80,40,0.35)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  for (const x of [JAR.left - 7, JAR.right + 7]) {
    ctx.moveTo(x, JAR.top - 4);
    ctx.lineTo(x, JAR.bottom - 2);
  }
  ctx.moveTo(JAR.left - 10, JAR.bottom + 7);
  ctx.lineTo(JAR.right + 10, JAR.bottom + 7);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBodies(s) {
  const bodies = s.bodies;
  ctx.beginPath();
  for (const b of bodies) {
    ctx.moveTo(b.x + 1.5 + b.r, b.y + 3);
    ctx.arc(b.x + 1.5, b.y + 3, b.r, 0, TAU);
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();
  // motion trails for fast movers
  for (const b of bodies) {
    const vx = b.x - b.px, vy = b.y - b.py, sp = Math.hypot(vx, vy);
    if (sp < 1.6) continue;
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.12 * (4 - i) * Math.min(1, (sp - 1.6) / 2);
      drawItem(b.tier, b.x - vx * i * 2.2, b.y - vy * i * 2.2, b.angle, b.r / b.R);
    }
  }
  ctx.globalAlpha = 1;
  for (const b of bodies) {
    // pieces above the line tremble while the overflow timer runs
    const tr = s.overflow > 0 && b.y - b.r < DANGER_Y + 10 ? (Math.random() - 0.5) * 2.4 : 0;
    drawItem(b.tier, b.x + tr, b.y, b.angle, b.r / b.R, b.sq, b.sqA);
  }
}

function surfaceY(x, bodies) {
  let y = JAR.bottom;
  for (const b of bodies) {
    const dx = x - b.x;
    if (Math.abs(dx) < b.r) {
      const top = b.y - Math.sqrt(b.r * b.r - dx * dx);
      if (top < y && top > DROP_Y) y = top;
    }
  }
  return y;
}

function drawGuide(s) {
  const r = TIERS[s.current].r, x = s.heldX, y1 = surfaceY(x, s.bodies);
  ctx.strokeStyle = s.fever ? `hsla(${(s.time * 200) % 360},80%,50%,0.5)` : 'rgba(74,52,38,0.22)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 7]);
  ctx.lineDashOffset = -s.time * 30;
  ctx.beginPath();
  ctx.moveTo(x, DROP_Y + r + 4);
  ctx.lineTo(x, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  // landing marker
  ctx.fillStyle = 'rgba(74,52,38,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y1, 6, 2.2, 0, 0, TAU);
  ctx.fill();
}

function drawHeld(s, pump) {
  const t = Math.min(1, s.appearT / 0.18);
  const pop = t < 1 ? 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2 : 1;
  const r = TIERS[s.current].r;
  const tremble = s.overflow > 0 ? (Math.random() - 0.5) * 2 : 0;
  const y = DROP_Y - pump * 2.5;
  ctx.beginPath();
  ctx.arc(s.heldX + 1.5, y + 3, r * pop, 0, TAU);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  // stretch sideways with aim speed
  const stretch = Math.max(-0.25, Math.min(0.25, s.heldVel * 0.0006));
  drawItem(s.current, s.heldX + tremble, y, s.hangAngle + s.heldTilt, pop, -Math.abs(stretch), 0);
}

function drawDanger(s) {
  let a = 0.22 + 0.5 * s.near;
  if (s.overflow > 0) a = 0.55 + 0.45 * Math.sin(s.time * 18);
  ctx.strokeStyle = `rgba(205,70,60,${a})`;
  ctx.lineWidth = 2.2 + (s.overflow > 0 ? 1.5 : 0);
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = s.overflow > 0 ? s.time * 60 : 0;
  ctx.beginPath();
  ctx.moveTo(JAR.left + 2, DANGER_Y);
  ctx.lineTo(JAR.right - 2, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function paperDisc(x, y, r) {
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2.5, r, 0, TAU);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = PAPER;
  ctx.fill();
}

function drawHud(s, pump) {
  text('score', 28, 30, 17, 'left', INK_SOFT);
  const punch = 1 + s.scorePunch * 0.35;
  ctx.save();
  ctx.translate(26, 70);
  ctx.scale(punch, punch);
  ctx.rotate(-s.scorePunch * 0.06);
  text(String(Math.round(s.shownScore)), 0, 0, 42, 'left', s.fever ? `hsl(${(s.time * 300) % 360},70%,40%)` : INK);
  ctx.restore();
  text('best ' + Math.max(s.best, s.score), 28, 94, 17, 'left', INK_SOFT);

  // combo + fever meters
  if (s.combo >= 2 && s.time - s.lastMerge < s.comboWindow) {
    const left = 1 - (s.time - s.lastMerge) / s.comboWindow;
    text('×' + s.comboMult.toFixed(1), 150, 64, 24 + pump * 3, 'left', '#c0453b');
    ctx.fillStyle = 'rgba(192,69,59,0.25)';
    ctx.fillRect(150, 72, 50, 4);
    ctx.fillStyle = '#c0453b';
    ctx.fillRect(150, 72, 50 * left, 4);
  }
  if (s.fever) {
    const left = s.feverT / s.feverMax;
    text('FEVER', 150, 100, 18, 'left', `hsl(${(s.time * 400) % 360},85%,48%)`);
    for (let i = 0; i < 20; i++) {
      if (i / 20 > left) break;
      ctx.fillStyle = `hsl(${(i * 18 + s.time * 300) % 360},85%,60%)`;
      ctx.fillRect(150 + i * 2.6, 104, 2.2, 4);
    }
  }

  text('next', NEXT.x, 30, 17, 'center', INK_SOFT);
  paperDisc(NEXT.x, NEXT.y, NEXT.r + pump * 1.2);
  drawItem(s.next, NEXT.x, NEXT.y, Math.sin(s.time * 2) * 0.1, Math.min(1, 19 / TIERS[s.next].r));

  const { mute, restart } = BUTTONS;
  paperDisc(mute.x, mute.y, mute.r);
  paperDisc(restart.x, restart.y, restart.r);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // restart: circular arrow
  ctx.beginPath();
  ctx.arc(restart.x, restart.y, 7.5, -0.35 * Math.PI, 1.3 * Math.PI);
  ctx.stroke();
  const ax = restart.x + 7.5 * Math.cos(-0.35 * Math.PI), ay = restart.y + 7.5 * Math.sin(-0.35 * Math.PI);
  ctx.beginPath();
  ctx.moveTo(ax - 5.5, ay - 2.5);
  ctx.lineTo(ax + 0.5, ay - 0.5);
  ctx.lineTo(ax - 1, ay + 5.5);
  ctx.stroke();
  // mute: speaker + waves or cross
  ctx.beginPath();
  ctx.moveTo(mute.x - 8, mute.y - 3);
  ctx.lineTo(mute.x - 4, mute.y - 3);
  ctx.lineTo(mute.x + 1, mute.y - 7.5);
  ctx.lineTo(mute.x + 1, mute.y + 7.5);
  ctx.lineTo(mute.x - 4, mute.y + 3);
  ctx.lineTo(mute.x - 8, mute.y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (s.muted) {
    ctx.moveTo(mute.x + 4, mute.y - 4); ctx.lineTo(mute.x + 10, mute.y + 4);
    ctx.moveTo(mute.x + 10, mute.y - 4); ctx.lineTo(mute.x + 4, mute.y + 4);
  } else {
    ctx.arc(mute.x + 2, mute.y, 5, -0.9, 0.9);
    ctx.moveTo(mute.x + 2 + 9 * Math.cos(-0.9), mute.y + 9 * Math.sin(-0.9));
    ctx.arc(mute.x + 2, mute.y, 9, -0.9, 0.9);
  }
  ctx.stroke();
  if (s.restartArmed > 0) text('tap again', restart.x - 4, restart.y + 36, 15, 'right', '#c0453b');

  // growth chain
  cutout(jar.strip, '#f6ead0', 1.5, 2.5);
  const step = (JAR.right - JAR.left) / TIERS.length;
  TIERS.forEach((t, i) => {
    const cx = JAR.left + step * (i + 0.5), ir = 7 + i * 0.95;
    if (i <= s.discovered) {
      const lit = s.chainFlash[i] || 0;
      const bob = i === s.biggest ? Math.sin(s.time * 4) * 1.5 : 0;
      drawItem(i, cx, CHAIN_Y + bob - lit * 6, lit * Math.sin(s.time * 30) * 0.3, (ir / t.r) * (1 + lit * 0.5));
    } else {
      ctx.beginPath();
      ctx.arc(cx, CHAIN_Y, ir, 0, TAU);
      ctx.fillStyle = 'rgba(74,52,38,0.14)';
      ctx.fill();
      text('?', cx, CHAIN_Y + 5, 15, 'center', 'rgba(74,52,38,0.4)');
    }
  });
}
