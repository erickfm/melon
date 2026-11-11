/**
 * Trickshot trace: a shooting star re-runs the shot's whole path (the hop,
 * then every merge in the cascade after it), leaving a thin echo of the line
 * that fades. When the cascade continues, the star carries on along the new
 * stretch. Real time, visual only.
 */

import { TAU } from './paper.js';

const STEP = 3;           // units between resampled points
const SPEED = 1100;       // units/s the star travels
const MIN_RUN = 0.3, MAX_RUN = 0.65;  // s per stretch, whatever its length
const TAIL = 40;          // points of glowing tail behind the head
const HOLD = 0.5;         // s the echo stays once the star lands
const OUT = 0.7;          // s for the echo to fade

const traces = [];

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = t => 1 - (1 - t) ** 2;

// Append path points (flat [x, y, ...]), resampled to even steps.
function addPath(tr, path) {
  let px = tr.xs[tr.n - 1], py = tr.ys[tr.n - 1], carry = 0;
  for (let i = 0; i < path.length; i += 2) {
    const dx = path[i] - px, dy = path[i + 1] - py, d = Math.hypot(dx, dy);
    let t = STEP - carry;
    while (t <= d) {
      tr.xs.push(px + (dx * t) / d);
      tr.ys.push(py + (dy * t) / d);
      t += STEP;
    }
    carry = d - (t - STEP);
    px = path[i];
    py = path[i + 1];
  }
  if (Math.hypot(px - tr.xs[tr.xs.length - 1], py - tr.ys[tr.ys.length - 1]) > 0.5) { tr.xs.push(px); tr.ys.push(py); }
  tr.n = tr.xs.length;
}

function run(tr) {
  tr.from = tr.head;
  tr.t0 = tr.life;
  tr.dur = Math.min(MAX_RUN, Math.max(MIN_RUN, ((tr.n - 1 - tr.head) * STEP) / SPEED));
  tr.landed = false;
}

// path: flat [x, y, ...] from takeoff to the merge.
export function trickTrace(path) {
  if (path.length < 4) return null;
  const tr = { xs: [path[0]], ys: [path[1]], n: 1, life: 0, head: 0, fade: 0 };
  addPath(tr, path);
  run(tr);
  traces.push(tr);
  return tr;
}

// The cascade went on: the star carries on from the last merge to this one.
export function extendTrace(tr, path) {
  if (!tr || !traces.includes(tr)) return null;
  addPath(tr, path);
  run(tr);
  return tr;
}

export function clearTraces() { traces.length = 0; }

export function updateTraces(dt) {
  for (let k = traces.length; k--;) {
    const tr = traces[k];
    tr.life += dt;
    const p = clamp01((tr.life - tr.t0) / tr.dur);
    tr.head = tr.from + (tr.n - 1 - tr.from) * easeOut(p);
    if (p >= 1 && !tr.landed) {
      tr.landed = true;
      tr.landAt = tr.life;
    }
    tr.fade = tr.landed ? clamp01((tr.life - tr.landAt - HOLD) / OUT) : 0;
    if (tr.fade >= 1) traces.splice(k, 1);
  }
}

function seg(ctx, tr, i0, i1) {
  ctx.beginPath();
  ctx.moveTo(tr.xs[i0], tr.ys[i0]);
  for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(tr.xs[i], tr.ys[i]);
}

function sparkle(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// pal: the theme palette (the echo uses its ink so it suits light and dark)
export function drawTraces(ctx, pal) {
  for (const tr of traces) {
    const h = Math.floor(tr.head);
    if (h < 1) continue;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = 'round';

    // the echo: a thin line along everything the star has run
    ctx.globalAlpha = 1 - tr.fade;
    ctx.strokeStyle = `rgba(${pal.inkFaint},0.28)`;
    ctx.lineWidth = 1.3;
    seg(ctx, tr, 0, h);
    ctx.stroke();

    // the star: a glowing tail that shrinks into the landing, then a twinkle
    const shrink = tr.landed ? clamp01((tr.life - tr.landAt) / 0.25) : 0;
    const len = TAIL * (1 - shrink), i0 = Math.max(0, Math.floor(h - len));
    if (h - i0 >= 1) {
      for (const [w, c] of [[2.4, 'rgba(233,150,40,0.35)'], [0, 'rgba(255,252,238,0.95)']]) {
        ctx.strokeStyle = c;
        for (let i = i0; i < h; i++) {
          const f = (i - i0 + 1) / (h - i0);
          ctx.globalAlpha = f;
          ctx.lineWidth = 0.5 + f * 4.5 + w;
          seg(ctx, tr, i, i + 1);
          ctx.stroke();
        }
      }
    }
    const x = tr.xs[h], y = tr.ys[h];
    const tw = tr.landed ? 1 + 0.8 * Math.sin(Math.min(1, (tr.life - tr.landAt) / 0.35) * Math.PI) : 1;
    const r = 6.5 * tw * (1 - tr.fade);
    if (r > 0.3) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,217,61,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fffdf2';
      ctx.strokeStyle = 'rgba(233,150,40,0.7)';
      ctx.lineWidth = 1;
      sparkle(ctx, x, y, r, tr.life * 3);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
