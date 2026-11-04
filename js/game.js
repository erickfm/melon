/**
 * Game entry point: state, input, merge/combo/fever rules, impact juice
 * (squash, landing sounds, haptics), hit-stop and slow motion,
 * overflow rule, save/resume, replays and challenge links, loop.
 *
 * Determinism: everything that moves bodies runs on whole sim ticks and a
 * seeded RNG (`s.rng`), and drops are logged as [tick, x in tenths]. Replaying
 * that log from the seed reproduces the run exactly; saves store the full float
 * state so a resumed run stays replayable. Visual-only randomness (particles,
 * shake) uses Math.random and never touches the sim.
 */

import {
  WORLD_W, JAR, DROP_Y, DANGER_Y, STEP, DROP_COOLDOWN, SPAWN_WEIGHTS,
  OVERFLOW_GRACE, OVERFLOW_LIMIT, MELON_BONUS, BUTTONS,
} from './constants.js';
import { TIERS } from './items.js';
import { bodies, makeBody, stepPhysics, shockwave, perSecond, getLastH, resetPhysics } from './physics.js';
import { fx, clearFx, initMotes, mergeFx, landFx, rain, popup, banner, updateFx } from './fx.js';
import {
  initAudio, setMuted, setMood, playDrop, playLand, playMerge, playMelon, playFever,
  playCombo, playHeartbeat, playOver, playUi, setQuiet,
} from './audio.js';
import { haptic } from './haptics.js';
import { initRender, resize, render, toWorld, adaptQuality, setTheme } from './render.js';
import { encodeRun, decodeRun, randomName, cleanName } from './run.js';
import { submitRun, flushPending, fetchBoard, fetchRun } from './net.js';
import {
  L, es, tierName, withArticle, isFem, numberWord, praise, say, setSpanish, initSpanish, initLessons,
  hasLesson, showLesson, unlockVoice, setVoiceMuted,
} from './es.js';

const canvas = document.getElementById('game');
const overEl = document.getElementById('over');
const overScore = document.getElementById('over-score');
const overBest = document.getElementById('over-best');
const overBiggest = document.getElementById('over-biggest');
const overTitle = document.getElementById('over-title');
const overVs = document.getElementById('over-vs');
const againBtn = document.getElementById('again');
const watchBtn = document.getElementById('watch');
const watchThemBtn = document.getElementById('watch-them');
const shareBtn = document.getElementById('share');
const whoEl = document.getElementById('who');
const toastEl = document.getElementById('toast');
const overRank = document.getElementById('over-rank');
const boardEl = document.getElementById('board');
const boardList = document.getElementById('board-list');
const boardMe = document.getElementById('board-me');

const SAVE_KEY = 'melon_save_v2';
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

store.del('melon_save_v1');  // old saves can't be replayed; drop them

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
  name: cleanName(store.get('melon_name', '')) || randomName(),
  // run record (see run.js)
  seed: 0,
  rng: 0,
  tick: 0,
  log: [],
  marks: [],
  vs: null,          // the run we're racing (from a challenge link)
  beaten: false,
  replay: null,      // { run, i, label, speed } while watching
  lastRun: null,
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
store.set('melon_name', s.name);
setMuted(s.muted);
setVoiceMuted(s.muted);
setTheme(s.dark);

// mulberry32 with its state in s.rng, so saves and replays can resume it
function rand() {
  s.rng = (s.rng + 0x6D2B79F5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const newSeed = () => (Math.random() * 4294967296) >>> 0;

function roll() {
  let r = rand() * SPAWN_WEIGHTS.reduce((a, b) => a + b);
  for (let i = 0; i < SPAWN_WEIGHTS.length; i++) if ((r -= SPAWN_WEIGHTS[i]) < 0) return i;
  return 0;
}

const heldXFor = tier => clamp(s.aimX, JAR.left + TIERS[tier].r, JAR.right - TIERS[tier].r);

// Everything the sim depends on, back to the start of a run.
function resetRun(seed) {
  bodies.length = 0;
  resetPhysics();
  clearFx();
  Object.assign(s, {
    score: 0, shownScore: 0, cooldown: 0, appearT: 0, overflow: 0, near: 0, biggest: 0, restartArmed: 0,
    combo: 0, comboMult: 1, comboWindow: COMBO_WINDOW, lastMerge: -99, fever: false, feverT: 0,
    freeze: 0, slowT: 0, time: 0, tick: 0, seed, rng: seed | 0, log: [], marks: [], dropped: false,
  });
  s.current = roll();
  s.next = roll();
  s.heldX = heldXFor(s.current);
}

function newGame(seed = newSeed(), vs = null) {
  setQuiet(false);
  Object.assign(s, { phase: 'play', vs, beaten: false, replay: null });
  resetRun(seed);
  overEl.classList.add('hidden');
  store.del(SAVE_KEY);
  if (vs) banner(L(`beat ${vs.name}: ${vs.score}`, `¡gánale a ${vs.name}: ${vs.score}!`), 30, '#c0453b', 405, 2.6);
}

// Live drops pass nothing and take the aim; replays pass the logged x (tenths).
function drop(q) {
  if (s.phase === 'over' || s.current === null) return;
  const live = q === undefined;
  if (live) {
    if (s.phase !== 'play') return;
    q = Math.round(heldXFor(s.current) * 10);
  }
  const r = TIERS[s.current].r;
  s.log.push([s.tick, q]);
  s.marks.push(s.score);
  const b = makeBody(s.current, clamp(q / 10, JAR.left + r, JAR.right - r), DROP_Y, { angle: s.hangAngle + s.heldTilt, vy: 0.4 });
  b.sq = -0.12;  // released stretched, snaps back
  bodies.push(b);
  playDrop(s.current);
  s.current = null;
  s.cooldown = DROP_COOLDOWN;
  s.dropped = true;
  if (live) {
    haptic(0);
    save();
  }
}

const buzz = n => { if (s.phase === 'play') haptic(n); };
const speak = (text, priority) => { if (s.phase === 'play') say(text, priority); };

function addScore(n) {
  s.score += n;
  s.scorePunch = Math.min(1, s.scorePunch + 0.4 + n / 200);
  if (s.vs && !s.beaten && s.phase === 'play' && s.score > s.vs.score) {
    s.beaten = true;
    banner(L(`you beat ${s.vs.name}!`, `¡le ganaste a ${s.vs.name}!`), 34, '#4f9a4a', 405, 2.2);
    speak('¡ganaste!', 4);
    rain(60, ['#4f9a4a', '#ffd93d', '#fbf5e6']);
  }
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
    banner(L('MELON!!', '¡MELÓN!'), 66, 'rainbow', 330, 2);
    speak('¡melón!', 5);
    s.freeze = 0.18;
    s.slowT = 1.3;
    playMelon();
    buzz(2);
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
  buzz(t >= 6 ? 2 : t >= 3 ? 1 : 0);

  if (t >= 6) speak(praise(), 1);
  if (s.combo >= 2) {
    banner(s.combo >= 4 ? `combo ×${s.combo}!!` : `combo ×${s.combo}`, 26 + Math.min(s.combo, 6) * 3, '#c0453b', 262, 0.9);
    speak(`¡${numberWord(s.combo)}!`, 2);
    playCombo(s.combo);
  }
  if (t > s.discovered && s.phase === 'play') {
    s.discovered = t;
    store.set('melon_discovered', t);
    banner(L('new: ' + TIERS[t].name + '!', `¡${isFem(t) ? 'nueva' : 'nuevo'}: ${withArticle(t)}!`), 32, TIERS[t].color === '#fffaf0' ? '#4a3426' : TIERS[t].color, 405, 1.6);
    rain(40, [TIERS[t].color, '#fbf5e6']);
  }
}

function startFever() {
  s.fever = true;
  s.feverT = FEVER_TIME;
  s.comboWindow = 2.2;
  banner(L('FEVER!!', '¡FIEBRE!'), 58, 'rainbow', 340, 1.6);
  speak('¡fiebre!', 3);
  rain(70, ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#c77dff']);
  fx.zoomV += 0.3;
  playFever();
}

function gameOver() {
  if (s.phase === 'replay') return endReplay();
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
  s.lastRun = {
    name: s.name, seed: s.seed, score: s.score, end: s.tick, log: s.log, marks: s.marks,
    biggest: s.biggest, newBest, rank: undefined,  // undefined: sending, null: offline
  };
  const run = s.lastRun;
  if (run.log.length) {
    submitRun(run, s.name).then(res => {
      run.rank = res;
      if (s.lastRun === run) showRank();
    });
  }
  // Spanish mode: an everyday dialogue first, for runs that weren't instant restarts
  setTimeout(() => (hasLesson() && run.log.length >= 10 ? showLesson(showCard) : showCard()), 900);
}

function showRank() {
  const r = s.lastRun?.rank;
  overRank.textContent = r === undefined ? '…' : !r ? ''
    : L(`#${r.day.rank} today · #${r.all.rank} all time`, `#${r.day.rank} hoy · #${r.all.rank} histórico`);
  overRank.classList.toggle('gold', !!r && r.day.rank <= 3);
}

// --- leaderboard overlay: today / all time; tap a row to watch that run ---

let boardKind = 'day', boardReq = 0;

async function openBoard(kind = boardKind) {
  boardKind = kind;
  boardEl.querySelectorAll('[data-b]').forEach(b => b.classList.toggle('on', b.dataset.b === kind));
  overEl.classList.add('hidden');
  boardEl.classList.remove('hidden');
  const n = ++boardReq;
  boardList.innerHTML = '<li class="empty">…</li>';
  boardMe.textContent = '';
  let data;
  try {
    data = await fetchBoard(kind);
  } catch {
    if (n === boardReq) boardList.innerHTML = `<li class="empty">${L("can't reach the board right now", 'no se pudo cargar la tabla')}</li>`;
    return;
  }
  if (n !== boardReq) return;
  boardList.replaceChildren(...data.rows.map((row, i) => {
    const li = document.createElement('li');
    li.className = row.me ? 'me' : '';
    for (const [cls, txt] of [['rk', i + 1], ['nm', row.name], ['sc', row.score], ['pl', '▶']]) {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = txt;
      li.append(sp);
    }
    li.addEventListener('click', tapped(() => watchBoardRun(row)));
    return li;
  }));
  if (!data.rows.length) boardList.innerHTML = `<li class="empty">${L('no scores yet. be the first!', 'nadie ha jugado todavía. ¡empieza tú!')}</li>`;
  const me = data.me;
  boardMe.textContent = !me ? '' : L(`you: #${me.rank} of ${me.of} · best ${me.score}`, `tú: #${me.rank} de ${me.of} · récord ${me.score}`);
}

async function watchBoardRun(row) {
  try {
    const run = await fetchRun(row.id);
    boardEl.classList.add('hidden');
    watch(run, L(`${row.name}'s run`, `partida de ${row.name}`));
  } catch {
    toast(L("couldn't load that run", 'no se pudo cargar la partida'));
  }
}

function showCard() {
  const run = s.lastRun, vs = s.vs;
  if (!run || s.phase !== 'over') return;
  overTitle.textContent = !vs ? L("jar's full!", '¡frasco lleno!')
    : run.score > vs.score ? L('you win!', '¡ganaste!') : run.score === vs.score ? L('a tie!', '¡empate!') : L('so close!', '¡casi!');
  overScore.textContent = run.score;
  overBest.textContent = run.newBest ? L('★ new best!', '★ ¡nuevo récord!') : L('best ', 'récord ') + s.best;
  overBest.classList.toggle('gold', run.newBest);
  const big = run.biggest;
  overBiggest.textContent = L('grew a ', isFem(big) ? 'cultivaste una ' : 'cultivaste un ') + tierName(big, TIERS[big].name);
  overVs.hidden = !vs;
  overVs.textContent = vs ? `${L('you', 'tú')} ${run.score} · ${vs.name} ${vs.score}` : '';
  watchThemBtn.hidden = !vs;
  watchThemBtn.textContent = vs ? '▶ ' + L(`${vs.name}'s run`, `partida de ${vs.name}`) : '';
  shareBtn.textContent = vs ? L('send it back', 'contestar') : L('challenge', 'retar');
  showRank();
  whoEl.textContent = s.name;
  overEl.classList.remove('hidden');
}

// --- replays: re-run a logged run from its seed, fast and silent ---

function watch(run, label) {
  if (!run) return;
  overEl.classList.add('hidden');
  s.phase = 'replay';
  resetRun(run.seed);
  // aim for ~30s of playback; idle stretches go faster still (see replayTicks)
  s.replay = { run, i: 0, label, speed: clamp(Math.ceil(run.end / (30 * 60)), 2, 10) };
  setQuiet(true);
}

function endReplay() {
  const r = s.replay;
  if (r && s.score !== r.run.score) console.warn(`replay drifted: ${s.score} vs ${r.run.score}`);
  s.replay = null;
  s.phase = 'over';
  s.fever = false;
  setQuiet(false);
  setTimeout(showCard, 600);
}

// Sim ticks to run this frame: faster while the player was thinking.
function replayTicks() {
  const r = s.replay, next = r.run.log[r.i];
  return s.current !== null && next && next[0] - s.tick > 20 ? r.speed * 4 : r.speed;
}

function replayStep() {
  const r = s.replay, log = r.run.log;
  while (r.i < log.length && log[r.i][0] <= s.tick) drop(log[r.i++][1]);
  if (r.i < log.length) s.aimX = log[r.i][1] / 10;  // held piece drifts to where it'll drop
  update(STEP);
  if (s.replay && s.tick > r.run.end + 600) endReplay();  // drifted; don't run forever
}

// --- challenge links: #vs=<packed run> races you against that run's seed ---

function readLink() {
  const m = location.hash.match(/vs=([\w-]+)/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return decodeRun(m[1]);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

async function share() {
  const run = s.lastRun;
  if (!run) return;
  const url = location.origin + location.pathname + '#vs=' + encodeRun(run);
  const text = s.vs
    ? L(`I got ${run.score} on your melon jar, ${s.vs.name}. your move 🍉`, `saqué ${run.score} en tu frasco, ${s.vs.name}. te toca 🍉`)
    : L(`I grew ${run.score} points of melon. same seeds, can you beat me? 🍉`, `cultivé ${run.score} puntos de melón. mismas semillas, ¿me ganas? 🍉`);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast(L('link copied', 'enlace copiado'));
    } catch {
      prompt(L('copy this link', 'copia este enlace'), url);
    }
  };
  if (!navigator.share) return copy();
  try {
    await navigator.share({ title: 'Melon', text, url });
  } catch (e) {
    if (e.name !== 'AbortError') copy();
  }
}

// --- save / resume ---

let saveTimer = 0;

// Full float state (JSON round-trips doubles exactly), so a resumed run
// continues bit-for-bit and its replay still matches.
const SIM_KEYS = ['score', 'current', 'next', 'cooldown', 'overflow', 'near', 'biggest', 'combo', 'comboMult',
  'comboWindow', 'lastMerge', 'fever', 'feverT', 'freeze', 'slowT', 'time', 'tick', 'seed', 'rng', 'log', 'marks',
  'vs', 'beaten', 'dropped'];
const BODY_KEYS = ['tier', 'x', 'y', 'px', 'py', 'r', 'r0', 'grow', 'angle', 'spin', 'age'];

function save() {
  if (s.phase !== 'play') return;
  const d = { lastH: getLastH(), bodies: bodies.map(b => BODY_KEYS.map(k => b[k])) };
  for (const k of SIM_KEYS) d[k] = s[k];
  store.set(SAVE_KEY, d);
}

function load() {
  const d = store.get(SAVE_KEY, null);
  const okTier = t => Number.isInteger(t) && t >= 0 && t <= TOP;
  if (!d || !Array.isArray(d.bodies) || !Array.isArray(d.log) || !Array.isArray(d.marks)) return false;
  if (!(d.current === null || okTier(d.current)) || !okTier(d.next)) return false;
  if (!d.bodies.every(v => Array.isArray(v) && okTier(v[0]) && v.slice(1).every(Number.isFinite))) return false;
  for (const k of SIM_KEYS) s[k] = d[k];
  for (const v of d.bodies) {
    const b = makeBody(v[0], 0, 0);
    BODY_KEYS.forEach((k, i) => { b[k] = v[i]; });
    bodies.push(b);
  }
  resetPhysics(d.lastH || 0);
  s.shownScore = s.score;
  s.heldX = heldXFor(s.current ?? s.next);
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
  s.tick++;
  s.time += dt;
  s.restartArmed = Math.max(0, s.restartArmed - dt);
  s.shownScore += (s.score - s.shownScore) * Math.min(1, dt * 12);
  if (Math.abs(s.score - s.shownScore) < 0.5) s.shownScore = s.score;
  s.scorePunch = Math.max(0, s.scorePunch - dt * 4);
  s.chainFlash = s.chainFlash.map(v => Math.max(0, (v || 0) - dt * 1.5));

  const danger = s.phase !== 'over' ? clamp((s.near - 0.5) / 0.5, 0, 1) : 0;
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
  if (s.phase === 'over') return;

  const dir = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  if (dir && s.phase === 'play') s.aimX = clamp(s.aimX + dir * 320 * dt, JAR.left, JAR.right);

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
    setVoiceMuted(s.muted);
    store.set('melon_muted', s.muted);
  } else if (name === 'theme') {
    s.dark = !s.dark;
    setTheme(s.dark);
    store.set('melon_dark', s.dark);
  } else if (name === 'lang') {
    setSpanish(!es());
    banner(L('english', '¡español!'), 34, '#c0453b', 405, 1.2);
  } else if (name === 'restart') {
    if (s.phase === 'replay') endReplay();
    else if (s.phase !== 'play' || !s.dropped || s.restartArmed > 0) newGame();
    else s.restartArmed = 2;
  }
}

canvas.addEventListener('pointerdown', e => {
  initAudio();
  unlockVoice();
  const p = toWorld(e.clientX, e.clientY);
  for (const [name, b] of Object.entries(BUTTONS)) {
    if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 6) return press(name);
  }
  if (s.phase === 'replay') return endReplay();  // tap to skip
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
    else if (s.phase === 'replay') endReplay();
    else if (!e.repeat) drop();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

const tapped = fn => () => {
  initAudio();
  playUi();
  haptic(1);
  fn();
};
againBtn.addEventListener('click', tapped(() => newGame()));
watchBtn.addEventListener('click', tapped(() => watch(s.lastRun, L('your run', 'tu partida'))));
watchThemBtn.addEventListener('click', tapped(() => watch(s.vs, L(`${s.vs.name}'s run`, `partida de ${s.vs.name}`))));
initLessons(tapped);
shareBtn.addEventListener('click', tapped(share));
whoEl.parentElement.addEventListener('click', tapped(() => {
  const n = cleanName(prompt(L('your name', 'tu nombre'), s.name));
  if (!n) return;
  s.name = n;
  store.set('melon_name', n);
  if (s.lastRun) s.lastRun.name = n;
  whoEl.textContent = n;
}));
document.getElementById('open-board').addEventListener('click', tapped(() => openBoard()));
boardEl.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', tapped(() => openBoard(b.dataset.b))));
function closeBoard() {
  boardEl.classList.add('hidden');
  if (s.phase === 'over') overEl.classList.remove('hidden');
}
boardEl.addEventListener('click', e => { if (e.target === boardEl) closeBoard(); });
document.getElementById('board-close').addEventListener('click', tapped(closeBoard));

addEventListener('hashchange', () => {
  const vs = readLink();
  if (vs) newGame(vs.seed, vs);
});

addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);

// --- loop ---

initRender(canvas);
initMotes();
initSpanish();
flushPending();
const linked = readLink();
if (linked) newGame(linked.seed, linked);
else if (!load()) newGame();

let last = performance.now(), acc = 0;
function frame(now) {
  if (!document.hidden) adaptQuality(now - last);
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let n = 0;
  while (acc >= STEP && n++ < 6) {
    if (s.phase === 'replay') for (let k = replayTicks(); k-- > 0 && s.phase === 'replay';) replayStep();
    else update(STEP);
    acc -= STEP;
  }
  if (n > 6) acc = 0;
  render(s);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// debug hook for headless checks
window.__melon = { s, bodies, drop, TIERS, fx, makeBody, update, newGame, watch, replayStep, save, load, encodeRun, decodeRun, setSpanish };
