"""
Melon scores API (deployed on Railway; the game itself stays on GitHub Pages).

  POST /api/runs            submit a finished run → its rank today and all time
  GET  /api/board?b=day|all top 50, one row per player (their best), plus your rank
  GET  /api/runs/<id>       a stored run, for watching its replay
  POST /api/admin/delete    {player} or {run}; needs `Authorization: Bearer $ADMIN_TOKEN`

Checks are basic: shape and range validation, drop spacing, and a score
ceiling computed from the run's own seed (the spawn sequence is regenerated
here with the same RNG as the game). Every run keeps its full drop log, so
runs can be re-simulated and verified later.
"""
import json
import os
import re
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 256 * 1024

ORIGINS = set(filter(None, os.environ.get(
    'ALLOW_ORIGINS',
    'https://erickfm.github.io,http://localhost:8000,http://127.0.0.1:8000',
).split(',')))

pool = ConnectionPool(os.environ['DATABASE_URL'], min_size=1, max_size=4, kwargs={'row_factory': dict_row}, open=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS runs (
  id BIGSERIAL PRIMARY KEY,
  player TEXT NOT NULL REFERENCES players(id),
  score INT NOT NULL,
  seed BIGINT NOT NULL,
  ticks INT NOT NULL,
  drops INT NOT NULL,
  biggest SMALLINT NOT NULL,
  day DATE NOT NULL,
  created TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  log JSONB NOT NULL,
  marks JSONB NOT NULL,
  verified BOOLEAN
);
CREATE INDEX IF NOT EXISTS runs_day_player ON runs (day, player, score DESC);
CREATE INDEX IF NOT EXISTS runs_player ON runs (player, score DESC);
"""
with pool.connection() as c:
    c.execute(SCHEMA)

# --- the game's rules, mirrored for checking ---

SPAWN_WEIGHTS = [30, 26, 20, 14, 10]   # js/constants.js
MIN_GAP = 26          # DROP_COOLDOWN 0.45s at 60Hz = 27 ticks; one tick of float slack
MAX_Q = 4000          # drop x in tenths
TOP_TIER = 9
# Best case points per seed-sized unit of material: two melons merging is
# 7120 points from 1024 seeds' worth (≈6.95), and combo ×4 × fever ×2 on top.
MAX_PTS_PER_UNIT = 7.0 * 8
# Trickshots (constants.js TRICK_BONUS): at most one per merge, so per drop:
# (25 flat + 2 × 55 melon points) × combo ×4 × fever ×2 × cascade ×3.
MAX_TRICK_PER_DROP = (25 + 2 * 55) * 8 * 3
M32 = 0xFFFFFFFF


def spawns(seed, n):
    """The game's tier sequence for a seed (mulberry32 + weighted roll in game.js)."""
    st, out, total = seed & M32, [], sum(SPAWN_WEIGHTS)
    imul = lambda a, b: (a * b) & M32
    for _ in range(n):
        st = (st + 0x6D2B79F5) & M32
        t = imul(st ^ (st >> 15), 1 | st)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        r = ((t ^ (t >> 14)) & M32) / 4294967296 * total
        tier = 0
        for i, w in enumerate(SPAWN_WEIGHTS):
            r -= w
            if r < 0:
                tier = i
                break
        out.append(tier)
    return out


def check(run):
    """Returns an error string, or None if the run looks plausible."""
    log, marks, score, end = run['log'], run['marks'], run['score'], run['end']
    if len(log) != len(marks) or not (1 <= len(log) <= 20000):
        return 'bad drop count'
    prev = -MIN_GAP
    for tick, q in log:
        if tick - prev < MIN_GAP or not (0 <= q <= MAX_Q):
            return 'bad drop'
        prev = tick
    if end < prev or end > prev + 60 * 60 * 10:
        return 'bad end'
    if any(b < a for a, b in zip(marks, marks[1:])) or marks[0] != 0 or marks[-1] > score:
        return 'bad marks'
    units = sum(2 ** t for t in spawns(run['seed'], len(log)))
    if score > units * MAX_PTS_PER_UNIT + len(log) * MAX_TRICK_PER_DROP:
        return 'score too high'
    return None


# --- request helpers ---

ID_RE = re.compile(r'^[\w-]{8,64}$')
hits = defaultdict(deque)
hits_lock = threading.Lock()


def limited(ip, n=40, window=3600):
    now = time.time()
    with hits_lock:
        q = hits[ip]
        while q and q[0] < now - window:
            q.popleft()
        if len(q) >= n:
            return True
        q.append(now)
        return False


def client_ip():
    return (request.headers.get('X-Forwarded-For') or request.remote_addr or '').split(',')[0].strip()


def clean_name(n):
    return re.sub(r'\s+', ' ', str(n or '')).strip()[:18] or 'a gardener'


def is_int(v, lo, hi):
    return isinstance(v, int) and not isinstance(v, bool) and lo <= v <= hi


def today():
    return datetime.now(timezone.utc).date()


@app.after_request
def cors(resp):
    origin = request.headers.get('Origin')
    if origin in ORIGINS:
        resp.headers['Access-Control-Allow-Origin'] = origin
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Max-Age'] = '86400'
        resp.headers['Vary'] = 'Origin'
    return resp


@app.route('/api/<path:_>', methods=['OPTIONS'])
def preflight(_):
    return '', 204


@app.get('/health')
def health():
    return 'ok'


BEST = """
  SELECT DISTINCT ON (player) id, player, score, biggest
  FROM runs WHERE {where}
  ORDER BY player, score DESC, id
"""


def rank_of(c, where, args, score):
    row = c.execute(
        f'SELECT count(*) AS above FROM ({BEST.format(where=where)}) b WHERE b.score > %s',
        (*args, score),
    ).fetchone()
    total = c.execute(f'SELECT count(DISTINCT player) AS n FROM runs WHERE {where}', args).fetchone()
    return {'rank': row['above'] + 1, 'of': total['n']}


@app.post('/api/runs')
def submit():
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        return jsonify(error='bad json'), 400
    player = d.get('player')
    if not isinstance(player, str) or not ID_RE.match(player):
        return jsonify(error='bad player'), 400
    ok = (
        is_int(d.get('seed'), 0, M32) and is_int(d.get('score'), 0, 10**8)
        and is_int(d.get('end'), 0, 10**8) and is_int(d.get('biggest', 0), 0, TOP_TIER)
        and isinstance(d.get('log'), list) and isinstance(d.get('marks'), list)
        and all(isinstance(x, list) and len(x) == 2 and is_int(x[0], 0, 10**8) and is_int(x[1], 0, MAX_Q) for x in d['log'])
        and all(is_int(m, 0, 10**8) for m in d['marks'])
    )
    if not ok:
        return jsonify(error='bad run'), 400
    err = check(d)
    if err:
        return jsonify(error=err), 422
    ip = client_ip()
    if limited(ip):
        return jsonify(error='slow down'), 429

    day = today()
    with pool.connection() as c:
        c.execute(
            'INSERT INTO players (id, name) VALUES (%s, %s) '
            'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated = now()',
            (player, clean_name(d.get('name'))),
        )
        rid = c.execute(
            'INSERT INTO runs (player, score, seed, ticks, drops, biggest, day, ip, log, marks) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
            (player, d['score'], d['seed'], d['end'], len(d['log']), d.get('biggest', 0), day, ip,
             json.dumps(d['log'], separators=(',', ':')), json.dumps(d['marks'], separators=(',', ':'))),
        ).fetchone()['id']
        return jsonify(
            id=rid,
            day=rank_of(c, 'day = %s', (day,), d['score']),
            all=rank_of(c, 'true', (), d['score']),
        )


@app.get('/api/board')
def board():
    kind = request.args.get('b', 'day')
    player = request.args.get('player', '')
    where, args = ('day = %s', (today(),)) if kind == 'day' else ('true', ())
    with pool.connection() as c:
        rows = c.execute(
            f'SELECT b.id, b.player, b.score, b.biggest, p.name FROM ({BEST.format(where=where)}) b '
            'JOIN players p ON p.id = b.player ORDER BY b.score DESC, b.id LIMIT 50',
            args,
        ).fetchall()
        me = None
        if ID_RE.match(player):
            mine = c.execute(
                f'SELECT score FROM runs WHERE {where} AND player = %s ORDER BY score DESC LIMIT 1',
                (*args, player),
            ).fetchone()
            if mine:
                me = {'score': mine['score'], **rank_of(c, where, args, mine['score'])}
    return jsonify(
        day=str(today()),
        rows=[{'id': r['id'], 'name': r['name'], 'score': r['score'], 'biggest': r['biggest'],
               'me': r['player'] == player} for r in rows],
        me=me,
    )


@app.get('/api/runs/<int:rid>')
def get_run(rid):
    with pool.connection() as c:
        r = c.execute(
            'SELECT r.seed, r.score, r.ticks, r.log, r.marks, p.name FROM runs r '
            'JOIN players p ON p.id = r.player WHERE r.id = %s',
            (rid,),
        ).fetchone()
    if not r:
        return jsonify(error='not found'), 404
    resp = jsonify(seed=r['seed'], score=r['score'], end=r['ticks'], log=r['log'], marks=r['marks'], name=r['name'])
    resp.headers['Cache-Control'] = 'public, max-age=86400'  # runs never change
    return resp


# Moderation: remove a cheater's or test player's runs, or one run.
@app.post('/api/admin/delete')
def admin_delete():
    token = os.environ.get('ADMIN_TOKEN')
    if not token or request.headers.get('Authorization') != f'Bearer {token}':
        return jsonify(error='nope'), 403
    d = request.get_json(silent=True) or {}
    with pool.connection() as c:
        if isinstance(d.get('player'), str):
            n = c.execute('DELETE FROM runs WHERE player = %s', (d['player'],)).rowcount
            c.execute('DELETE FROM players WHERE id = %s', (d['player'],))
        elif is_int(d.get('run'), 1, 2**62):
            n = c.execute('DELETE FROM runs WHERE id = %s', (d['run'],)).rowcount
        else:
            return jsonify(error='say which'), 400
    return jsonify(deleted=n)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8001)), debug=True)
