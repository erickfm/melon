/**
 * Verlet circle physics: substepped integration, mass-weighted position
 * correction, contact friction, and a visual-only roll (spin) estimate.
 * Velocities are implicit (x - px) and measured per substep.
 */

import { JAR, GRAVITY, SUBSTEPS } from './constants.js';
import { TIERS } from './items.js';

const RESPONSE = 0.8;       // fraction of overlap resolved per pass
const FRICTION = 0.08;      // tangential damping between items
const WALL_FRICTION = 0.1;
const FLOOR_FRICTION = 0.12;
const SPIN_BLEND = 0.12;
const DAMP = 0.9998;
const MAX_V = 8;            // units per substep
const MAX_SEP = 0.6;        // cap on push-apart speed, so squeezed items can't get launched
const GROW_TIME = 0.16;     // seconds for a merged item to reach full size
const MERGE_SLOP = 0.5;     // same-tier items this close count as touching

export const bodies = [];

const easeOutBack = t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;

export function makeBody(tier, x, y, { r0, vx = 0, vy = 0, angle = 0 } = {}) {
  const R = TIERS[tier].r;
  const start = r0 ?? R;
  return {
    tier, x, y, px: x - vx, py: y - vy,
    r: start, r0: start, R, m: R * R, grow: start === R ? 1 : 0,
    angle, spin: 0, age: 0, dead: false,
  };
}

export function stepPhysics(dt, onMerge) {
  const h = dt / SUBSTEPS, g = GRAVITY * h * h;
  for (let s = 0; s < SUBSTEPS; s++) {
    integrate(h, g);
    for (let it = 0; it < 2; it++) {
      collide(onMerge);
      walls();
    }
    let k = 0;
    for (const b of bodies) if (!b.dead) bodies[k++] = b;
    bodies.length = k;
  }
  for (const b of bodies) b.age += dt;
}

function integrate(h, g) {
  for (const b of bodies) {
    let vx = (b.x - b.px) * DAMP, vy = (b.y - b.py) * DAMP;
    const sp = Math.hypot(vx, vy);
    if (sp > MAX_V) { vx *= MAX_V / sp; vy *= MAX_V / sp; }
    b.px = b.x; b.py = b.y;
    b.x += vx; b.y += vy + g;
    b.angle += b.spin;
    b.spin *= sp < 0.05 ? 0.95 : 0.998;   // settled items stop turning
    if (b.grow < 1) {
      b.grow = Math.min(1, b.grow + h / GROW_TIME);
      b.r = b.r0 + (b.R - b.r0) * easeOutBack(b.grow);
    }
  }
}

function collide(onMerge) {
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const same = a.tier === b.tier;
      const rr = a.r + b.r + (same ? MERGE_SLOP : 0);
      if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      if (same) {
        onMerge(a, b);
        break;
      }
      const d = Math.sqrt(d2) || 1e-4;
      const nx = dx / d, ny = dy / d;
      const wa = b.m / (a.m + b.m), wb = 1 - wa;
      const c = (a.r + b.r - d) * RESPONSE;
      a.x -= nx * c * wa; a.y -= ny * c * wa;
      b.x += nx * c * wb; b.y += ny * c * wb;

      // friction along the contact tangent
      const tx = -ny, ty = nx;
      const rvx = (b.x - b.px) - (a.x - a.px), rvy = (b.y - b.py) - (a.y - a.py);
      const f = (rvx * tx + rvy * ty) * FRICTION;
      a.px -= tx * f * wa; a.py -= ty * f * wa;
      b.px += tx * f * wb; b.py += ty * f * wb;

      const vn = rvx * nx + rvy * ny;
      if (vn > MAX_SEP) {
        const e = vn - MAX_SEP;
        a.px -= nx * e * wa; a.py -= ny * e * wa;
        b.px += nx * e * wb; b.py += ny * e * wb;
      }

      // rolling: spin that would make the contact point not slip
      const roll = ny * -rvx - nx * -rvy;
      a.spin += (roll / a.r - a.spin) * SPIN_BLEND * wa;
      b.spin += (roll / b.r - b.spin) * SPIN_BLEND * wb;
    }
  }
}

function walls() {
  for (const b of bodies) {
    if (b.dead) continue;
    const vx = b.x - b.px, vy = b.y - b.py;
    if (b.x - b.r < JAR.left) {
      b.x = JAR.left + b.r;
      b.px = Math.max(b.px, b.x - MAX_SEP);
      b.py += vy * WALL_FRICTION;
      b.spin += (vy / b.r - b.spin) * SPIN_BLEND;
    } else if (b.x + b.r > JAR.right) {
      b.x = JAR.right - b.r;
      b.px = Math.min(b.px, b.x + MAX_SEP);
      b.py += vy * WALL_FRICTION;
      b.spin += (-vy / b.r - b.spin) * SPIN_BLEND;
    }
    if (b.y + b.r > JAR.bottom) {
      b.y = JAR.bottom - b.r;
      b.py = Math.min(b.py, b.y + MAX_SEP);
      b.px += vx * FLOOR_FRICTION;
      b.spin += (vx / b.r - b.spin) * SPIN_BLEND * 2;
    }
  }
}
