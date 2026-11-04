/**
 * Scores API client. The API lives on Railway (api/ in this repo); the game
 * stays on GitHub Pages and works fine offline: failed submissions wait in
 * localStorage (`melon_pending`) and go out on the next load or game over.
 */

export const API = 'https://api-production-e5b59.up.railway.app/api';

const PENDING_KEY = 'melon_pending';
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// anonymous, per-device player id; the name shown is whatever they last played as
export const playerId = (() => {
  let id = get('melon_id', null);
  if (typeof id !== 'string' || !/^[\w-]{8,64}$/.test(id)) {
    id = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    set('melon_id', id);
  }
  return id;
})();

async function req(path, body) {
  const res = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout?.(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

// Resolves to { id, day: {rank, of}, all: {rank, of} }, or null if it couldn't go out now.
export async function submitRun(run, name) {
  const body = {
    player: playerId, name, seed: run.seed, score: run.score, end: run.end,
    biggest: run.biggest, log: run.log, marks: run.marks,
  };
  try {
    return await req('/runs', body);
  } catch (e) {
    // retry later on network trouble; a rejected run (4xx) is dropped
    if (!e.status || e.status >= 500 || e.status === 429) set(PENDING_KEY, [...get(PENDING_KEY, []), body].slice(-5));
    return null;
  }
}

export async function flushPending() {
  const queue = get(PENDING_KEY, []);
  if (!queue.length) return;
  set(PENDING_KEY, []);
  for (const body of queue) {
    try {
      await req('/runs', body);
    } catch (e) {
      if (!e.status || e.status >= 500 || e.status === 429) set(PENDING_KEY, [...get(PENDING_KEY, []), body].slice(-5));
    }
  }
}

export const fetchBoard = kind => req(`/board?b=${kind}&player=${encodeURIComponent(playerId)}`);
export const fetchRun = id => req(`/runs/${id}`);
