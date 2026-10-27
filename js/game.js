/**
 * Game entry point: state, input, merge/overflow rules, save/resume, loop.
 */

import {
  WORLD_W, JAR, DROP_Y, DANGER_Y, STEP, DROP_COOLDOWN, SPAWN_WEIGHTS,
  OVERFLOW_GRACE, OVERFLOW_LIMIT, MELON_BONUS, BUTTONS,
} from './constants.js';
import { TIERS } from './items.js';
import { bodies, makeBody, stepPhysics } from './physics.js';
import { fx, clearFx, mergeFx, popup, updateFx } from './fx.js';
import { initAudio, setMuted, playDrop, playMerge, playMelon, playOver } from './audio.js';
import { initRender, resize, render, toWorld } from './render.js';

const canvas = document.getElementById('game');
const overEl = document.getElementById('over');
const overScore = document.getElementById('over-score');
const overBest = document.getElementById('over-best');
const overBiggest = document.getElementById('over-biggest');
const againBtn = document.getElementById('again');

const SAVE_KEY = 'melon_save_v1';
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const TOP = TIERS.length - 1;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const s = {
  phase: 'play',
  bodies,
  score: 0,
  shownScore: 0,
  best: store.get('melon_best', 0),
  discovered: store.get('melon_discovered', SPAWN_WEIGHTS.length - 1),
  muted: store.get('melon_muted', false),
  current: 0,
  next: 0,
  aimX: WORLD_W / 2,
  heldX: WORLD_W / 2,
  hangAngle: 0,
  cooldown: 0,
  appearT: 0,
  overflow: 0,
  near: 0,
  biggest: 0,
  dropped: false,
  restartArmed: 0,
  time: 0,
};
setMuted(s.muted);

function roll() {
  let r = Math.random() * SPAWN_WEIGHTS.reduce((a, b) => a + b);
  for (let i = 0; i < SPAWN_WEIGHTS.length; i++) if ((r -= SPAWN_WEIGHTS[i]) < 0) return i;
  return 0;
}

const heldXFor = tier => clamp(s.aimX, JAR.left + TIERS[tier].r, JAR.right - TIERS[tier].r);

function newGame() {
  bodies.length = 0;
  clearFx();
  Object.assign(s, {
    phase: 'play', score: 0, shownScore: 0, current: roll(), next: roll(),
    cooldown: 0, appearT: 0, overflow: 0, near: 0, biggest: 0, restartArmed: 0, newBest: false,
  });
  overEl.classList.add('hidden');
  store.del(SAVE_KEY);
}

function drop() {
  if (s.phase !== 'play' || s.current === null) return;
  bodies.push(makeBody(s.current, heldXFor(s.current), DROP_Y, { angle: s.hangAngle }));
  playDrop(s.current);
  s.current = null;
  s.cooldown = DROP_COOLDOWN;
  s.dropped = true;
  save();
}

function onMerge(a, b) {
  a.dead = b.dead = true;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  if (a.tier === TOP) {
    s.score += MELON_BONUS;
    mergeFx(x, y, TOP, true);
    popup(x, y, '+' + MELON_BONUS, 34);
    playMelon();
    return;
  }
  const t = a.tier + 1;
  bodies.push(makeBody(t, x, y, {
    r0: TIERS[a.tier].r,
    vx: (a.x - a.px + b.x - b.px) / 2,
    vy: (a.y - a.py + b.y - b.py) / 2,
    angle: (a.angle + b.angle) / 2,
  }));
  s.score += TIERS[t].points;
  s.biggest = Math.max(s.biggest, t);
  mergeFx(x, y, t);
  popup(x, y, '+' + TIERS[t].points, 15 + t * 1.6);
  playMerge(t);
  if (t > s.discovered) {
    s.discovered = t;
    store.set('melon_discovered', t);
    popup(x, y - TIERS[t].r - 14, 'new: ' + TIERS[t].name + '!', 22, '#c0453b');
  }
}

function gameOver() {
  s.phase = 'over';
  playOver();
  store.del(SAVE_KEY);
  const newBest = s.score > s.best;
  if (newBest) {
    s.best = s.score;
    store.set('melon_best', s.best);
  }
  setTimeout(() => {
    overScore.textContent = s.score;
    overBest.textContent = newBest ? '★ new best!' : 'best ' + s.best;
    overBest.classList.toggle('gold', newBest);
    overBiggest.textContent = 'grew a ' + TIERS[s.biggest].name;
    overEl.classList.remove('hidden');
  }, 800);
}

// --- save / resume ---

let saveTimer = 0;

function save() {
  if (s.phase !== 'play') return;
  store.set(SAVE_KEY, {
    score: s.score,
    current: s.current ?? s.next,
    next: s.current === null ? roll() : s.next,
    bodies: bodies.map(b => [b.tier, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.angle * 100) / 100]),
  });
}

function load() {
  const d = store.get(SAVE_KEY, null);
  const okTier = t => Number.isInteger(t) && t >= 0 && t <= TOP;
  if (!d || !Array.isArray(d.bodies) || !okTier(d.current) || !okTier(d.next)) return false;
  for (const [t, x, y, a] of d.bodies) {
    if (!okTier(t) || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    const r = TIERS[t].r;
    const b = makeBody(t, clamp(x, JAR.left + r, JAR.right - r), Math.min(y, JAR.bottom - r), { angle: a || 0 });
    b.age = OVERFLOW_GRACE;
    bodies.push(b);
    s.biggest = Math.max(s.biggest, t);
  }
  s.score = s.shownScore = d.score | 0;
  s.current = d.current;
  s.next = d.next;
  s.dropped = bodies.length > 0;
  return true;
}

// --- update ---

const keys = {};

function update(dt) {
  s.time += dt;
  s.restartArmed = Math.max(0, s.restartArmed - dt);
  s.shownScore += (s.score - s.shownScore) * Math.min(1, dt * 12);
  if (Math.abs(s.score - s.shownScore) < 0.5) s.shownScore = s.score;
  updateFx(dt);
  if (s.phase !== 'play') return;

  const dir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  if (dir) s.aimX = clamp(s.aimX + dir * 320 * dt, JAR.left, JAR.right);

  stepPhysics(dt, onMerge);

  if (s.current === null) {
    s.cooldown -= dt;
    if (s.cooldown <= 0) {
      s.current = s.next;
      s.next = roll();
      s.appearT = 0;
    }
  }
  if (s.current !== null) s.heldX = heldXFor(s.current);
  s.appearT += dt;
  s.hangAngle = Math.sin(s.time * 1.7) * 0.07;

  let over = false, near = 0;
  for (const b of bodies) {
    if (b.age < OVERFLOW_GRACE) continue;
    const top = b.y - b.r;
    if (top < DANGER_Y) over = true;
    near = Math.max(near, 1 - (top - DANGER_Y) / 90);
  }
  s.near = clamp(near, 0, 1);
  s.overflow = over ? s.overflow + dt : Math.max(0, s.overflow - dt);
  if (s.overflow > OVERFLOW_LIMIT) gameOver();

  if ((saveTimer += dt) > 3) {
    saveTimer = 0;
    save();
  }
}

// --- input ---

let dragging = false;

function press(name) {
  if (name === 'mute') {
    s.muted = !s.muted;
    setMuted(s.muted);
    store.set('melon_muted', s.muted);
  } else if (name === 'restart') {
    if (s.phase !== 'play' || !s.dropped || s.restartArmed > 0) newGame();
    else s.restartArmed = 2;
  }
}

canvas.addEventListener('pointerdown', e => {
  initAudio();
  const p = toWorld(e.clientX, e.clientY);
  for (const [name, b] of Object.entries(BUTTONS)) {
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6) return press(name);
  }
  if (s.phase !== 'play') return;
  dragging = true;
  canvas.setPointerCapture?.(e.pointerId);
  s.aimX = clamp(p.x, JAR.left, JAR.right);
});

canvas.addEventListener('pointermove', e => {
  if (!dragging && e.pointerType !== 'mouse') return;
  s.aimX = clamp(toWorld(e.clientX, e.clientY).x, JAR.left, JAR.right);
});

canvas.addEventListener('pointerup', e => {
  if (!dragging) return;
  dragging = false;
  s.aimX = clamp(toWorld(e.clientX, e.clientY).x, JAR.left, JAR.right);
  drop();
});

canvas.addEventListener('pointercancel', () => { dragging = false; });

addEventListener('keydown', e => {
  initAudio();
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
    e.preventDefault();
    if (s.phase === 'over') newGame();
    else if (!e.repeat) drop();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

againBtn.addEventListener('click', () => {
  initAudio();
  newGame();
});

addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// --- loop ---

initRender(canvas);
if (!load()) newGame();
s.heldX = heldXFor(s.current);

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let n = 0;
  while (acc >= STEP && n++ < 6) {
    update(STEP);
    acc -= STEP;
  }
  if (n > 6) acc = 0;
  render(s);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for headless checks
window.__melon = { s, bodies, drop, TIERS };
