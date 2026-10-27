/**
 * Web Audio synthesized sounds: soft papery plucks, no external files.
 */

let ac = null, master = null, noise = null, muted = false;

// major pentatonic, one step per tier
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function initAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}

function tone(freq, t0, dur, { type = 'triangle', vol = 0.3, slide = 1 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function crinkle(t0, dur, vol, freq = 2500) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noise;
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.3);
  src.stop(t0 + dur + 0.02);
}

const ready = () => ac && !muted;

export function playDrop(tier) {
  if (!ready()) return;
  const t = ac.currentTime;
  tone(180 - tier * 12, t, 0.12, { type: 'sine', vol: 0.22, slide: 0.6 });
  crinkle(t, 0.05, 0.06, 1400);
}

export function playMerge(tier) {
  if (!ready()) return;
  const t = ac.currentTime, f = 330 * 2 ** (SCALE[tier] / 12);
  tone(f, t, 0.28, { vol: 0.26 });
  tone(f * 2, t + 0.015, 0.14, { type: 'sine', vol: 0.07 });
  crinkle(t, 0.07, 0.12, 2600);
}

export function playMelon() {
  if (!ready()) return;
  const t = ac.currentTime;
  [0, 4, 7, 12, 16].forEach((st, i) => tone(523 * 2 ** (st / 12), t + i * 0.07, 0.35, { vol: 0.2 }));
  crinkle(t, 0.3, 0.15, 3200);
}

export function playOver() {
  if (!ready()) return;
  const t = ac.currentTime;
  [7, 4, 0].forEach((st, i) => tone(262 * 2 ** (st / 12), t + i * 0.16, 0.4, { vol: 0.2, slide: 0.97 }));
}
