/**
 * Game entry point: state, input, merge/combo/fever rules, impact juice
 * (squash, landing sounds, haptics), hit-stop and slow motion,
 * overflow rule, save/resume, loop.
 */

import {
  WORLD_W, JAR, DROP_Y, DANGER_Y, STEP, DROP_COOLDOWN, SPAWN_WEIGHTS,
  OVERFLOW_GRACE, OVERFLOW_LIMIT, MELON_BONUS, BUTTONS,
} from './constants.js';
import { TIERS } from './items.js';
import { bodies, makeBody, stepPhysics, shockwave, perSecond } from './physics.js';
import { fx, clearFx, initMotes, mergeFx, landFx, rain, popup, banner, updateFx } from './fx.js';
import {
  initAudio, setMuted, setMood, playDrop, playLand, playMerge, playMelon, playFever,
  playCombo, playHeartbeat, playOver, playUi,
} from './audio.js';
import { haptic } from './haptics.js';
import { initRender, resize, render, toWorld, adaptQuality, setTheme } from './render.js';

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

const COMBO_WINDOW = 1.4;       // seconds between merges to keep a combo
const FEVER_COMBO = 5;          // combo that starts fever
const FEVER_TIME = 8;
const HIT_MIN = 170;            // units/s impact before squash + sound
const SQUASH_K = 900, SQUASH_DAMP = 14;

const s = {
  phase: 'play',
  bodies,
  score: 0,
  shownScore: 0,
  scorePunch: 0,
  best: store.get('melon_best', 0),
  discovered: store.get('melon_discovered', SPAWN_WEIGHTS.length - 1),
  muted: store.get('melon_muted', false),
  dark: store.get('melon_dark', matchMedia('(prefers-color-scheme: dark)').matches),
  current: 0,
  next: 0,
  aimX: WORLD_W / 2,
  heldX: WORLD_W / 2,
  heldVel: 0,
  heldTilt: 0,
  hangAngle: 0,
  cooldown: 0,
  appearT: 0,
  overflow: 0,
  near: 0,
  biggest: 0,
  dropped: false,
  restartArmed: 0,
  time: 0,
  combo: 0,
  comboMult: 1,
  comboWindow: COMBO_WINDOW,
  lastMerge: -99,
  fever: false,
  feverT: 0,
  feverMax: FEVER_TIME,
  freeze: 0,
  slowT: 0,
  heartT: 0,
  chainFlash: [],
};
setMuted(s.muted);
setTheme(s.dark);

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
    cooldown: 0, appearT: 0, overflow: 0, near: 0, biggest: 0, restartArmed: 0,
    combo: 0, comboMult: 1, lastMerge: -99, fever: false, feverT: 0, freeze: 0, slowT: 0,
  });
  overEl.classList.add('hidden');
  store.del(SAVE_KEY);
}

function drop() {
  if (s.phase !== 'play' || s.current === null) return;
  const b = makeBody(s.current, heldXFor(s.current), DROP_Y, { angle: s.hangAngle + s.heldTilt, vy: 0.4 });
  b.sq = -0.12;  // released stretched, snaps back
  bodies.push(b);
  playDrop(s.current);
  haptic(0);
  s.current = null;
  s.cooldown = DROP_COOLDOWN;
  s.dropped = true;
  save();
}

function addScore(n) {
  s.score += n;
  s.scorePunch = Math.min(1, s.scorePunch + 0.4 + n / 200);
}

function onMerge(a, b) {
  a.dead = b.dead = true;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;

  s.combo = s.time - s.lastMerge < s.comboWindow ? s.combo + 1 : 1;
  s.lastMerge = s.time;
  s.comboMult = Math.min(4, 1 + (s.combo - 1) * 0.25);
  if (s.fever) s.feverT = Math.min(FEVER_TIME, s.feverT + 0.6);
  else if (s.combo >= FEVER_COMBO) startFever();
  const mult = s.comboMult * (s.fever ? 2 : 1);

  if (a.tier === TOP) {
    const pts = Math.round(MELON_BONUS * mult);
    addScore(pts);
    mergeFx(x, y, TOP, { big: true, combo: s.combo, fever: s.fever });
    rain(140, TIERS.map(t => t.color));
    shockwave(x, y, 240, 1.1);
    popup(x, y, '+' + pts, 34);
    banner('MELON!!', 66, 'rainbow', 330, 2);
    s.freeze = 0.18;
    s.slowT = 1.3;
    playMelon();
    haptic(2);
    return;
  }

  const t = a.tier + 1, R = TIERS[t].r;
  const nb = makeBody(t, x, y, {
    r0: TIERS[a.tier].r,
    vx: (a.x - a.px + b.x - b.px) / 2,
    vy: (a.y - a.py + b.y - b.py) / 2,
    angle: (a.angle + b.angle) / 2,
  });
  nb.sqA = Math.atan2(b.y - a.y, b.x - a.x);
  nb.sqV = -7;  // jelly bloop as it grows
  bodies.push(nb);
  shockwave(x, y, R * 2.4, 0.4 + t * 0.07, nb);

  const pts = Math.round(TIERS[t].points * mult);
  addScore(pts);
  s.biggest = Math.max(s.biggest, t);
  s.chainFlash[t] = 1;
  mergeFx(x, y, t, { combo: s.combo, fever: s.fever });
  popup(x, y, '+' + pts, 15 + t * 1.6 + Math.min(s.combo, 6) * 1.5, s.combo >= 3 ? '#c0453b' : '#4a3426');
  playMerge(t, s.combo);
  s.freeze = Math.max(s.freeze, 0.022 + t * 0.007 + (s.combo >= 3 ? 0.02 : 0));
  if (t >= 7) s.slowT = Math.max(s.slowT, 0.45 + (t - 7) * 0.2);
  haptic(t >= 6 ? 2 : t >= 3 ? 1 : 0);

  if (s.combo >= 2) {
    banner(s.combo >= 4 ? `combo ×${s.combo}!!` : `combo ×${s.combo}`, 26 + Math.min(s.combo, 6) * 3, '#c0453b', 262, 0.9);
    playCombo(s.combo);
  }
  if (t > s.discovered) {
    s.discovered = t;
    store.set('melon_discovered', t);
    banner('new: ' + TIERS[t].name + '!', 32, TIERS[t].color === '#fffaf0' ? '#4a3426' : TIERS[t].color, 405, 1.6);
    rain(40, [TIERS[t].color, '#fbf5e6']);
  }
}

function startFever() {
  s.fever = true;
  s.feverT = FEVER_TIME;
  s.comboWindow = 2.2;
  banner('FEVER!!', 58, 'rainbow', 340, 1.6);
  rain(70, ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff']);
  fx.zoomV += 0.3;
  playFever();
}

function gameOver() {
  s.phase = 'over';
  s.fever = false;
  fx.shake = 10;
  playOver();
  haptic(2);
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
  }, 900);
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
let sounds = 0;

// Turn this frame's impacts into squash, sound, dust and shake; run squash springs.
function impacts(dt) {
  sounds = 0;
  for (const b of bodies) {
    const v = perSecond(b.hit);
    if (v > HIT_MIN) {
      const I = Math.min(1, (v - HIT_MIN) / 1300);
      const amt = 0.04 + I * 0.13;
      if (amt > b.sq) {
        b.sqA = Math.atan2(b.hny, b.hnx);
        b.sqV += amt * 40;
      }
      if (s.time - b.lastSound > 0.15 && sounds < 3) {
        b.lastSound = s.time;
        sounds++;
        playLand(b.tier, I);
        if (I > 0.25) landFx(b.x, b.y, b.hnx, b.hny, b.r, I);
        if (b.tier >= 6 && I > 0.3) fx.shake = Math.max(fx.shake, I * (b.tier - 4));
      }
    }
    b.hit = 0;
    b.sqV += (-b.sq * SQUASH_K - b.sqV * SQUASH_DAMP) * dt;
    b.sq = clamp(b.sq + b.sqV * dt, -0.3, 0.3);
  }
}

let moodKey = '';

function update(dt) {
  s.time += dt;
  s.restartArmed = Math.max(0, s.restartArmed - dt);
  s.shownScore += (s.score - s.shownScore) * Math.min(1, dt * 12);
  if (Math.abs(s.score - s.shownScore) < 0.5) s.shownScore = s.score;
  s.scorePunch = Math.max(0, s.scorePunch - dt * 4);
  s.chainFlash = s.chainFlash.map(v => Math.max(0, (v || 0) - dt * 1.5));

  const danger = s.phase === 'play' ? clamp((s.near - 0.5) / 0.5, 0, 1) : 0;
  const key = `${s.fever}|${danger.toFixed(1)}`;
  if (key !== moodKey) {
    moodKey = key;
    setMood({ fever: s.fever, danger });
  }

  // hit-stop: everything holds for a few frames
  if (s.freeze > 0) {
    s.freeze -= dt;
    return;
  }
  s.slowT = Math.max(0, s.slowT - dt);
  const gdt = dt * (1 - 0.68 * clamp(s.slowT / 0.3, 0, 1));
  updateFx(gdt);
  if (s.phase !== 'play') return;

  const dir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  if (dir) s.aimX = clamp(s.aimX + dir * 320 * dt, JAR.left, JAR.right);

  stepPhysics(gdt, onMerge);
  impacts(gdt);

  if (s.time - s.lastMerge > s.comboWindow) s.combo = 0;
  if (s.fever && (s.feverT -= gdt) <= 0) {
    s.fever = false;
    s.comboWindow = COMBO_WINDOW;
  }

  if (s.current === null) {
    s.cooldown -= gdt;
    if (s.cooldown <= 0) {
      s.current = s.next;
      s.next = roll();
      s.appearT = 0;
    }
  }
  if (s.current !== null) {
    const nx = heldXFor(s.current);
    s.heldVel += ((nx - s.heldX) / dt - s.heldVel) * Math.min(1, dt * 20);
    s.heldX = nx;
  }
  s.heldTilt += (clamp(-s.heldVel * 0.0009, -0.45, 0.45) - s.heldTilt) * Math.min(1, dt * 9);
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
  s.overflow = over ? s.overflow + gdt : Math.max(0, s.overflow - gdt);
  if (s.overflow > OVERFLOW_LIMIT) gameOver();

  if (s.near > 0.6 || s.overflow > 0) {
    if ((s.heartT -= dt) <= 0) {
      s.heartT = s.overflow > 0 ? 0.42 : 0.85;
      playHeartbeat(s.overflow > 0 ? 1 : 0.6);
    }
  }

  if ((saveTimer += dt) > 3) {
    saveTimer = 0;
    save();
  }
}

// --- input ---

let dragging = false;

function press(name) {
  playUi();
  haptic(0);
  if (name === 'mute') {
    s.muted = !s.muted;
    setMuted(s.muted);
    store.set('melon_muted', s.muted);
  } else if (name === 'theme') {
    s.dark = !s.dark;
    setTheme(s.dark);
    store.set('melon_dark', s.dark);
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
  haptic(1);
  newGame();
});

addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// --- loop ---

initRender(canvas);
initMotes();
if (!load()) newGame();
s.heldX = heldXFor(s.current);

let last = performance.now(), acc = 0;
function frame(now) {
  if (!document.hidden) adaptQuality(now - last);
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
window.__melon = { s, bodies, drop, TIERS, fx, makeBody };
