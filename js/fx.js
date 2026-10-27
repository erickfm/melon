/**
 * Merge effects: paper confetti, pop rings, floating score text, screen shake.
 */

import { TIERS } from './items.js';
import { TAU } from './paper.js';

export const fx = { parts: [], rings: [], pops: [], shake: 0 };

export function clearFx() {
  fx.parts.length = fx.rings.length = fx.pops.length = 0;
  fx.shake = 0;
}

export function mergeFx(x, y, tier, big = false) {
  const t = TIERS[tier], R = t.r;
  const n = big ? 70 : 8 + tier * 3;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = 60 + Math.random() * (120 + R * 3) * (big ? 1.6 : 1);
    const color = big ? TIERS[(Math.random() * TIERS.length) | 0].color : Math.random() < 0.25 ? '#fbf5e6' : t.color;
    fx.parts.push({
      x: x + Math.cos(a) * R * 0.5, y: y + Math.sin(a) * R * 0.5,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
      rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14,
      w: 3 + Math.random() * 4 + tier * 0.4, h: 2 + Math.random() * 3,
      color, life: 0, max: 0.6 + Math.random() * 0.5 + (big ? 0.6 : 0),
    });
  }
  fx.rings.push({ x, y, r: R * 0.6, R: R * (big ? 2.2 : 1.35), life: 0, max: big ? 0.6 : 0.35, color: t.color });
  if (big) fx.shake = 9;
  else if (tier >= 6) fx.shake = Math.max(fx.shake, 2 + (tier - 6) * 1.5);
}

export function popup(x, y, text, size = 18, color = '#4a3426') {
  fx.pops.push({ x, y, text, size, color, life: 0, max: 0.9 });
}

export function updateFx(dt) {
  for (const p of fx.parts) {
    p.life += dt;
    p.vx *= 1 - 2.5 * dt;
    p.vy = p.vy * (1 - 2.5 * dt) + 700 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
  for (const r of fx.rings) r.life += dt;
  for (const p of fx.pops) { p.life += dt; p.y -= 38 * dt; }
  fx.parts = fx.parts.filter(p => p.life < p.max);
  fx.rings = fx.rings.filter(r => r.life < r.max);
  fx.pops = fx.pops.filter(p => p.life < p.max);
  fx.shake = Math.max(0, fx.shake - dt * 30);
}

export function drawFx(ctx, font) {
  for (const r of fx.rings) {
    const t = r.life / r.max;
    ctx.globalAlpha = (1 - t) * 0.8;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r + (r.R - r.r) * (1 - (1 - t) ** 3), 0, TAU);
    ctx.stroke();
  }
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.min(1, (1 - p.life / p.max) * 2);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = 'rgba(50,30,10,0.2)';
    ctx.fillRect(-p.w / 2 + 0.8, -p.h / 2 + 1.2, p.w, p.h);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const p of fx.pops) {
    const t = p.life / p.max;
    ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
    const s = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1;
    ctx.font = font(p.size * s);
    ctx.lineWidth = p.size * 0.28;
    ctx.strokeStyle = '#fbf5e6';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}
