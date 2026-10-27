/**
 * Effects: tier-themed bits (petals, leaves, seeds), sparkles, flashes,
 * shock rings, background pulses, floating text, banners, ambient pollen,
 * screen shake and camera zoom kicks.
 */

import { TIERS } from './items.js';
import { TAU } from './paper.js';
import { WORLD_W, WORLD_H } from './constants.js';

export const fx = { parts: [], rings: [], pops: [], flashes: [], pulses: [], banners: [], motes: [], shake: 0, zoom: 0, zoomV: 0, whiteout: 0 };

// What flies out of each tier when it's made: [shape, colors]
const BITS = [
  ['seed', ['#8d5b38', '#b5814f']],
  ['leaf', ['#6dbb4c', '#8fd070', '#ead49c']],
  ['leaf', ['#5fb04f', '#6bbb57', '#8fd070']],
  ['petal', ['#fffaf0', '#f2e8d4', '#f4c430']],
  ['petal', ['#dc4a55', '#e25c66', '#b82d39']],
  ['petal', ['#f6884a', '#ec6629', '#2b2530']],
  ['petal', ['#f7c948', '#eba52a', '#6b4423']],
  ['leaf', ['#9dd176', '#7cb658', '#cdeaa6']],
  ['chunk', ['#ec8d34', '#f19e48', '#f6e7c8']],
  ['confetti', TIERS.map(t => t.color)],
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

export function clearFx() {
  for (const k of ['parts', 'rings', 'pops', 'flashes', 'pulses', 'banners']) fx[k].length = 0;
  fx.shake = fx.zoom = fx.zoomV = fx.whiteout = 0;
}

export function initMotes() {
  fx.motes = Array.from({ length: 34 }, () => ({
    x: rand(0, WORLD_W), y: rand(0, WORLD_H), vx: 0, vy: 0,
    r: rand(0.8, 2.4), ph: rand(0, TAU), sp: rand(6, 16),
  }));
}

export function mergeFx(x, y, tier, { combo = 1, fever = false, big = false } = {}) {
  const t = TIERS[tier], R = t.r;
  const [shape, colors] = BITS[tier];
  const mult = (fever ? 1.6 : 1) * (1 + Math.min(combo - 1, 6) * 0.15);
  const n = Math.round((big ? 90 : 10 + tier * 3.5) * mult);
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(70, 150 + R * 3.2) * (big ? 1.7 : 1);
    const sz = rand(0.7, 1.2) * (4 + tier * 0.55) * (big ? 1.4 : 1);
    fx.parts.push({
      shape: big ? pick(['confetti', 'petal', 'leaf']) : shape,
      x: x + Math.cos(a) * R * 0.45, y: y + Math.sin(a) * R * 0.45,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(60, 140),
      rot: rand(0, TAU), vr: rand(-10, 10), ph: rand(0, TAU),
      w: sz, h: sz * rand(0.45, 0.65),
      color: big ? pick(TIERS).color : Math.random() < 0.18 ? '#fbf5e6' : pick(colors),
      life: 0, max: rand(0.7, 1.3) + (big ? 0.8 : 0),
    });
  }
  // sparkles
  const ns = Math.round((4 + tier) * mult * (big ? 4 : 1));
  for (let i = 0; i < ns; i++) {
    const a = rand(0, TAU), d = rand(0.3, 1.3) * R;
    fx.parts.push({
      shape: 'star', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(20, 60), vy: Math.sin(a) * rand(20, 60) - 30,
      rot: rand(0, TAU), vr: rand(-3, 3), w: rand(3, 6) + tier * 0.4, h: 0,
      color: fever ? `hsl(${rand(0, 360)},95%,70%)` : '#fff6c8', life: 0, max: rand(0.4, 0.8),
    });
  }
  fx.rings.push({ x, y, r: R * 0.6, R: R * (big ? 2.6 : 1.5), life: 0, max: big ? 0.6 : 0.4, color: t.color, w: 5 + tier * 0.6 });
  if (tier >= 4 || combo >= 3) fx.rings.push({ x, y, r: R * 0.3, R: R * 2.2, life: -0.06, max: 0.5, color: '#fbf5e6', w: 3 });
  fx.flashes.push({ x, y, r: R * (big ? 3 : 1.7), life: 0, max: big ? 0.35 : 0.16 + tier * 0.012 });
  fx.pulses.push({ x, y, color: t.color, life: 0, max: 0.9 + tier * 0.06, R: 120 + tier * 45 });

  fx.shake = Math.max(fx.shake, big ? 12 : tier >= 5 ? 1.5 + (tier - 5) * 1.6 : combo >= 3 ? 1.2 : 0);
  if (tier >= 5 || big) fx.zoomV += big ? 0.6 : 0.08 + (tier - 5) * 0.06;
  if (big) fx.whiteout = 1;

  for (const m of fx.motes) {
    const dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy) || 1, reach = R * 4;
    if (d < reach) { const f = (1 - d / reach) * (200 + tier * 30); m.vx += (dx / d) * f; m.vy += (dy / d) * f; }
  }
}

// Small dust puff where something lands hard.
export function landFx(x, y, nx, ny, r, intensity) {
  const n = Math.round(2 + intensity * 5);
  for (let i = 0; i < n; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    fx.parts.push({
      shape: 'dust', x: x + nx * r, y: y + ny * r,
      vx: -ny * side * rand(30, 90) - nx * 20, vy: nx * side * rand(30, 90) - ny * 20 - 20,
      rot: 0, vr: 0, w: rand(1.5, 3.5), h: 0, color: 'rgba(250,240,215,0.8)', life: 0, max: rand(0.25, 0.45),
    });
  }
}

// Confetti falling from the top of the screen.
export function rain(count, colors) {
  for (let i = 0; i < count; i++) {
    fx.parts.push({
      shape: pick(['confetti', 'petal', 'leaf']), x: rand(0, WORLD_W), y: rand(-200, -10),
      vx: rand(-30, 30), vy: rand(60, 200), rot: rand(0, TAU), vr: rand(-8, 8), ph: rand(0, TAU),
      w: rand(5, 10), h: rand(3, 5), color: pick(colors), life: 0, max: rand(2.5, 4), float: true,
    });
  }
}

export function popup(x, y, text, size = 18, color = '#4a3426') {
  fx.pops.push({ x, y, text, size, color, life: 0, max: 0.9 });
}

export function banner(text, size, color, y = 300, max = 1.1) {
  fx.banners = fx.banners.filter(b => b.y !== y);
  fx.banners.push({ text, size, color, y, life: 0, max, tilt: rand(-0.08, 0.08) });
}

export function updateFx(dt) {
  for (const p of fx.parts) {
    p.life += dt;
    const flutter = p.shape === 'petal' || p.shape === 'leaf' || p.shape === 'confetti';
    const drag = p.float ? 0.6 : flutter ? 3.2 : p.shape === 'dust' ? 5 : 2.2;
    p.vx *= 1 - drag * dt;
    p.vy = p.vy * (1 - drag * dt) + (p.shape === 'star' ? 40 : p.shape === 'dust' ? -20 : flutter ? 260 : 650) * dt;
    if (flutter) p.vx += Math.sin(p.life * 7 + p.ph) * 120 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (const r of fx.rings) r.life += dt;
  for (const f of fx.flashes) f.life += dt;
  for (const p of fx.pulses) p.life += dt;
  for (const b of fx.banners) b.life += dt;
  for (const p of fx.pops) { p.life += dt; p.y -= 42 * dt; }
  fx.parts = fx.parts.filter(p => p.life < p.max && p.y < WORLD_H + 40);
  fx.rings = fx.rings.filter(r => r.life < r.max);
  fx.flashes = fx.flashes.filter(f => f.life < f.max);
  fx.pulses = fx.pulses.filter(p => p.life < p.max);
  fx.banners = fx.banners.filter(b => b.life < b.max);
  fx.pops = fx.pops.filter(p => p.life < p.max);
  fx.shake = Math.max(0, fx.shake - dt * 28);
  fx.whiteout = Math.max(0, fx.whiteout - dt * 2.2);
  // camera zoom spring
  fx.zoomV += (-fx.zoom * 140 - fx.zoomV * 12) * dt;
  fx.zoom += fx.zoomV * dt;

  for (const m of fx.motes) {
    m.vx *= 1 - 2 * dt;
    m.vy *= 1 - 2 * dt;
    m.x += (m.vx + Math.sin(m.ph + m.y * 0.02) * 6) * dt;
    m.y += (m.vy - m.sp) * dt;
    if (m.y < -10) { m.y = WORLD_H + 10; m.x = rand(0, WORLD_W); }
    if (m.x < -10) m.x = WORLD_W + 10;
    if (m.x > WORLD_W + 10) m.x = -10;
  }
}

// Behind the jar: color pulses and pollen.
export function drawBackFx(ctx, fever, time, beat) {
  for (const p of fx.pulses) {
    const t = p.life / p.max, r = p.R * (0.3 + 0.7 * (1 - (1 - t) ** 3));
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.8, hexA(p.color, 0.22 * (1 - t)));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
  for (const m of fx.motes) {
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + m.ph);
    ctx.fillStyle = fever ? `hsla(${(m.ph * 57 + time * 120) % 360},90%,70%,${0.4 + tw * 0.5})` : `rgba(255,250,225,${0.35 + tw * 0.45})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * (1 + (1 - beat) ** 4 * 0.6), 0, TAU);
    ctx.fill();
  }
}

export function drawFx(ctx, font) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of fx.flashes) {
    const t = f.life / f.max, r = f.r * (0.6 + t * 0.6);
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
    g.addColorStop(0, `rgba(255,250,230,${0.9 * (1 - t)})`);
    g.addColorStop(0.4, `rgba(255,235,190,${0.45 * (1 - t)})`);
    g.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
  }
  ctx.restore();

  for (const r of fx.rings) {
    if (r.life < 0) continue;
    const t = r.life / r.max;
    ctx.globalAlpha = (1 - t) * 0.85;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.w * (1 - t) + 0.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + (r.R - r.r) * (1 - (1 - t) ** 3), 0, TAU);
    ctx.stroke();
  }

  for (const p of fx.parts) {
    const fade = Math.min(1, (1 - p.life / p.max) * 2.5);
    if (p.shape === 'star') { drawStar(ctx, p, fade); continue; }
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.shape === 'dust') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.w * (1 + p.life * 3), 0, TAU);
      ctx.fill();
    } else {
      // flutter: squash width to fake a 3D flip
      const flip = p.shape === 'seed' || p.shape === 'chunk' ? 1 : Math.cos(p.life * 9 + p.ph);
      ctx.scale(1, Math.abs(flip) * 0.8 + 0.2);
      shapePath(ctx, p.shape, p.w, p.h);
      ctx.fillStyle = 'rgba(50,30,10,0.2)';
      ctx.save();
      ctx.translate(0.8, 1.2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const p of fx.pops) {
    const t = p.life / p.max;
    ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
    const s = t < 0.12 ? 0.5 + (t / 0.12) * 0.7 : t < 0.22 ? 1.2 - ((t - 0.12) / 0.1) * 0.2 : 1;
    outlined(ctx, font, p.text, p.x, p.y, p.size * s, p.color);
  }
  ctx.globalAlpha = 1;
}

// Big centered text (combo, fever), drawn above everything in world space.
export function drawBanners(ctx, font, time) {
  for (const b of fx.banners) {
    const t = b.life / b.max;
    const s = t < 0.15 ? 0.3 + (t / 0.15) * 0.9 : t < 0.25 ? 1.2 - ((t - 0.15) / 0.1) * 0.2 : 1;
    ctx.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
    ctx.save();
    ctx.translate(WORLD_W / 2, b.y - t * 20);
    ctx.rotate(b.tilt + Math.sin(time * 9) * 0.02);
    ctx.scale(s, s);
    const color = b.color === 'rainbow' ? `hsl(${(time * 400) % 360},90%,55%)` : b.color;
    outlined(ctx, font, b.text, 0, 0, b.size, color, true);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function outlined(ctx, font, text, x, y, size, color, heavy = false) {
  ctx.font = font(size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (heavy) {
    ctx.fillStyle = 'rgba(50,30,10,0.25)';
    ctx.fillText(text, x + 2, y + 3);
  }
  ctx.lineWidth = size * (heavy ? 0.32 : 0.28);
  ctx.strokeStyle = '#fbf5e6';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function shapePath(ctx, shape, w, h) {
  ctx.beginPath();
  if (shape === 'petal') {
    ctx.ellipse(0, 0, w * 0.6, h * 0.6, 0, 0, TAU);
  } else if (shape === 'leaf') {
    ctx.moveTo(-w * 0.6, 0);
    ctx.quadraticCurveTo(0, -h * 0.9, w * 0.6, 0);
    ctx.quadraticCurveTo(0, h * 0.9, -w * 0.6, 0);
  } else if (shape === 'seed') {
    ctx.ellipse(0, 0, w * 0.4, h * 0.45, 0, 0, TAU);
  } else if (shape === 'chunk') {
    ctx.moveTo(-w * 0.5, -h * 0.4);
    ctx.lineTo(w * 0.45, -h * 0.55);
    ctx.lineTo(w * 0.3, h * 0.5);
    ctx.lineTo(-w * 0.4, h * 0.35);
    ctx.closePath();
  } else {
    ctx.rect(-w / 2, -h / 2, w, h);
  }
}

function drawStar(ctx, p, fade) {
  const tw = 0.6 + 0.4 * Math.sin(p.life * 30);
  const s = p.w * tw * (p.life < 0.1 ? p.life / 0.1 : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = fade;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.22, Math.sin(a + Math.PI / 4) * s * 0.22);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

