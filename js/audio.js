/**
 * Web Audio synth, no external files: sound effects plus a generative
 * music bed (C major pentatonic) that reacts to fever and danger.
 */

let ac = null, master = null, sfxBus = null, musicBus = null, musicFilter = null, noise = null;
let muted = false;

const PENTA = [0, 2, 4, 7, 9];
const note = (step, base = 261.63) => base * 2 ** ((Math.floor(step / 5) * 12 + PENTA[((step % 5) + 5) % 5]) / 12);

export function initAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.7;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);

    sfxBus = ac.createGain();
    sfxBus.connect(master);
    musicFilter = ac.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = 9000;
    musicBus = ac.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(musicFilter).connect(master);

    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  if (ac.state === 'suspended') ac.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ac.currentTime, 0.05);
}

// --- primitives ---

function tone(freq, t0, dur, { type = 'triangle', vol = 0.3, slide = 1, attack = 0.006, bus = sfxBus, detune = 0 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(freq, t0);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(bus);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function hiss(t0, dur, vol, freq = 2500, { type = 'bandpass', q = 0.8, bus = sfxBus, sweep = 1 } = {}) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noise;
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(freq * sweep, t0 + dur);
  f.Q.value = q;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
}

const ready = () => ac && !muted;

// --- sound effects ---

export function playDrop(tier) {
  if (!ready()) return;
  const t = ac.currentTime;
  hiss(t, 0.16, 0.05, 900, { sweep: 3, q: 1.5 });  // whoosh
  tone(500 - tier * 30, t, 0.09, { type: 'sine', vol: 0.08, slide: 1.6 });
}

// A wooden "tok", lower for bigger pieces, louder for harder hits (0–1).
export function playLand(tier, intensity) {
  if (!ready()) return;
  const t = ac.currentTime, f = 520 / (1 + tier * 0.22);
  tone(f, t, 0.07 + tier * 0.012, { type: 'sine', vol: 0.05 + intensity * 0.22, slide: 0.55 });
  hiss(t, 0.03, 0.03 + intensity * 0.08, 1800 - tier * 100, { q: 2 });
}

export function playMerge(tier, combo = 1) {
  if (!ready()) return;
  const t = ac.currentTime;
  const step = tier + Math.min(combo - 1, 10);
  const f = note(step + 3);
  // bloop: quick upward sweep into a bell-ish pluck
  tone(f * 0.5, t, 0.1, { type: 'sine', vol: 0.18, slide: 2 });
  tone(f, t + 0.03, 0.4, { vol: 0.22 });
  tone(f * 2, t + 0.03, 0.25, { type: 'sine', vol: 0.08 });
  tone(f * 3.01, t + 0.03, 0.12, { type: 'sine', vol: 0.04 });
  hiss(t, 0.09, 0.12, 3000, { q: 0.7 });
  if (combo >= 2) tone(note(step + 5), t + 0.09, 0.3, { vol: 0.12 });
  if (combo >= 4) tone(note(step + 7), t + 0.15, 0.3, { type: 'sine', vol: 0.1 });
  if (tier >= 6) {
    // big piece: sub thump
    tone(90, t, 0.35, { type: 'sine', vol: 0.4, slide: 0.5 });
  }
}

export function playMelon() {
  if (!ready()) return;
  const t = ac.currentTime;
  tone(70, t, 0.7, { type: 'sine', vol: 0.5, slide: 0.5 });
  hiss(t, 1.2, 0.2, 6000, { sweep: 0.2, q: 0.5 });
  [0, 2, 4, 5, 7, 9, 10, 12].forEach((s, i) => tone(note(s + 5), t + i * 0.06, 0.6, { vol: 0.14 }));
}

export function playFever() {
  if (!ready()) return;
  const t = ac.currentTime;
  hiss(t, 0.8, 0.12, 400, { sweep: 12, q: 1 });
  [0, 1, 2, 3, 4, 5].forEach(i => tone(note(i + 8), t + i * 0.045, 0.25, { type: 'square', vol: 0.05 }));
}

export function playCombo(combo) {
  if (!ready()) return;
  const t = ac.currentTime;
  tone(note(8 + Math.min(combo, 12)), t + 0.05, 0.18, { type: 'square', vol: 0.04 });
}

export function playHeartbeat(vol) {
  if (!ready()) return;
  const t = ac.currentTime;
  tone(60, t, 0.16, { type: 'sine', vol: 0.4 * vol, slide: 0.7 });
  tone(55, t + 0.17, 0.2, { type: 'sine', vol: 0.3 * vol, slide: 0.7 });
}

export function playOver() {
  if (!ready()) return;
  const t = ac.currentTime;
  [4, 2, 0, -3].forEach((s, i) => tone(note(s + 5), t + i * 0.18, 0.5, { vol: 0.18, slide: 0.96 }));
  tone(80, t, 0.8, { type: 'sine', vol: 0.3, slide: 0.4 });
}

export function playUi() {
  if (!ready()) return;
  tone(880, ac.currentTime, 0.06, { type: 'sine', vol: 0.08 });
}

// --- music ---

const BPM = 100;
const ROOTS = [0, -2, -4, -1];  // pentatonic steps: C, A, F-ish, G-ish → loops nicely
let mood = { fever: false, danger: 0 };
let beat0 = 0, nextTime = 0, sixteenth = 0, melodyStep = 7;

export function setMood(m) {
  mood = m;
  if (!ac) return;
  const cutoff = mood.danger > 0 ? 9000 * (1 - mood.danger * 0.9) + 300 : 9000;
  musicFilter.frequency.setTargetAtTime(cutoff, ac.currentTime, 0.15);
}

// 0 at each beat, rising to 1 just before the next.
export function beatPhase() {
  if (!ac) return 0.5;
  const spb = 60 / (BPM * (mood.fever ? 1.25 : 1));
  return (((ac.currentTime - beat0) / spb) % 1 + 1) % 1;
}

function startMusic() {
  beat0 = nextTime = ac.currentTime + 0.1;
  setInterval(schedule, 30);
}

function schedule() {
  if (!ac || ac.state !== 'running') return;
  const spb = 60 / (BPM * (mood.fever ? 1.25 : 1)), s16 = spb / 4;
  while (nextTime < ac.currentTime + 0.12) {
    playSixteenth(sixteenth, nextTime);
    nextTime += s16;
    sixteenth++;
    if (sixteenth % 4 === 0) beat0 = nextTime;
  }
}

function playSixteenth(i, t) {
  if (muted) return;
  const bar = Math.floor(i / 16) % ROOTS.length, pos = i % 16, root = ROOTS[bar];
  const bus = musicBus, fever = mood.fever;

  // pad on each bar
  if (pos === 0) {
    for (const st of [0, 2, 4]) tone(note(root + st, 130.81), t, 60 / BPM * 4, { type: 'sine', vol: 0.05, attack: 0.4, bus, detune: (Math.random() - 0.5) * 8 });
  }
  // bass: beats 1 and 3, plus pushes in fever
  if (pos === 0 || pos === 8 || (fever && (pos === 6 || pos === 14))) {
    tone(note(root, 65.41), t, 0.32, { type: 'triangle', vol: 0.22, bus });
  }
  // soft kick on the beat, hats on offbeats (fever: every 16th)
  if (pos % 4 === 0) tone(110, t, 0.12, { type: 'sine', vol: fever ? 0.25 : 0.14, slide: 0.4, bus });
  if (fever ? true : pos % 4 === 2) hiss(t, 0.03, fever ? 0.05 : 0.03, 8000, { type: 'highpass', q: 0.5, bus });
  if (pos === 4 || pos === 12) hiss(t, fever ? 0.12 : 0.06, fever ? 0.07 : 0.03, 1800, { q: 0.6, bus });
  // marimba-ish melody: random walk over the pentatonic, denser in fever
  if (pos % 2 === 0 && Math.random() < (fever ? 0.85 : 0.45)) {
    melodyStep += [-2, -1, -1, 1, 1, 2][(Math.random() * 6) | 0];
    melodyStep = Math.max(3, Math.min(13, melodyStep));
    const f = note(melodyStep + (fever ? 5 : 0));
    tone(f, t, 0.35, { type: 'sine', vol: 0.09, bus });
    tone(f * 4, t, 0.05, { type: 'sine', vol: 0.015, bus });
  }
}
