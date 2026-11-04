/**
 * Spanish mode (opt-in, off by default; toggled by the bare "ñ" icon).
 *
 * In play: the game's words switch to Spanish (`L(en, es)` everywhere), and a
 * Spanish voice (speechSynthesis, Latin American when available) calls out new
 * plants, combos, fever and melons. Between runs: a postcard from Doña Rosa
 * (es-story.js) after each run of 10+ drops. Tap a word for its meaning and to
 * hear it; words you've looked up get a dotted underline when they come back.
 *
 * State lives in localStorage `melon_es`: { on, next, looked: {word: n} }.
 */

import { POSTCARDS, GLOSS, FROM } from './es-story.js';

const KEY = 'melon_es';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const st = Object.assign({ on: false, next: 0, looked: {} }, load());
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

export const es = () => st.on;
export const L = (en, sp) => (st.on ? sp : en);

// The growth chain in Spanish, with articles (gender is the thing to learn).
const NAMES = [
  ['la', 'semilla'], ['el', 'brote'], ['el', 'trébol'], ['la', 'margarita'], ['la', 'rosa'],
  ['la', 'amapola'], ['el', 'girasol'], ['el', 'repollo'], ['la', 'calabaza'], ['el', 'melón'],
];
export const tierName = (t, en) => (st.on ? NAMES[t][1] : en);
export const withArticle = t => NAMES[t].join(' ');
export const isFem = t => NAMES[t][0] === 'la';
const NUMBERS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
export const numberWord = n => NUMBERS[n] ?? String(n);

// --- voice ---

let voice = null, muted = false, speaking = 0, unlocked = false;
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

function pickVoice() {
  if (!synth) return;
  const vs = synth.getVoices().filter(v => /^es/i.test(v.lang));
  const rank = v => {
    const l = v.lang.replace('_', '-').toLowerCase();
    let r = l === 'es-mx' ? 0 : l === 'es-us' || l === 'es-419' ? 1 : l === 'es-es' ? 4 : 2;
    if (/paulina|juan|sabina|google español de estados unidos/i.test(v.name)) r -= 0.5;
    return r;
  };
  voice = vs.sort((a, b) => rank(a) - rank(b))[0] || null;
}
if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
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

// Higher priority interrupts lower; equal or lower is dropped while talking.
export function say(text, priority = 0, rate = 1.05) {
  if (!synth || !st.on || muted || !voice) return;
  if (synth.speaking && priority <= speaking) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speaking = priority;
  u.onend = () => { speaking = -1; };
  synth.speak(u);
}

// --- postcards ---

const $ = id => document.getElementById(id);
let shown = 0, onDone = null;

export const hasPostcard = () => st.on && st.next < POSTCARDS.length;

// After a run: unlock the next postcard and show it; calls done() when closed.
export function showPostcard(done) {
  onDone = done;
  shown = st.next;
  st.next = Math.min(POSTCARDS.length, st.next + 1);
  persist();
  renderPostcard();
  $('postcard').classList.remove('hidden');
}

function renderPostcard() {
  const [text, en] = POSTCARDS[shown];
  $('pc-from').textContent = FROM;
  $('pc-n').textContent = `postal ${shown + 1} de ${POSTCARDS.length}`;
  const box = $('pc-text');
  box.replaceChildren();
  // words become tappable spans; spaces and punctuation stay plain text
  for (const part of text.split(/([A-Za-zÁÉÍÓÚÑÜáéíóúñü]+)/)) {
    if (!part) continue;
    const key = part.toLowerCase();
    if (GLOSS[key]) {
      const w = document.createElement('span');
      w.className = 'w' + (st.looked[key] ? ' seen' : '');
      w.textContent = part;
      w.addEventListener('click', e => { e.stopPropagation(); gloss(w, key); });
      box.append(w);
    } else {
      box.append(part);
    }
  }
  $('pc-en').textContent = en;
  $('pc-en').hidden = true;
  $('pc-gloss').textContent = '';
  $('pc-prev').disabled = shown === 0;
  $('pc-fwd').disabled = shown >= st.next - 1;
  const n = Object.keys(st.looked).length;
  $('pc-words').textContent = n ? `palabras que buscaste: ${n}` : 'toca una palabra para ver qué significa';
}

function gloss(el, key) {
  document.querySelectorAll('#pc-text .w.on').forEach(w => w.classList.remove('on'));
  el.classList.add('on');
  const g = $('pc-gloss');
  g.replaceChildren();
  const b = document.createElement('b');
  b.textContent = el.textContent;
  g.append(b, ' · ' + GLOSS[key]);
  say(el.textContent, 9, 0.9);
  st.looked[key] = (st.looked[key] || 0) + 1;
  persist();
}

export function initPostcards(tap) {
  $('pc-say').addEventListener('click', tap(() => say(POSTCARDS[shown][0], 9, 0.85)));
  $('pc-tr').addEventListener('click', tap(() => { $('pc-en').hidden = !$('pc-en').hidden; }));
  $('pc-prev').addEventListener('click', tap(() => { shown = Math.max(0, shown - 1); renderPostcard(); }));
  $('pc-fwd').addEventListener('click', tap(() => { shown = Math.min(st.next - 1, shown + 1); renderPostcard(); }));
  $('pc-next').addEventListener('click', tap(() => {
    synth?.cancel();
    $('postcard').classList.add('hidden');
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
