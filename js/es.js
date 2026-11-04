/**
 * Spanish mode (opt-in, off by default; toggled by the bare "ñ" icon).
 *
 * In play: the game's words switch to Spanish (`L(en, es)` everywhere) and a
 * Spanish voice (speechSynthesis, Latin American when available) cheers
 * combos with numbers and big merges with everyday praise.
 * Between runs: after each run of 10+ drops, the next everyday dialogue
 * (es-lessons.js) with one key phrase. Tap a word for its meaning and sound,
 * tap a speaker to hear the line, 🔊 plays the whole thing in two voices,
 * "inglés" shows each line's translation, ‹ › flips back through the
 * phrasebook. Words looked up before get a dotted underline.
 *
 * State lives in localStorage `melon_es`: { v, on, next, looked: {word: n} }.
 */

import { DIALOGUES, GLOSS, ME } from './es-lessons.js';

const KEY = 'melon_es', VERSION = 2;  // v1 was the old postcard story; its progress doesn't carry over
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saved = load();
const st = { on: !!saved.on, v: VERSION, next: 0, looked: {}, ...(saved.v === VERSION ? saved : {}) };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
persist();

export const es = () => st.on;
export const L = (en, sp) => (st.on ? sp : en);

// The growth chain in Spanish, with articles (only shown, never spoken).
const NAMES = [
  ['la', 'semilla'], ['el', 'brote'], ['el', 'trébol'], ['la', 'margarita'], ['la', 'rosa'],
  ['la', 'amapola'], ['el', 'girasol'], ['el', 'repollo'], ['la', 'calabaza'], ['el', 'melón'],
];
export const tierName = (t, en) => (st.on ? NAMES[t][1] : en);
export const withArticle = t => NAMES[t].join(' ');
export const isFem = t => NAMES[t][0] === 'la';
const NUMBERS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
export const numberWord = n => NUMBERS[n] ?? String(n);
const PRAISE = ['¡muy bien!', '¡eso!', '¡qué bien!', '¡excelente!', '¡bravo!', '¡así se hace!'];
export const praise = () => PRAISE[(Math.random() * PRAISE.length) | 0];

// --- voices: a woman's for her lines and the game, a man's for his ---

let voiceF = null, voiceM = null, muted = false, speaking = -1, unlocked = false;
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
const MALE = /juan|jorge|diego|carlos|andr[eé]s|pablo|enrique|ra[uú]l|male|hombre/i;

function pickVoices() {
  if (!synth) return;
  const rank = v => {
    const l = v.lang.replace('_', '-').toLowerCase();
    return l === 'es-mx' ? 0 : l === 'es-us' || l === 'es-419' ? 1 : l.startsWith('es-') && l !== 'es-es' ? 2 : 3;
  };
  const vs = synth.getVoices().filter(v => /^es/i.test(v.lang)).sort((a, b) => rank(a) - rank(b));
  voiceM = vs.find(v => MALE.test(v.name)) || null;
  voiceF = vs.find(v => !MALE.test(v.name)) || voiceM;
  voiceM ||= voiceF;
}
if (synth) {
  pickVoices();
  synth.addEventListener?.('voiceschanged', pickVoices);
}

export function setVoiceMuted(m) {
  muted = m;
  if (m) synth?.cancel();
}

// iOS only lets speech start from a user gesture; call this from one.
export function unlockVoice() {
  if (!synth || unlocked || !st.on) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

function utter(text, { male = false, rate = 1, onend } = {}) {
  const v = male ? voiceM : voiceF;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = v;
  u.lang = v.lang;
  u.rate = rate;
  // one voice for both parts: pitch tells them apart
  if (voiceM === voiceF) u.pitch = male ? 0.8 : 1.15;
  u.onend = onend;
  return u;
}

// Higher priority interrupts lower; equal or lower is dropped while talking.
export function say(text, priority = 0, opts = {}) {
  if (!synth || !st.on || muted || !voiceF) return;
  if (synth.speaking && priority <= speaking) return;
  synth.cancel();
  speaking = priority;
  synth.speak(utter(text, { rate: 1.05, ...opts, onend: () => { speaking = -1; } }));
}

// A whole dialogue, line by line, each speaker in their own voice.
function sayLines(lines) {
  if (!synth || muted || !voiceF) return;
  synth.cancel();
  speaking = 9;
  lines.forEach(([who, text], i) => synth.speak(utter(text.replace(/…/g, ', '), {
    male: who !== ME, rate: 0.9, onend: i === lines.length - 1 ? () => { speaking = -1; } : undefined,
  })));
}

// --- the between-runs dialogue ---

const $ = id => document.getElementById(id);
let shown = 0, onDone = null;
const WORD = /([A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)/;

export const hasLesson = () => st.on && st.next < DIALOGUES.length;

// After a run: unlock the next dialogue and show it; calls done() when closed.
export function showLesson(done) {
  onDone = done;
  shown = st.next;
  st.next = Math.min(DIALOGUES.length, st.next + 1);
  persist();
  renderLesson();
  $('lesson').classList.remove('hidden');
}

// Spanish text → tappable word spans; `hi` marks the key phrase's words.
function words(text, into, hi = null) {
  for (const part of text.split(WORD)) {
    if (!part) continue;
    const key = part.toLowerCase();
    if (!GLOSS[key]) {
      into.append(part);
      continue;
    }
    const w = document.createElement('span');
    w.className = 'w' + (st.looked[key] ? ' seen' : '') + (hi?.has(key) ? ' key' : '');
    w.textContent = part;
    w.addEventListener('click', e => { e.stopPropagation(); gloss(w, key); });
    into.append(w);
  }
}

function renderLesson() {
  const dl = DIALOGUES[shown];
  $('ls-scene').textContent = `${dl.icon} ${dl.scene[0]}`;
  $('ls-scene-en').textContent = dl.scene[1];
  const keyWords = new Set(dl.phrase[0].toLowerCase().match(/[a-záéíóúñü]+/g));
  const box = $('ls-lines');
  box.replaceChildren();
  for (const [who, text, en] of dl.lines) {
    const row = document.createElement('div');
    row.className = 'ln' + (who === ME ? ' me' : '');
    const name = document.createElement('button');
    name.className = 'who';
    name.textContent = who;
    name.addEventListener('click', () => say(text.replace(/…/g, ', '), 9, { male: who !== ME, rate: 0.9 }));
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const p = document.createElement('p');
    p.lang = 'es';
    words(text, p, keyWords);
    const tr = document.createElement('p');
    tr.className = 'tr';
    tr.textContent = en;
    bubble.append(p, tr);
    row.append(name, bubble);
    box.append(row);
  }
  $('lesson').classList.remove('english');
  const ph = $('ls-phrase');
  ph.replaceChildren();
  words(dl.phrase[0], ph);
  $('ls-phrase-en').textContent = dl.phrase[1];
  $('ls-gloss').textContent = '';
  $('ls-prev').disabled = shown === 0;
  $('ls-fwd').disabled = shown >= st.next - 1;
  $('ls-n').textContent = `frase ${shown + 1} de ${DIALOGUES.length}`;
}

function gloss(el, key) {
  document.querySelectorAll('#lesson .w.on').forEach(w => w.classList.remove('on'));
  el.classList.add('on');
  const g = $('ls-gloss');
  g.replaceChildren();
  const b = document.createElement('b');
  b.textContent = el.textContent;
  g.append(b, ' · ' + GLOSS[key]);
  say(el.textContent, 9, { rate: 0.85 });
  st.looked[key] = (st.looked[key] || 0) + 1;
  persist();
}

export function initLessons(tap) {
  $('ls-say').addEventListener('click', tap(() => sayLines(DIALOGUES[shown].lines)));
  $('ls-tr').addEventListener('click', tap(() => $('lesson').classList.toggle('english')));
  $('ls-prev').addEventListener('click', tap(() => { shown = Math.max(0, shown - 1); renderLesson(); }));
  $('ls-fwd').addEventListener('click', tap(() => { shown = Math.min(st.next - 1, shown + 1); renderLesson(); }));
  $('ls-next').addEventListener('click', tap(() => {
    synth?.cancel();
    $('lesson').classList.add('hidden');
    onDone?.();
  }));
}

// --- toggle ---

// Static DOM strings carry their Spanish in data-es; swap them in place.
function applyDom() {
  document.querySelectorAll('[data-es]').forEach(el => {
    el.dataset.en ??= el.textContent;
    el.textContent = st.on ? el.dataset.es : el.dataset.en;
  });
  document.documentElement.lang = st.on ? 'es' : 'en';
}

export function setSpanish(on) {
  st.on = on;
  persist();
  applyDom();
  if (on) {
    unlockVoice();
    say('¡Hola!', 5);
  } else {
    synth?.cancel();
  }
}

export function initSpanish() {
  applyDom();
}
