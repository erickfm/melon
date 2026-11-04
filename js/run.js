/**
 * A run as data: its seed plus every drop (sim tick, x in tenths of a unit)
 * and the score when each drop happened. The sim is deterministic, so that is
 * enough to replay a run exactly, to race against it live (challenge links),
 * and to re-check it on a server.
 *
 * Links pack a run into varints → base64url, roughly 5 bytes per drop.
 */

const ADJ = ['Quiet', 'Sunny', 'Brave', 'Sleepy', 'Lucky', 'Tiny', 'Mighty', 'Dewy', 'Fuzzy', 'Jolly',
  'Gentle', 'Speedy', 'Cozy', 'Plucky', 'Rosy', 'Breezy', 'Humble', 'Bouncy', 'Mellow', 'Zesty'];
const NOUN = ['Turnip', 'Radish', 'Sprout', 'Pumpkin', 'Clover', 'Pea', 'Bean', 'Daisy', 'Fern', 'Acorn',
  'Tulip', 'Basil', 'Mint', 'Plum', 'Fig', 'Carrot', 'Sunflower', 'Squash', 'Leek', 'Thistle'];
const pick = a => a[(Math.random() * a.length) | 0];

export const randomName = () => `${pick(ADJ)} ${pick(NOUN)} ${10 + ((Math.random() * 90) | 0)}`;
export const cleanName = n => String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 18);

export const MAX_Q = 4000;  // drop x in tenths; the world is 400 wide

export function encodeRun(run) {
  const out = [];
  const u = n => {
    n = Math.max(0, Math.floor(n));
    while (n >= 128) {
      out.push((n % 128) | 128);
      n = Math.floor(n / 128);
    }
    out.push(n);
  };
  const name = new TextEncoder().encode(cleanName(run.name));
  u(1);  // format version
  u(run.seed >>> 0);
  u(run.score);
  u(run.end);
  u(name.length);
  out.push(...name);
  u(run.log.length);
  let t = 0, m = 0;
  run.log.forEach(([tick, q], i) => {
    u(tick - t);
    u(q);
    u(run.marks[i] - m);
    t = tick;
    m = run.marks[i];
  });
  let bin = '';
  for (const b of out) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Returns null for anything malformed, so a bad link just starts a normal game.
export function decodeRun(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    let p = 0;
    const u = () => {
      let n = 0, mul = 1, b;
      do {
        if (p >= bytes.length || mul > 2 ** 35) throw new Error('truncated');
        b = bytes[p++];
        n += (b & 127) * mul;
        mul *= 128;
      } while (b & 128);
      return n;
    };
    if (u() !== 1) return null;
    const seed = u() >>> 0, score = u(), end = u();
    const len = u();
    if (len > 64) return null;
    const name = cleanName(new TextDecoder().decode(bytes.slice(p, p + len))) || 'a friend';
    p += len;
    const n = u();
    if (n > 20000) return null;
    const log = [], marks = [];
    let t = 0, m = 0;
    for (let i = 0; i < n; i++) {
      t += u();
      const q = u();
      m += u();
      if (q > MAX_Q) return null;
      log.push([t, q]);
      marks.push(m);
    }
    if (p !== bytes.length || m > score || t > end) return null;
    return { seed, score, end, name, log, marks };
  } catch {
    return null;
  }
}
