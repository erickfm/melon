/**
 * Paper cutout helpers: seeded RNG, wobbly hand-cut outlines, grain texture.
 */

export const TAU = Math.PI * 2;

export function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Closed outline around (cx, cy): radius from radiusAt(theta), jittered per point.
export function blob(rng, n, radiusAt, jitter = 0.015, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = radiusAt(a) * (1 + (rng() * 2 - 1) * jitter);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

export function ellipsePts(rng, cx, cy, rx, ry, rot = 0, n = 20, jitter = 0.03) {
  const c = Math.cos(rot), s = Math.sin(rot), pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, j = 1 + (rng() * 2 - 1) * jitter;
    const x = Math.cos(a) * rx * j, y = Math.sin(a) * ry * j;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}

// Rectangle perimeter with scissor-cut jitter, for straight-line tracing.
export function rectPts(rng, x, y, w, h, step = 12, jitter = 0.8) {
  const pts = [];
  const edge = (x0, y0, x1, y1, nx, ny) => {
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) {
      const t = i / n, j = (rng() * 2 - 1) * jitter;
      pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
    }
  };
  edge(x, y, x + w, y, 0, 1);
  edge(x + w, y, x + w, y + h, 1, 0);
  edge(x + w, y + h, x, y + h, 0, 1);
  edge(x, y + h, x, y, 1, 0);
  return pts;
}

// Smooth closed path through midpoints.
export function tracePts(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

export function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

let grain = null;
export function getGrain() {
  if (grain) return grain;
  const size = 256, c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size), rng = mulberry32(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng(), shade = v < 0.5 ? 40 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = shade;
    img.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 34);
  }
  g.putImageData(img, 0, 0);
  // paper fibers
  g.strokeStyle = 'rgba(70,45,20,0.09)';
  g.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = rng() * size, y = rng() * size, a = rng() * Math.PI, l = 6 + rng() * 18;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  grain = c;
  return c;
}
