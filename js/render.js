/**
 * Canvas setup and drawing: letterboxed world transform (DPR capped at 2),
 * sprite cache, jar, held item, effects, HUD.
 */

import { WORLD_W, WORLD_H, JAR, DANGER_Y, DROP_Y, NEXT, BUTTONS, CHAIN_Y } from './constants.js';
import { TIERS, buildSprite } from './items.js';
import { TAU, mulberry32, rectPts, tracePoly, getGrain } from './paper.js';
import { fx, drawFx } from './fx.js';

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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const k = view.scale * view.dpr;
  const sx = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
  const sy = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
  ctx.setTransform(k, 0, 0, k, (view.ox + sx * view.scale) * view.dpr, (view.oy + sy * view.scale) * view.dpr);

  drawJarBack();
  if (s.phase === 'play' && s.current !== null) drawGuide(s);
  drawBodies(s.bodies);
  drawJarFront();
  drawDanger(s);
  if (s.current !== null && s.phase === 'play') drawHeld(s);
  if (!s.dropped && s.phase === 'play') {
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(s.time * 3);
    text('drag to aim, let go to drop', WORLD_W / 2, 440, 20, 'center', INK);
    ctx.globalAlpha = 1;
  }
  drawFx(ctx, font);
  drawHud(s);
}

export function drawItem(tier, x, y, angle = 0, scale = 1) {
  const sp = sprites[tier], w = sp.size / sp.ppu;
  ctx.save();
  ctx.translate(x, y);
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

function drawJarBack() {
  tracePoly(ctx, jar.back);
  ctx.fillStyle = 'rgba(160,110,60,0.13)';
  ctx.fill();
}

function drawJarFront() {
  cutout(jar.left, '#c08f58');
  cutout(jar.right, '#c08f58');
  cutout(jar.floor, '#b5834d');
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

function drawBodies(bodies) {
  ctx.beginPath();
  for (const b of bodies) {
    ctx.moveTo(b.x + 1.5 + b.r, b.y + 3);
    ctx.arc(b.x + 1.5, b.y + 3, b.r, 0, TAU);
  }
  ctx.fillStyle = SHADOW;
  ctx.fill();
  for (const b of bodies) drawItem(b.tier, b.x, b.y, b.angle, b.r / b.R);
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
  const r = TIERS[s.current].r, x = s.heldX;
  ctx.strokeStyle = 'rgba(74,52,38,0.22)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.moveTo(x, DROP_Y + r + 4);
  ctx.lineTo(x, surfaceY(x, s.bodies));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawHeld(s) {
  const t = Math.min(1, s.appearT / 0.18);
  const scale = t < 1 ? 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2 : 1;
  const r = TIERS[s.current].r;
  ctx.beginPath();
  ctx.arc(s.heldX + 1.5, DROP_Y + 3, r * scale, 0, TAU);
  ctx.fillStyle = SHADOW;
  ctx.fill();
  drawItem(s.current, s.heldX, DROP_Y, s.hangAngle, scale);
}

function drawDanger(s) {
  let a = 0.22 + 0.5 * s.near;
  if (s.overflow > 0) a = 0.55 + 0.45 * Math.sin(s.time * 18);
  ctx.strokeStyle = `rgba(205,70,60,${a})`;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  ctx.moveTo(JAR.left + 2, DANGER_Y);
  ctx.lineTo(JAR.right - 2, DANGER_Y);
  ctx.stroke();
  ctx.setLineDash([]);
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

function drawHud(s) {
  text('score', 28, 30, 17, 'left', INK_SOFT);
  text(String(Math.round(s.shownScore)), 26, 70, 42);
  text('best ' + Math.max(s.best, s.score), 28, 94, 17, 'left', INK_SOFT);

  text('next', NEXT.x, 30, 17, 'center', INK_SOFT);
  paperDisc(NEXT.x, NEXT.y, NEXT.r);
  drawItem(s.next, NEXT.x, NEXT.y, 0, Math.min(1, 19 / TIERS[s.next].r));

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
      drawItem(i, cx, CHAIN_Y, 0, ir / t.r);
    } else {
      ctx.beginPath();
      ctx.arc(cx, CHAIN_Y, ir, 0, TAU);
      ctx.fillStyle = 'rgba(74,52,38,0.14)';
      ctx.fill();
      text('?', cx, CHAIN_Y + 5, 15, 'center', 'rgba(74,52,38,0.4)');
    }
  });
}
